"""Verify signed, architecture-specific CleanOS preview APKs before publication."""

import json
import os
import re
import struct
import zipfile
from pathlib import Path

def arm64_load_alignments(data, library):
    if len(data) < 64 or data[:4] != b'\x7fELF' or data[4] != 2 or data[5] not in (1, 2):
        raise SystemExit(f'{library}: Expected a valid ELF64 shared library.')
    endian = '<' if data[5] == 1 else '>'
    if struct.unpack_from(endian + 'H', data, 18)[0] != 183:
        raise SystemExit(f'{library}: Expected an AArch64 ELF machine type.')
    phoff = struct.unpack_from(endian + 'Q', data, 32)[0]
    phentsize = struct.unpack_from(endian + 'H', data, 54)[0]
    phnum = struct.unpack_from(endian + 'H', data, 56)[0]
    if phentsize < 56 or not phnum or phoff + phentsize * phnum > len(data):
        raise SystemExit(f'{library}: Invalid ELF program header table.')
    alignments = []
    for index in range(phnum):
        header = struct.unpack_from(endian + 'IIQQQQQQ', data, phoff + index * phentsize)
        if header[0] != 1:  # PT_LOAD
            continue
        offset, virtual_address, alignment = header[2], header[3], header[7]
        if alignment < 16384 or alignment & (alignment - 1):
            raise SystemExit(f'{library}: PT_LOAD alignment {alignment} is below the 16 KiB requirement.')
        if offset % 16384 != virtual_address % 16384:
            raise SystemExit(f'{library}: PT_LOAD offsets are not congruent for 16 KiB pages.')
        alignments.append(alignment)
    if not alignments:
        raise SystemExit(f'{library}: No ELF PT_LOAD segments found.')
    return alignments

config = json.loads(Path('app.json').read_text())['expo']
certificate = 'fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c'
previews = [
    ('CleanOS-preview.apk', 'arm64-v8a', 'Recommended for modern Android phones and tablets'),
    ('CleanOS-preview-armv7.apk', 'armeabi-v7a', 'Older-device compatibility download'),
]
metadata = []
for filename, expected_abi, label in previews:
    prefix = filename.removesuffix('.apk')
    path = Path('artifacts') / filename
    manifest = Path(f'artifacts/{prefix}-manifest.txt').read_text()
    package = re.search(r"^package: name='([^']+)'", manifest, re.MULTILINE)
    if not package or package.group(1) != 'in.auratradings.cleanos':
        raise SystemExit(f'{filename}: APK package does not match CleanOS.')
    version = re.search(r"^package: .*versionCode='([^']+)' .*versionName='([^']+)'", manifest, re.MULTILINE)
    expected_version = (str(config['android']['versionCode']), config['version'])
    if not version or version.groups() != expected_version:
        raise SystemExit(f'{filename}: APK version does not match the configured update version.')
    signature = Path(f'artifacts/{prefix}-signature.txt').read_text().lower()
    if f'certificate sha-256 digest: {certificate}' not in signature:
        raise SystemExit(f'{filename}: Preview certificate changed; existing installations cannot update.')
    with zipfile.ZipFile(path) as apk:
        if not apk.read('assets/index.android.bundle'):
            raise SystemExit(f'{filename}: The APK has no embedded JavaScript bundle.')
        native_files = sorted(name for name in apk.namelist()
                              if name.startswith('lib/') and name.endswith('.so') and name.count('/') >= 2)
        abis = {name.split('/')[1] for name in native_files}
        if abis != {expected_abi}:
            raise SystemExit(f'{filename}: Expected only {expected_abi}, found {sorted(abis)}.')
        elf_report = []
        if expected_abi == 'arm64-v8a':
            for library in native_files:
                alignments = arm64_load_alignments(apk.read(library), f'{filename}/{library}')
                elf_report.append(f"{library}: PT_LOAD p_align={', '.join(map(str, alignments))}")
    elf_status = ('ARM64 ELF PT_LOAD segments: at least 16384-byte alignment, verified'
                  if expected_abi == 'arm64-v8a'
                  else 'ELF 16 KiB load alignment: not required for the 32-bit compatibility download')
    Path(f'artifacts/{prefix}-ELF-ALIGNMENT.txt').write_text(
        elf_status + '\n' + '\n'.join(elf_report) + '\n'
    )
    size_bytes = path.stat().st_size
    Path(f'artifacts/{prefix}-BUILD-INFO.txt').write_text(
        'CleanOS standalone Android preview\n'
        f'Download: {filename}\n'
        f'Purpose: {label}\n'
        f"Source commit: {os.environ['GITHUB_SHA']}\n"
        f"App version: {config['version']} (Android code {config['android']['versionCode']})\n"
        f'Included architecture: {expected_abi} only\n'
        f'APK size: {size_bytes} bytes ({size_bytes / 1048576:.1f} MiB)\n'
        'JavaScript bundle: embedded\n'
        f'Signing certificate SHA-256: {certificate}\n'
        'Signature: Expo template generic debug key, verified with apksigner\n'
        'APK alignment: zipalign -c -P 16 -v 4 passed\n'
        f'{elf_status}\n'
        'Physical Android device testing: not performed by this workflow\n'
    )
    metadata.append({
        'file': filename,
        'label': label,
        'abi': expected_abi,
        'size_bytes': size_bytes,
        'version': config['version'],
        'version_code': config['android']['versionCode'],
        'package': package.group(1),
        'certificate_sha256': certificate,
        'arm64_elf_16k_verified': True if expected_abi == 'arm64-v8a' else None,
    })
    print(f'Verified {filename}: {size_bytes} bytes, {expected_abi} only, embedded JavaScript and unchanged certificate.')
Path('artifacts/APK-METADATA.json').write_text(json.dumps(metadata, indent=2) + '\n')
