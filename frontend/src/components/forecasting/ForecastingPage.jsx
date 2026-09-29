import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { API_BASE_URL } from "../../api";
import {
  CHART_MARGIN_LARGE,
  COLORS,
  GRID_PROPS,
  LEGEND_PROPS,
  TOOLTIP_PROPS,
  XAXIS_PROPS,
  XAXIS_PROPS_ANGLED,
  YAXIS_PROPS,
} from "../../chartTheme";

const GROUP_ORDER = [
  "Financial",
  "Subscriptions",
  "Customer Acquisition",
  "Gateway Analysis",
  "International",
  "International — Top Countries",
];

const formatMonth = (value) => {
  if (!value) return "—";
  const [year, month] = value.split("-");
  return new Intl.DateTimeFormat("en-NZ", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(year), Number(month) - 1, 1)));
};

const formatMetricValue = (value, unit, compact = false) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const number = Number(value);
  const options = compact
    ? { notation: "compact", maximumFractionDigits: 1 }
    : { maximumFractionDigits: unit === "count" ? 0 : 2 };
  const formatted = number.toLocaleString("en-NZ", options);
  if (unit === "k") return `$${formatted}k`;
  if (unit === "currency") return `$${formatted}`;
  return formatted;
};

const formatPercent = (value) =>
  value === null || value === undefined
    ? "—"
    : `${value >= 0 ? "+" : ""}${Number(value).toFixed(1)}%`;

function ForecastTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="forecast-tooltip">
      <strong>{formatMonth(label)}</strong>
      {row.actual !== null && row.actual !== undefined && (
        <span><i className="actual-dot" />Actual: {formatMetricValue(row.actual, unit)}</span>
      )}
      {row.isForecast && (
        <>
          <span><i className="forecast-dot" />Forecast: {formatMetricValue(row.forecast, unit)}</span>
          <span>Lower range: {formatMetricValue(row.lower, unit)}</span>
          <span>Upper range: {formatMetricValue(row.upper, unit)}</span>
        </>
      )}
    </div>
  );
}

