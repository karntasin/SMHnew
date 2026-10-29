#!/usr/bin/env python3
"""ถอดรหัสไฟล์สำรองรูปแบบ Databasus (AES-256-GCM) โดยไม่ต้องมีแอปนี้

ต้องมีไฟล์ข้อมูล, ไฟล์ .metadata คู่กัน, และ secret.key
ติดตั้งครั้งเดียว: pip install pycryptodome

dump ของแอปนี้หลังถอดรหัสแล้วเป็น .sql.gz ให้แตก gzip ก่อนนำเข้า MySQL
"""

import argparse
import base64
import json
import os
import struct
import sys

from Crypto.Cipher import AES
from Crypto.Hash import SHA256
from Crypto.Protocol.KDF import PBKDF2

MAGIC_BYTES = b"PGRSUS01"
HEADER_LENGTH = 64
PBKDF2_ITERATIONS = 100000


def decrypt_backup(backup_file, metadata_file, master_key, output_file=None):
    if not os.path.exists(backup_file):
        print(f"Error: Backup file not found: {backup_file}", file=sys.stderr)
        return 1
    if not os.path.exists(metadata_file):
        print(f"Error: Metadata file not found: {metadata_file}", file=sys.stderr)
        return 1

    with open(metadata_file, "r", encoding="utf-8") as handle:
        metadata = json.load(handle)

    encryption_status = metadata.get("encryption", "").upper()
    if encryption_status != "ENCRYPTED":
        print(
            f"Error: Backup is not encrypted (encryption status: {metadata.get('encryption')})",
            file=sys.stderr,
        )
        return 1

    backup_id = metadata["backupId"]
    salt = base64.b64decode(metadata["encryptionSalt"])
    iv = base64.b64decode(metadata["encryptionIV"])
    key_material = (master_key + backup_id).encode("utf-8")
    derived_key = PBKDF2(
        key_material, salt, dkLen=32, count=PBKDF2_ITERATIONS, hmac_hash_module=SHA256
    )

    backup_dir = os.path.dirname(backup_file) or "."
    backup_name = os.path.basename(backup_file)
    if output_file is None:
        output_file = os.path.join(backup_dir, f"decrypted_{backup_name}")

    try:
        with open(backup_file, "rb") as source, open(output_file, "wb") as target:
            header = source.read(HEADER_LENGTH)
            magic = header[:8]
            if magic != MAGIC_BYTES:
                raise ValueError(f"Invalid magic bytes: expected {MAGIC_BYTES!r}, got {magic!r}")

            chunk_index = 0
            while True:
                length_bytes = source.read(4)
                if not length_bytes:
                    break
                chunk_length = struct.unpack(">I", length_bytes)[0]
                encrypted_chunk = source.read(chunk_length)
                if not encrypted_chunk:
                    break

                chunk_nonce = bytearray(iv)
                chunk_nonce[4:12] = struct.pack(">Q", chunk_index)
                chunk_cipher = AES.new(derived_key, AES.MODE_GCM, nonce=bytes(chunk_nonce))
                try:
                    decrypted_chunk = chunk_cipher.decrypt_and_verify(
                        encrypted_chunk[:-16],
                        encrypted_chunk[-16:],
                    )
                except ValueError as exc:
                    if "MAC check failed" in str(exc):
                        print("Error: Failed to decrypt backup (MAC check failed)", file=sys.stderr)
                        print(f"Failed at chunk {chunk_index}", file=sys.stderr)
                    raise
                target.write(decrypted_chunk)
                chunk_index += 1
    except ValueError:
        if os.path.exists(output_file):
            os.remove(output_file)
        return 1

    print(f"Successfully decrypted {chunk_index} chunks to {output_file}")
    return 0


def main():
    parser = argparse.ArgumentParser(description="Decrypt a Databasus-format AES-256-GCM backup")
    parser.add_argument("backup_file")
    parser.add_argument("metadata_file")
    parser.add_argument("master_key_file", help="path to secret.key")
    parser.add_argument("--output")
    args = parser.parse_args()

    with open(args.master_key_file, "r", encoding="utf-8") as handle:
        master_key = handle.read().rstrip("\r\n")

    sys.exit(decrypt_backup(args.backup_file, args.metadata_file, master_key, args.output))


if __name__ == "__main__":
    main()
