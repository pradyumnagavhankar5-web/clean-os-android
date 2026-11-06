"""Resolve a candidate to one successful run/attempt and its immutable artifact."""

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import zipfile

WORKFLOW = '.github/workflows/android-preview.yml'
REPOSITORY = 'pradyumnagavhankar5-web/clean-os-android'
FILES = ('CleanOS-team-preview.apk', 'CleanOS-team-preview.apk.sha256',
         'CleanOS-team-preview-armv7.apk', 'CleanOS-team-preview-armv7.apk.sha256')


def tag_parts(tag):
    match = re.fullmatch(r'shared-preview-([1-9][0-9]*)-([1-9][0-9]*)-([0-9a-f]{7})', tag)
    if not match:
        raise ValueError('Choose a complete shared-preview tag from this repository Releases page.')
    return int(match[1]), int(match[2]), match[3]


def choose_run(runs, tag, source):
    number, _, short = tag_parts(tag)
    if not re.fullmatch('[0-9a-f]{40}', source) or not source.startswith(short):
        raise ValueError('Candidate tag and source commit do not match.')
    matches = [run for run in runs if run.get('path') == WORKFLOW
               and run.get('run_number') == number and run.get('head_sha') == source
               and run.get('event') in ('push', 'workflow_dispatch')
               and (run.get('head_repository') or {}).get('full_name') == REPOSITORY]
    if len(matches) != 1:
        raise ValueError('Could not identify the exact candidate build run.')
    return matches[0]


def verify_attempt(attempt, run, tag, source):
    number, retry, _ = tag_parts(tag)
    if (attempt.get('id') != run['id'] or attempt.get('run_number') != number
            or attempt.get('run_attempt') != retry or attempt.get('head_sha') != source
            or attempt.get('path') != WORKFLOW or attempt.get('event') not in ('push', 'workflow_dispatch')
            or attempt.get('status') != 'completed' or attempt.get('conclusion') != 'success'):
        raise ValueError('The exact tagged Android, database and emulator run must pass first.')


def choose_artifact(artifacts, run, tag, source):
    number, retry, _ = tag_parts(tag)
    name = f'cleanos-android-preview-{number}-{retry}'
    matches = [artifact for artifact in artifacts if artifact.get('name') == name]
    if len(matches) != 1:
        raise ValueError('The original build artifact is missing or ambiguous. Build a fresh candidate.')
    artifact = matches[0]
    workflow = artifact.get('workflow_run') or {}
    digest = artifact.get('digest')
    if (artifact.get('expired') or workflow.get('id') != run['id'] or workflow.get('head_sha') != source
            or not isinstance(digest, str) or not re.fullmatch(r'sha256:[0-9a-f]{64}', digest)):
        raise ValueError('The original build artifact has expired or does not match its source.')
    return artifact


def api(path):
    result = subprocess.run(['gh', 'api', f'repos/{REPOSITORY}/{path}'],
                            check=True, capture_output=True)
    return json.loads(result.stdout)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('tag')
    parser.add_argument('--directory', default='candidate')
    args = parser.parse_args()
    tag_parts(args.tag)
    if os.environ.get('GITHUB_REPOSITORY') != REPOSITORY:
        raise SystemExit('Run signing from the CleanOS repository.')
    directory = Path(args.directory)
    directory.mkdir(exist_ok=False)
    release = api(f'releases/tags/{args.tag}')
    if release.get('tag_name') != args.tag or release.get('draft') or not release.get('prerelease'):
        raise SystemExit('Choose a published shared candidate prerelease.')
    source = api(f'commits/{args.tag}')['sha']
    run = choose_run(api(f'actions/runs?head_sha={source}&per_page=100')['workflow_runs'], args.tag, source)
    _, retry, _ = tag_parts(args.tag)
    verify_attempt(api(f'actions/runs/{run["id"]}/attempts/{retry}'), run, args.tag, source)
    artifact = choose_artifact(api(f'actions/runs/{run["id"]}/artifacts?per_page=100')['artifacts'],
                               run, args.tag, source)
    archive = directory / 'build.zip'
    with archive.open('wb') as output:
        subprocess.run(['gh', 'api', f'repos/{REPOSITORY}/actions/artifacts/{artifact["id"]}/zip'],
                       check=True, stdout=output)
    if hashlib.sha256(archive.read_bytes()).hexdigest() != artifact['digest'].split(':')[1]:
        raise SystemExit('The downloaded artifact digest differs from the original build.')
    with zipfile.ZipFile(archive) as bundle:
        names = bundle.namelist()
        if len(names) != len(set(names)) or not set(FILES).issubset(names):
            raise SystemExit('The original artifact does not contain the expected phone APKs.')
        for name in FILES:
            (directory / name).write_bytes(bundle.read(name))
    config = api(f'contents/app.json?ref={source}')
    (directory / 'app.json').write_bytes(base64.b64decode(config['content']))
    provenance = {'source_commit': source, 'candidate_tag': args.tag, 'run_id': run['id'],
                  'run_attempt': retry, 'artifact_id': artifact['id'], 'artifact_digest': artifact['digest']}
    (directory / 'SOURCE-BUILD.json').write_text(json.dumps(provenance, indent=2) + '\n')
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write(f'source={source}\n')
    print(f'Verified original build artifact {artifact["id"]} from run {run["id"]}, attempt {retry}.')


if __name__ == '__main__':
    main()
