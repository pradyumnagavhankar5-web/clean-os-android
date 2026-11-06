"""Replace preview signatures while preserving every Android app payload byte."""

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import zipfile

PREVIEW_CERTIFICATE = 'fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c'
VARIANTS = [
    ('CleanOS-team-preview.apk', 'CleanOS.apk', 'arm64-v8a'),
    ('CleanOS-team-preview-armv7.apk', 'CleanOS-armv7.apk', 'armeabi-v7a'),
]


def command(arguments):
    return subprocess.run(list(map(str, arguments)), check=True, capture_output=True, text=True).stdout


def payload(path):
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        if len(set(names)) != len(names):
            raise SystemExit('APK contains duplicate entries.')
        return {name: hashlib.sha256(archive.read(name)).hexdigest() for name in names
                if not re.fullmatch(r'META-INF/(?:MANIFEST\.MF|[^/]+\.(?:SF|RSA|DSA|EC))', name, re.I)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', default='candidate')
    parser.add_argument('--output', default='signed')
    parser.add_argument('--config', default='app.json')
    parser.add_argument('--source-commit', required=True)
    args = parser.parse_args()
    if not re.fullmatch(r'[0-9a-f]{40}', args.source_commit):
        parser.error('A full verified source commit is required.')
    provenance = json.loads((Path(args.input) / 'SOURCE-BUILD.json').read_text())
    if provenance.get('source_commit') != args.source_commit:
        raise SystemExit('The build artifact provenance does not match the selected source.')
    config = json.loads(Path(args.config).read_text())['expo']
    if config['android']['package'] != 'in.auratradings.cleanos.team' or not re.fullmatch(r'\d+\.\d+\.\d+', config['version']):
        raise SystemExit('Only the shared CleanOS Android package with a numbered version can be signed.')
    build_tools = Path(os.environ['ANDROID_HOME']) / 'build-tools/37.0.0'
    apksigner, aapt2, zipalign = [build_tools / name for name in ('apksigner', 'aapt2', 'zipalign')]
    output = Path(args.output)
    output.mkdir(exist_ok=False)
    metadata = []
    with tempfile.TemporaryDirectory(prefix='cleanos-signing-') as temporary:
        private = Path(temporary)
        keystore = private / 'release.p12'
        encoded = os.environ.get('CLEANOS_ANDROID_KEYSTORE_BASE64', '').strip()
        password = os.environ.get('CLEANOS_ANDROID_KEYSTORE_PASSWORD', '')
        if not encoded or not password:
            raise SystemExit('Configure both owner signing secrets in GitHub first.')
        try:
            raw = base64.b64decode(encoded, validate=True)
        except ValueError:
            raise SystemExit('The keystore secret is not valid Base64.') from None
        if not 512 <= len(raw) <= 100000:
            raise SystemExit('The keystore secret has an unexpected size.')
        keystore.write_bytes(raw)
        keystore.chmod(0o600)
        certificate_path = private / 'certificate.der'
        command(['keytool', '-exportcert', '-keystore', keystore, '-alias', 'cleanos-release',
                 '-storepass:env', 'CLEANOS_ANDROID_KEYSTORE_PASSWORD', '-file', certificate_path])
        certificate = hashlib.sha256(certificate_path.read_bytes()).hexdigest()
        if certificate == PREVIEW_CERTIFICATE:
            raise SystemExit('The owner key must differ from the public Expo template key.')
        for original_name, signed_name, expected_abi in VARIANTS:
            original = Path(args.input) / original_name
            expected_hash = original.with_suffix('.apk.sha256').read_text().split()
            if len(expected_hash) != 2 or expected_hash[1] != original_name or not re.fullmatch(r'[0-9a-f]{64}', expected_hash[0]):
                raise SystemExit('Candidate checksum file is malformed.')
            if hashlib.sha256(original.read_bytes()).hexdigest() != expected_hash[0]:
                raise SystemExit('Candidate APK checksum does not match.')
            signature = command([apksigner, 'verify', '--verbose', '--print-certs', original])
            if f'certificate SHA-256 digest: {PREVIEW_CERTIFICATE}' not in signature:
                raise SystemExit('The candidate is not signed with the expected preview identity.')
            manifest = command([aapt2, 'dump', 'badging', original])
            package = re.search(r"^package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'", manifest, re.M)
            expected = (config['android']['package'], str(config['android']['versionCode']), config['version'])
            if not package or package.groups() != expected or 'application-debuggable' in manifest:
                raise SystemExit('Candidate package/version or release mode does not match app.json.')
            before = payload(original)
            if not before.get('assets/index.android.bundle'):
                raise SystemExit('Candidate has no embedded JavaScript.')
            abis = {name.split('/')[1] for name in before if name.startswith('lib/') and name.endswith('.so')}
            if abis != {expected_abi}:
                raise SystemExit('Candidate processor architecture is unexpected.')
            signed = output / signed_name
            command([apksigner, 'sign', '--ks', keystore, '--ks-key-alias', 'cleanos-release',
                     '--ks-pass', 'env:CLEANOS_ANDROID_KEYSTORE_PASSWORD', '--out', signed, original])
            verified = command([apksigner, 'verify', '--verbose', '--print-certs', signed])
            if f'certificate SHA-256 digest: {certificate}' not in verified:
                raise SystemExit('Signed APK certificate does not match the owner key.')
            command([zipalign, '-c', '-P', '16', '4', signed])
            if payload(signed) != before:
                raise SystemExit('Signing changed the application payload.')
            digest = hashlib.sha256(signed.read_bytes()).hexdigest()
            (output / f'{signed_name}.sha256').write_text(f'{digest}  {signed_name}\n')
            metadata.append({'file': signed_name, 'abi': expected_abi, 'sha256': digest,
                             'size_bytes': signed.stat().st_size, 'package': expected[0],
                             'version': expected[2], 'version_code': int(expected[1])})
            print(f'Verified {signed_name}: owner signature, unchanged payload and ZIP alignment.')
    (output / 'SIGNING-CERTIFICATE-SHA256.txt').write_text(certificate + '\n')
    (output / 'BUILD-INFO.json').write_text(json.dumps({
        'source_commit': args.source_commit, 'source_build': provenance,
        'certificate_sha256': certificate, 'apks': metadata,
        'acceptance': 'Confirm real accounts, two-phone operations and physical installation before operational rollout.',
    }, indent=2) + '\n')


if __name__ == '__main__':
    main()