export default function ForecastingPage() {
  const [metrics, setMetrics] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState("");
  const [horizon, setHorizon] = useState(3);
  const [result, setResult] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadMetrics() {
      setMetricsLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE_URL}/forecast/metrics`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Forecast metrics returned ${response.status}`);
        const data = await response.json();
        setMetrics(Array.isArray(data) ? data : []);
        const preferred = data.find((item) => item.key === "total_revenue" && item.available)
          || data.find((item) => item.available);
        setSelectedMetric((current) => current || preferred?.key || "");
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setError(loadError.message || "Unable to load forecast metrics.");
        }
      } finally {
        if (!controller.signal.aborted) setMetricsLoading(false);
      }
    }
    loadMetrics();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedMetric) return undefined;
    const controller = new AbortController();
    async function loadForecast() {
      setForecastLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          metric: selectedMetric,
          horizon: String(horizon),
        });
        const response = await fetch(`${API_BASE_URL}/forecast?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || `Forecast returned ${response.status}`);
        if (!data.success) throw new Error(data.message || "Forecast unavailable.");
        setResult(data);
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setResult(null);
          setError(loadError.message || "Unable to generate forecast.");
        }
      } finally {
        if (!controller.signal.aborted) setForecastLoading(false);
      }
    }
    loadForecast();
    return () => controller.abort();
  }, [selectedMetric, horizon, refreshKey]);

  const groupedMetrics = useMemo(() => {
    const groups = new Map();
    metrics.filter((item) => item.available).forEach((item) => {
      if (!groups.has(item.category)) groups.set(item.category, []);
      groups.get(item.category).push(item);
    });
    return GROUP_ORDER.filter((group) => groups.has(group)).map((group) => ({
      group,
      items: groups.get(group),
    }));
  }, [metrics]);

  const chartData = useMemo(() => {
    if (!result) return [];
    const history = result.history.map((item) => ({
      date: item.date,
      actual: item.actual,
      forecast: null,
      lower: null,
      upper: null,
      range: null,
      isForecast: false,
    }));
    const latest = [...history].reverse().find((item) => item.actual !== null);
    if (latest) latest.forecast = latest.actual;
    return [
      ...history,
      ...result.forecast.map((item) => ({
        ...item,
        actual: null,
        range: [item.lower, item.upper],
        isForecast: true,
      })),
    ];
  }, [result]);

  const forecastRows = useMemo(() => {
    if (!result) return [];
    const latestActual = [...result.history].reverse().find((item) => item.actual !== null)?.actual;
    return result.forecast.map((item, index) => {
      const previous = index === 0 ? latestActual : result.forecast[index - 1].forecast;
      return {
        ...item,
        changePrevious: previous ? ((item.forecast - previous) / previous) * 100 : null,
        changeLatest: latestActual ? ((item.forecast - latestActual) / latestActual) * 100 : null,
      };
    });
  }, [result]);

  const successfulCandidates = useMemo(
    () => result?.candidate_models?.filter((item) => item.status === "success") || [],
    [result],
  );

  const sourceKeys = useMemo(() => {
    const first = result?.source_contribution?.[0];
    return first ? Object.keys(first).filter((key) => key !== "date") : [];
  }, [result]);

  const latestActualRow = result
    ? [...result.history].reverse().find((item) => item.actual !== null)
    : null;
  const firstForecast = result?.forecast?.[0];
  const lastForecast = result?.forecast?.[result.forecast.length - 1];

  return (
    <div className="forecast-page">
      <section className="forecast-command-panel">
        <div className="forecast-command-copy">
          <div className="forecast-eyebrow">
            <span>Experimental</span>
            Forecast outlook
          </div>
          <h3>Business forecast</h3>
          <p>Select a metric and forecast period.</p>
        </div>
        <div className="forecast-controls">
          <label>
            <span>Metric</span>
            <select
              value={selectedMetric}
              onChange={(event) => setSelectedMetric(event.target.value)}
              disabled={metricsLoading}
            >
              {groupedMetrics.map(({ group, items }) => (
                <optgroup key={group} label={group}>
                  {items.map((metric) => (
                    <option key={metric.key} value={metric.key}>{metric.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            <span>Forecast horizon</span>
            <select value={horizon} onChange={(event) => setHorizon(Number(event.target.value))}>
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
            </select>
          </label>
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={forecastLoading}>
            <span aria-hidden="true">↻</span>
            {forecastLoading ? "Refreshing…" : "Refresh forecast"}
          </button>
        </div>
      </section>

      {result?.data_status?.warning && (
        <div className={`forecast-warning ${result.data_status.contains_fictitious_values ? "is-demo" : ""}`}>
          <span aria-hidden="true">!</span>
          <p>{result.data_status.warning}</p>
        </div>
      )}

      {(metricsLoading || forecastLoading) && !result && (
        <div className="forecast-loading panel">
          <div className="spinner" />
          <h3>Evaluating forecast models</h3>
          <p>Comparing models against recent historical results.</p>
        </div>
      )}

      {error && (
        <div className="forecast-error panel">
          <strong>Forecast unavailable</strong>
          <p>{error}</p>
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)}>Try again</button>
        </div>
      )}

      {result && (
        <>
          <section className="forecast-kpi-grid">
            <article className="forecast-kpi is-primary">
              <span>Latest actual</span>
              <strong>{formatMetricValue(latestActualRow?.actual, result.unit)}</strong>
              <small>{formatMonth(latestActualRow?.date)}</small>
            </article>
            <article className="forecast-kpi">
              <span>Next month forecast</span>
              <strong>{formatMetricValue(firstForecast?.forecast, result.unit)}</strong>
              <small>{formatMonth(firstForecast?.date)}</small>
            </article>
            <article className={`forecast-kpi ${result.insights.direction === "down" ? "is-down" : "is-up"}`}>
              <span>Forecast change</span>
              <strong>{formatPercent(result.insights.next_month_change_percent)}</strong>
              <small>Versus latest actual</small>
            </article>
            <article className="forecast-kpi">
              <span>End of horizon</span>
              <strong>{formatMetricValue(lastForecast?.forecast, result.unit)}</strong>
              <small>{formatMonth(lastForecast?.date)}</small>
            </article>
          </section>

          <section className="section">
            <div className="section-heading forecast-section-heading">
              <div>
                <h3>Actual vs Forecast</h3>
                <p>Historical results and the selected forecast.</p>
              </div>
              <div className="forecast-model-pill">
                <span>Selected model</span>
                <strong>{result.selected_model.name}</strong>
              </div>
            </div>
            <div className="panel chart-panel large-chart forecast-main-chart">
              <ResponsiveContainer width="100%" height={440}>
                <ComposedChart data={chartData} margin={CHART_MARGIN_LARGE}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="date" {...XAXIS_PROPS} tickFormatter={formatMonth} />
                  <YAxis {...YAXIS_PROPS} tickFormatter={(value) => formatMetricValue(value, result.unit, true)} />
                  <Tooltip content={<ForecastTooltip unit={result.unit} />} />
                  <Legend {...LEGEND_PROPS} />
                  <Area type="monotone" dataKey="range" name="Estimated Forecast Range" fill="#38bdf8" fillOpacity={0.16} stroke="none" connectNulls />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="#159a9c" strokeWidth={3} dot={{ r: 2.5 }} connectNulls />
                  <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#1376a8" strokeWidth={3} strokeDasharray="8 6" dot={{ r: 4 }} connectNulls />
                  <ReferenceLine
                    x={firstForecast?.date}
                    stroke="#d68a17"
                    strokeDasharray="4 4"
                    label={{ value: "FORECAST START", position: "insideTopRight", fill: "#a96b12", fontSize: 10 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="forecast-insight-strip">
            <div>
              <span>Business trend</span>
              <strong>{result.insights.summary}</strong>
            </div>
            <p>{result.insights.uncertainty}</p>
          </section>

          <section className="section">
            <div className="section-heading">
              <h3>Forecast Details</h3>
              <p>Monthly estimates with lower and upper ranges.</p>
            </div>
            <div className="panel table-panel">
              <div className="table-scroll">
                <table className="forecast-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Forecast</th>
                      <th>Lower range</th>
                      <th>Upper range</th>
                      <th>Change vs previous</th>
                      <th>Change vs latest actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastRows.map((row) => (
                      <tr key={row.date}>
                        <td><strong>{formatMonth(row.date)}</strong></td>
                        <td className="total-cell">{formatMetricValue(row.forecast, result.unit)}</td>
                        <td>{formatMetricValue(row.lower, result.unit)}</td>
                        <td>{formatMetricValue(row.upper, result.unit)}</td>
                        <td>{formatPercent(row.changePrevious)}</td>
                        <td>{formatPercent(row.changeLatest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="section forecast-model-grid">
            <div className="panel forecast-model-card">
              <div className="section-heading">
                <h3>Model Performance</h3>
                <p>Accuracy of the selected model on recent historical data.</p>
              </div>
              <div className="model-stat-grid">
                <div><span>Selected model</span><strong>{result.selected_model.name}</strong></div>
                <div><span>Selection metric</span><strong>{result.selected_model.selection_metric}</strong></div>
                <div><span>MAE</span><strong>{Number(result.selected_model.mae).toLocaleString("en-NZ")}</strong></div>
                <div><span>RMSE</span><strong>{Number(result.selected_model.rmse).toLocaleString("en-NZ")}</strong></div>
                <div><span>sMAPE</span><strong>{Number(result.selected_model.smape).toFixed(2)}%</strong></div>
                <div><span>Observations</span><strong>{result.metadata.observations}</strong></div>
                <div><span>Actual range</span><strong>{formatMonth(result.metadata.first_actual)} – {formatMonth(result.metadata.last_actual)}</strong></div>
                <div><span>Horizon</span><strong>{result.metadata.forecast_horizon} months</strong></div>
              </div>
            </div>
            <div className="panel chart-panel forecast-candidate-chart">
              <h4 className="chart-subtitle">Candidate MAE comparison</h4>
              <ResponsiveContainer width="100%" height={330}>
                <BarChart data={successfulCandidates} layout="vertical" margin={{ top: 6, right: 18, left: 12, bottom: 4 }}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis type="number" {...XAXIS_PROPS} />
                  <YAxis type="category" dataKey="name" {...YAXIS_PROPS} width={150} tick={{ fontSize: 10 }} />
                  <Tooltip {...TOOLTIP_PROPS} />
                  <Bar dataKey="mae" name="MAE" fill="#6d64c4" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="section">
            <div className="section-heading">
              <h3>Model Backtest</h3>
              <p>Predictions compared with known historical results.</p>
            </div>
            <div className="panel chart-panel large-chart">
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={result.backtest} margin={CHART_MARGIN_LARGE}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="date" {...XAXIS_PROPS} tickFormatter={formatMonth} />
                  <YAxis {...YAXIS_PROPS} tickFormatter={(value) => formatMetricValue(value, result.unit, true)} />
                  <Tooltip {...TOOLTIP_PROPS} labelFormatter={formatMonth} formatter={(value) => formatMetricValue(value, result.unit)} />
                  <Legend {...LEGEND_PROPS} />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="#159a9c" strokeWidth={2.6} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="predicted" name="Backtest Prediction" stroke="#6d64c4" strokeWidth={2.6} strokeDasharray="7 5" dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {result.source_contribution?.length > 0 && (
            <section className="section">
              <div className="section-heading">
                <h3>Historical Source Contribution</h3>
                <p>Monthly contribution by source.</p>
              </div>
              <div className="panel chart-panel large-chart">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={result.source_contribution} margin={CHART_MARGIN_LARGE}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="date" {...XAXIS_PROPS_ANGLED} tickFormatter={formatMonth} />
                    <YAxis {...YAXIS_PROPS} tickFormatter={(value) => formatMetricValue(value, result.unit, true)} />
                    <Tooltip {...TOOLTIP_PROPS} labelFormatter={formatMonth} formatter={(value) => formatMetricValue(value, result.unit)} />
                    <Legend {...LEGEND_PROPS} />
                    {sourceKeys.map((key, index) => (
                      <Bar key={key} dataKey={key} stackId="sources" fill={COLORS[index % COLORS.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {result.international_country_analysis?.length > 0 && (
            <section className="section">
              <div className="section-heading">
                <h3>Top Country Forecast Analysis</h3>
                <p>Top countries by historical value, forecast only where sufficient monthly history exists.</p>
              </div>
              <div className="country-forecast-grid">
                {result.international_country_analysis.map((country) => (
                  <article className="panel country-forecast-card" key={country.key}>
                    <span>{country.country}</span>
                    <strong>{formatMetricValue(country.historical_total, "currency")}</strong>
                    <small>Historical total</small>
                    {country.forecast ? (
                      <div>
                        <span>{formatMonth(country.forecast[country.forecast.length - 1].date)} forecast</span>
                        <b>{formatMetricValue(country.forecast[country.forecast.length - 1].forecast, "currency")}</b>
                      </div>
                    ) : (
                      <em>Insufficient data</em>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="section">
            <details className="panel forecast-audit-details">
              <summary>All models tested</summary>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Candidate</th><th>Status</th><th>MAE</th><th>RMSE</th><th>sMAPE</th><th>Reason</th></tr></thead>
                  <tbody>
                    {result.candidate_models.map((model) => (
                      <tr key={model.name}>
                        <td><strong>{model.name}</strong></td>
                        <td><span className={`model-status ${model.status}`}>{model.status}</span></td>
                        <td>{model.mae ?? "—"}</td>
                        <td>{model.rmse ?? "—"}</td>
                        <td>{model.smape === null || model.smape === undefined ? "—" : `${model.smape}%`}</td>
                        <td>{model.reason || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        </>
      )}
    </div>
  );
}
