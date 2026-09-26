from __future__ import annotations

from dataclasses import dataclass
import math
import warnings
from typing import Callable

import numpy as np
import pandas as pd
class ForecastModelError(RuntimeError):
    pass


@dataclass
class CandidateEvaluation:
    name: str
    status: str
    mae: float | None = None
    rmse: float | None = None
    smape: float | None = None
    reason: str | None = None
    predictions: list[dict] | None = None

    def as_dict(self) -> dict:
        return {
            "name": self.name,
            "status": self.status,
            "mae": self.mae,
            "rmse": self.rmse,
            "smape": self.smape,
            "reason": self.reason,
        }


def _naive(values: np.ndarray, horizon: int) -> np.ndarray:
    return np.repeat(values[-1], horizon).astype(float)


def _drift(values: np.ndarray, horizon: int) -> np.ndarray:
    if len(values) < 2:
        raise ValueError("Drift requires at least two observations.")
    slope = (values[-1] - values[0]) / (len(values) - 1)
    return np.array([values[-1] + slope * step for step in range(1, horizon + 1)], dtype=float)


def _seasonal_naive(values: np.ndarray, horizon: int) -> np.ndarray:
    if len(values) < 24:
        raise ValueError("Seasonal naive requires at least 24 monthly observations.")
    season = values[-12:]
    return np.resize(season, horizon).astype(float)


def _ses(values: np.ndarray, horizon: int) -> np.ndarray:
    from statsmodels.tsa.holtwinters import SimpleExpSmoothing

    fit = SimpleExpSmoothing(values, initialization_method="estimated").fit(optimized=True)
    return np.asarray(fit.forecast(horizon), dtype=float)


def _holt(values: np.ndarray, horizon: int, damped: bool) -> np.ndarray:
    from statsmodels.tsa.holtwinters import Holt

    fit = Holt(values, damped_trend=damped, initialization_method="estimated").fit(optimized=True)
    return np.asarray(fit.forecast(horizon), dtype=float)


def _ets_additive(values: np.ndarray, horizon: int) -> np.ndarray:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing

    fit = ExponentialSmoothing(
        values,
        trend="add",
        damped_trend=False,
        seasonal=None,
        initialization_method="estimated",
    ).fit(optimized=True, use_brute=False)
    return np.asarray(fit.forecast(horizon), dtype=float)


def _holt_winters(values: np.ndarray, horizon: int) -> np.ndarray:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing

    if len(values) < 24:
        raise ValueError("Holt-Winters requires at least 24 monthly observations.")
    fit = ExponentialSmoothing(
        values,
        trend="add",
        seasonal="add",
        seasonal_periods=12,
        initialization_method="estimated",
    ).fit(optimized=True, use_brute=False)
    return np.asarray(fit.forecast(horizon), dtype=float)


def _arima(values: np.ndarray, horizon: int, order: tuple[int, int, int]) -> np.ndarray:
    from statsmodels.tsa.arima.model import ARIMA

    fit = ARIMA(
        values,
        order=order,
        enforce_stationarity=False,
        enforce_invertibility=False,
    ).fit()
    return np.asarray(fit.forecast(horizon), dtype=float)


CANDIDATES: list[tuple[str, Callable[[np.ndarray, int], np.ndarray]]] = [
    ("Naive / Last Value", _naive),
    ("Drift", _drift),
    ("Seasonal Naive (12)", _seasonal_naive),
    ("Simple Exponential Smoothing", _ses),
    ("Holt Linear Trend", lambda values, horizon: _holt(values, horizon, False)),
    ("Holt Damped Trend", lambda values, horizon: _holt(values, horizon, True)),
    ("ETS Additive Trend", _ets_additive),
    ("Holt-Winters Additive", _holt_winters),
    ("ARIMA (1,1,0)", lambda values, horizon: _arima(values, horizon, (1, 1, 0))),
    ("ARIMA (0,1,1)", lambda values, horizon: _arima(values, horizon, (0, 1, 1))),
]


def _round(value: float | None) -> float | None:
    return None if value is None or not math.isfinite(value) else round(float(value), 4)


def _metrics(actual: np.ndarray, predicted: np.ndarray) -> tuple[float, float, float | None]:
    errors = actual - predicted
    mae = float(np.mean(np.abs(errors)))
    rmse = float(np.sqrt(np.mean(np.square(errors))))
    denominator = np.abs(actual) + np.abs(predicted)
    valid = denominator > 1e-12
    smape = None
    if np.any(valid):
        smape = float(np.mean(200 * np.abs(errors[valid]) / denominator[valid]))
    return mae, rmse, smape


