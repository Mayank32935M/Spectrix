from spectrix.routers.health import get_health
from spectrix.main import root

def test_health_check():
    res = get_health()
    assert res["status"] == "ok"
    assert res["service"] == "SPECTRIX"
    assert res["vault_status"] == "accessible"

def test_root_endpoint():
    res = root()
    assert "SPECTRIX" in res["message"]
    assert res["version"] == "1.0.0"
