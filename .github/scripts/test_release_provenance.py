import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('resolver', Path(__file__).with_name('resolve-shared-candidate.py'))
resolver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(resolver)

SOURCE = '11f6b0fe3addb5601bb87fb72b6da62dd4cbf194'
TAG = 'shared-preview-6-1-11f6b0f'


class ProvenanceTests(unittest.TestCase):
    def setUp(self):
        self.run = {'id': 123, 'run_number': 6, 'run_attempt': 1, 'path': resolver.WORKFLOW,
                    'head_sha': SOURCE, 'event': 'push', 'head_repository': {'full_name': resolver.REPOSITORY},
                    'status': 'completed', 'conclusion': 'success'}
        self.artifact = {'id': 456, 'name': 'cleanos-android-preview-6-1', 'expired': False,
                         'workflow_run': {'id': 123, 'head_sha': SOURCE}, 'digest': 'sha256:' + 'a' * 64}

    def test_push_and_manual_builds_use_the_exact_run(self):
        for event in ('push', 'workflow_dispatch'):
            with self.subTest(event=event):
                self.run['event'] = event
                self.assertEqual(resolver.choose_run([self.run], TAG, SOURCE)['id'], 123)
                resolver.verify_attempt(self.run, self.run, TAG, SOURCE)

    def test_another_successful_run_at_the_same_commit_is_insufficient(self):
        self.run['run_number'] = 5
        with self.assertRaises(ValueError):
            resolver.choose_run([self.run], TAG, SOURCE)

    def test_wrong_commit_or_fork_or_event_is_rejected(self):
        for change in ({'head_sha': 'a' * 40}, {'event': 'pull_request'},
                       {'head_repository': {'full_name': 'someone/fork'}}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                resolver.choose_run([{**self.run, **change}], TAG, SOURCE)
        with self.assertRaises(ValueError):
            resolver.choose_run([self.run], TAG, 'a' * 40)

    def test_failed_pending_or_different_attempt_is_rejected(self):
        for change in ({'conclusion': 'failure'}, {'status': 'in_progress'}, {'run_attempt': 2}, {'id': 999}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                resolver.verify_attempt({**self.run, **change}, self.run, TAG, SOURCE)

    def test_exact_original_artifact_is_required(self):
        self.assertEqual(resolver.choose_artifact([self.artifact], self.run, TAG, SOURCE)['id'], 456)
        for change in ({'expired': True}, {'name': 'cleanos-android-preview-6-2'}, {'digest': None},
                       {'workflow_run': {'id': 999, 'head_sha': SOURCE}}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                resolver.choose_artifact([{**self.artifact, **change}], self.run, TAG, SOURCE)
        with self.assertRaises(ValueError):
            resolver.choose_artifact([self.artifact, copy.deepcopy(self.artifact)], self.run, TAG, SOURCE)

    def test_tag_is_bounded_and_has_no_command_or_path_syntax(self):
        for tag in ('shared-preview-0-1-11f6b0f', 'shared-preview-6-1-11f6b0f/other', '$(echo bad)', TAG + '\n'):
            with self.subTest(tag=tag), self.assertRaises(ValueError):
                resolver.tag_parts(tag)


if __name__ == '__main__':
    unittest.main()
