# backend/src/services/bq_client.py
import re
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional

from google.cloud import bigquery
from . import config  # <-- troquei: import relativo em vez de backend.src.services

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
TBL_DMS       = "equipe-dados.datawarehouse_gobrax.vw_dms_cs_team"

# --------------------------------------------------------------------------
# Resolve vehicle: aceita PLACA (case-insensitive), IMEI ou CHASSI (últimos 8)
# Retorna: {vehicle_id, plate, chassi, chassi_last8, imei?, customer_id, customer_name,
#           plan_active, plan_type}
# --------------------------------------------------------------------------
def resolve_vehicle(vehicle_key: str) -> Optional[Dict]:
    key = (vehicle_key or "").strip().upper()
    key_last8 = key[-8:] if key else ""

    sql = f"""
    WITH veh AS (
      SELECT
        v.vehicle_id,
        UPPER(v.plate)                                 AS plate,
        UPPER(CAST(v.chassi AS STRING))               AS chassi,
        RIGHT(UPPER(CAST(v.chassi AS STRING)), 8)     AS chassi_last8,
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
    dms AS (
      SELECT
        RIGHT(UPPER(CAST(chassis AS STRING)), 8) AS chassi_last8,
        CAST(status_gobrax AS BOOL)             AS plan_active,
        CAST(plan_type     AS STRING)           AS plan_type
      FROM `{TBL_DMS}`
    ),
    result_base AS (
      -- por PLACA / CHASSI (8) direto na tabela de veículos
      SELECT v.vehicle_id, v.plate, NULL AS imei, v.chassi, v.chassi_last8,
             v.customer_id, v.customer_name
      FROM veh v
      WHERE v.plate = @key OR v.chassi_last8 = @key_last8

      UNION ALL

      -- por IMEI (device -> instalação -> veículo)
      SELECT v.vehicle_id, v.plate, itv.imei AS imei, v.chassi, v.chassi_last8,
             v.customer_id, v.customer_name
      FROM imei_to_vehicle itv
      JOIN veh v ON v.vehicle_id = itv.vehicle_id
      WHERE itv.imei = @key
    )
    SELECT
      rb.*,
      dm.plan_active,
      dm.plan_type
    FROM result_base rb
    LEFT JOIN dms dm USING (chassi_last8)
    LIMIT 1
    """

    job = _client.query(
        sql,
        job_config=bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("key", "STRING", key),
                bigquery.ScalarQueryParameter("key_last8", "STRING", key_last8),
            ]
        ),
    )
    rows = [dict(r) for r in job.result()]
    return rows[0] if rows else None

