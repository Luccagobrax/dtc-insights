import json
from pathlib import Path

_seed = None

def _load_seed():
    global _seed
    if _seed is None:
        path = Path(__file__).resolve().parents[2] / "kb" / "seed_severity.json"
        _seed = json.loads(path.read_text(encoding="utf-8"))
    return _seed


def lookup(spn: int, fmi: int):
    data = _load_seed()
    for item in data:
        if item.get("spn") == spn and item.get("fmi") == fmi:
            return item
    return {"title": "Desconhecido", "severity": "Baixa", "sop": [], "can_run": True}