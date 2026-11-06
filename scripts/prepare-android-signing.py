#!/usr/bin/env python3
"""Create a private Android signing identity without printing credentials."""

import argparse
import base64
import hashlib
import os
from pathlib import Path
import secrets
import shutil
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', default='.private/android-signing',
                        help='New private directory; existing directories are never replaced.')
    args = parser.parse_args()
    if not shutil.which('keytool'):
        parser.error('Java keytool is required. Run this in Codex Cloud with Java installed.')
    os.umask(0o077)
    directory = Path(args.directory).resolve()
    directory.mkdir(parents=True, mode=0o700, exist_ok=False)
    password = secrets.token_urlsafe(36)
    environment = {**os.environ, 'CLEANOS_KEYSTORE_PASSWORD': password}
    keystore = directory / 'cleanos-release.p12'
    subprocess.run([
        'keytool', '-genkeypair', '-keystore', str(keystore), '-storetype', 'PKCS12',
        '-alias', 'cleanos-release', '-keyalg', 'RSA', '-keysize', '4096',
        '-sigalg', 'SHA256withRSA', '-validity', '36500', '-noprompt',
        '-dname', 'CN=Aura Builds,O=Aura Tradings,C=IN',
        '-storepass:env', 'CLEANOS_KEYSTORE_PASSWORD',
    ], env=environment, check=True, capture_output=True)
    certificate = subprocess.run([
        'keytool', '-exportcert', '-keystore', str(keystore), '-alias', 'cleanos-release',
        '-storepass:env', 'CLEANOS_KEYSTORE_PASSWORD',
    ], env=environment, check=True, capture_output=True).stdout
    (directory / 'CLEANOS_ANDROID_KEYSTORE_BASE64.txt').write_text(base64.b64encode(keystore.read_bytes()).decode() + '\n')
    (directory / 'CLEANOS_ANDROID_KEYSTORE_PASSWORD.txt').write_text(password + '\n')
    (directory / 'certificate-sha256.txt').write_text(hashlib.sha256(certificate).hexdigest() + '\n')
    (directory / 'BACKUP-INSTRUCTIONS.txt').write_text(
        'PRIVATE: preserve cleanos-release.p12 in a protected private backup.\n'
        'Store its password separately in the owner\'s password manager.\n'
        'The BASE64 file contains the same private keystore, encoded for a GitHub secret.\n'
        'Never commit these files, attach them to an issue, or upload them as public artifacts.\n'
        'Keep this identity for future CleanOS team updates. Losing it can prevent updates.\n'
    )
    print(f'Private signing files created in {directory}. No credentials printed.')
    print('Back up the keystore and password privately before configuring GitHub secrets.')


if __name__ == '__main__':
    main()
