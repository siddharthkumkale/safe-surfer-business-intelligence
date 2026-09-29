import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import AppHeader from "./components/AppHeader";
import PageHeader from "./components/PageHeader";
import Sidebar from "./components/Sidebar";
import ForecastingPage from "./components/forecasting/ForecastingPage";
import { DASHBOARD_API_URL } from "./api";
import {
  BAR_RADIUS,
  BAR_RADIUS_STACK,
  CHART_MARGIN,
  CHART_MARGIN_LARGE,
  CHART_SERIES,
  COLORS,
  GRID_PROPS,
  LEGEND_PROPS,
  LINE_ACTIVE_DOT,
  LINE_DOT,
  PIE_PROPS,
  TOOLTIP_PROPS,
  XAXIS_PROPS,
  XAXIS_PROPS_ANGLED,
  YAXIS_PROPS,
} from "./chartTheme";

import "./index.css";

const formatNumber = (value) =>
  Number(value ?? 0).toLocaleString("en-NZ");

const formatCurrency = (value) =>
  `$${Number(value ?? 0).toLocaleString("en-NZ")}`;

const INCOME_SOURCE_LABELS = {
  licensing: "Licensing",
  marketing_support: "Marketing Support",
  other: "Other",
  product_sales: "Product Sales",
  shipping: "Shipping",
  apple: "Apple",
  google: "Google",
  website_stripe: "Website (Stripe)",
  invoices: "Invoices",
  resellers: "Resellers",
};

