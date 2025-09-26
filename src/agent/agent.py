from agno import Agent, tool
import httpx, os

API_BASE = os.getenv("API_BASE", "http://127.0.0.1:8000")

@tool
def get_recent_dtcs(vehicle_id: str, hours: int = 24):
    with httpx.Client(timeout=10) as c:
        r = c.get(f"{API_BASE}/vehicles/{vehicle_id}/dtc", params={"hours": hours})
        r.raise_for_status()
        return r.json()

@tool
def get_telemetry(vehicle_id: str, minutes: int = 30):
    with httpx.Client(timeout=10) as c:
        r = c.get(f"{API_BASE}/vehicles/{vehicle_id}/telemetry", params={"minutes": minutes})
        r.raise_for_status()
        return r.json()

@tool
def kb_lookup(spn: int, fmi: int):
    with httpx.Client(timeout=10) as c:
        r = c.get(f"{API_BASE}/kb/lookup", params={"spn": spn, "fmi": fmi})
        r.raise_for_status()
        return r.json()

assistant = Agent(
    name="daf_incident_assistant",
    instructions=(
        """
        Você atende incidentes DAF. Dado um veículo/placa/VIN, 1) consulte DTCs e telemetria,
        2) explique a falha em PT-BR (cite SPN/FMI), 3) diga se pode operar,
        4) liste próximos passos objetivos (SOP). Seja conciso e objetivo.
        """
    ),
    tools=[get_recent_dtcs, get_telemetry, kb_lookup],
    memory=True,
)

if __name__ == "__main__":
    print(assistant.run("Avaliar criticidade para veículo 1234-ABC (últimas 24h)"))