# --------------------------------------------------------------------------
# DTCs recentes (enriquecidos) para PLACA / IMEI / CHASSI(8)
# Usa: Telemetry -> Devices -> Installed -> Vehicles + DMS (planos)
# --------------------------------------------------------------------------
def get_dtcs(vehicle_key: str, hours: int = 24) -> List[Dict]:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    key = (vehicle_key or "").strip().upper()
    key_last8 = key[-8:] if key else ""

    sql = f"""
    WITH dtc_raw AS (
      SELECT
        t.event_datetime_utc                       AS ts,
        UPPER(CAST(t.DTC AS STRING))               AS dtc,
        SAFE_CAST(t.spn AS INT64)                  AS spn,
        SAFE_CAST(t.fmi AS INT64)                  AS fmi,
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
      SELECT
        v.vehicle_id,
        UPPER(v.plate)                             AS plate,
        UPPER(CAST(v.chassi AS STRING))           AS chassi,
        RIGHT(UPPER(CAST(v.chassi AS STRING)), 8) AS chassi_last8,
        v.customer_id,
        v.customer_name
      FROM `{TBL_VEHICLES}` v
    ),
    dms AS (
      SELECT
        RIGHT(UPPER(CAST(chassis AS STRING)), 8) AS chassi_last8,
        CAST(status_gobrax AS BOOL)             AS plan_active,
        CAST(plan_type     AS STRING)           AS plan_type
      FROM `{TBL_DMS}`
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
    -- junta veículo + DMS e aplica filtro por placa/imei/chassi(8)
    t_full AS (
      SELECT
        tdi.ts, tdi.dtc, tdi.spn, tdi.fmi, tdi.status, tdi.lat, tdi.lon,
        tdi.imei_norm,
        v.vehicle_id, v.plate, v.customer_id, v.customer_name, v.chassi, v.chassi_last8,
        dm.plan_active, dm.plan_type
      FROM t_dev_inst tdi
      JOIN veh v ON v.vehicle_id = tdi.vehicle_id
      LEFT JOIN dms dm USING (chassi_last8)
      WHERE (@key = '')
         OR (v.plate       = @key)
         OR (UPPER(tdi.imei_norm) = @key)
         OR (v.chassi_last8 = @key_last8)
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
        bigquery.ScalarQueryParameter("key", "STRING", key),
        bigquery.ScalarQueryParameter("key_last8", "STRING", key_last8),
    ]
    job = _client.query(sql, job_config=bigquery.QueryJobConfig(query_parameters=params))
    return [dict(r) for r in job.result()]

# --------------------------------------------------------------------------
# Telemetria curta (últimos N minutos) para PLACA / IMEI / CHASSI(8)
# Retorna série temporal simples já vinculada ao veículo + info de plano
# --------------------------------------------------------------------------
def get_telemetry(vehicle_key: str, minutes: int = 30) -> Dict:
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    key = (vehicle_key or "").strip().upper()
    key_last8 = key[-8:] if key else ""

    sql = f"""
    WITH dtc_raw AS (
      SELECT
        t.event_datetime_utc                       AS ts,
        SAFE_CAST(t.spn AS INT64)                  AS spn,
        SAFE_CAST(t.fmi AS INT64)                  AS fmi,
        t.DTC                                       AS dtc,
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
      SELECT
        v.vehicle_id,
        UPPER(v.plate)                             AS plate,
        UPPER(CAST(v.chassi AS STRING))           AS chassi,
        RIGHT(UPPER(CAST(v.chassi AS STRING)), 8) AS chassi_last8,
        v.customer_name
      FROM `{TBL_VEHICLES}` v
    ),
    dms AS (
      SELECT
        RIGHT(UPPER(CAST(chassis AS STRING)), 8) AS chassi_last8,
        CAST(status_gobrax AS BOOL)             AS plan_active,
        CAST(plan_type     AS STRING)           AS plan_type
      FROM `{TBL_DMS}`
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
        v.plate, v.customer_name, v.chassi, v.chassi_last8,
        dm.plan_active, dm.plan_type,
        tdi.imei_norm
      FROM t_dev_inst tdi
      JOIN veh v ON v.vehicle_id = tdi.vehicle_id
      LEFT JOIN dms dm USING (chassi_last8)
      WHERE (@key = '')
         OR (v.plate       = @key)
         OR (UPPER(tdi.imei_norm) = @key)
         OR (v.chassi_last8 = @key_last8)
    )
    SELECT *
    FROM t_full
    ORDER BY time DESC
    LIMIT 1000
    """

    params = [
        bigquery.ScalarQueryParameter("since", "TIMESTAMP", since),
        bigquery.ScalarQueryParameter("key", "STRING", key),
        bigquery.ScalarQueryParameter("key_last8", "STRING", key_last8),
    ]
    job = _client.query(sql, job_config=bigquery.QueryJobConfig(query_parameters=params))
    rows = [dict(r) for r in job.result()]
    return {"time_series": rows}

# --------------------------------------------------------------------------
# Resumo por DTC/FMI + classificação (persistente/intermitente/resolvido)
# Lookback padrão: 30 dias (sem o usuário escolher janela)
# + enriquecimento de plano (DMS) por chassi(8)
# --------------------------------------------------------------------------
def get_dtc_summary(vehicle_key: str, days: int = 30) -> List[Dict]:
    key = (vehicle_key or "").strip().upper()
    key_last8 = key[-8:] if key else ""

    sql = f"""
    WITH dtc_raw AS (
      SELECT
        t.event_datetime_utc AS ts,
        UPPER(CAST(t.DTC AS STRING)) AS dtc,
        SAFE_CAST(t.spn AS INT64)    AS spn,
        SAFE_CAST(t.fmi AS INT64)    AS fmi,
        t.status,
        UPPER(CAST(t.imeis AS STRING)) AS imeis
      FROM `{TBL_TELEMETRY}` t
      WHERE t.event_datetime_utc >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
    ),
    dtc_norm AS (
      SELECT
        r.ts, r.dtc, r.spn, r.fmi, r.status,
        TRIM(imei) AS imei_norm
      FROM dtc_raw r,
      UNNEST(SPLIT(REGEXP_REPLACE(r.imeis, r'[;,\s]+', ','), ',')) AS imei
    ),
    dev AS (
      SELECT
        d.device_id,
        UPPER(CAST(d.identification AS STRING)) AS imei
      FROM `{TBL_DEVICES}` d
    ),
    inst AS (
      SELECT
        i.device_id,
        i.vehicle_id,
        CAST(i.start_date AS TIMESTAMP) AS start_ts
      FROM `{TBL_INSTALLS}` i
    ),
    veh AS (
      SELECT
        v.vehicle_id,
        UPPER(v.plate)                             AS plate,
        UPPER(CAST(v.chassi AS STRING))           AS chassi,
        RIGHT(UPPER(CAST(v.chassi AS STRING)), 8) AS chassi_last8,
        v.customer_id,
        v.customer_name
      FROM `{TBL_VEHICLES}` v
    ),
    dms AS (
      SELECT
        RIGHT(UPPER(CAST(chassis AS STRING)), 8) AS chassi_last8,
        CAST(status_gobrax AS BOOL)             AS plan_active,
        CAST(plan_type     AS STRING)           AS plan_type
      FROM `{TBL_DMS}`
    ),
    t_dev AS (
      SELECT n.*, d.device_id, d.imei AS dev_imei
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
        tdi.ts, tdi.dtc, tdi.spn, tdi.fmi, tdi.status,
        v.plate, v.customer_id, v.customer_name,
        v.chassi, v.chassi_last8,
        tdi.dev_imei AS imei,
        dm.plan_active, dm.plan_type
      FROM t_dev_inst tdi
      JOIN veh v ON v.vehicle_id = tdi.vehicle_id
      LEFT JOIN dms dm USING (chassi_last8)
    ),
    filt AS (
      SELECT * FROM t_full
      WHERE (@key = '' OR plate = @key OR imei = @key OR chassi_last8 = @key_last8)
    ),
    known AS (
      SELECT
        f.*,
        dc.Description   AS dtc_description,
        fc.SAE_J1939     AS fmi_sae,
        fc.transcription AS fmi_pt
      FROM filt f
      JOIN `{TBL_DTC_CODES}` dc ON UPPER(dc.DTC) = f.dtc
      LEFT JOIN `{TBL_FMI_CODES}` fc ON fc.FMI = f.fmi
    )
    SELECT
      customer_name,
      plate,
      chassi,
      chassi_last8,
      imei,
      ANY_VALUE(plan_active)        AS plan_active,
      ANY_VALUE(plan_type)          AS plan_type,
      dtc,
      fmi,
      ANY_VALUE(dtc_description)    AS dtc_description,
      ANY_VALUE(fmi_pt)             AS fmi_pt,
      COUNT(*)                      AS events_total,
      MIN(ts)                       AS first_seen_utc,
      MAX(ts)                       AS last_seen_utc,
      COUNTIF(ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR))  AS ev_6h,
      COUNTIF(ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)) AS ev_24h,
      COUNTIF(ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY))   AS ev_7d,
      APPROX_COUNT_DISTINCT(DATE(ts))                                     AS days_with_events
    FROM known
    GROUP BY customer_name, plate, chassi, chassi_last8, imei, dtc, fmi
    ORDER BY last_seen_utc DESC
    LIMIT 500
    """

    job = _client.query(
        sql,
        job_config=bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("days", "INT64", days),
                bigquery.ScalarQueryParameter("key", "STRING", key),
                bigquery.ScalarQueryParameter("key_last8", "STRING", key_last8),
            ]
        ),
    )
    rows = [dict(r) for r in job.result()]

    # Pós-processo: rótulos de persistência
    now = datetime.now(timezone.utc)
    out: List[Dict] = []
    for r in rows:
        last_seen = r.get("last_seen_utc")
        gap_h = None
        if last_seen:
            try:
                if getattr(last_seen, "tzinfo", None) is None:
                    last_seen = last_seen.replace(tzinfo=timezone.utc)
                gap_h = (now - last_seen).total_seconds() / 3600.0
            except Exception:
                pass

        ev24 = int(r.get("ev_24h", 0) or 0)
        ev7  = int(r.get("ev_7d", 0) or 0)
        d_we = int(r.get("days_with_events", 0) or 0)

        if ev24 > 0 or d_we >= 3:
            status = "persistente"
        elif ev7 > 0 and ev24 == 0:
            status = "intermitente"
        else:
            status = "provavelmente resolvido"

        out.append({
            **r,
            "gap_hours_since_last": gap_h,
            "status_label": status,
            "recommended_action": (
                "Atuar imediatamente (falha ativa/persistente)."
                if status == "persistente" else
                "Monitorar; revisar condições que dispararam a falha."
                if status == "intermitente" else
                "Sem recorrência recente; tratar como resolvida (confirmar com cliente)."
            ),
        })
    return out

# --------------------------------------------------------------------------
# Resumo por CLIENTE (fuzzy tokens com LIKE AND) + classificação
# --------------------------------------------------------------------------
def get_customer_summary(customer_name: str, days: int = 30) -> List[Dict]:
    name_norm = (customer_name or "").strip().upper()
    tokens = [t for t in re.split(r"[^A-Z0-9]+", name_norm) if len(t) >= 3]
    if not tokens:
        tokens = [name_norm] if name_norm else []

    like_clauses = [f"UPPER(v.customer_name) LIKE @tok{i}" for i in range(len(tokens))]
    where_tokens = " AND ".join(like_clauses) if like_clauses else "TRUE"

    sql = f"""
    WITH dtc_raw AS (
      SELECT
        t.event_datetime_utc AS ts,
        UPPER(CAST(t.DTC AS STRING)) AS dtc,
        SAFE_CAST(t.spn AS INT64)    AS spn,
        SAFE_CAST(t.fmi AS INT64)    AS fmi,
        t.status,
        UPPER(CAST(t.imeis AS STRING)) AS imeis
      FROM `{TBL_TELEMETRY}` t
      WHERE t.event_datetime_utc >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
    ),
    dtc_norm AS (
      SELECT
        r.ts, r.dtc, r.spn, r.fmi, r.status,
        TRIM(imei) AS imei_norm
      FROM dtc_raw r,
      UNNEST(SPLIT(REGEXP_REPLACE(r.imeis, r'[;,\s]+', ','), ',')) AS imei
    ),
    dev AS (
      SELECT
        d.device_id,
        UPPER(CAST(d.identification AS STRING)) AS imei
      FROM `{TBL_DEVICES}` d
    ),
    inst AS (
      SELECT
        i.device_id,
        i.vehicle_id,
        CAST(i.start_date AS TIMESTAMP) AS start_ts
      FROM `{TBL_INSTALLS}` i
    ),
    veh AS (
      SELECT
        v.vehicle_id,
        UPPER(v.plate) AS plate,
        v.customer_id,
        v.customer_name,
        RIGHT(UPPER(CAST(v.chassi AS STRING)), 8) AS chassi_last8,
        CAST(dms.status_gobrax AS BOOL)           AS plan_active,
        CAST(dms.plan_type     AS STRING)         AS plan_type
      FROM `{TBL_VEHICLES}` v
      LEFT JOIN `{TBL_DMS}` dms
        ON RIGHT(UPPER(CAST(v.chassi AS STRING)), 8) = RIGHT(UPPER(CAST(dms.chassis AS STRING)), 8)
    ),
    t_dev AS (
      SELECT n.*, d.device_id, d.imei AS dev_imei
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
        tdi.ts, tdi.dtc, tdi.spn, tdi.fmi, tdi.status,
        v.plate, v.customer_id, v.customer_name,
        v.plan_active, v.plan_type,
        tdi.dev_imei AS imei
      FROM t_dev_inst tdi
      JOIN veh v ON v.vehicle_id = tdi.vehicle_id
      WHERE {where_tokens}
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
    SELECT
      customer_name,
      plate,
      imei,
      ANY_VALUE(plan_active) AS plan_active,
      ANY_VALUE(plan_type)   AS plan_type,
      dtc,
      fmi,
      ANY_VALUE(dtc_description) AS dtc_description,
      ANY_VALUE(fmi_pt)          AS fmi_pt,
      COUNT(*)                   AS events_total,
      MIN(ts)                    AS first_seen_utc,
      MAX(ts)                    AS last_seen_utc,
      COUNTIF(ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR))  AS ev_6h,
      COUNTIF(ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)) AS ev_24h,
      COUNTIF(ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY))   AS ev_7d,
      APPROX_COUNT_DISTINCT(DATE(ts))                                     AS days_with_events
    FROM known
    GROUP BY customer_name, plate, imei, dtc, fmi
    ORDER BY last_seen_utc DESC
    LIMIT 1000
    """

    params = [bigquery.ScalarQueryParameter("days", "INT64", days)]
    for i, tok in enumerate(tokens):
        params.append(bigquery.ScalarQueryParameter(f"tok{i}", "STRING", f"%{tok}%"))

    job = _client.query(sql, job_config=bigquery.QueryJobConfig(query_parameters=params))
    rows = [dict(r) for r in job.result()]

    # Rótulos de persistência
    now = datetime.now(timezone.utc)
    out: List[Dict] = []
    for r in rows:
        last_seen = r.get("last_seen_utc")
        gap_h = None
        if last_seen:
            try:
                if getattr(last_seen, "tzinfo", None) is None:
                    last_seen = last_seen.replace(tzinfo=timezone.utc)
                gap_h = (now - last_seen).total_seconds() / 3600.0
            except Exception:
                pass

        ev24 = int(r.get("ev_24h", 0) or 0)
        ev7  = int(r.get("ev_7d", 0) or 0)
        d_we = int(r.get("days_with_events", 0) or 0)

        if ev24 > 0 or d_we >= 3:
            status = "persistente"
        elif ev7 > 0 and ev24 == 0:
            status = "intermitente"
        else:
            status = "provavelmente resolvido"

        out.append({
            **r,
            "gap_hours_since_last": gap_h,
            "status_label": status,
            "recommended_action": (
                "Atuar imediatamente (falha ativa/persistente)."
                if status == "persistente" else
                "Monitorar; revisar condições que dispararam a falha."
                if status == "intermitente" else
                "Sem recorrência recente; tratar como resolvida (confirmar com cliente)."
            ),
        })
    return out
