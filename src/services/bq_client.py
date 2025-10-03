# src/services/bq_client.py
from google.cloud import bigquery
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional
from src import config

# Cliente BigQuery
_client = bigquery.Client(project=config.GCP_PROJECT_ID)

# --------------------------------------------------------------------------
# Tabelas (ajuste aqui se o nome/namespace mudar)
# --------------------------------------------------------------------------
TBL_TELEMETRY = "equipe-dados.datawarehouse_gobrax.dw_v3_telemetry_dtc"
TBL_DTC_CODES = "equipe-dados.datawarehouse_gobrax.dw_dtc_codes"
TBL_FMI_CODES = "equipe-dados.datawarehouse_gobrax.dw_fmi_codes"
TBL_VEHICLES  = "equipe-dados.datawarehouse_gobrax.dw_core_mgmt_vehicles"
TBL_DEVICES   = "equipe-dados.datawarehouse_gobrax.dw_core_mgmt_devices"
TBL_INSTALLS  = "equipe-dados.datawarehouse_gobrax.dw_core_mgmt_installed_vehicles"


# --------------------------------------------------------------------------
# Resolve vehicle: aceita PLACA (case-insensitive) OU IMEI
# - Para IMEI: pega a instalação mais recente do device e retorna o veículo
# Retorna: {vehicle_id, plate, imei (quando vier por IMEI), customer_id, customer_name}
# --------------------------------------------------------------------------
def resolve_vehicle(vehicle_key: str) -> Optional[Dict]:
    sql = f"""
    WITH veh AS (
      SELECT
        v.vehicle_id,
        UPPER(v.plate) AS plate,
        v.customer_id,
        v.customer_name
      FROM `{TBL_VEHICLES}` v
    ),
    dev AS (
      SELECT
        d.device_id,
        UPPER(CAST(d.identification AS STRING)) AS imei
      FROM `{TBL_DEVICES}` d
    ),
    last_inst AS (
      -- instalação "vigente" ≈ a mais recente por device (não temos end_date)
      SELECT device_id, vehicle_id
      FROM (
        SELECT
          i.*,
          ROW_NUMBER() OVER (PARTITION BY i.device_id ORDER BY CAST(i.start_date AS TIMESTAMP) DESC) rn
        FROM `{TBL_INSTALLS}` i
      )
      WHERE rn = 1
    ),
    imei_to_vehicle AS (
      SELECT d.imei, li.vehicle_id
      FROM dev d
      JOIN last_inst li USING (device_id)
    ),
    result AS (
      -- caminho 1: via PLACA
      SELECT v.vehicle_id, v.plate, NULL AS imei, v.customer_id, v.customer_name
      FROM veh v
      WHERE v.plate = UPPER(@key)

      UNION ALL

      -- caminho 2: via IMEI
      SELECT v.vehicle_id, v.plate, itv.imei AS imei, v.customer_id, v.customer_name
      FROM imei_to_vehicle itv
      JOIN veh v ON v.vehicle_id = itv.vehicle_id
      WHERE itv.imei = UPPER(@key)
    )
    SELECT * FROM result
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


# --------------------------------------------------------------------------
# DTCs recentes (enriquecidos) para uma PLACA ou IMEI
# Usa o fluxo: Telemetry -> Devices -> Installed -> Vehicles
# Aceita IMEIs múltiplos no campo 'imeis' (separados por ; , espaço)
# --------------------------------------------------------------------------
def get_dtcs(vehicle_key: str, hours: int = 24) -> List[Dict]:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    sql = f"""
    WITH dtc_raw AS (
      SELECT
        t.event_datetime_utc                       AS ts,
        UPPER(CAST(t.DTC AS STRING))               AS dtc,
        SAFE_CAST(t.spn AS INT64)                  AS spn,
        t.fmi,
        t.status, t.lat, t.lon,
        UPPER(CAST(t.imeis AS STRING))             AS imeis
      FROM `{TBL_TELEMETRY}` t
      WHERE t.event_datetime_utc >= @since
    ),
    -- normaliza IMEI (lista -> linhas)
    dtc_norm AS (
      SELECT
        r.ts, r.dtc, r.spn, r.fmi, r.status, r.lat, r.lon,
        TRIM(imei) AS imei_norm
      FROM dtc_raw r,
      UNNEST(SPLIT(REGEXP_REPLACE(r.imeis, r'[;,\s]+', ','), ',')) AS imei
    ),
    dev AS (
      SELECT d.device_id, UPPER(CAST(d.identification AS STRING)) AS imei
      FROM `{TBL_DEVICES}` d
    ),
    inst AS (
      SELECT i.device_id, i.vehicle_id, CAST(i.start_date AS TIMESTAMP) AS start_ts
      FROM `{TBL_INSTALLS}` i
    ),
    veh AS (
      SELECT v.vehicle_id, UPPER(v.plate) AS plate, v.customer_id, v.customer_name
      FROM `{TBL_VEHICLES}` v
    ),
    -- telemetry -> device
    t_dev AS (
      SELECT n.*, d.device_id
      FROM dtc_norm n
      JOIN dev d ON UPPER(n.imei_norm) = d.imei
    ),
    -- aplica instalação vigente (sem end_date, vale a partir de start_ts)
    t_dev_inst AS (
      SELECT td.*, iv.vehicle_id
      FROM t_dev td
      JOIN inst iv
        ON iv.device_id = td.device_id
       AND td.ts >= iv.start_ts
    ),
    -- junta veículo e aplica filtro por placa/imei (se fornecido)
    t_full AS (
      SELECT
        tdi.ts, tdi.dtc, tdi.spn, tdi.fmi, tdi.status, tdi.lat, tdi.lon,
        tdi.imei_norm,
        v.vehicle_id, v.plate, v.customer_id, v.customer_name
      FROM t_dev_inst tdi
      JOIN veh v ON v.vehicle_id = tdi.vehicle_id
      WHERE (@key IS NULL)
         OR (v.plate = UPPER(@key))
         OR (tdi.imei_norm = UPPER(@key))
    ),
    known AS (
      SELECT
        f.*,
        dc.Description   AS dtc_description,
        fc.SAE_J1939     AS fmi_sae,
        fc.transcription AS fmi_pt
      FROM t_full f
      JOIN `{TBL_DTC_CODES}` dc ON UPPER(dc.DTC) = f.dtc
      LEFT JOIN `{TBL_FMI_CODES}` fc ON fc.FMI = f.fmi
    )
    SELECT *
    FROM known
    ORDER BY ts DESC
    LIMIT 500
    """

    params = [
        bigquery.ScalarQueryParameter("since", "TIMESTAMP", since),
        bigquery.ScalarQueryParameter("key", "STRING", vehicle_key),
    ]
    job = _client.query(sql, job_config=bigquery.QueryJobConfig(query_parameters=params))
    return [dict(r) for r in job.result()]


# --------------------------------------------------------------------------
# Telemetria curta (últimos N minutos) para PLACA ou IMEI
# Retorna série temporal simples já vinculada ao veículo
# --------------------------------------------------------------------------
def get_telemetry(vehicle_key: str, minutes: int = 30) -> Dict:
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)

    sql = f"""
    WITH dtc_raw AS (
      SELECT
        t.event_datetime_utc                       AS ts,
        SAFE_CAST(t.spn AS INT64)                  AS spn,
        t.fmi, t.DTC AS dtc,
        t.status, t.lat, t.lon,
        UPPER(CAST(t.imeis AS STRING))             AS imeis
      FROM `{TBL_TELEMETRY}` t
      WHERE t.event_datetime_utc >= @since
    ),
    dtc_norm AS (
      SELECT r.ts, r.dtc, r.spn, r.fmi, r.status, r.lat, r.lon, TRIM(imei) AS imei_norm
      FROM dtc_raw r,
      UNNEST(SPLIT(REGEXP_REPLACE(r.imeis, r'[;,\s]+', ','), ',')) AS imei
    ),
    dev AS (
      SELECT d.device_id, UPPER(CAST(d.identification AS STRING)) AS imei
      FROM `{TBL_DEVICES}` d
    ),
    inst AS (
      SELECT i.device_id, i.vehicle_id, CAST(i.start_date AS TIMESTAMP) AS start_ts
      FROM `{TBL_INSTALLS}` i
    ),
    veh AS (
      SELECT v.vehicle_id, UPPER(v.plate) AS plate, v.customer_name
      FROM `{TBL_VEHICLES}` v
    ),
    t_dev AS (
      SELECT n.*, d.device_id
      FROM dtc_norm n
      JOIN dev d ON UPPER(n.imei_norm) = d.imei
    ),
    t_dev_inst AS (
      SELECT td.*, iv.vehicle_id
      FROM t_dev td
      JOIN inst iv
        ON iv.device_id = td.device_id
       AND td.ts >= iv.start_ts
    ),
    t_full AS (
      SELECT
        tdi.ts AS time,
        tdi.spn, tdi.fmi, tdi.dtc, tdi.status, tdi.lat, tdi.lon,
        v.plate, v.customer_name, tdi.imei_norm
      FROM t_dev_inst tdi
      JOIN veh v ON v.vehicle_id = tdi.vehicle_id
      WHERE (@key IS NULL)
         OR (v.plate = UPPER(@key))
         OR (tdi.imei_norm = UPPER(@key))
    )
    SELECT *
    FROM t_full
    ORDER BY time DESC
    LIMIT 1000
    """

    params = [
        bigquery.ScalarQueryParameter("since", "TIMESTAMP", since),
        bigquery.ScalarQueryParameter("key", "STRING", vehicle_key),
    ]
    job = _client.query(sql, job_config=bigquery.QueryJobConfig(query_parameters=params))
    rows = [dict(r) for r in job.result()]
    return {"time_series": rows}