const INCOME_SOURCE_KEYS = [
  "licensing",
  "marketing_support",
  "other",
  "product_sales",
  "shipping",
  "apple",
  "google",
  "website_stripe",
  "invoices",
  "resellers",
];

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [trialistMonthFilter, setTrialistMonthFilter] = useState("all");
  const [trialistSourceFilter, setTrialistSourceFilter] = useState("all");
  const [internationalMonthFilter, setInternationalMonthFilter] =
    useState("all");

  async function loadDashboard(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(DASHBOARD_API_URL);

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.dashboard) {
        throw new Error("Invalid dashboard response");
      }

      setDashboard(result.dashboard);
    } catch (err) {
      setError(err.message || "Unable to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    // Loading on mount is the intended external synchronization for this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    void loadDashboard();
  }, []);

  // Convert optional API sections into predictable arrays before rendering charts.
  const summary = dashboard?.summary || {};

  const total = summary.total_subscriptions || {};
  const chargeBee = summary.cb_total || {};
  const google = summary.google || {};
  const invoices = summary.invoices || {};

  const activeDetails = Array.isArray(dashboard?.active_details)
    ? dashboard.active_details
    : [];
  const activeSubs = Array.isArray(dashboard?.active_subs)
    ? dashboard.active_subs
    : Array.isArray(dashboard?.active_subs?.data)
    ? dashboard.active_subs.data
    : [];

  const latestActiveSubs =
    activeSubs.length > 0
      ? activeSubs[activeSubs.length - 1]
      : null;
  const activeSubsChartData = activeSubs.map((item) => ({
    label: item.label || `${item.month || ""} ${item.year || ""}`,
    active: Number(item.active || 0),
    nonRenewing: Number(item.non_renewing || 0),
    balance: Number(item.balance || 0),
  }));
  const trialists = dashboard?.trialists || {};

  const trialistDetails = Array.isArray(trialists.details)
    ? trialists.details
    : [];

  const trialistMonthly = Array.isArray(trialists.monthly)
    ? trialists.monthly
    : [];

  const trialistSources = Array.isArray(trialists.sources)
    ? trialists.sources
    : [];

  const latestTrialists =
    trialists.latest ||
    (trialistMonthly.length > 0
      ? trialistMonthly[trialistMonthly.length - 1]
      : null);

  const trialistMonthlyChartData = trialistMonthly.map((item) => ({
    label: item.label || `${item.month || ""} ${item.year || ""}`.trim(),
    year: item.year,
    month: item.month,
    total: Number(item.total || 0),
    converted: Number(item.converted || 0),
    thisMonth: Number(item.this_month || 0),
    next7Days: Number(item.next_7_days || 0),
    noResponse: Number(item.no_response || 0),
    conversionRate: Number(item.conversion_rate || 0),
    notConvertedRate:
      Number(item.total || 0) > 0
        ? (Number(item.no_response || 0) / Number(item.total || 0)) * 100
        : 0,
    immediateRate:
      Number(item.total || 0) > 0
        ? (Number(item.this_month || 0) / Number(item.total || 0)) * 100
        : 0,
    delayedRate:
      Number(item.total || 0) > 0
        ? (Number(item.next_7_days || 0) / Number(item.total || 0)) * 100
        : 0,
  }));

  const trialistSourceChartData = trialistSources.map((item) => ({
    name: item.source || "Unknown",
    total: Number(item.total || 0),
    converted: Number(item.converted || 0),
    thisMonth: Number(item.this_month || 0),
    next7Days: Number(item.next_7_days || 0),
    noResponse: Number(item.no_response || 0),
    conversionRate: Number(item.conversion_rate || 0),
  }));

  const selectedTrialistMonth =
    trialistMonthFilter === "all"
      ? null
      : trialistMonthlyChartData.find(
          (item) => item.label === trialistMonthFilter
        ) || null;

  const filteredTrialistDetails = trialistDetails.filter((item) => {
    const itemLabel =
      item.label || `${item.month || ""} ${item.year || ""}`.trim();

    const monthMatches =
      trialistMonthFilter === "all" ||
      itemLabel === trialistMonthFilter;

    const sourceMatches =
      trialistSourceFilter === "all" ||
      item.source === trialistSourceFilter;

    return monthMatches && sourceMatches;
  });

  const filteredTrialistMonthlyData =
    trialistMonthFilter === "all"
      ? trialistMonthlyChartData
      : trialistMonthlyChartData.filter(
          (item) => item.label === trialistMonthFilter
        );

  const trialistSourceMonthlyData = trialistMonthlyChartData.map((month) => {
    const row = {
      label: month.label,
      "CB iOS": 0,
      "CB Web": 0,
      Google: 0,
    };

    trialistDetails
      .filter((item) => {
        const itemLabel =
          item.label || `${item.month || ""} ${item.year || ""}`.trim();
        return itemLabel === month.label;
      })
      .forEach((item) => {
        if (Object.prototype.hasOwnProperty.call(row, item.source)) {
          row[item.source] = Number(item.converted || 0);
        }
      });

    return row;
  });

  const trialistSourceRateData = trialistSourceChartData.map((item) => ({
    name: item.name,
    conversionRate: Number(item.conversionRate || 0),
    notConvertedRate:
      item.total > 0 ? (item.noResponse / item.total) * 100 : 0,
  }));

  const trialistConversionMixData = [
    {
      name: "Converted This Month",
      value: Number(
        selectedTrialistMonth?.thisMonth ??
          latestTrialists?.this_month ??
          0
      ),
    },
    {
      name: "Converted Next 1–7 Days",
      value: Number(
        selectedTrialistMonth?.next7Days ??
          latestTrialists?.next_7_days ??
          0
      ),
    },
    {
      name: "Not Converted",
      value: Number(
        selectedTrialistMonth?.noResponse ??
          latestTrialists?.no_response ??
          0
      ),
    },
  ];

  const trialistMoMData = trialistMonthlyChartData.map((item, index) => {
    const previous = trialistMonthlyChartData[index - 1];

    const trialistGrowth =
      previous && previous.total
        ? ((item.total - previous.total) / previous.total) * 100
        : 0;

    const convertedGrowth =
      previous && previous.converted
        ? ((item.converted - previous.converted) / previous.converted) * 100
        : 0;

    return {
      label: item.label,
      trialistGrowth,
      convertedGrowth,
    };
  });

  const trialistTotals = filteredTrialistDetails.reduce(
    (acc, item) => {
      acc.total += Number(item.total || 0);
      acc.thisMonth += Number(item.this_month || 0);
      acc.next7Days += Number(item.next_7_days || 0);
      acc.converted += Number(item.converted || 0);
      acc.noResponse += Number(item.no_response || 0);
      return acc;
    },
    {
      total: 0,
      thisMonth: 0,
      next7Days: 0,
      converted: 0,
      noResponse: 0,
    }
  );

  const trialistFilteredConversionRate =
    trialistTotals.total > 0
      ? (trialistTotals.converted / trialistTotals.total) * 100
      : 0;

  const latestTrialistDisplay =
    selectedTrialistMonth || latestTrialists || {};
  const international = dashboard?.international || {};
  const intlIncome = international.income || {};
  const intlCountries = international.countries || {};

  const intlIncomeMonthly = Array.isArray(intlIncome.monthly)
    ? intlIncome.monthly
    : [];

  const intlIncomeSources = Array.isArray(intlIncome.sources)
    ? intlIncome.sources
    : [];

  const intlCountryMonthly = Array.isArray(intlCountries.monthly)
    ? intlCountries.monthly
    : [];

  const intlCountryTotals = Array.isArray(intlCountries.totals)
    ? intlCountries.totals
    : [];

  const latestIntlIncome =
    intlIncome.latest ||
    (intlIncomeMonthly.length > 0
      ? intlIncomeMonthly[intlIncomeMonthly.length - 1]
      : null);

  const latestIntlCountries =
    intlCountries.latest ||
    (intlCountryMonthly.length > 0
      ? intlCountryMonthly[intlCountryMonthly.length - 1]
      : null);

  const intlIncomeChartData = intlIncomeMonthly.map((item) => ({
    label: item.label,
    total: Number(item.total || 0),
    licensing: Number(item.licensing || 0),
    marketing_support: Number(item.marketing_support || 0),
    other: Number(item.other || 0),
    product_sales: Number(item.product_sales || 0),
    shipping: Number(item.shipping || 0),
    apple: Number(item.apple || 0),
    google: Number(item.google || 0),
    website_stripe: Number(item.website_stripe || 0),
    invoices: Number(item.invoices || 0),
    resellers: Number(item.resellers || 0),
  }));

  const selectedIntlMonth =
    internationalMonthFilter === "all"
      ? null
      : intlIncomeChartData.find(
          (item) => item.label === internationalMonthFilter
        ) || null;

  const intlDisplayMonth = selectedIntlMonth || latestIntlIncome || {};

  const intlSourcePieData = INCOME_SOURCE_KEYS.map((key) => ({
    name: INCOME_SOURCE_LABELS[key],
    value: Number(intlDisplayMonth[key] || 0),
  })).filter((item) => item.value > 0);

  const selectedIntlCountryMonth =
    internationalMonthFilter === "all"
      ? latestIntlCountries
      : intlCountryMonthly.find(
          (item) => item.label === internationalMonthFilter
        ) || latestIntlCountries;

  const intlTopCountriesData = (
    selectedIntlCountryMonth?.countries || []
  )
    .filter((item) => item.country.toLowerCase() !== "total")
    .slice(0, 10)
    .map((item) => ({
      name: item.country,
      value: Number(item.total || 0),
    }));

  const intlMoMData = intlIncomeChartData.map((item, index) => {
    const previous = intlIncomeChartData[index - 1];
    const growth =
      previous && previous.total
        ? ((item.total - previous.total) / previous.total) * 100
        : 0;

    return {
      label: item.label,
      growth,
    };
  });

  const topIntlCountryNames = intlCountryTotals
    .slice(0, 5)
    .map((item) => item.country);

  const intlCountryTrendData = intlCountryMonthly.map((month) => {
    const row = { label: month.label };

    topIntlCountryNames.forEach((name) => {
      const match = month.countries.find(
        (country) => country.country === name
      );
      row[name] = Number(match?.total || 0);
    });

    return row;
  });

  const topIntlIncomeSource = intlIncomeSources[0] || null;
  const topIntlCountry = intlCountryTotals[0] || null;
  const billingData = [
    {
      name: "Monthly",
      value: Number(total.monthly || 0),
    },
    {
      name: "Annual",
      value: Number(total.annual || 0),
    },
  ];

  const sourceData = [
    {
      name: "ChargeBee",
      value: Number(chargeBee.total || 0),
    },
    {
      name: "Google",
      value: Number(google.total || 0),
    },
    {
      name: "Invoices",
      value: Number(invoices.total || 0),
    },
  ];

  const chargeBeeData = [
    {
      name: "CB OLD",
      value: Number(summary.cb_old?.total || 0),
    },
    {
      name: "CB NEW",
      value: Number(summary.cb_new?.total || 0),
    },
  ];

  const geographicData = [
    {
      name: "Monthly",
      nz: Number(total.nz_monthly || 0),
      overseas: Number(total.os_monthly || 0),
    },
    {
      name: "Annual",
      nz: Number(total.nz_annual || 0),
      overseas: Number(total.os_annual || 0),
    },
  ];
  const findCustomer = (name, status) => {
    return activeDetails.find(
      (item) =>
        String(item.active || "").trim().toLowerCase() ===
          String(name).trim().toLowerCase() &&
        String(item.status || "").trim().toLowerCase() ===
          String(status).trim().toLowerCase()
    );
  };

  const getCustomerValue = (name, status, field) => {
    return Number(findCustomer(name, status)?.[field] || 0);
  };
  const sourceCustomerData = [
    {
      name: "iOS",
      value:
        getCustomerValue("iOS", "Old", "total") +
        getCustomerValue("iOS", "New", "total"),
    },
    {
      name: "Web",
      value:
        getCustomerValue("Web", "Old", "total") +
        getCustomerValue("Web", "New", "total"),
    },
    {
      name: "KSD",
      value:
        getCustomerValue("KSD", "Old", "total") +
        getCustomerValue("KSD", "New", "total"),
    },
    {
      name: "Bus",
      value:
        getCustomerValue("Bus", "Old", "total") +
        getCustomerValue("Bus", "New", "total"),
    },
    {
      name: "Reseller",
      value:
        getCustomerValue("Reseller", "Old", "total") +
        getCustomerValue("Reseller", "New", "total"),
    },
    {
      name: "Family",
      value: getCustomerValue("Family", "Google", "total"),
    },
    {
      name: "Minor",
      value: getCustomerValue("Minor", "Google", "total"),
    },
    {
      name: "Inv",
      value: getCustomerValue(
        "Inv 00 A/c",
        "00 A/c",
        "total"
      ),
    },
  ];
  const sourceNzOsData = [
    {
      name: "iOS",
      nzMonthly:
        getCustomerValue("iOS", "Old", "nz_monthly") +
        getCustomerValue("iOS", "New", "nz_monthly"),
      osMonthly:
        getCustomerValue("iOS", "Old", "os_monthly") +
        getCustomerValue("iOS", "New", "os_monthly"),
      nzAnnual:
        getCustomerValue("iOS", "Old", "nz_annual") +
        getCustomerValue("iOS", "New", "nz_annual"),
      osAnnual:
        getCustomerValue("iOS", "Old", "os_annual") +
        getCustomerValue("iOS", "New", "os_annual"),
    },

    {
      name: "Web",
      nzMonthly:
        getCustomerValue("Web", "Old", "nz_monthly") +
        getCustomerValue("Web", "New", "nz_monthly"),
      osMonthly:
        getCustomerValue("Web", "Old", "os_monthly") +
        getCustomerValue("Web", "New", "os_monthly"),
      nzAnnual:
        getCustomerValue("Web", "Old", "nz_annual") +
        getCustomerValue("Web", "New", "nz_annual"),
      osAnnual:
        getCustomerValue("Web", "Old", "os_annual") +
        getCustomerValue("Web", "New", "os_annual"),
    },

    {
      name: "KSD",
      nzMonthly:
        getCustomerValue("KSD", "Old", "nz_monthly") +
        getCustomerValue("KSD", "New", "nz_monthly"),
      osMonthly:
        getCustomerValue("KSD", "Old", "os_monthly") +
        getCustomerValue("KSD", "New", "os_monthly"),
      nzAnnual:
        getCustomerValue("KSD", "Old", "nz_annual") +
        getCustomerValue("KSD", "New", "nz_annual"),
      osAnnual:
        getCustomerValue("KSD", "Old", "os_annual") +
        getCustomerValue("KSD", "New", "os_annual"),
    },

    {
      name: "Bus",
      nzMonthly:
        getCustomerValue("Bus", "Old", "nz_monthly") +
        getCustomerValue("Bus", "New", "nz_monthly"),
      osMonthly:
        getCustomerValue("Bus", "Old", "os_monthly") +
        getCustomerValue("Bus", "New", "os_monthly"),
      nzAnnual:
        getCustomerValue("Bus", "Old", "nz_annual") +
        getCustomerValue("Bus", "New", "nz_annual"),
      osAnnual:
        getCustomerValue("Bus", "Old", "os_annual") +
        getCustomerValue("Bus", "New", "os_annual"),
    },

    {
      name: "Reseller",
      nzMonthly:
        getCustomerValue("Reseller", "Old", "nz_monthly") +
        getCustomerValue("Reseller", "New", "nz_monthly"),
      osMonthly:
        getCustomerValue("Reseller", "Old", "os_monthly") +
        getCustomerValue("Reseller", "New", "os_monthly"),
      nzAnnual:
        getCustomerValue("Reseller", "Old", "nz_annual") +
        getCustomerValue("Reseller", "New", "nz_annual"),
      osAnnual:
        getCustomerValue("Reseller", "Old", "os_annual") +
        getCustomerValue("Reseller", "New", "os_annual"),
    },

    {
      name: "Family",
      nzMonthly: getCustomerValue(
        "Family",
        "Google",
        "nz_monthly"
      ),
      osMonthly: getCustomerValue(
        "Family",
        "Google",
        "os_monthly"
      ),
      nzAnnual: getCustomerValue(
        "Family",
        "Google",
        "nz_annual"
      ),
      osAnnual: getCustomerValue(
        "Family",
        "Google",
        "os_annual"
      ),
    },

    {
      name: "Minor",
      nzMonthly: getCustomerValue(
        "Minor",
        "Google",
        "nz_monthly"
      ),
      osMonthly: getCustomerValue(
        "Minor",
        "Google",
        "os_monthly"
      ),
      nzAnnual: getCustomerValue(
        "Minor",
        "Google",
        "nz_annual"
      ),
      osAnnual: getCustomerValue(
        "Minor",
        "Google",
        "os_annual"
      ),
    },

    {
      name: "Inv",
      nzMonthly: getCustomerValue(
        "Inv 00 A/c",
        "00 A/c",
        "nz_monthly"
      ),
      osMonthly: getCustomerValue(
        "Inv 00 A/c",
        "00 A/c",
        "os_monthly"
      ),
      nzAnnual: getCustomerValue(
        "Inv 00 A/c",
        "00 A/c",
        "nz_annual"
      ),
      osAnnual: getCustomerValue(
        "Inv 00 A/c",
        "00 A/c",
        "os_annual"
      ),
    },
  ];
  const sourceBillingData = [
    {
      name: "iOS",
      monthly:
        getCustomerValue("iOS", "Old", "monthly") +
        getCustomerValue("iOS", "New", "monthly"),
      annual:
        getCustomerValue("iOS", "Old", "annual") +
        getCustomerValue("iOS", "New", "annual"),
    },

    {
      name: "Web",
      monthly:
        getCustomerValue("Web", "Old", "monthly") +
        getCustomerValue("Web", "New", "monthly"),
      annual:
        getCustomerValue("Web", "Old", "annual") +
        getCustomerValue("Web", "New", "annual"),
    },

    {
      name: "KSD",
      monthly:
        getCustomerValue("KSD", "Old", "monthly") +
        getCustomerValue("KSD", "New", "monthly"),
      annual:
        getCustomerValue("KSD", "Old", "annual") +
        getCustomerValue("KSD", "New", "annual"),
    },

    {
      name: "Bus",
      monthly:
        getCustomerValue("Bus", "Old", "monthly") +
        getCustomerValue("Bus", "New", "monthly"),
      annual:
        getCustomerValue("Bus", "Old", "annual") +
        getCustomerValue("Bus", "New", "annual"),
    },

    {
      name: "Reseller",
      monthly:
        getCustomerValue("Reseller", "Old", "monthly") +
        getCustomerValue("Reseller", "New", "monthly"),
      annual:
        getCustomerValue("Reseller", "Old", "annual") +
        getCustomerValue("Reseller", "New", "annual"),
    },

    {
      name: "Family",
      monthly: getCustomerValue(
        "Family",
        "Google",
        "monthly"
      ),
      annual: getCustomerValue(
        "Family",
        "Google",
        "annual"
      ),
    },

    {
      name: "Minor",
      monthly: getCustomerValue(
        "Minor",
        "Google",
        "monthly"
      ),
      annual: getCustomerValue(
        "Minor",
        "Google",
        "annual"
      ),
    },

    {
      name: "Inv",
      monthly: getCustomerValue(
        "Inv 00 A/c",
        "00 A/c",
        "monthly"
      ),
      annual: getCustomerValue(
        "Inv 00 A/c",
        "00 A/c",
        "annual"
      ),
    },
  ];
  const oldNewData = [
    {
      name: "CB OLD",
      monthly: Number(summary.cb_old?.monthly || 0),
      annual: Number(summary.cb_old?.annual || 0),
    },

    {
      name: "CB NEW",
      monthly: Number(summary.cb_new?.monthly || 0),
      annual: Number(summary.cb_new?.annual || 0),
    },

    {
      name: "GOOGLE",
      monthly: Number(google.monthly || 0),
      annual: Number(google.annual || 0),
    },

    {
      name: "INVOICES",
      monthly: Number(invoices.monthly || 0),
      annual: Number(invoices.annual || 0),
    },
  ];
  if (loading) {
    return (
      <div className="screen">
        <div className="loading-card">
          <div className="spinner"></div>

          <div className="loading-logo">SS</div>

          <h1>Safe Surfer</h1>

          <p>Loading financial dashboard...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="screen">
        <div className="error-card">
          <div className="error-icon">!</div>

          <h1>Dashboard Error</h1>

          <p>{error}</p>

          <button
            className="primary-button"
            onClick={() => loadDashboard(false)}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="main-content">
        <AppHeader
          refreshing={refreshing}
          onRefresh={() => loadDashboard(true)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="content">
        <PageHeader activeTab={activeTab} />
        {activeTab === "overview" && (
          <>
            <section className="kpi-grid">

              <div className="kpi-card primary">

                <span>
                  Total Active
                </span>

                <strong>
                  {formatNumber(total.total)}
                </strong>

                <small>
                  All active subscriptions
                </small>

              </div>

              <div className="kpi-card accent-teal">

                <span>
                  ChargeBee
                </span>

                <strong>
                  {formatNumber(chargeBee.total)}
                </strong>

                <small>
                  ChargeBee subscriptions
                </small>

              </div>

              <div className="kpi-card accent-violet">

                <span>
                  Google
                </span>

                <strong>
                  {formatNumber(google.total)}
                </strong>

                <small>
                  Google subscriptions
                </small>

              </div>

              <div className="kpi-card accent-amber">

                <span>
                  Invoices
                </span>

                <strong>
                  {formatNumber(invoices.total)}
                </strong>

                <small>
                  Invoice subscriptions
                </small>

              </div>

            </section>
            <section className="section">

              <div className="section-heading">

                <h3>
                  Billing Structure
                </h3>

                <p>
                  Monthly versus annual active subscriptions
                </p>

              </div>

              <div className="two-column">

                <div className="panel chart-panel">

                  <h4 className="chart-subtitle">
                    Subscription billing mix
                  </h4>

                  <ResponsiveContainer
                    width="100%"
                    height={320}
                  >

                    <BarChart data={billingData} margin={CHART_MARGIN}>

                      <CartesianGrid {...GRID_PROPS} />

                      <XAxis
                        dataKey="name"
                        {...XAXIS_PROPS}
                      />

                      <YAxis
                        {...YAXIS_PROPS}
                        tickFormatter={formatNumber}
                      />

                      <Tooltip
                        {...TOOLTIP_PROPS}
                        formatter={(value) =>
                          formatNumber(value)
                        }
                      />

                      <Bar
                        dataKey="value"
                        name="Subscriptions"
                        fill={COLORS[0]}
                        radius={BAR_RADIUS}
                      />

                    </BarChart>

                  </ResponsiveContainer>

                </div>

                <div className="stats-panel">

                  <div className="metric">

                    <span>
                      Monthly
                    </span>

                    <strong>
                      {formatNumber(total.monthly)}
                    </strong>

                  </div>

                  <div className="metric">

                    <span>
                      Annual
                    </span>

                    <strong>
                      {formatNumber(total.annual)}
                    </strong>

                  </div>

                  <div className="metric highlight">

                    <span>
                      Total
                    </span>

                    <strong>
                      {formatNumber(total.total)}
                    </strong>

                  </div>

                </div>

              </div>

            </section>
            <section className="section">

              <div className="section-heading">

                <h3>
                  Subscription Sources
                </h3>

                <p>
                  Active subscriptions by source
                </p>

              </div>

              <div className="two-column">

                <div className="panel chart-panel">

                  <h4 className="chart-subtitle">
                    Share by platform
                  </h4>

                  <ResponsiveContainer
                    width="100%"
                    height={360}
                  >

                    <PieChart>

                      <Pie
                        data={sourceData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={78}
                        outerRadius={122}
                        paddingAngle={PIE_PROPS.paddingAngle}
                        stroke={PIE_PROPS.stroke}
                        strokeWidth={PIE_PROPS.strokeWidth}
                      >

                        {sourceData.map(
                          (entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={COLORS[index % COLORS.length]}
                            />
                          )
                        )}

                      </Pie>

                      <Tooltip
                        {...TOOLTIP_PROPS}
                        formatter={(value) =>
                          formatNumber(value)
                        }
                      />

                      <Legend {...LEGEND_PROPS} />

                    </PieChart>

                  </ResponsiveContainer>

                </div>

                <div className="source-list">

                  <div className="source-item">

                    <div>

                      <span>
                        ChargeBee
                      </span>

                      <small>
                        Primary subscription platform
                      </small>

                    </div>

                    <strong>
                      {formatNumber(chargeBee.total)}
                    </strong>

                  </div>

                  <div className="source-item">

                    <div>

                      <span>
                        Google
                      </span>

                      <small>
                        Google subscriptions
                      </small>

                    </div>

                    <strong>
                      {formatNumber(google.total)}
                    </strong>

                  </div>

                  <div className="source-item">

                    <div>

                      <span>
                        Invoices
                      </span>

                      <small>
                        Invoice-based subscriptions
                      </small>

                    </div>

                    <strong>
                      {formatNumber(invoices.total)}
                    </strong>

                  </div>

                </div>

              </div>

            </section>
            <section className="section">

              <div className="section-heading">

                <h3>
                  Geographic Distribution
                </h3>

                <p>
                  New Zealand versus overseas subscriptions
                </p>

              </div>

              <div className="panel chart-panel">

                <ResponsiveContainer
                  width="100%"
                  height={350}
                >

                  <BarChart data={geographicData}>

                    <CartesianGrid {...GRID_PROPS} />

                    <XAxis
                      dataKey="name"
                      {...XAXIS_PROPS}
                    />

                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={formatNumber}
                    />

                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) =>
                        formatNumber(value)
                      }
                    />

                    <Legend {...LEGEND_PROPS} />

                    <Bar
                      dataKey="nz"
                      name="New Zealand"
                      fill={COLORS[1]}
                      radius={BAR_RADIUS}
                    />

                    <Bar
                      dataKey="overseas"
                      name="Overseas"
                      fill={CHART_SERIES.warning}
                      radius={BAR_RADIUS}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </section>
            <section className="section">

              <div className="section-heading">

                <h3>
                  ChargeBee Customer Base
                </h3>

                <p>
                  Existing versus new ChargeBee customers
                </p>

              </div>

              <div className="panel chart-panel">

                <ResponsiveContainer
                  width="100%"
                  height={320}
                >

                  <BarChart data={chargeBeeData}>

                    <CartesianGrid {...GRID_PROPS} />

                    <XAxis
                      dataKey="name"
                      {...XAXIS_PROPS}
                    />

                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={formatNumber}
                    />

                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) =>
                        formatNumber(value)
                      }
                    />

                    <Bar
                      dataKey="value"
                      name="Customers"
                      fill="#818cf8"
                      radius={BAR_RADIUS}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </section>

          </>
        )}
        {activeTab === "active-subs" && (
          <>
            <section className="kpi-grid">

              <div className="kpi-card primary">

                <span>
                  Current Active
                </span>

                <strong>
                  {formatNumber(
                    latestActiveSubs?.active
                  )}
                </strong>

                <small>
                  Latest active subscriptions
                </small>

              </div>

              <div className="kpi-card">

                <span>
                  Balance
                </span>

                <strong>
                  {formatNumber(
                    latestActiveSubs?.balance
                  )}
                </strong>

                <small>
                  Current subscription balance
                </small>

              </div>

              <div className="kpi-card">

                <span>
                  Non-Renewing
                </span>

                <strong>
                  {formatNumber(
                    latestActiveSubs?.non_renewing
                  )}
                </strong>

                <small>
                  Latest non-renewing subscriptions
                </small>

              </div>

              <div className="kpi-card">

                <span>
                  Reporting Period
                </span>

                <strong>
                  {latestActiveSubs?.label || "—"}
                </strong>

                <small>
                  Most recent reporting month
                </small>

              </div>

            </section>
            <section className="section">

              <div className="section-heading">

                <h3>
                  Active Subscriptions
                </h3>

                <p>
                  Monthly active subscription performance
                </p>

              </div>

              <div className="panel chart-panel large-chart">

                <ResponsiveContainer
                  width="100%"
                  height={430}
                >

                  <BarChart
                    data={activeSubsChartData}
                    margin={CHART_MARGIN_LARGE}
                  >

                    <CartesianGrid {...GRID_PROPS} />

                    <XAxis
                      dataKey="label"
                      {...XAXIS_PROPS}
                    />

                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={formatNumber}
                    />

                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) =>
                        formatNumber(value)
                      }
                    />

                    <Bar
                      dataKey="active"
                      name="Active"
                      fill={COLORS[0]}
                      radius={BAR_RADIUS}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </section>
            <section className="section">

              <div className="section-heading">

                <h3>
                  Non-Renewing Subscriptions
                </h3>

                <p>
                  Monthly subscriptions marked as non-renewing
                </p>

              </div>

              <div className="panel chart-panel large-chart">

                <ResponsiveContainer
                  width="100%"
                  height={400}
                >

                  <BarChart
                    data={activeSubsChartData}
                    margin={CHART_MARGIN_LARGE}
                  >

                    <CartesianGrid {...GRID_PROPS} />

                    <XAxis
                      dataKey="label"
                      {...XAXIS_PROPS}
                    />

                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={formatNumber}
                    />

                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) =>
                        formatNumber(value)
                      }
                    />

                    <Bar
                      dataKey="nonRenewing"
                      name="Non-Renewing"
                      fill="#f59e0b"
                      radius={BAR_RADIUS}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </section>
            <section className="section">

              <div className="section-heading">

                <h3>
                  Subscription Balance
                </h3>

                <p>
                  Monthly active balance after non-renewing subscriptions
                </p>

              </div>

              <div className="panel chart-panel large-chart">

                <ResponsiveContainer
                  width="100%"
                  height={400}
                >

                  <BarChart
                    data={activeSubsChartData}
                    margin={CHART_MARGIN_LARGE}
                  >

                    <CartesianGrid {...GRID_PROPS} />

                    <XAxis
                      dataKey="label"
                      {...XAXIS_PROPS}
                    />

                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={formatNumber}
                    />

                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) =>
                        formatNumber(value)
                      }
                    />

                    <Bar
                      dataKey="balance"
                      name="Balance"
                      fill={COLORS[1]}
                      radius={BAR_RADIUS}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </section>
            <section className="section">

              <div className="section-heading">

                <h3>
                  Monthly Active Subscriptions
                </h3>

                <p>
                  Historical active subscription data from
                  Active Subs &amp; Graphics.xlsx
                </p>

              </div>

              <div className="panel table-panel">

                <div className="table-scroll">

                  <table>

                    <thead>

                      <tr>
                        <th>Year</th>
                        <th>Month</th>
                        <th>Active</th>
                        <th>Non-Renewing</th>
                        <th>Balance</th>
                      </tr>

                    </thead>

                    <tbody>

                      {activeSubs.map(
                        (item, index) => (

                          <tr
                            key={
                              item.row ||
                              `${item.year}-${item.month}-${index}`
                            }
                          >

                            <td>
                              {item.year}
                            </td>

                            <td>
                              <strong>
                                {item.month}
                              </strong>
                            </td>

                            <td>
                              {formatNumber(
                                item.active
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                item.non_renewing
                              )}
                            </td>

                            <td className="total-cell">
                              {formatNumber(
                                item.balance
                              )}
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </section>

          </>
        )}
        {activeTab === "trialists" && (
          <>
            <section className="section">
              <div className="panel filter-panel">
                <div className="filter-bar">
                  <strong className="filter-bar-label">
                    Interactive view
                  </strong>

                  <select
                    value={trialistMonthFilter}
                    onChange={(event) =>
                      setTrialistMonthFilter(event.target.value)
                    }
                  >
                    <option value="all">All months</option>
                    {trialistMonthlyChartData.map((item) => (
                      <option key={item.label} value={item.label}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={trialistSourceFilter}
                    onChange={(event) =>
                      setTrialistSourceFilter(event.target.value)
                    }
                  >
                    <option value="all">All sources</option>
                    {trialistSourceChartData.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <button
                    className="refresh-btn"
                    onClick={() => {
                      setTrialistMonthFilter("all");
                      setTrialistSourceFilter("all");
                    }}
                  >
                    Reset filters
                  </button>

                  <span className="filter-bar-tip">
                    Tip: click a month or source bar to drill down
                  </span>
                </div>
              </div>
            </section>
            <section className="kpi-grid">

              <div className="kpi-card primary">
                <span>
                  {trialistMonthFilter === "all"
                    ? "Latest Total Trialists"
                    : "Selected Total Trialists"}
                </span>
                <strong>
                  {formatNumber(latestTrialistDisplay?.total)}
                </strong>
                <small>
                  {trialistMonthFilter === "all"
                    ? latestTrialistDisplay?.label || "Latest reporting month"
                    : trialistMonthFilter}
                </small>
              </div>

              <div className="kpi-card">
                <span>Active Trialists</span>
                <strong>
                  {formatNumber(latestTrialistDisplay?.converted)}
                </strong>
                <small>This month + next 1–7 days</small>
              </div>

              <div className="kpi-card">
                <span>Conversion Rate</span>
                <strong>
                  {Number(
                    latestTrialistDisplay?.conversionRate ??
                      latestTrialistDisplay?.conversion_rate ??
                      0
                  ).toFixed(2)}%
                </strong>
                <small>Active trialists ÷ total trialists</small>
              </div>

              <div className="kpi-card">
                <span>Not Converted</span>
                <strong>
                  {formatNumber(
                    latestTrialistDisplay?.noResponse ??
                      latestTrialistDisplay?.no_response
                  )}
                </strong>
                <small>Trialists with no conversion</small>
              </div>

            </section>
            <section className="section">
              <div className="section-heading">
                <h3>Total Trialists vs Active Trialists</h3>
                <p>
                  Mirrors Karen&apos;s Excel comparison of total trialists
                  against trialists active this month + 7 days
                </p>
              </div>

              <div className="panel chart-panel large-chart">
                <ResponsiveContainer width="100%" height={430}>
                  <BarChart
                    data={trialistMonthlyChartData}
                    onClick={(state) => {
                      const label = state?.activeLabel;
                      if (label) setTrialistMonthFilter(label);
                    }}
                    margin={CHART_MARGIN_LARGE}
                  >
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis
                      dataKey="label"
                      {...XAXIS_PROPS}
                    />
                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={formatNumber}
                    />
                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) => formatNumber(value)}
                    />
                    <Legend {...LEGEND_PROPS} />
                    <Bar
                      dataKey="total"
                      name="Total Trialists"
                      fill={COLORS[0]}
                      radius={[7, 7, 0, 0]}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="converted"
                      name="Active This Month + 7 Days"
                      fill={COLORS[1]}
                      radius={[7, 7, 0, 0]}
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="section">
              <div className="section-heading">
                <h3>Trialist Acquisition & Conversion Trend</h3>
                <p>
                  Business trend showing whether trialist acquisition and
                  successful conversions are moving together
                </p>
              </div>

              <div className="panel chart-panel large-chart">
                <ResponsiveContainer width="100%" height={410}>
                  <LineChart
                    data={trialistMonthlyChartData}
                    onClick={(state) => {
                      const label = state?.activeLabel;
                      if (label) setTrialistMonthFilter(label);
                    }}
                    margin={CHART_MARGIN_LARGE}
                  >
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis
                      dataKey="label"
                      {...XAXIS_PROPS}
                    />
                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={formatNumber}
                    />
                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) => formatNumber(value)}
                    />
                    <Legend {...LEGEND_PROPS} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Total Trialists"
                      stroke={CHART_SERIES.primary}
                      strokeWidth={2.5}
                      dot={LINE_DOT}
                      activeDot={{ ...LINE_ACTIVE_DOT, fill: CHART_SERIES.primary }}
                    />
                    <Line
                      type="monotone"
                      dataKey="converted"
                      name="Active / Converted"
                      stroke={CHART_SERIES.success}
                      strokeWidth={2.5}
                      dot={LINE_DOT}
                      activeDot={{ ...LINE_ACTIVE_DOT, fill: CHART_SERIES.success }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="section">
              <div className="section-heading">
                <h3>Trialist Outcome %</h3>
                <p>
                  Karen&apos;s percentage view: converted this month,
                  converted in the next 1–7 days, and no conversion
                </p>
              </div>

              <div className="panel chart-panel large-chart">
                <ResponsiveContainer width="100%" height={430}>
                  <BarChart
                    data={trialistMonthlyChartData}
                    onClick={(state) => {
                      const label = state?.activeLabel;
                      if (label) setTrialistMonthFilter(label);
                    }}
                    margin={CHART_MARGIN_LARGE}
                  >
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis
                      dataKey="label"
                      {...XAXIS_PROPS}
                    />
                    <YAxis
                      {...YAXIS_PROPS}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) => `${Number(value || 0).toFixed(2)}%`}
                    />
                    <Legend {...LEGEND_PROPS} />
                    <Bar
                      dataKey="immediateRate"
                      name="This Month %"
                      stackId="outcome"
                      fill={COLORS[1]}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="delayedRate"
                      name="Next 1–7 Days %"
                      stackId="outcome"
                      fill={COLORS[2]}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="notConvertedRate"
                      name="No %"
                      stackId="outcome"
                      fill="#f59e0b"
                      radius={[7, 7, 0, 0]}
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="section">
              <div className="section-heading">
                <h3>Conversion Timing</h3>
                <p>
                  Separates immediate conversions from conversions occurring
                  in the next 1–7 days
                </p>
              </div>

              <div className="two-column">

                <div className="panel chart-panel">
                  <h4 className="chart-subtitle">
                    Trialists This Month
                  </h4>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={trialistMonthlyChartData}
                      onClick={(state) => {
                        const label = state?.activeLabel;
                        if (label) setTrialistMonthFilter(label);
                      }}
                    >
                      <CartesianGrid {...GRID_PROPS} />
                      <XAxis
                        dataKey="label"
                        {...XAXIS_PROPS}
                      />
                      <YAxis
                        {...YAXIS_PROPS}
                        tickFormatter={formatNumber}
                      />
                      <Tooltip
                        {...TOOLTIP_PROPS}
                        formatter={(value) => formatNumber(value)}
                      />
                      <Bar
                        dataKey="thisMonth"
                        name="This Month"
                        fill={COLORS[1]}
                        radius={[7, 7, 0, 0]}
                        cursor="pointer"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="panel chart-panel">
                  <h4 className="chart-subtitle">
                    Next Month First 7 Days
                  </h4>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={trialistMonthlyChartData}
                      onClick={(state) => {
                        const label = state?.activeLabel;
                        if (label) setTrialistMonthFilter(label);
                      }}
                    >
                      <CartesianGrid {...GRID_PROPS} />
                      <XAxis
                        dataKey="label"
                        {...XAXIS_PROPS}
                      />
                      <YAxis
                        {...YAXIS_PROPS}
                        tickFormatter={formatNumber}
                      />
                      <Tooltip
                        {...TOOLTIP_PROPS}
                        formatter={(value) => formatNumber(value)}
                      />
                      <Bar
                        dataKey="next7Days"
                        name="Next 1–7 Days"
                        fill={COLORS[2]}
                        radius={[7, 7, 0, 0]}
                        cursor="pointer"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

              </div>
            </section>
            <section className="section">
              <div className="section-heading">
                <h3>Conversion Leakage</h3>
                <p>
                  Shows the volume of trialists that did not convert and the
                  outcome mix for the selected/latest month
                </p>
              </div>

              <div className="two-column">

                <div className="panel chart-panel">
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart
                      data={trialistMonthlyChartData}
                      onClick={(state) => {
                        const label = state?.activeLabel;
                        if (label) setTrialistMonthFilter(label);
                      }}
                    >
                      <CartesianGrid {...GRID_PROPS} />
                      <XAxis
                        dataKey="label"
                        {...XAXIS_PROPS}
                      />
                      <YAxis
                        {...YAXIS_PROPS}
                        tickFormatter={formatNumber}
                      />
                      <Tooltip
                        {...TOOLTIP_PROPS}
                        formatter={(value) => formatNumber(value)}
                      />
                      <Bar
                        dataKey="noResponse"
                        name="Not Converted"
                        fill="#f59e0b"
                        radius={[7, 7, 0, 0]}
                        cursor="pointer"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="panel chart-panel">
                  <ResponsiveContainer width="100%" height={360}>
                    <PieChart>
                      <Pie
                        data={trialistConversionMixData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={120}
                        paddingAngle={3}
                      >
                        {trialistConversionMixData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        {...TOOLTIP_PROPS}
                        formatter={(value) => formatNumber(value)}
                      />
                      <Legend {...LEGEND_PROPS} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

              </div>
            </section>
            <section className="section">
              <div className="section-heading">
                <h3>Active Trialists by Source</h3>
                <p>
                  Mirrors Karen&apos;s source-level active trialist chart and
                  makes each source selectable
                </p>
              </div>

              <div className="panel chart-panel large-chart">
                <ResponsiveContainer width="100%" height={430}>
                  <BarChart
                    data={trialistSourceMonthlyData}
                    onClick={(state) => {
                      const label = state?.activeLabel;
                      if (label) setTrialistMonthFilter(label);
                    }}
                    margin={CHART_MARGIN_LARGE}
                  >
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis
                      dataKey="label"
                      {...XAXIS_PROPS}
                    />
                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={formatNumber}
                    />
                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) => formatNumber(value)}
                    />
                    <Legend {...LEGEND_PROPS} />
                    <Bar
                      dataKey="CB iOS"
                      name="CB iOS"
                      stackId="source"
                      fill={COLORS[0]}
                      cursor="pointer"
                      onClick={() => setTrialistSourceFilter("CB iOS")}
                    />
                    <Bar
                      dataKey="CB Web"
                      name="CB Web"
                      stackId="source"
                      fill={COLORS[1]}
                      cursor="pointer"
                      onClick={() => setTrialistSourceFilter("CB Web")}
                    />
                    <Bar
                      dataKey="Google"
                      name="Google"
                      stackId="source"
                      fill={COLORS[2]}
                      radius={[7, 7, 0, 0]}
                      cursor="pointer"
                      onClick={() => setTrialistSourceFilter("Google")}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="section">
              <div className="section-heading">
                <h3>Total Source Trialists</h3>
                <p>
                  Click a source to filter the detailed records below
                </p>
              </div>

              <div className="two-column">

                <div className="panel chart-panel">
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={trialistSourceChartData}>
                      <CartesianGrid {...GRID_PROPS} />
                      <XAxis dataKey="name" {...XAXIS_PROPS} />
                      <YAxis
                        {...YAXIS_PROPS}
                        tickFormatter={formatNumber}
                      />
                      <Tooltip
                        {...TOOLTIP_PROPS}
                        formatter={(value) => formatNumber(value)}
                      />
                      <Legend {...LEGEND_PROPS} />
                      <Bar
                        dataKey="total"
                        name="Total Trialists"
                        fill={COLORS[0]}
                        radius={[7, 7, 0, 0]}
                        cursor="pointer"
                        onClick={(data) => {
                          if (data?.name) {
                            setTrialistSourceFilter(data.name);
                          }
                        }}
                      />
                      <Bar
                        dataKey="converted"
                        name="Converted"
                        fill={COLORS[1]}
                        radius={[7, 7, 0, 0]}
                        cursor="pointer"
                        onClick={(data) => {
                          if (data?.name) {
                            setTrialistSourceFilter(data.name);
                          }
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="source-list">
                  {trialistSourceChartData.map((source) => (
                    <button
                      type="button"
                      className="source-item"
                      key={source.name}
                      onClick={() =>
                        setTrialistSourceFilter(source.name)
                      }
                      style={{
                        width: "100%",
                        textAlign: "left",
                        cursor: "pointer",
                        border:
                          trialistSourceFilter === source.name
                            ? "1px solid #38bdf8"
                            : undefined,
                      }}
                    >
                      <div>
                        <span>{source.name}</span>
                        <small>
                          Conversion rate:{" "}
                          {Number(source.conversionRate || 0).toFixed(2)}%
                        </small>
                      </div>
                      <strong>
                        {formatNumber(source.converted)}
                        {" / "}
                        {formatNumber(source.total)}
                      </strong>
                    </button>
                  ))}
                </div>

              </div>
            </section>
            <section className="section">
              <div className="section-heading">
                <h3>Source Conversion Efficiency</h3>
                <p>
                  Compares conversion and non-conversion percentages across
                  acquisition sources
                </p>
              </div>

              <div className="panel chart-panel large-chart">
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={trialistSourceRateData}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="name" {...XAXIS_PROPS} />
                    <YAxis
                      {...YAXIS_PROPS}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) =>
                        `${Number(value || 0).toFixed(2)}%`
                      }
                    />
                    <Legend {...LEGEND_PROPS} />
                    <Bar
                      dataKey="conversionRate"
                      name="Converted %"
                      fill={COLORS[1]}
                      radius={[7, 7, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => {
                        if (data?.name) {
                          setTrialistSourceFilter(data.name);
                        }
                      }}
                    />
                    <Bar
                      dataKey="notConvertedRate"
                      name="Not Converted %"
                      fill="#f59e0b"
                      radius={[7, 7, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => {
                        if (data?.name) {
                          setTrialistSourceFilter(data.name);
                        }
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="section">
              <div className="section-heading">
                <h3>Month-over-Month Movement</h3>
                <p>
                  Percentage movement in total trialists and converted
                  trialists versus the previous reporting month
                </p>
              </div>

              <div className="panel chart-panel large-chart">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={trialistMoMData}
                    margin={CHART_MARGIN_LARGE}
                  >
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis
                      dataKey="label"
                      {...XAXIS_PROPS}
                    />
                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                    />
                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) =>
                        `${Number(value || 0).toFixed(2)}%`
                      }
                    />
                    <Legend {...LEGEND_PROPS} />
                    <Line
                      type="monotone"
                      dataKey="trialistGrowth"
                      name="Trialist Growth"
                      stroke="#38bdf8"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="convertedGrowth"
                      name="Converted Growth"
                      stroke="#22c55e"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
            {(trialistMonthFilter !== "all" ||
              trialistSourceFilter !== "all") && (
              <section className="section">
                <div className="section-heading">
                  <h3>Selected View</h3>
                  <p>
                    Drill-down for{" "}
                    {trialistMonthFilter === "all"
                      ? "all months"
                      : trialistMonthFilter}
                    {" • "}
                    {trialistSourceFilter === "all"
                      ? "all sources"
                      : trialistSourceFilter}
                  </p>
                </div>

                <div className="analysis-summary-grid">
                  <div className="analysis-summary-card">
                    <span>Total Trialists</span>
                    <strong>{formatNumber(trialistTotals.total)}</strong>
                    <small>Filtered total</small>
                  </div>
                  <div className="analysis-summary-card">
                    <span>Converted</span>
                    <strong>{formatNumber(trialistTotals.converted)}</strong>
                    <small>Filtered conversions</small>
                  </div>
                  <div className="analysis-summary-card">
                    <span>Not Converted</span>
                    <strong>{formatNumber(trialistTotals.noResponse)}</strong>
                    <small>Filtered non-conversions</small>
                  </div>
                  <div className="analysis-summary-card">
                    <span>Conversion Rate</span>
                    <strong>
                      {trialistFilteredConversionRate.toFixed(2)}%
                    </strong>
                    <small>Filtered conversion efficiency</small>
                  </div>
                </div>
              </section>
            )}
            <section className="section">
              <div className="section-heading">
                <h3>Monthly Trialist Summary</h3>
                <p>
                  Monthly trialist and conversion data from
                  Trialists Graphics.xlsx
                </p>
              </div>

              <div className="panel table-panel">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Month</th>
                        <th>Total Trialists</th>
                        <th>This Month</th>
                        <th>Next 1–7 Days</th>
                        <th>Active / Converted</th>
                        <th>Not Converted</th>
                        <th>Conversion Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrialistMonthlyData.map((item, index) => (
                        <tr
                          key={`${item.year}-${item.month}-${index}`}
                          onClick={() =>
                            setTrialistMonthFilter(item.label)
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <td>{item.year}</td>
                          <td><strong>{item.month}</strong></td>
                          <td>{formatNumber(item.total)}</td>
                          <td>{formatNumber(item.thisMonth)}</td>
                          <td>{formatNumber(item.next7Days)}</td>
                          <td className="total-cell">
                            {formatNumber(item.converted)}
                          </td>
                          <td>{formatNumber(item.noResponse)}</td>
                          <td>
                            {Number(item.conversionRate || 0).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
            <section className="section">
              <div className="section-heading">
                <h3>Trialist Source Details</h3>
                <p>
                  {filteredTrialistDetails.length} source records shown.
                  Click charts or use the filters above to drill down.
                </p>
              </div>

              <div className="panel table-panel">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Source</th>
                        <th>Total</th>
                        <th>This Month</th>
                        <th>Next 1–7 Days</th>
                        <th>Active / Converted</th>
                        <th>Not Converted</th>
                        <th>Conversion Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrialistDetails.map((item, index) => (
                        <tr
                          key={
                            item.row ||
                            `${item.year}-${item.month}-${item.source}-${index}`
                          }
                        >
                          <td>{item.label}</td>
                          <td><strong>{item.source}</strong></td>
                          <td>{formatNumber(item.total)}</td>
                          <td>{formatNumber(item.this_month)}</td>
                          <td>{formatNumber(item.next_7_days)}</td>
                          <td className="total-cell">
                            {formatNumber(item.converted)}
                          </td>
                          <td>{formatNumber(item.no_response)}</td>
                          <td>
                            {Number(item.conversion_rate || 0).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

          </>
        )}
        {activeTab === "analysis" && (
          <>
            <section className="analysis-summary-grid">

              <div className="analysis-summary-card">

                <span>
                  ChargeBee
                </span>

                <strong>
                  {formatNumber(chargeBee.total)}
                </strong>

                <small>
                  Active ChargeBee subscriptions
                </small>

              </div>

              <div className="analysis-summary-card">

                <span>
                  Google
                </span>

                <strong>
                  {formatNumber(google.total)}
                </strong>

                <small>
                  Active Google subscriptions
                </small>

              </div>

              <div className="analysis-summary-card">

                <span>
                  NZ Monthly
                </span>

                <strong>
                  {formatNumber(total.nz_monthly)}
                </strong>

                <small>
                  New Zealand monthly
                </small>

              </div>

              <div className="analysis-summary-card">

                <span>
                  Overseas Monthly
                </span>

                <strong>
                  {formatNumber(total.os_monthly)}
                </strong>

                <small>
                  Overseas monthly
                </small>

              </div>

            </section>
            <section className="section">

              <div className="section-heading">

                <h3>
                  Active Subscriptions per Source
                </h3>

                <p>
                  Total active subscription customers across
                  iOS, Web, KSD, Business, Reseller, Family,
                  Minor and Invoice sources
                </p>

              </div>

              <div className="panel chart-panel large-chart">

                <ResponsiveContainer
                  width="100%"
                  height={430}
                >

                  <BarChart
                    data={sourceCustomerData}
                    margin={CHART_MARGIN_LARGE}
                  >

                    <CartesianGrid {...GRID_PROPS} />

                    <XAxis
                      dataKey="name"
                      {...XAXIS_PROPS_ANGLED}
                    />

                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={formatNumber}
                    />

                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) =>
                        formatNumber(value)
                      }
                    />

                    <Bar
                      dataKey="value"
                      name="Active Customers"
                      fill={CHART_SERIES.primary}
                      radius={BAR_RADIUS}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </section>
            <section className="section">

              <div className="section-heading">

                <h3>
                  Active Subscriptions — NZ &amp; Overseas
                </h3>

                <p>
                  Monthly and annual active subscriptions
                  separated by geographic region
                </p>

              </div>

              <div className="panel chart-panel large-chart">

                <ResponsiveContainer
                  width="100%"
                  height={450}
                >

                  <BarChart
                    data={sourceNzOsData}
                    margin={CHART_MARGIN_LARGE}
                  >

                    <CartesianGrid {...GRID_PROPS} />

                    <XAxis
                      dataKey="name"
                      {...XAXIS_PROPS}
                    />

                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={formatNumber}
                    />

                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) =>
                        formatNumber(value)
                      }
                    />

                    <Legend {...LEGEND_PROPS} />

                    <Bar
                      dataKey="nzMonthly"
                      name="NZ Monthly"
                      fill={COLORS[1]}
                      radius={[6, 6, 0, 0]}
                    />

                    <Bar
                      dataKey="osMonthly"
                      name="OS Monthly"
                      fill={COLORS[0]}
                      radius={[6, 6, 0, 0]}
                    />

                    <Bar
                      dataKey="nzAnnual"
                      name="NZ Annual"
                      fill={COLORS[2]}
                      radius={[6, 6, 0, 0]}
                    />

                    <Bar
                      dataKey="osAnnual"
                      name="OS Annual"
                      fill="#f59e0b"
                      radius={[6, 6, 0, 0]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </section>
            <section className="section">

              <div className="section-heading">

                <h3>
                  Active Subscriptions by Billing Type
                </h3>

                <p>
                  Monthly versus annual subscriptions for
                  each subscription source
                </p>

              </div>

              <div className="panel chart-panel large-chart">

                <ResponsiveContainer
                  width="100%"
                  height={450}
                >

                  <BarChart
                    data={sourceBillingData}
                    margin={CHART_MARGIN_LARGE}
                  >

                    <CartesianGrid {...GRID_PROPS} />

                    <XAxis
                      dataKey="name"
                      {...XAXIS_PROPS}
                    />

                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={formatNumber}
                    />

                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) =>
                        formatNumber(value)
                      }
                    />

                    <Legend {...LEGEND_PROPS} />

                    <Bar
                      dataKey="monthly"
                      name="Monthly"
                      fill={COLORS[0]}
                      radius={[7, 7, 0, 0]}
                    />

                    <Bar
                      dataKey="annual"
                      name="Annual"
                      fill="#818cf8"
                      radius={[7, 7, 0, 0]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </section>
            <section className="section">

              <div className="section-heading">

                <h3>
                  Active Subscriptions — Old vs New
                </h3>

                <p>
                  ChargeBee old customers, ChargeBee new
                  customers, Google and invoice subscriptions
                </p>

              </div>

              <div className="panel chart-panel">

                <ResponsiveContainer
                  width="100%"
                  height={400}
                >

                  <BarChart
                    data={oldNewData}
                    margin={CHART_MARGIN_LARGE}
                  >

                    <CartesianGrid {...GRID_PROPS} />

                    <XAxis
                      dataKey="name"
                      {...XAXIS_PROPS}
                    />

                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={formatNumber}
                    />

                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) =>
                        formatNumber(value)
                      }
                    />

                    <Legend {...LEGEND_PROPS} />

                    <Bar
                      dataKey="monthly"
                      name="Monthly"
                      fill={COLORS[1]}
                      radius={BAR_RADIUS}
                    />

                    <Bar
                      dataKey="annual"
                      name="Annual"
                      fill={COLORS[2]}
                      radius={BAR_RADIUS}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </section>
            <section className="section">

              <div className="section-heading">

                <h3>
                  Source Analysis Summary
                </h3>

                <p>
                  Calculated values used by the customer
                  analysis charts
                </p>

              </div>

              <div className="panel table-panel">

                <div className="table-scroll">

                  <table>

                    <thead>

                      <tr>
                        <th>Source</th>
                        <th>Monthly</th>
                        <th>Annual</th>
                        <th>Total</th>
                        <th>NZ Monthly</th>
                        <th>OS Monthly</th>
                        <th>NZ Annual</th>
                        <th>OS Annual</th>
                      </tr>

                    </thead>

                    <tbody>

                      {sourceBillingData.map(
                        (source) => {

                          const geographic =
                            sourceNzOsData.find(
                              (item) =>
                                item.name ===
                                source.name
                            );

                          return (
                            <tr
                              key={source.name}
                            >

                              <td>
                                <strong>
                                  {source.name}
                                </strong>
                              </td>

                              <td>
                                {formatNumber(
                                  source.monthly
                                )}
                              </td>

                              <td>
                                {formatNumber(
                                  source.annual
                                )}
                              </td>

                              <td className="total-cell">
                                {formatNumber(
                                  source.monthly +
                                  source.annual
                                )}
                              </td>

                              <td>
                                {formatNumber(
                                  geographic?.nzMonthly
                                )}
                              </td>

                              <td>
                                {formatNumber(
                                  geographic?.osMonthly
                                )}
                              </td>

                              <td>
                                {formatNumber(
                                  geographic?.nzAnnual
                                )}
                              </td>

                              <td>
                                {formatNumber(
                                  geographic?.osAnnual
                                )}
                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </section>

          </>
        )}
        {activeTab === "details" && (
          <>
            <section className="section">

              <div className="section-heading">

                <h3>
                  Active Subscription Details
                </h3>

                <p>
                  Detailed data read directly from the Excel
                  calculation layer
                </p>

              </div>

              <div className="panel table-panel">

                <div className="table-scroll">

                  <table>

                    <thead>

                      <tr>
                        <th>Platform</th>
                        <th>Status</th>
                        <th>Monthly</th>
                        <th>Annual</th>
                        <th>Total</th>
                        <th>NZ Monthly</th>
                        <th>OS Monthly</th>
                        <th>NZ Annual</th>
                        <th>OS Annual</th>
                      </tr>

                    </thead>

                    <tbody>

                      {activeDetails.map(
                        (item) => (

                          <tr
                            key={`${item.row}-${item.active}-${item.status}`}
                          >

                            <td>
                              <strong>
                                {item.active}
                              </strong>
                            </td>

                            <td>
                              <span className="status">
                                {item.status}
                              </span>
                            </td>

                            <td>
                              {formatNumber(
                                item.monthly
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                item.annual
                              )}
                            </td>

                            <td className="total-cell">
                              {formatNumber(
                                item.total
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                item.nz_monthly
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                item.os_monthly
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                item.nz_annual
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                item.os_annual
                              )}
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </section>
            <section className="section">

              <div className="section-heading">

                <h3>
                  Financial Subscription Summary
                </h3>

                <p>
                  Summary calculated by Karen's Excel workbook
                </p>

              </div>

              <div className="panel table-panel">

                <div className="table-scroll">

                  <table>

                    <thead>

                      <tr>
                        <th>Source</th>
                        <th>Monthly</th>
                        <th>Annual</th>
                        <th>Total</th>
                        <th>NZ Monthly</th>
                        <th>OS Monthly</th>
                        <th>NZ Annual</th>
                        <th>OS Annual</th>
                      </tr>

                    </thead>

                    <tbody>

                      <tr>

                        <td>
                          CB OLD
                        </td>

                        <td>
                          {formatNumber(
                            summary.cb_old?.monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            summary.cb_old?.annual
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            summary.cb_old?.total
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            summary.cb_old?.nz_monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            summary.cb_old?.os_monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            summary.cb_old?.nz_annual
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            summary.cb_old?.os_annual
                          )}
                        </td>

                      </tr>

                      <tr>

                        <td>
                          CB NEW
                        </td>

                        <td>
                          {formatNumber(
                            summary.cb_new?.monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            summary.cb_new?.annual
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            summary.cb_new?.total
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            summary.cb_new?.nz_monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            summary.cb_new?.os_monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            summary.cb_new?.nz_annual
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            summary.cb_new?.os_annual
                          )}
                        </td>

                      </tr>

                      <tr className="subtotal">

                        <td>
                          CB Total
                        </td>

                        <td>
                          {formatNumber(
                            chargeBee.monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            chargeBee.annual
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            chargeBee.total
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            chargeBee.nz_monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            chargeBee.os_monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            chargeBee.nz_annual
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            chargeBee.os_annual
                          )}
                        </td>

                      </tr>

                      <tr>

                        <td>
                          GOOGLE
                        </td>

                        <td>
                          {formatNumber(
                            google.monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            google.annual
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            google.total
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            google.nz_monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            google.os_monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            google.nz_annual
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            google.os_annual
                          )}
                        </td>

                      </tr>

                      <tr>

                        <td>
                          INVOICES
                        </td>

                        <td>
                          {formatNumber(
                            invoices.monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            invoices.annual
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            invoices.total
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            invoices.nz_monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            invoices.os_monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            invoices.nz_annual
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            invoices.os_annual
                          )}
                        </td>

                      </tr>

                      <tr className="grand-total">

                        <td>
                          Total Subscriptions
                        </td>

                        <td>
                          {formatNumber(
                            total.monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            total.annual
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            total.total
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            total.nz_monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            total.os_monthly
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            total.nz_annual
                          )}
                        </td>

                        <td>
                          {formatNumber(
                            total.os_annual
                          )}
                        </td>

                      </tr>

                    </tbody>

                  </table>

                </div>

              </div>

            </section>

          </>
        )}
        {activeTab === "revenue" && (
          <section className="section">

            <div className="panel">

              <div className="section-heading">

                <h3>
                  Revenue
                </h3>

                <p>
                  Revenue dashboard will be added here.
                </p>

              </div>

              <div className="empty-state">

                <div className="empty-state-icon">
                  $
                </div>

                <h3>
                  Revenue Dashboard
                </h3>

                <p>
                  
                </p>

              </div>

            </div>

          </section>
        )}
        {activeTab === "mrr" && (
          <section className="section">

            <div className="panel">

              <div className="section-heading">

                <h3>
                  Monthly Recurring Revenue
                </h3>

                <p>
                  MRR dashboard will be added here.
                </p>

              </div>

              <div className="empty-state">

                <div className="empty-state-icon">
                  ↗
                </div>

                <h3>
                  MRR Dashboard
                </h3>

                <p>
                  
                </p>

              </div>

            </div>

          </section>
        )}
        {activeTab === "forecasting" && (
          <ForecastingPage />
        )}
        {activeTab === "international" && (
          <>

            <section className="section">
              <div className="panel filter-panel">
                <div className="filter-bar">
                  <strong className="filter-bar-label">
                    Interactive view
                  </strong>

                  <select
                    value={internationalMonthFilter}
                    onChange={(event) =>
                      setInternationalMonthFilter(event.target.value)
                    }
                  >
                    <option value="all">All months</option>
                    {intlIncomeChartData.map((item) => (
                      <option key={item.label} value={item.label}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  <button
                    className="refresh-btn"
                    onClick={() => setInternationalMonthFilter("all")}
                  >
                    Reset filters
                  </button>

                  <span className="filter-bar-tip">
                    Tip: click a chart bar or line point to drill into a month
                  </span>
                </div>
              </div>
            </section>

            <section className="kpi-grid">

              <div className="kpi-card primary">
                <span>
                  {internationalMonthFilter === "all"
                    ? "Latest International Revenue"
                    : "Selected Month Revenue"}
                </span>
                <strong>
                  {formatCurrency(intlDisplayMonth?.total)}
                </strong>
                <small>
                  {internationalMonthFilter === "all"
                    ? intlDisplayMonth?.label || "Latest reporting month"
                    : internationalMonthFilter}
                </small>
              </div>

              <div className="kpi-card">
                <span>Leading Income Source</span>
                <strong>
                  {topIntlIncomeSource
                    ? INCOME_SOURCE_LABELS[
                        topIntlIncomeSource.source
                      ] || topIntlIncomeSource.source
                    : "—"}
                </strong>
                <small>
                  {topIntlIncomeSource
                    ? formatCurrency(topIntlIncomeSource.total)
                    : "Across all reporting months"}
                </small>
              </div>

              <div className="kpi-card">
                <span>Top Country</span>
                <strong>
                  {topIntlCountry?.country || "—"}
                </strong>
                <small>
                  {topIntlCountry
                    ? formatCurrency(topIntlCountry.total)
                    : "Cumulative international total"}
                </small>
              </div>

              <div className="kpi-card">
                <span>Reporting Period</span>
                <strong>
                  {intlDisplayMonth?.label || "—"}
                </strong>
                <small>
                  Income Source &amp; Top Countries sheets
                </small>
              </div>

            </section>

            <section className="section">
              <div className="section-heading">
                <h3>International Revenue Trend</h3>
                <p>
                  Total international income over time from the
                  Income Source $ workbook
                </p>
              </div>

              <div className="panel chart-panel large-chart">
                <ResponsiveContainer width="100%" height={410}>
                  <LineChart
                    data={intlIncomeChartData}
                    onClick={(state) => {
                      const label = state?.activeLabel;
                      if (label) setInternationalMonthFilter(label);
                    }}
                    margin={CHART_MARGIN_LARGE}
                  >
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="label" {...XAXIS_PROPS} />
                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Legend {...LEGEND_PROPS} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Total International Revenue"
                      stroke={CHART_SERIES.primary}
                      strokeWidth={2.5}
                      dot={LINE_DOT}
                      activeDot={{
                        ...LINE_ACTIVE_DOT,
                        fill: CHART_SERIES.primary,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="section">
              <div className="section-heading">
                <h3>Income by Source</h3>
                <p>
                  Stacked monthly view of licensing, subscriptions,
                  resellers and other international income channels
                </p>
              </div>

              <div className="panel chart-panel large-chart">
                <ResponsiveContainer width="100%" height={460}>
                  <BarChart
                    data={intlIncomeChartData}
                    onClick={(state) => {
                      const label = state?.activeLabel;
                      if (label) setInternationalMonthFilter(label);
                    }}
                    margin={CHART_MARGIN_LARGE}
                  >
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis
                      dataKey="label"
                      {...XAXIS_PROPS_ANGLED}
                    />
                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Legend {...LEGEND_PROPS} />
                    {INCOME_SOURCE_KEYS.map((key, index) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        name={INCOME_SOURCE_LABELS[key]}
                        stackId="income"
                        fill={COLORS[index % COLORS.length]}
                        cursor="pointer"
                        radius={
                          index === INCOME_SOURCE_KEYS.length - 1
                            ? [7, 7, 0, 0]
                            : BAR_RADIUS_STACK
                        }
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="section">
              <div className="section-heading">
                <h3>Revenue Composition &amp; Top Countries</h3>
                <p>
                  Source mix for the selected month alongside the
                  top-performing international countries
                </p>
              </div>

              <div className="two-column">

                <div className="panel chart-panel">
                  <h4 className="chart-subtitle">
                    Income Source Mix
                  </h4>
                  <ResponsiveContainer width="100%" height={360}>
                    <PieChart>
                      <Pie
                        data={intlSourcePieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={72}
                        outerRadius={118}
                        {...PIE_PROPS}
                      >
                        {intlSourcePieData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        {...TOOLTIP_PROPS}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Legend {...LEGEND_PROPS} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="panel chart-panel">
                  <h4 className="chart-subtitle">
                    Top Countries
                  </h4>
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart
                      data={intlTopCountriesData}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid {...GRID_PROPS} />
                      <XAxis
                        type="number"
                        {...XAXIS_PROPS}
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        {...YAXIS_PROPS}
                        width={120}
                      />
                      <Tooltip
                        {...TOOLTIP_PROPS}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Bar
                        dataKey="value"
                        name="Revenue"
                        fill={CHART_SERIES.secondary}
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

              </div>
            </section>

            <section className="section">
              <div className="section-heading">
                <h3>Top Country Performance Trend</h3>
                <p>
                  Monthly revenue movement for the five highest-performing
                  international countries
                </p>
              </div>

              <div className="panel chart-panel large-chart">
                <ResponsiveContainer width="100%" height={410}>
                  <LineChart
                    data={intlCountryTrendData}
                    onClick={(state) => {
                      const label = state?.activeLabel;
                      if (label) setInternationalMonthFilter(label);
                    }}
                    margin={CHART_MARGIN_LARGE}
                  >
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="label" {...XAXIS_PROPS} />
                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Legend {...LEGEND_PROPS} />
                    {topIntlCountryNames.map((name, index) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        name={name}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2.5}
                        dot={LINE_DOT}
                        activeDot={{
                          ...LINE_ACTIVE_DOT,
                          fill: COLORS[index % COLORS.length],
                        }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="section">
              <div className="section-heading">
                <h3>Month-on-Month Revenue Change</h3>
                <p>
                  Percentage movement in total international revenue
                  versus the previous reporting month
                </p>
              </div>

              <div className="panel chart-panel large-chart">
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart
                    data={intlMoMData}
                    onClick={(state) => {
                      const label = state?.activeLabel;
                      if (label) setInternationalMonthFilter(label);
                    }}
                    margin={CHART_MARGIN_LARGE}
                  >
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis
                      dataKey="label"
                      {...XAXIS_PROPS_ANGLED}
                    />
                    <YAxis
                      {...YAXIS_PROPS}
                      tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                    />
                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(value) =>
                        `${Number(value || 0).toFixed(2)}%`
                      }
                    />
                    <Bar
                      dataKey="growth"
                      name="MoM Change"
                      fill={CHART_SERIES.warning}
                      radius={[7, 7, 0, 0]}
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="section">
              <div className="section-heading">
                <h3>International Income Detail</h3>
                <p>
                  Monthly income source breakdown read directly from
                  FF - International - Final Dashboard tables.xlsx
                </p>
              </div>

              <div className="panel table-panel">
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Licensing</th>
                        <th>Marketing</th>
                        <th>Other</th>
                        <th>Product Sales</th>
                        <th>Shipping</th>
                        <th>Apple</th>
                        <th>Google</th>
                        <th>Website</th>
                        <th>Invoices</th>
                        <th>Resellers</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intlIncomeMonthly.map((item) => (
                        <tr
                          key={`${item.label}-${item.row}`}
                          className={
                            internationalMonthFilter !== "all" &&
                            item.label === internationalMonthFilter
                              ? "highlight-row"
                              : ""
                          }
                        >
                          <td>{item.label}</td>
                          <td>{formatCurrency(item.licensing)}</td>
                          <td>{formatCurrency(item.marketing_support)}</td>
                          <td>{formatCurrency(item.other)}</td>
                          <td>{formatCurrency(item.product_sales)}</td>
                          <td>{formatCurrency(item.shipping)}</td>
                          <td>{formatCurrency(item.apple)}</td>
                          <td>{formatCurrency(item.google)}</td>
                          <td>{formatCurrency(item.website_stripe)}</td>
                          <td>{formatCurrency(item.invoices)}</td>
                          <td>{formatCurrency(item.resellers)}</td>
                          <td>{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

          </>
        )}
        <footer className="content-footer">

          <div>

            <strong>
              Safe Surfer
            </strong>

            <span>
              Financial Dashboard
            </span>

          </div>

          <span>
            Excel-powered financial analytics
          </span>

        </footer>

        </div>

      </main>

    </div>
  );
}

export default App;