def _clean_predictions(predictions: np.ndarray, scale: float) -> np.ndarray:
    if predictions.ndim != 1 or not np.all(np.isfinite(predictions)):
        raise ValueError("Forecast contains NaN or infinite values.")
    negative_tolerance = max(1e-8, scale * 0.01)
    if np.any(predictions < -negative_tolerance):
        raise ValueError("Forecast contains materially negative values for a non-negative metric.")
    return np.where(predictions < 0, 0.0, predictions)


def select_and_forecast(series: pd.Series, horizon: int) -> dict:
    ordered = series.sort_index()
    expected = pd.date_range(ordered.dropna().index.min(), ordered.dropna().index.max(), freq="MS")
    aligned = ordered.reindex(expected)
    missing_months = [date.strftime("%Y-%m") for date in aligned[aligned.isna()].index]
    preprocessing = []
    training = aligned.copy()
    if training.isna().any():
        training = training.interpolate(method="linear", limit_area="inside")
        if training.isna().any():
            raise ForecastModelError("The series has unresolved leading or trailing missing observations.")
        preprocessing.append("Linear interpolation was used only in model-training copies for internal gaps.")

    values = training.to_numpy(dtype=float)
    if len(values) < 10:
        raise ForecastModelError("At least 10 usable monthly observations are required.")

    validation_points = min(6, max(3, len(values) // 4))
    start = len(values) - validation_points
    scale = max(float(np.nanmedian(np.abs(values))), 1.0)
    evaluations: list[CandidateEvaluation] = []

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        for name, forecast_function in CANDIDATES:
            predictions = []
            actuals = []
            prediction_rows = []
            rejection = None
            for index in range(start, len(values)):
                train = values[:index]
                try:
                    prediction = forecast_function(train, 1)
                    prediction = _clean_predictions(np.asarray(prediction, dtype=float), scale)
                    predictions.append(float(prediction[0]))
                    actuals.append(float(values[index]))
                    prediction_rows.append({
                        "date": expected[index].strftime("%Y-%m"),
                        "actual": float(values[index]),
                        "predicted": float(prediction[0]),
                    })
                except Exception as error:
                    rejection = str(error)
                    break

            if rejection is not None or len(predictions) != validation_points:
                evaluations.append(CandidateEvaluation(
                    name=name,
                    status="rejected",
                    reason=rejection or "Insufficient rolling-origin backtests.",
                ))
                continue

            actual_array = np.asarray(actuals)
            prediction_array = np.asarray(predictions)
            mae, rmse, smape = _metrics(actual_array, prediction_array)
            evaluations.append(CandidateEvaluation(
                name=name,
                status="success",
                mae=_round(mae),
                rmse=_round(rmse),
                smape=_round(smape),
                predictions=prediction_rows,
            ))

    successful = [item for item in evaluations if item.status == "success" and item.mae is not None]
    if not successful:
        raise ForecastModelError("All candidate forecasting models failed validation.")
    selected = min(successful, key=lambda item: item.mae)
    selected_function = dict(CANDIDATES)[selected.name]

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        final_forecast = selected_function(values, horizon)
    final_forecast = _clean_predictions(np.asarray(final_forecast, dtype=float), scale)

    residuals = np.asarray([
        row["actual"] - row["predicted"] for row in (selected.predictions or [])
    ], dtype=float)
    if residuals.size:
        empirical_error = float(np.quantile(np.abs(residuals), 0.8))
    else:
        empirical_error = float(selected.rmse or selected.mae or 0)
    empirical_error = max(empirical_error, float(selected.mae or 0), 1e-9)

    future_dates = pd.date_range(expected[-1] + pd.offsets.MonthBegin(1), periods=horizon, freq="MS")
    forecast_rows = []
    for step, (date, value) in enumerate(zip(future_dates, final_forecast), start=1):
        spread = empirical_error * math.sqrt(step)
        forecast_rows.append({
            "date": date.strftime("%Y-%m"),
            "forecast": round(float(value), 4),
            "lower": round(max(0.0, float(value) - spread), 4),
            "upper": round(float(value) + spread, 4),
        })

    return {
        "forecast": forecast_rows,
        "selected_model": {
            "name": selected.name,
            "selection_metric": "MAE",
            "mae": selected.mae,
            "rmse": selected.rmse,
            "smape": selected.smape,
        },
        "candidate_models": [item.as_dict() for item in evaluations],
        "backtest": selected.predictions or [],
        "missing_months": missing_months,
        "preprocessing": preprocessing,
        "range_label": "Estimated Forecast Range",
    }
