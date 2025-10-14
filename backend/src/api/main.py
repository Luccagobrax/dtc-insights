# backend/src/api/main.py
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from src.services import bq_client
from src.services import kb as kb_service
from src.agent.agent import get_agent

load_dotenv()

app = FastAPI(title="dtc-insights API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # front (vite)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/chat")
def chat(req: ChatRequest):
    agent = get_agent()

    prompt = req.message
    tips: list[str] = []
    if req.vehicle_key:
        tips.append(f"- fetch_dtcs(vehicle_key='{req.vehicle_key}', hours={req.hours})")
        tips.append(f"- fetch_telemetry(vehicle_key='{req.vehicle_key}', minutes={req.minutes})")
    if req.customer_name:
        tips.append(f"- fetch_customer_summary(customer_name='{req.customer_name}', days={req.days})")

    if tips:
        prompt += "\n\nSe útil, use as ferramentas:\n" + "\n".join(tips)

    try:
        result = agent.run(prompt)
        text = getattr(result, "content", None) or getattr(result, "text", None) or str(result)
        return {"reply": text}
    except Exception as e:
        return {"reply": f"Houve um erro ao buscar as informações. Por favor, tente novamente. Detalhe: {e}"}
