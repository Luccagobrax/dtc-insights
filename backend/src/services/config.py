from dotenv import load_dotenv
import os


load_dotenv()


GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
BQ_DATASET = os.getenv("BQ_DATASET")
BQ_TABLE_DTC = os.getenv("BQ_TABLE_DTC", "dtc_events")
BQ_TABLE_TELEMETRY = os.getenv("BQ_TABLE_TELEMETRY", "telemetry_points")
API_PORT = int(os.getenv("API_PORT", 8000))