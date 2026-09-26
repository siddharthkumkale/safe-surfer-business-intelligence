export const NAV_SECTIONS = [
  {
    title: "Dashboard",
    items: [
      { id: "overview", label: "Overview", icon: "grid" },
      { id: "active-subs", label: "Active Subs", icon: "activity" },
      { id: "trialists", label: "Trialists", icon: "users" },
      { id: "analysis", label: "Customer Analysis", icon: "chart" },
      { id: "details", label: "Detailed Data", icon: "table" },
    ],
  },
  {
    title: "Financial",
    items: [
      { id: "forecasting", label: "Forecasting", icon: "forecast" },
      { id: "international", label: "International", icon: "globe" },
    ],
  },
];

export const PAGE_META = {
  overview: {
    title: "Subscription Overview",
    subtitle: "Active customer and subscription analysis",
  },
  "active-subs": {
    title: "Active Subscriptions",
    subtitle: "Monthly active subscription performance",
  },
  trialists: {
    title: "Trialists",
    subtitle: "Trialist acquisition and conversion performance",
  },
  analysis: {
    title: "Customer Analysis",
    subtitle: "Active subscriptions by source, billing type and geography",
  },
  details: {
    title: "Detailed Data",
    subtitle: "Detailed data read from the Excel calculation layer",
  },
  revenue: {
    title: "Revenue",
    subtitle: "Revenue performance and financial analysis",
  },
  mrr: {
    title: "MRR",
    subtitle: "Monthly recurring revenue analysis",
  },
  forecasting: {
    title: "Financial Forecasting",
    subtitle: "Forward-looking analysis generated from historical Safe Surfer business data",
  },
  international: {
    title: "International",
    subtitle: "International income by source and top countries",
  },
};
