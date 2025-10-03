# src/agent/agent.py
from __future__ import annotations

import os
from typing import Any, Dict, List

from agno.agent import Agent
from agno.tools import tool

from src.services import bq_client  # usa suas funções que consultam o BigQuery


# ----------------------- helpers -----------------------
def _ts(v) -> str:
    """Formata timestamp de forma curtinha para não inflar o payload do LLM."""
    try:
        return str(v).replace("T", " ")[:19]
    except Exception:
        return str(v)


# ----------------------- tools -------------------------
@tool
def fetch_dtcs(vehicle_key: str, hours: int = 24) -> List[Dict[str, Any]]:
    """
    Busca DTCs recentes para uma placa/IMEI.
    Retorna uma versão 'slim' (no máx. 50 linhas) para não travar o LLM.
    """
    print(f"[tool] fetch_dtcs vehicle_key={vehicle_key} hours={hours}", flush=True)
    rows = bq_client.get_dtcs(vehicle_key=vehicle_key, hours=hours) or []
    print(f"[tool] fetch_dtcs -> {len(rows)} linhas (antes de limitar)", flush=True)

    slim: List[Dict[str, Any]] = []
    for r in rows[:50]:
        slim.append(
            {
                "timestamp": _ts(r.get("timestamp") or r.get("time")),
                "dtc": r.get("dtc"),
                "fmi": r.get("fmi"),
                "spn": r.get("spn"),
                "status": r.get("status"),
                "plate": r.get("plate"),
                "customer": r.get("customer_name"),
                "dtc_description": r.get("dtc_description"),
                "fmi_pt": r.get("fmi_pt"),
                # Se quiser mandar lat/lon, descomente:
                # "lat": r.get("lat"),
                # "lon": r.get("lon"),
            }
        )
    return slim


@tool
def fetch_telemetry(vehicle_key: str, minutes: int = 60) -> Dict[str, Any]:
    """
    Busca telemetria bruta recente para uma placa/IMEI.
    Retorna no máx. 200 pontos para não inflar o LLM.
    """
    print(f"[tool] fetch_telemetry vehicle_key={vehicle_key} minutes={minutes}", flush=True)
    data = bq_client.get_telemetry(vehicle_key=vehicle_key, minutes=minutes) or {}
    points = data.get("time_series", []) or []
    print(f"[tool] fetch_telemetry -> {len(points)} pontos (antes de limitar)", flush=True)

    slim_points = [
        {
            "time": _ts(p.get("time")),
            "spn": p.get("spn"),
            "fmi": p.get("fmi"),
            "dtc": p.get("dtc"),
            "status": p.get("status"),
            # Se quiser mandar lat/lon, descomente:
            # "lat": p.get("lat"),
            # "lon": p.get("lon"),
        }
        for p in points[:200]
    ]
    return {"time_series": slim_points}


# --------------------- model factory -------------------
def _make_model():
    """
    Cria o modelo para o Agno.
    Padrão: Gemini via chave do Google AI Studio (GEMINI_API_KEY/GOOGLE_API_KEY).
    Alternativa: Vertex (se quiser ativar depois).
    """
    provider = (os.getenv("AGNO_PROVIDER", "gemini") or "gemini").lower()
    model_id = (
        os.getenv("AGNO_MODEL")
        or os.getenv("GEMINI_MODEL")
        or "gemini-1.5-flash"
    )

    if provider == "gemini":
        # Google AI Studio (não é o Vertex)
        from agno.models.google import Gemini

        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("Faltou GEMINI_API_KEY (ou GOOGLE_API_KEY) no .env")
        return Gemini(id=model_id, api_key=api_key)

    elif provider == "vertex":
        # Caso decida usar Vertex AI
        from agno.models.vertexai import VertexAI

        project = os.getenv("GCP_PROJECT_ID")
        location = os.getenv("VERTEX_LOCATION", "us-central1")
        return VertexAI(id=model_id, project=project, location=location)

    else:
        raise ValueError(f"AGNO_PROVIDER inválido: {provider}")


# ---------------------- singleton ----------------------
_agent: Agent | None = None


def get_agent() -> Agent:
    """
    Retorna um Agent singleton (com tools registradas).
    """
    global _agent
    if _agent is not None:
        return _agent

    system = """
Você é um analista de veículos DAF especializado em DTC (Diagnostic Trouble Codes) e telemetria.
- Sempre que o usuário fornecer placa/IMEI, utilize as ferramentas disponíveis para buscar dados.
- Explique DTC + FMI, severidade e próximos passos, em PT-BR e de forma objetiva.
- Se não houver dados, sugira ampliar a janela de tempo ou confirmar a identificação.
"""

    _agent = Agent(
        name="DAF DTC Analyst",
        model=_make_model(),
        instructions=system.strip(),
        tools=[fetch_dtcs, fetch_telemetry],
    )
    return _agent
