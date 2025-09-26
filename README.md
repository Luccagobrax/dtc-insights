# dtc-insights


IA de atendimento a incidentes DAF usando DTCs + telemetria. MVP com FastAPI (tools), Agno (agente) e Streamlit (chat).


## Setup
1. Python 3.11+
2. `python -m venv .venv && .\.venv\Scripts\activate`
3. `pip install -r requirements.txt`
4. Copie `.env.example` para `.env` e preencha.


## Rodar
- API (tools): `uvicorn src.api.main:app --reload`
- Agente (console): `python src/agent/agent.py`
- UI (chat): `streamlit run src/ui/app.py`