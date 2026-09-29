# Safe Surfer Business Intelligence Dashboard

React frontend for the Safe Surfer reporting and forecasting dashboard. The application displays subscription, customer, trialist, international, and forecast data supplied by the FastAPI backend.

## Local development

From the repository root, start the API:

```powershell
python -m uvicorn backend.main:app --reload
```

In a second terminal, start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at `http://127.0.0.1:5173` and uses `http://127.0.0.1:8000/api` by default.

## Environment variables

- `VITE_API_BASE_URL`: Backend origin, for example `https://safe-surfer-api.onrender.com`.
- `VITE_API_URL`: Optional full dashboard endpoint ending in `/api/dashboard`.

## Quality checks

```powershell
npm run lint
npm run build
```

## Deployment

The repository-level `render.yaml` deploys the FastAPI service and this Vite application together. Render supplies the backend URL to the frontend automatically.
