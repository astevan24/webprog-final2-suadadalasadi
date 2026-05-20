/**
 * ChartPage.jsx
 * -------------
 * The chart / visualisation page — Page 3 of the application.
 *
 * Features:
 *   1. Filter panel (left sidebar):
 *        - Country dropdown  : "All Countries" or a specific country
 *        - Gender dropdown   : Both / Male / Female
 *        - Year From slider  : lower bound of the year range
 *        - Year To slider    : upper bound of the year range
 *        - Chart type toggle : Line chart or Bar chart
 *   2. Chart area (right):
 *        - Renders a Recharts LineChart or BarChart based on the toggle
 *        - Dynamic title that reflects the current filters
 *        - Info banner when "All Countries" is selected explaining
 *          that the chart shows the global average (not 180+ overlapping lines)
 *
 * "All Countries" handling:
 *   When no specific country is selected, the backend returns records for
 *   every country. We aggregate those records client-side by computing the
 *   average death rate per (year, gender) pair — so the chart shows one or
 *   two smooth "global average" lines instead of hundreds of overlapping ones.
 *
 * Data flow:
 *   Mount  → GET_META  → populate country list + set slider bounds
 *   Apply  → GET_DEATHS (with filters as GraphQL variables)
 *          → aggregate if "All Countries", else use raw records
 *          → render chart
 */

import React, { useEffect, useState, useMemo } from "react";
import {
  LineChart, Line,
  BarChart,  Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import client from "../graphql/client.js";
import { GET_META, GET_DEATHS } from "../graphql/queries.js";
import styles from "./ChartPage.module.css";


// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Fixed colour palette for the chart series (Male / Female lines/bars)
const COLORS = {
  Male:   "#4299e1",   // blue for Male
  Female: "#ed64a6",   // pink for Female
};


// ---------------------------------------------------------------------------
// Data transformation helpers
// ---------------------------------------------------------------------------

/**
 * aggregateByYear()
 * -----------------
 * Called when "All Countries" is selected.
 *
 * The backend returns one row per (country, year, gender).
 * This function groups those rows by (year, gender) and computes the
 * arithmetic mean of deathRate across all countries for each group.
 *
 * Output shape (array of objects, one per year):
 *   [{ year: 2000, Male: 412.3, Female: 247.4 }, { year: 2001, … }, …]
 *
 * @param {Array}  records  - raw records from the GraphQL response
 * @param {string} gender   - "" | "Male" | "Female"
 * @returns {Array} chart-ready data points
 */
function aggregateByYear(records, gender) {
  // Accumulator: { year -> { Male: [rates], Female: [rates] } }
  const acc = {};

  records.forEach(({ year, gender: g, deathRate }) => {
    if (!acc[year]) acc[year] = { Male: [], Female: [] };
    acc[year][g].push(deathRate);
  });

  // Determine which genders to include in the output
  const gendersToShow = gender ? [gender] : ["Male", "Female"];

  return Object.keys(acc)
    .map(Number)
    .sort((a, b) => a - b)
    .map((year) => {
      const point = { year };
      gendersToShow.forEach((g) => {
        const rates = acc[year][g];
        if (rates && rates.length > 0) {
          // Arithmetic mean, rounded to 1 decimal place
          point[g] = +(rates.reduce((sum, v) => sum + v, 0) / rates.length).toFixed(1);
        }
      });
      return point;
    });
}

/**
 * buildCountryData()
 * ------------------
 * Called when a specific country is selected.
 *
 * Converts flat records into one object per year, with Male and Female
 * as separate keys — the shape Recharts expects for multi-line charts.
 *
 * Output shape:
 *   [{ year: 2000, Male: 650.0, Female: 390.0 }, …]
 *
 * @param {Array}  records - raw records from the GraphQL response
 * @param {string} gender  - "" | "Male" | "Female"
 * @returns {Array} chart-ready data points
 */
function buildCountryData(records, gender) {
  const byYear = {};

  records.forEach(({ year, gender: g, deathRate }) => {
    if (!byYear[year]) byYear[year] = { year };
    byYear[year][g] = deathRate;
  });

  const gendersToShow = gender ? [gender] : ["Male", "Female"];

  return Object.values(byYear)
    .sort((a, b) => a.year - b.year)
    .map((point) => {
      // Keep only the selected gender keys (drop the other if filtered)
      const filtered = { year: point.year };
      gendersToShow.forEach((g) => {
        if (point[g] !== undefined) filtered[g] = point[g];
      });
      return filtered;
    });
}


// ---------------------------------------------------------------------------
// Custom Tooltip component for the chart
// ---------------------------------------------------------------------------

/**
 * CustomTooltip
 * -------------
 * Renders a styled popup when the user hovers over a data point.
 * Recharts passes `active`, `payload`, and `label` as props automatically.
 */
function CustomTooltip({ active, payload, label }) {
  // Don't render anything when the mouse is not over a data point
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipYear}>Year: {label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <strong>{p.value?.toFixed(1)}</strong> per 100k
        </p>
      ))}
    </div>
  );
}


// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ChartPage() {

  // ── Meta state (loaded once on mount) ────────────────────────────────────
  const [countries, setCountries] = useState([]);   // list of country names
  const [yearMin,   setYearMin]   = useState(2000); // earliest year in DB
  const [yearMax,   setYearMax]   = useState(2021); // latest year in DB
  const [metaError, setMetaError] = useState("");

  // ── Filter state (controlled by the sidebar form) ────────────────────────
  const [country,   setCountry]   = useState("");       // "" = all countries
  const [gender,    setGender]    = useState("");       // "" = both genders
  const [yearFrom,  setYearFrom]  = useState(2000);
  const [yearTo,    setYearTo]    = useState(2021);
  const [chartType, setChartType] = useState("line");   // "line" | "bar"

  // ── Chart data state ─────────────────────────────────────────────────────
  const [records,  setRecords]  = useState([]);  // raw response from GraphQL
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Keep a copy of the filters that were used for the current chart
  // so the title shows what is actually displayed (not what is typed in the form)
  const [appliedFilters, setAppliedFilters] = useState(null);


  // ── Step 1: Load metadata on mount ───────────────────────────────────────
  useEffect(() => {
    async function loadMeta() {
      try {
        // GET_META fetches the country list and year range in one request
        const data = await client.request(GET_META);

        setCountries(data.countries);
        setYearMin(data.yearRange.minYear);
        setYearMax(data.yearRange.maxYear);

        // Initialise sliders to the full range from the database
        setYearFrom(data.yearRange.minYear);
        setYearTo(data.yearRange.maxYear);
      } catch (err) {
        setMetaError(
          "Cannot connect to the backend. " +
          "Make sure the server is running: uvicorn main:app --port 8000"
        );
      }
    }
    loadMeta();
  }, []); // empty deps → runs once when the component mounts


  // ── Step 2: Fetch chart data when user clicks "Apply Filters" ────────────
  async function handleApply() {
    setLoading(true);
    setError("");

    try {
      // Build the GraphQL variables object.
      // null means "no filter" — the backend ignores null fields.
      const variables = {
        filters: {
          country:  country  || null,
          gender:   gender   || null,
          yearFrom: yearFrom,
          yearTo:   yearTo,
        },
      };

      const data = await client.request(GET_DEATHS, variables);
      setRecords(data.deaths);

      // Save a snapshot of the filters used for this fetch
      // so the chart title stays in sync with the displayed data
      setAppliedFilters({ country, gender, yearFrom, yearTo });
    } catch (err) {
      setError(err.message || "Failed to fetch data.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }


  // ── Step 3: Transform raw records into chart-ready data ──────────────────
  // useMemo recomputes only when records, country, or gender change
  const chartData = useMemo(() => {
    if (records.length === 0) return [];

    if (!country) {
      // No country selected → compute global average per year
      return aggregateByYear(records, gender);
    }
    // Specific country selected → one row per year with Male/Female keys
    return buildCountryData(records, gender);
  }, [records, country, gender]);


  // Determine which gender series to draw on the chart
  const seriesKeys = useMemo(() => {
    if (gender === "Male")   return ["Male"];
    if (gender === "Female") return ["Female"];
    return ["Male", "Female"]; // show both when no gender filter is applied
  }, [gender]);


  // ── Chart title ───────────────────────────────────────────────────────────
  // Reflects the filters that were applied when the user last clicked "Apply"
  const chartTitle = useMemo(() => {
    if (!appliedFilters) return "Select filters and click Apply";
    const c = appliedFilters.country  || "All Countries (Global Average)";
    const g = appliedFilters.gender   || "Both Genders";
    return `${c} — ${g} (${appliedFilters.yearFrom}–${appliedFilters.yearTo})`;
  }, [appliedFilters]);


  // ── Render the Recharts chart ─────────────────────────────────────────────
  function renderChart() {
    // Empty state — prompt the user to apply filters
    if (chartData.length === 0) {
      return (
        <div className={styles.empty}>
          Select filters and click <strong>Apply Filters</strong> to see the chart.
        </div>
      );
    }

    // Common props shared by both LineChart and BarChart
    const commonProps = {
      data:   chartData,
      margin: { top: 10, right: 30, left: 10, bottom: 5 },
    };

    // ── Bar chart ────────────────────────────────────────────────────────
    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={420}>
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              label={{
                value: "Deaths / 100k",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                style: { fontSize: 11 },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {seriesKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                fill={COLORS[key]}
                radius={[3, 3, 0, 0]}  // rounded top corners
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // ── Line chart (default) ──────────────────────────────────────────────
    return (
      <ResponsiveContainer width="100%" height={420}>
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            label={{
              value: "Deaths / 100k",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              style: { fontSize: 11 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {seriesKeys.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={COLORS[key]}
              strokeWidth={2.5}
              dot={false}           // hide dots on every point for cleaner look
              activeDot={{ r: 5 }}  // show a dot only on hover
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }


  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* Backend connection error */}
      {metaError && <div className={styles.error}>{metaError}</div>}

      <div className={styles.layout}>

        {/* ── LEFT: Filter sidebar ─────────────────────────────────────── */}
        <aside className={styles.filters}>
          <h2>Filters</h2>

          {/* Country selector */}
          <label className={styles.label}>Country</label>
          <select
            className={styles.select}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {/* Empty value = "All Countries" → triggers global average mode */}
            <option value="">🌍 All Countries (Global Avg)</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Gender selector */}
          <label className={styles.label}>Gender</label>
          <select
            className={styles.select}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Both</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          {/* Year From slider */}
          <label className={styles.label}>
            Year From: <strong>{yearFrom}</strong>
          </label>
          <input
            type="range"
            className={styles.range}
            min={yearMin}
            max={yearMax}
            value={yearFrom}
            onChange={(e) => {
              const val = Number(e.target.value);
              // Prevent yearFrom from exceeding yearTo
              setYearFrom(Math.min(val, yearTo));
            }}
          />

          {/* Year To slider */}
          <label className={styles.label}>
            Year To: <strong>{yearTo}</strong>
          </label>
          <input
            type="range"
            className={styles.range}
            min={yearMin}
            max={yearMax}
            value={yearTo}
            onChange={(e) => {
              const val = Number(e.target.value);
              // Prevent yearTo from going below yearFrom
              setYearTo(Math.max(val, yearFrom));
            }}
          />

          {/* Chart type toggle */}
          <label className={styles.label}>Chart Type</label>
          <div className={styles.chartTypeRow}>
            <button
              className={chartType === "line" ? styles.typeActive : styles.typeBtn}
              onClick={() => setChartType("line")}
            >
              📈 Line
            </button>
            <button
              className={chartType === "bar" ? styles.typeActive : styles.typeBtn}
              onClick={() => setChartType("bar")}
            >
              📊 Bar
            </button>
          </div>

          {/* Apply button — triggers the GraphQL request */}
          <button
            className={styles.applyBtn}
            onClick={handleApply}
            disabled={loading}
          >
            {loading ? "Loading…" : "Apply Filters"}
          </button>
        </aside>

        {/* ── RIGHT: Chart area ─────────────────────────────────────────── */}
        <div className={styles.chartArea}>

          {/* Dynamic chart title */}
          <h1 className={styles.chartTitle}>📈 {chartTitle}</h1>

          {/* Info banner: shown only when "All Countries" is selected and data exists */}
          {!country && records.length > 0 && (
            <div className={styles.note}>
              ℹ️ Showing the <strong>global average</strong> across all countries.
              Select a specific country for a per-country view.
            </div>
          )}

          {/* Fetch error */}
          {error && <div className={styles.error}>{error}</div>}

          {/* Chart container */}
          <div className={styles.chartBox}>
            {renderChart()}
          </div>

        </div>
      </div>
    </div>
  );
}