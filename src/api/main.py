from fastapi import FastAPI
from src.services import bq_client
from src.services import kb as kb_service
from pydantic import BaseModel
from fastapi.responses import RedirectResponse
from src.agent.agent import get_agent
from fastapi import HTTPException
from dotenv import load_dotenv
load_dotenv()  # carrega o .env no subprocesso do uvicorn

app = FastAPI(title="dtc-insights API")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/vehicles/{vehicle_id}/dtc")
def get_dtcs(vehicle_id: str, hours: int = 24):
    return bq_client.get_dtcs(vehicle_id, hours)

@app.get("/vehicles/{vehicle_id}/telemetry")
def get_telemetry(vehicle_id: str, minutes: int = 30):
    return bq_client.get_telemetry(vehicle_id, minutes)

@app.get("/kb/lookup")
def kb_lookup(spn: int, fmi: int):
    return kb_service.lookup(spn, fmi)

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

class ChatRequest(BaseModel):
    message: str
    vehicle_key: str | None = None   # placa ou IMEI (opcional)
    hours: int = 24                  # janela para DTCs
    minutes: int = 60                # janela para telemetria

@app.post("/chat")
def chat(req: ChatRequest):
    try:
        agent = get_agent()
        prompt = req.message
        if req.vehicle_key:
            prompt += (
                f"\n\nSe útil, use as ferramentas:\n"
                f"- fetch_dtcs(vehicle_key='{req.vehicle_key}', hours={req.hours})\n"
                f"- fetch_telemetry(vehicle_key='{req.vehicle_key}', minutes={req.minutes})"
            )
        result = agent.run(prompt)
        text = getattr(result, "content", None) or getattr(result, "text", None) or str(result)
        return {"reply": text}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"chat failed: {e}")

