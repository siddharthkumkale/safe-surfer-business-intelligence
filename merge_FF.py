import pandas as pd
import numpy as np
from pathlib import Path

BASE = Path(r"C:\Users\Si004 (293400)\Desktop\Safe Surfer\Safe surfer UI")

MRR_FILE = BASE / "FF MRR (ChargeBee, Google, Apple, & Stripe).xlsx"
TRIAL_FILE = BASE / "FF Trialists Total.xlsx"
INTL_FILE = BASE / "FF - International - Final Dashboard tables.xlsx"

OUTPUT = BASE / "Financial_Forecasting_Master.xlsx"


# =========================================================
# 1. MRR / REVENUE / SUBSCRIPTIONS
# =========================================================

raw = pd.read_excel(
    MRR_FILE,
    sheet_name="Dashboard Info",
    header=None
)

# Row 3 in Excel contains month headers.
month_labels = raw.iloc[2, 3:]

records = []

for row_idx in range(3, len(raw)):

    gateway = raw.iloc[row_idx, 1]
    metric = raw.iloc[row_idx, 2]

    if pd.isna(gateway) or pd.isna(metric):
        continue

    for col_idx, month_label in month_labels.items():

        if pd.isna(month_label):
            continue

        value = raw.iloc[row_idx, col_idx]

        records.append({
            "Month": month_label,
            "Gateway": gateway,
            "Metric": metric,
            "Value": value
        })


mrr_long = pd.DataFrame(records)


def parse_mrr_month(x):

    x = str(x).replace("Sept", "Sep")

    return pd.to_datetime(
        x,
        format="%b-%y",
        errors="coerce"
    )


mrr_long["Month"] = mrr_long["Month"].apply(parse_mrr_month)


# Create unique column names such as:
# ChargeBee | Total MRR (k)
mrr_long["Column"] = (
    mrr_long["Gateway"].astype(str)
    + " | "
    + mrr_long["Metric"].astype(str)
)


mrr_wide = (
    mrr_long
    .pivot_table(
        index="Month",
        columns="Column",
        values="Value",
        aggfunc="first"
    )
    .reset_index()
)


# =========================================================
# 2. TRIALISTS
# =========================================================

trial = pd.read_excel(
    TRIAL_FILE,
    sheet_name="TRIALISTS TOTAL",
    header=None
)

trial = trial.iloc[6:, 1:4]

trial.columns = [
    "Year",
    "Month_Name",
    "Total Trialists"
]

# Excel only shows year on first row of each year.
trial["Year"] = trial["Year"].ffill()


month_lookup = {
    "JAN": 1,
    "FEB": 2,
    "MAR": 3,
    "APR": 4,
    "MAY": 5,
    "JUN": 6,
    "JUL": 7,
    "AUG": 8,
    "SEP": 9,
    "OCT": 10,
    "NOV": 11,
    "DEC": 12
}


trial["Month_Number"] = (
    trial["Month_Name"]
    .astype(str)
    .str.upper()
    .map(month_lookup)
)


trial["Month"] = pd.to_datetime({
    "year": trial["Year"].astype(int),
    "month": trial["Month_Number"].astype(int),
    "day": 1
})


trial = trial[
    [
        "Month",
        "Total Trialists"
    ]
]


# =========================================================
# 3. INTERNATIONAL – INCOME SOURCE
# =========================================================

income = pd.read_excel(
    INTL_FILE,
    sheet_name="Income Source $",
    header=None
)

# Actual headings are on Excel row 4.
income = income.iloc[5:, 1:14]

income.columns = [
    "Month",
    "Country",
    "International Licensing",
    "International Marketing Support",
    "International Other",
    "International Product Sales",
    "International Shipping",
    "International Apple",
    "International Google",
    "International Website Stripe",
    "International Invoices",
    "International Resellers",
    "International Total"
]


# Excel dates may arrive as datetime or Excel serial numbers.
def excel_date(value):

    if pd.isna(value):
        return pd.NaT

    if isinstance(value, pd.Timestamp):
        return value

    if hasattr(value, "year"):
        return pd.Timestamp(value)

    if isinstance(value, (int, float)):
        return pd.Timestamp("1899-12-30") + pd.to_timedelta(
            value,
            unit="D"
        )

    return pd.to_datetime(value, errors="coerce")


income["Month"] = income["Month"].apply(excel_date)

income = income.drop(columns=["Country"])


