from google.cloud import bigquery
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional
from src import config

_client = bigquery.Client(project=config.GCP_PROJECT_ID)

# --- Helpers ---------------------------------------------------------------

def _fq(table: str) -> str:
    """Fully-qualified table name."""
    return f"`{config.GCP_PROJECT_ID}.{config.BQ_DATASET}.{table}`"

# Ajuste os nomes das tabelas aqui (ou via .env)
TBL_DTC = "equipe-dados.datawarehouse_gobrax.dw_v3_telemetry_dtc"
TBL_DTC_CODES = "equipe-dados.datawarehouse_gobrax.dw_dtc_codes"
TBL_FMI_CODES = "equipe-dados.datawarehouse_gobrax.dw_fmi_codes"
TBL_VEHICLES = "equipe-dados.datawarehouse_gobrax.dw_core_mgmt_vehicles"
TBL_CUSTOMERS = "equipe-dados.datawarehouse_gobrax.dw_core_mgmt_customers"

# --- Resolve vehicle (por placa OU IMEI) ----------------------------------

def resolve_vehicle(vehicle_key: str) -> Optional[Dict]:
    """
    Tenta resolver um veículo a partir de uma placa (case-insensitive) OU IMEI.
    Ajuste os campos `plate`/`imei` conforme o seu schema em dw_core_mgmt_vehicles.
    Retorna: {vehicle_id, plate, imei, customer_id, customer_name}
    """
    sql = f"""
    WITH base AS (
      SELECT
        v.id            AS vehicle_id,
        UPPER(v.plate)  AS plate,
        CAST(v.imei AS STRING) AS imei,
        v.customer_id   AS customer_id
      FROM `{TBL_VEHICLES}` v
    ), cust AS (
      SELECT c.id AS customer_id, c.name AS customer_name
      FROM `{TBL_CUSTOMERS}` c
    )
    SELECT b.vehicle_id, b.plate, b.imei, b.customer_id, c.customer_name
    FROM base b
    LEFT JOIN cust c USING (customer_id)
    WHERE b.plate = UPPER(@key)
       OR b.imei = @key
    LIMIT 1
    """
    job = _client.query(
        sql,
        job_config=bigquery.QueryJobConfig(
            query_parameters=[bigquery.ScalarQueryParameter("key", "STRING", vehicle_key)]
        ),
    )
    rows = [dict(r) for r in job.result()]
    return rows[0] if rows else None

# --- DTCs recentes (com enriquecimento) -----------------------------------

def get_dtcs(vehicle_key: str, hours: int = 24) -> List[Dict]:
    v = resolve_vehicle(vehicle_key)
    key = vehicle_key if v is None else v.get("imei") or v.get("plate")

    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    sql = f"""
    -- Fonte principal de DTC/telemetria (dw_v3_telemetry_dtc)
    WITH src AS (
      SELECT
        t.event_datetime_utc AS timestamp,
        SAFE_CAST(t.spn AS INT64) AS spn,
        t.fmi AS fmi,
        t.DTC AS dtc,
        t.status,
        t.lat, t.lon,
        t.imeis
      FROM `{TBL_DTC}` t
      WHERE t.event_datetime_utc >= @since
        AND (
              UPPER(t.imeis) LIKE UPPER(@like_key)  -- quando imeis é STRING contendo um imei
           OR UPPER(t.DTC)   LIKE UPPER(@like_key)  -- fallback muito permissivo; manter só imei se preferir
        )
    ),
    enrich AS (
      SELECT s.*, dc.Description AS dtc_description,
             fc.SAE_J1939 AS fmi_sae, fc.transcription AS fmi_pt
      FROM src s
      LEFT JOIN `{TBL_DTC_CODES}` dc ON dc.DTC = s.dtc
      LEFT JOIN `{TBL_FMI_CODES}` fc ON fc.FMI = s.fmi
    )
    SELECT *
    FROM enrich
    ORDER BY timestamp DESC
    LIMIT 500
    """

    like_key = f"%{key}%"

    job = _client.query(
        sql,
        job_config=bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("since", "TIMESTAMP", since),
                bigquery.ScalarQueryParameter("like_key", "STRING", like_key),
            ]
        ),
    )
    rows = [dict(r) for r in job.result()]

    # Anexa metadados do veículo (se encontrado)
    if v:
        for r in rows:
            r["vehicle_id"] = v["vehicle_id"]
            r["plate"] = v["plate"]
            r["customer_id"] = v["customer_id"]
            r["customer_name"] = v.get("customer_name")
    return rows

# --- Telemetria curta (a partir da mesma origem) --------------------------

def get_telemetry(vehicle_key: str, minutes: int = 30) -> Dict:
    v = resolve_vehicle(vehicle_key)
    key = vehicle_key if v is None else v.get("imei") or v.get("plate")

    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)

    sql = f"""
    SELECT
      t.event_datetime_utc AS time,
      SAFE_CAST(t.spn AS INT64) AS spn,
      t.fmi,
      t.DTC AS dtc,
      t.status,
      t.lat, t.lon,
      t.imeis
    FROM `{TBL_DTC}` t
    WHERE t.event_datetime_utc >= @since
      AND UPPER(t.imeis) LIKE UPPER(@like_key)
    ORDER BY time DESC
    LIMIT 1000
    """

    like_key = f"%{key}%"

    job = _client.query(
        sql,
        job_config=bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("since", "TIMESTAMP", since),
                bigquery.ScalarQueryParameter("like_key", "STRING", like_key),
            ]
        ),
    )
    rows = [dict(r) for r in job.result()]
    return {"time_series": rows}
