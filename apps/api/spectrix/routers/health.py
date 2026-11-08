from fastapi import APIRouter
from spectrix.core.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
def get_health():
    vault_ok = settings.STORAGE_VAULT_PATH.exists()
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.SPECTRIX_ENV,
        "vault_status": "accessible" if vault_ok else "unavailable",
    }

