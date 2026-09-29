# Safe Surfer Business Intelligence Dashboard

A full-stack dashboard for Safe Surfer subscription reporting, customer analysis, trialist conversion, international performance, and experimental time-series forecasting.

## Technology

- React and Vite frontend
- FastAPI backend
- Recharts visualisations
- Excel-based source data
- pandas and statsmodels forecasting
- Render Blueprint deployment

## Local setup

Create a Python environment and install the backend dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload
```

In another terminal, start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Verification

```powershell
cd frontend
npm run lint
npm run build
```

The backend health endpoint is available at `http://127.0.0.1:8000/api/health`.

## Deployment

The included `render.yaml` defines the FastAPI web service and Vite static site. Create a new Render Blueprint from this repository to deploy both services.

## Forecasting notice

Forecasts are analytical estimates derived from the supplied historical workbooks. Data identified as fictitious or demonstrative is labelled in the interface, and forecast results should not be treated as financial commitments.
