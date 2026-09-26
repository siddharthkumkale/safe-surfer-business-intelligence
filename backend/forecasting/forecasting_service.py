from __future__ import annotations

from copy import deepcopy
import logging
from pathlib import Path
from threading import RLock

import pandas as pd

from .data_loader import ForecastDataLoader, MetricSeries
from .model_selection import ForecastModelError, select_and_forecast


logger = logging.getLogger("safe_surfer.forecasting")


class ForecastingService:
    def __init__(self, project_root: Path):
        self.loader = ForecastDataLoader(project_root)
        self._metrics: dict[str, MetricSeries] | None = None
        self._signature = None
        self._cache: dict[tuple, dict] = {}
        self._lock = RLock()

    def _ensure_loaded(self) -> dict[str, MetricSeries]:
        signature = self.loader.modification_signature()
        with self._lock:
            if self._metrics is None or signature != self._signature:
                self._metrics = self.loader.load()
                self._signature = signature
                self._cache.clear()
            return self._metrics

    def metrics_catalog(self) -> list[dict]:
        metrics = self._ensure_loaded()
        catalog = []
        for metric in metrics.values():
            validation = metric.validation()
            catalog.append({
                "key": metric.key,
                "label": metric.label,
                "category": metric.category,
                "unit": metric.unit,
                "available": validation["available"],
                "status": "available" if validation["available"] else "insufficient_data",
                "reason": validation["reason"],
                "observations": validation["observations"],
                "first_actual": validation.get("first_actual"),
                "last_actual": validation.get("last_actual"),
                "contains_fictitious_values": metric.contains_fictitious_values,
                "source": metric.source,
            })
        return catalog

    @staticmethod
    def _serialise_history(series: pd.Series) -> list[dict]:
        usable = series.dropna()
        if usable.empty:
            return []
        expected = pd.date_range(usable.index.min(), usable.index.max(), freq="MS")
        aligned = series.reindex(expected)
        return [
            {
                "date": date.strftime("%Y-%m"),
                "actual": None if pd.isna(value) else round(float(value), 4),
            }
            for date, value in aligned.items()
        ]

    @staticmethod
    def _serialise_contributions(metric: MetricSeries) -> list[dict]:
        if not metric.contributions:
            return []
        frame = pd.concat(metric.contributions, axis=1).sort_index()
        rows = []
        for date, values in frame.iterrows():
            row = {"date": date.strftime("%Y-%m")}
            for name, value in values.items():
                row[name] = None if pd.isna(value) else round(float(value), 4)
            rows.append(row)
        return rows

    def forecast(self, metric_key: str, horizon: int = 3, include_related: bool = True) -> dict:
        if horizon not in {3, 6}:
            raise ValueError("Forecast horizon must be either 3 or 6 months.")
        metrics = self._ensure_loaded()
        if metric_key not in metrics:
            raise KeyError(f"Unknown forecast metric: {metric_key}")

        metric = metrics[metric_key]
        validation = metric.validation()
        if not validation["available"]:
            return {
                "success": False,
                "status": "insufficient_data",
                "metric": metric.label,
                "metric_key": metric.key,
                "unit": metric.unit,
                "message": f"Forecast unavailable — {validation['reason']}",
                "metadata": validation,
            }

        cache_key = (metric_key, horizon, self._signature, include_related)
        with self._lock:
            if cache_key in self._cache:
                return deepcopy(self._cache[cache_key])

        try:
            model_result = select_and_forecast(metric.values, horizon)
        except ForecastModelError as error:
            return {
                "success": False,
                "status": "model_failure",
                "metric": metric.label,
                "metric_key": metric.key,
                "unit": metric.unit,
                "message": f"Forecast unavailable — {error}",
                "metadata": validation,
            }

        latest_actual = float(metric.values.dropna().iloc[-1])
        first_forecast = float(model_result["forecast"][0]["forecast"])
        end_forecast = float(model_result["forecast"][-1]["forecast"])
        next_change = None if latest_actual == 0 else ((first_forecast - latest_actual) / latest_actual) * 100
        end_change = None if latest_actual == 0 else ((end_forecast - latest_actual) / latest_actual) * 100
        tolerance = 1.0
        if end_change is None or abs(end_change) < tolerance:
            direction = "stable"
        elif end_change > 0:
            direction = "up"
        else:
            direction = "down"

        response = {
            "success": True,
            "status": "available",
            "metric": metric.label,
            "metric_key": metric.key,
            "unit": metric.unit,
            "data_status": {
                "contains_fictitious_values": metric.contains_fictitious_values,
                "experimental": metric.experimental,
                "warning": (
                    "Experimental Forecast — some supplied historical source values are marked as "
                    "fictitious/demo data. Forecasts are for analytical demonstration and should "
                    "not be treated as financial commitments."
                    if metric.contains_fictitious_values else
                    "Experimental Forecast — results are analytical estimates, not financial commitments."
                ),
            },
            "history": self._serialise_history(metric.values),
            "forecast": model_result["forecast"],
            "selected_model": model_result["selected_model"],
            "candidate_models": model_result["candidate_models"],
            "backtest": model_result["backtest"],
            "source_contribution": self._serialise_contributions(metric),
            "metadata": {
                **validation,
                "forecast_horizon": horizon,
                "missing_months": model_result["missing_months"],
                "preprocessing": model_result["preprocessing"],
                "source": metric.source,
                "source_notes": metric.notes,
                "range_label": model_result["range_label"],
                "data_quality_issues": self.loader.data_quality_issues,
            },
            "insights": {
                "direction": direction,
                "next_month_change_percent": None if next_change is None else round(next_change, 2),
                "forecast_end_change_percent": None if end_change is None else round(end_change, 2),
                "summary": self._insight(metric.label, horizon, direction, end_change),
                "uncertainty": "Estimated uncertainty widens further into the forecast horizon.",
            },
        }

        if include_related and metric.key == "international_total_income":
            related_forecasts = []
            for country in metric.related.get("top_countries", []):
                related_metric = metrics.get(country["key"])
                if related_metric is None:
                    continue
                related_validation = related_metric.validation()
                item = {**country, "available": related_validation["available"]}
                if related_validation["available"]:
                    related_result = self.forecast(country["key"], horizon, include_related=False)
                    if related_result.get("success"):
                        item.update({
                            "forecast": related_result["forecast"],
                            "selected_model": related_result["selected_model"],
                        })
                else:
                    item["status"] = "insufficient_data"
                    item["reason"] = related_validation["reason"]
                related_forecasts.append(item)
            response["international_country_analysis"] = related_forecasts

        logger.info(
            "Forecast diagnostic | Metric: %s | Observations: %s | Date range: %s to %s | "
            "Missing observations: %s | Candidate models tested: %s | Models rejected: %s | "
            "Backtest MAE: %s | Selected model: %s | Forecast horizon: %s",
            metric.label,
            validation["observations"],
            validation.get("first_actual"),
            validation.get("last_actual"),
            len(model_result["missing_months"]),
            len(model_result["candidate_models"]),
            sum(1 for item in model_result["candidate_models"] if item["status"] == "rejected"),
            model_result["selected_model"]["mae"],
            model_result["selected_model"]["name"],
            horizon,
        )

        with self._lock:
            self._cache[cache_key] = deepcopy(response)
        return response

    @staticmethod
    def _insight(label: str, horizon: int, direction: str, end_change: float | None) -> str:
        if direction == "stable" or end_change is None:
            return f"{label} is forecast to remain broadly stable over the next {horizon} months."
        verb = "increase" if direction == "up" else "decrease"
        position = "above" if direction == "up" else "below"
        return (
            f"{label} is forecast to {verb} over the next {horizon} months. "
            f"The end-of-horizon estimate is {abs(end_change):.1f}% {position} the latest actual value."
        )
