from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.ingestion.excel_dashboard_reader import ExcelDashboardReader


app = FastAPI(title="Safe Surfer Business Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ACTIVE_CUSTOMER_FILE = PROJECT_ROOT / "Active Customer #.xlsx"
ACTIVE_SUBS_FILE = PROJECT_ROOT / "Active Subs & Graphics.xlsx"
TRIALISTS_FILE = PROJECT_ROOT / "Trialists Graphics.xlsx"
INTERNATIONAL_FILE = PROJECT_ROOT / "FF - International - Final Dashboard tables.xlsx"


def get_forecasting_service():
    """Import the forecasting stack only when a forecast endpoint is used.

    pandas, SciPy, and statsmodels are intentionally kept out of the normal
    dashboard startup path. This keeps the Render free instance comfortably
    below its 512 MB memory ceiling while preserving the forecasting feature.
    """
    from backend.forecasting import ForecastingService

    if not hasattr(get_forecasting_service, "instance"):
        get_forecasting_service.instance = ForecastingService(PROJECT_ROOT)
    return get_forecasting_service.instance


@app.get("/api/health")
def health():
    return {
        "success": True,
        "message": "Safe Surfer dashboard API is running",
    }


@app.get("/api/dashboard")
def dashboard():
    customer_dashboard = ExcelDashboardReader(ACTIVE_CUSTOMER_FILE).read_dashboard()
    active_subs = ExcelDashboardReader(ACTIVE_SUBS_FILE).read_active_subscriptions()
    trialists = ExcelDashboardReader(TRIALISTS_FILE).read_trialists()
    international = ExcelDashboardReader(INTERNATIONAL_FILE).read_international()

    return {
        "success": True,
        "source_files": {
            "active_customer": ACTIVE_CUSTOMER_FILE.name,
            "active_subs": ACTIVE_SUBS_FILE.name,
            "trialists": TRIALISTS_FILE.name,
            "international": INTERNATIONAL_FILE.name,
        },
        "dashboard": {
            **customer_dashboard,
            "active_subs": active_subs,
            "trialists": trialists,
            "international": international,
        },
    }


@app.get("/api/forecast/metrics")
def forecast_metrics():
    try:
        return get_forecasting_service().metrics_catalog()
    except (FileNotFoundError, RuntimeError) as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.get("/api/forecast")
def forecast(
    metric: str = Query(..., min_length=1),
    horizon: int = Query(3),
):
    try:
        result = get_forecasting_service().forecast(metric, horizon)
    except KeyError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except (FileNotFoundError, RuntimeError) as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    if not result.get("success"):
        return result
    return result
