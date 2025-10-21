# backend/src/api/main.py
from datetime import date
import logging
import os
from typing import Any, Dict

from fastapi import FastAPI
from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from src.services import bq_client
from src.services import kb as kb_service
from src.agent.agent import get_agent

load_dotenv()

logger = logging.getLogger(__name__)

app = FastAPI(title="dtc-insights API")

origins_env = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173")
origins = [origin.strip() for origin in origins_env.split(",") if origin.strip()]
cors_kwargs: Dict[str, Any] = {
    "allow_origins": [origin for origin in origins if origin != "*"],
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}

if not cors_kwargs["allow_origins"] or "*" in origins:
    cors_kwargs["allow_origins"] = []
    cors_kwargs["allow_origin_regex"] = ".*"

app.add_middleware(CORSMiddleware, **cors_kwargs)

@app.get("/health")
def health():
    return {"status": "ok"}

# use a mesma palavra em todo lugar: vehicle_key (placa/imei/chassi-8)
@app.get("/vehicles/{vehicle_key}/dtc")
def get_dtcs(vehicle_key: str, hours: int = 24):
    return bq_client.get_dtcs(vehicle_key, hours)

@app.get("/vehicles/{vehicle_key}/telemetry")
def get_telemetry(vehicle_key: str, minutes: int = 30):
    return bq_client.get_telemetry(vehicle_key, minutes)

@app.get("/kb/lookup")
def kb_lookup(spn: int, fmi: int):
    return kb_service.lookup(spn, fmi)


@app.get("/overview/dtc-events")
def overview_events(
    chassi: str | None = None,
    customer: str | None = None,
    dtc: str | None = None,
    event_date: date | None = None,
    days: int = 30,
    limit: int = 500,
):
    items = bq_client.get_overview_events(
        chassi_last8=chassi,
        customer=customer,
        dtc=dtc,
        event_date=event_date,
        days=days,
        limit=limit,
    )
    return {"items": items}

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


class ChatRequest(BaseModel):
    message: str
    vehicle_key: str | None = None
    customer_name: str | None = None
    hours: int = 24
    minutes: int = 60
    days: int = 30
    
class AssistantAskRequest(BaseModel):
    prompt: str
    plate: str | None = None


def _stringify_agent_output(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (list, tuple)):
        parts = [_stringify_agent_output(item) for item in value]
        return "\n".join(part for part in parts if part).strip()
    if isinstance(value, dict):
        for key in ("answer", "content", "output", "message", "text"):
            if key in value:
                text = _stringify_agent_output(value[key])
                if text:
                    return text
    if hasattr(value, "content"):
        return _stringify_agent_output(getattr(value, "content"))
    return str(value).strip()


def _run_agent(prompt: str) -> str | None:
    try:
        agent = get_agent()
    except Exception:  # pragma: no cover - log unexpected boot errors
        logger.exception("Erro ao inicializar o agente de IA")
        return None

    try:
        result = agent.run(prompt)
    except Exception:  # pragma: no cover - log execution errors
        logger.exception("Erro ao consultar o agente de IA")
        return None

    answer = _stringify_agent_output(result)
    return answer or None


@app.post("/assistant/ask")
def assistant_ask(req: AssistantAskRequest):
    prompt = (req.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Informe uma pergunta para o assistente.")

    context_prompt = prompt
    if req.plate:
        context_prompt += f"\n\nContexto adicional: placa/chassi {req.plate}"

    answer = _run_agent(context_prompt)

    if not answer:
        extras = f" Contexto informado: {req.plate}." if req.plate else ""
        answer = (
            f"Recebi sua mensagem: \"{prompt}\".{extras} "
            "Estou pronto para ajudar assim que o assistente inteligente estiver disponível."
        )

    return {"answer": answer}

@app.post("/chat")
def chat(req: ChatRequest):
    prompt = (req.message or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Informe uma mensagem.")

    tips: list[str] = []
    if req.vehicle_key:
        tips.append(f"- fetch_dtcs(vehicle_key='{req.vehicle_key}', hours={req.hours})")
        tips.append(f"- fetch_telemetry(vehicle_key='{req.vehicle_key}', minutes={req.minutes})")
    if req.customer_name:
        tips.append(f"- fetch_customer_summary(customer_name='{req.customer_name}', days={req.days})")

    context_prompt = prompt
    if tips:
        joined = "\n".join(tips)
        context_prompt += f"\n\nSugestões de ferramentas:\n{joined}"

    answer = _run_agent(context_prompt)
    if not answer:
        answer = "Não foi possível gerar uma resposta no momento. Tente novamente em instantes."

    return {"answer": answer, "tips": tips}