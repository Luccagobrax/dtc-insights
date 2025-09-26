from fastapi import FastAPI
from src.services import bq_client
from src.services import kb as kb_service

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
