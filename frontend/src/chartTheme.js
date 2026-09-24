/** Shared Recharts styling — keeps every chart visually consistent. */

export const COLORS = [
  "#0ea5e9",
  "#10b981",
  "#6366f1",
  "#f43f5e",
  "#f59e0b",
  "#14b8a6",
  "#8b5cf6",
  "#ec4899",
];

export const CHART_SERIES = {
  primary: COLORS[0],
  success: COLORS[1],
  secondary: COLORS[2],
  warning: COLORS[4],
  accent: COLORS[5],
};

export const GRID_PROPS = {
  strokeDasharray: "4 4",
  vertical: false,
  stroke: "#e3ebf0",
  strokeOpacity: 0.9,
};

export const XAXIS_PROPS = {
  tick: { fill: "#6a8294", fontSize: 11, fontWeight: 500 },
  axisLine: { stroke: "#dce6ec" },
  tickLine: false,
  dy: 6,
};

export const XAXIS_PROPS_ANGLED = {
  ...XAXIS_PROPS,
  angle: -32,
  textAnchor: "end",
  height: 72,
  interval: 0,
};

export const YAXIS_PROPS = {
  tick: { fill: "#6a8294", fontSize: 11, fontWeight: 500 },
  axisLine: false,
  tickLine: false,
  width: 56,
};

export const chartTooltipStyle = {
  background: "rgba(255, 255, 255, 0.98)",
  border: "1px solid #d8e4ec",
  borderRadius: "10px",
  color: "#142a3b",
  fontSize: "12px",
  fontWeight: 500,
  padding: "12px 14px",
  boxShadow: "0 12px 40px rgba(20, 42, 59, 0.16)",
};

export const TOOLTIP_PROPS = {
  contentStyle: chartTooltipStyle,
  cursor: { fill: "rgba(14, 165, 233, 0.08)", stroke: "rgba(14, 165, 233, 0.25)" },
  itemStyle: { color: "#496174", paddingTop: 2 },
  labelStyle: { color: "#142a3b", fontWeight: 600, marginBottom: 6 },
};

export const LEGEND_PROPS = {
  wrapperStyle: {
    fontSize: 11,
    color: "#496174",
    paddingTop: 14,
    fontWeight: 500,
  },
  iconType: "circle",
  iconSize: 8,
};

export const BAR_RADIUS = [6, 6, 0, 0];
export const BAR_RADIUS_STACK = [0, 0, 0, 0];

export const CHART_MARGIN = { top: 12, right: 12, left: 0, bottom: 4 };
export const CHART_MARGIN_LARGE = { top: 16, right: 16, left: 4, bottom: 8 };

export const LINE_DOT = { r: 3, strokeWidth: 2, fill: "#ffffff" };
export const LINE_ACTIVE_DOT = { r: 6, strokeWidth: 2 };

export const PIE_PROPS = {
  paddingAngle: 2,
  stroke: "#ffffff",
  strokeWidth: 2,
};
