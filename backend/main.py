from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.ingestion.excel_dashboard_reader import (
    ExcelDashboardReader,
)


# =========================================================
# APP
# =========================================================

app = FastAPI(
    title="Safe Surfer Financial Dashboard"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# PROJECT FILES
# =========================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent


# PAGE 1
ACTIVE_CUSTOMER_FILE = (
    PROJECT_ROOT / "Active Customer #.xlsx"
)


# PAGE 2
ACTIVE_SUBS_FILE = (
    PROJECT_ROOT / "Active Subs & Graphics.xlsx"
)

TRIALISTS_FILE = (
    PROJECT_ROOT
    / "Trialists Graphics.xlsx"
)

INTERNATIONAL_FILE = (
    PROJECT_ROOT
    / "FF - International - Final Dashboard tables.xlsx"
)

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

# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/api/health")
def health():

    return {
        "success": True,
        "message": (
            "Safe Surfer dashboard backend is running"
        ),
    }


# =========================================================
# MAIN DASHBOARD API
# =========================================================

@app.get("/api/dashboard")
def dashboard():

    # -----------------------------------------------------
    # PAGE 1
    # Active Customer workbook
    # -----------------------------------------------------

    customer_reader = ExcelDashboardReader(
        ACTIVE_CUSTOMER_FILE
    )

    customer_dashboard = (
        customer_reader.read_dashboard()
    )


    # -----------------------------------------------------
    # PAGE 2
    # Active Subs & Graphics workbook
    # -----------------------------------------------------

    active_subs_reader = ExcelDashboardReader(
        ACTIVE_SUBS_FILE
    )

    active_subs = (
        active_subs_reader._read_active_subs_sheet()
    )

    trialists_reader = ExcelDashboardReader(
        TRIALISTS_FILE
    )

    trialists = (
        trialists_reader
        ._read_trialists_sheet()
    )

    international_reader = ExcelDashboardReader(
        INTERNATIONAL_FILE
    )

    international = (
        international_reader
        ._read_international_workbook()
    )


    # -----------------------------------------------------
    # COMBINE ALL WORKBOOKS
    # -----------------------------------------------------

    return {
        "success": True,

        "source_files": {
            "active_customer":
                ACTIVE_CUSTOMER_FILE.name,

            "active_subs":
                ACTIVE_SUBS_FILE.name,

            "trialists":
                TRIALISTS_FILE.name,

            "international":
                INTERNATIONAL_FILE.name,
        },

        "dashboard": {
            **customer_dashboard,

            "active_subs":
                active_subs,

            "trialists":
                trialists,

            "international":
                international,
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
