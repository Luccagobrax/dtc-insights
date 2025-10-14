# src/agent/agent.py
from __future__ import annotations

import os
from typing import Any, Dict, List

from agno.agent import Agent
from agno.tools import tool

from src.services import bq_client  # suas consultas BigQuery


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
    """Busca DTCs recentes do veículo (placa/IMEI/chassi 8). Retorna até 50 linhas 'slim'."""
    rows = bq_client.get_dtcs(vehicle_key=vehicle_key, hours=hours) or []
    slim: List[Dict[str, Any]] = []
    for r in rows[:50]:
        slim.append(
            {
                "timestamp": _ts(r.get("ts") or r.get("timestamp") or r.get("time")),
                "dtc": r.get("dtc"),
                "fmi": r.get("fmi"),
                "spn": r.get("spn"),
                "status": r.get("status"),
                "plate": r.get("plate"),
                "customer": r.get("customer_name"),
                "plan_active": r.get("plan_active"),
                "plan_type": r.get("plan_type"),
                "dtc_description": r.get("dtc_description"),
                "fmi_pt": r.get("fmi_pt"),
            }
        )
    return slim


@tool
def fetch_telemetry(vehicle_key: str, minutes: int = 60) -> Dict[str, Any]:
    """Busca telemetria bruta recente (placa/IMEI/chassi 8). Retorna até 200 pontos."""
    data = bq_client.get_telemetry(vehicle_key=vehicle_key, minutes=minutes) or {}
    points = data.get("time_series", []) or []
    slim_points = [
        {
            "time": _ts(p.get("time")),
            "spn": p.get("spn"),
            "fmi": p.get("fmi"),
            "dtc": p.get("dtc"),
            "status": p.get("status"),
        }
        for p in points[:200]
    ]
    return {"time_series": slim_points}


@tool
def fetch_customer_summary(customer_name: str, days: int = 30) -> List[Dict[str, Any]]:
    """
    Resumo por cliente (nome parcial ok). Classifica DTC/FMI como persistente/intermitente/resolvido,
    e inclui status de plano (status_gobrax/plan_type) via chassi last8.
    """
    return bq_client.get_customer_summary(customer_name=customer_name, days=days) or []


# --------------------- model factory -------------------
def _make_model():
    """
    Cria o modelo para o Agno.
    Padrão: Gemini via chave do Google AI Studio (GEMINI_API_KEY/GOOGLE_API_KEY).
    """
    provider = (os.getenv("AGNO_PROVIDER", "gemini") or "gemini").lower()
    model_id = os.getenv("AGNO_MODEL") or os.getenv("GEMINI_MODEL") or "gemini-1.5-flash"

    if provider == "gemini":
        from agno.models.google import Gemini
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("Faltou GEMINI_API_KEY (ou GOOGLE_API_KEY) no .env")
        return Gemini(id=model_id, api_key=api_key)

    raise ValueError(f"AGNO_PROVIDER inválido: {provider}")


# ---------------------- singleton ----------------------
_agent: Agent | None = None

def get_agent() -> Agent:
    global _agent
    if _agent is not None:
        return _agent

    system = """
Você é um analista de veículos DAF especializado em DTC (Diagnostic Trouble Codes).
- Pense que o usuário é um cliente da DAF (suporte técnico nível 2) e precisa decidir a partir da severidade de cada falha.
- Se perguntarem por um cliente específico, responda como analista da montadora.
- Sempre que o usuário fornecer PLACA, CHASSI (últimos 8) ou pedir um resumo por cliente (customer_name), use as ferramentas.
- Explique DTC + FMI, severidade e próximos passos, em PT-BR e de forma objetiva.
- Se não houver dados, sugira ampliar a janela ou confirmar a identificação.
- Classifique cada DTC/FMI como:
  • persistente (atividade em 24h OU ≥3 dias com eventos na última semana)
  • intermitente (houve na semana, mas não em 24h)
  • provavelmente resolvido (sem eventos na semana)
- Explique severidade e próximos passos. Responda em PT-BR, direto ao ponto.
- Se faltar veículo (placa/IMEI/chassi 8) ou nome do cliente, peça educadamente.
""".strip()

    _agent = Agent(
        name="DAF DTC Analyst",
        model=_make_model(),
        instructions=system,
        tools=[fetch_dtcs, fetch_telemetry, fetch_customer_summary],
    )
    return _agent