# =========================================================
# 4. MERGE EVERYTHING
# =========================================================

master = pd.merge(
    mrr_wide,
    trial,
    on="Month",
    how="outer"
)

master = pd.merge(
    master,
    income,
    on="Month",
    how="outer"
)

master = master.sort_values("Month").reset_index(drop=True)


# =========================================================
# 5. NUMERIC HELPERS
# =========================================================

# IMPORTANT:
# We do not replace N/A with zero.
# Numeric calculations ignore unavailable values.


def numeric_column(name):

    if name not in master.columns:
        return pd.Series(
            np.nan,
            index=master.index
        )

    return pd.to_numeric(
        master[name],
        errors="coerce"
    )


# Revenue/MRR are labelled "(k)" in the original workbook.
# These totals therefore remain in the same original units.

revenue_columns = [
    "ChargeBee | Total Payments - Revenue (k)",
    "Google | Total Payments - Revenue (k)",
    "Apple | Total Payments - Revenue (k)",
    "Stripe | Total Payments - Revenue (k)"
]

mrr_columns = [
    "ChargeBee | Total MRR (k)",
    "Google | Total MRR (k)",
    "Apple | Total MRR (k)",
    "Stripe | Total MRR (k)"
]

active_columns = [
    "ChargeBee | Total Active Subscriptions",
    "Google | Total Active Subscriptions",
    "Apple | Total Active Subscriptions",
    "Stripe | Total Active Subscriptions"
]


def safe_sum(columns):

    existing = [
        c for c in columns
        if c in master.columns
    ]

    if not existing:
        return np.nan

    numeric = master[existing].apply(
        pd.to_numeric,
        errors="coerce"
    )

    # min_count=1 prevents a completely missing month
    # from becoming an artificial zero.
    return numeric.sum(
        axis=1,
        min_count=1
    )


master["Total Gateway Revenue (k)"] = safe_sum(
    revenue_columns
)

master["Total MRR (k)"] = safe_sum(
    mrr_columns
)

master["Total Active Subscriptions"] = safe_sum(
    active_columns
)


# =========================================================
# 6. ORDER IMPORTANT COLUMNS FIRST
# =========================================================

priority = [
    "Month",

    "Total Gateway Revenue (k)",
    "Total MRR (k)",
    "Total Active Subscriptions",
    "Total Trialists",

    "ChargeBee | Total Payments - Revenue (k)",
    "ChargeBee | Total MRR (k)",
    "ChargeBee | Total Activations (New)",
    "ChargeBee | Total Signups",
    "ChargeBee | Total Churn",
    "ChargeBee | Total Active Subscriptions",

    "Google | Total Payments - Revenue (k)",
    "Google | Total MRR (k)",
    "Google | Total Activations (New)",
    "Google | Total Signups",
    "Google | Total Churn",
    "Google | Total Active Subscriptions",

    "Apple | Total Payments - Revenue (k)",
    "Apple | Total MRR (k)",
    "Apple | Total Activations (New)",
    "Apple | Total Signups",
    "Apple | Total Churn",
    "Apple | Total Active Subscriptions",

    "Stripe | Total Payments - Revenue (k)",
    "Stripe | Total MRR (k)",
    "Stripe | Total Active Subscriptions",

    "International Licensing",
    "International Marketing Support",
    "International Other",
    "International Product Sales",
    "International Shipping",
    "International Apple",
    "International Google",
    "International Website Stripe",
    "International Invoices",
    "International Resellers",
    "International Total"
]


priority = [
    c for c in priority
    if c in master.columns
]

remaining = [
    c for c in master.columns
    if c not in priority
]

master = master[
    priority + remaining
]


# =========================================================
# 7. EXPORT
# =========================================================

with pd.ExcelWriter(
    OUTPUT,
    engine="openpyxl"
) as writer:

    master.to_excel(
        writer,
        sheet_name="Forecasting Master",
        index=False
    )

    mrr_long.to_excel(
        writer,
        sheet_name="MRR Long Format",
        index=False
    )

    trial.to_excel(
        writer,
        sheet_name="Trialists",
        index=False
    )

    income.to_excel(
        writer,
        sheet_name="International",
        index=False
    )


print("Created:")
print(OUTPUT)

print("\nRows:", len(master))
print("Columns:", len(master.columns))

print("\nDate range:")
print(master["Month"].min())
print("to")
print(master["Month"].max())