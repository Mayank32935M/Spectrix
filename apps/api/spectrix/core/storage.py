import hashlib
import shutil
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile, HTTPException
from spectrix.core.config import settings

class StorageVault:
    def __init__(self, vault_dir: Path = settings.STORAGE_VAULT_PATH, derivatives_dir: Path = settings.DERIVATIVES_PATH):
        self.vault_dir = vault_dir
        self.derivatives_dir = derivatives_dir
        self.vault_dir.mkdir(parents=True, exist_ok=True)
        self.derivatives_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def calculate_sha256(file_path: Path) -> str:
        """Computes cryptographic SHA-256 digest of a file on disk."""
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                sha256.update(chunk)
        return sha256.hexdigest()

    async def save_upload(self, upload_file: UploadFile, evidence_id: str) -> Tuple[Path, str, int]:
        """
        Streams an incoming upload to immutable storage while computing SHA-256.
        Returns (saved_path, sha256_digest, total_bytes).
        """
        # Ensure evidence directory
        target_dir = self.vault_dir / evidence_id
        target_dir.mkdir(parents=True, exist_ok=True)
        
        safe_filename = Path(upload_file.filename or "evidence.bin").name
        target_path = target_dir / safe_filename

        sha256 = hashlib.sha256()
        total_bytes = 0

        with open(target_path, "wb") as buffer:
            while chunk := await upload_file.read(65536):
                total_bytes += len(chunk)
                if total_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
                    target_path.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail="File exceeds maximum allowed upload size")
                sha256.update(chunk)
                buffer.write(chunk)

        computed_digest = sha256.hexdigest()
        return target_path, computed_digest, total_bytes

    def verify_integrity(self, file_path: Path, expected_sha256: str) -> bool:
        """Verifies if the current on-disk content matches the registered reference digest."""
        if not file_path.exists():
            return False
        current_digest = self.calculate_sha256(file_path)
        return current_digest.lower() == expected_sha256.lower()

vault = StorageVault()

