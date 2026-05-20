/**
 * TablePage.jsx
 * -------------
 * The data table page — Page 2 of the application.
 *
 * Features:
 *   1. Year selector  — fetches data for a specific year via GraphQL.
 *                       Defaults to the latest year in the database.
 *   2. Search box     — filters rows client-side by country name, ISO code,
 *                       or gender (no extra network request needed).
 *   3. Sortable cols  — click any column header to sort ascending/descending.
 *                       A sort icon (↑ / ↓ / ↕) shows the current sort state.
 *   4. Pagination     — shows 50 rows per page with prev/next controls.
 *
 * Data flow:
 *   Mount → fetch all available years (GET_ALL_YEARS)
 *         → set selectedYear to the latest year
 *         → fetch rows for that year (GET_DEATHS_BY_YEAR)
 *   User changes year → fetch rows for new year
 *   User types in search / clicks header → filter/sort client-side (no fetch)
 */

import React, { useEffect, useState, useMemo } from "react";
import client from "../graphql/client.js";
import { GET_ALL_YEARS, GET_DEATHS_BY_YEAR } from "../graphql/queries.js";
import styles from "./TablePage.module.css";

// Number of table rows displayed per page
const ROWS_PER_PAGE = 50;

export default function TablePage() {

  // ── State ──────────────────────────────────────────────────────────────────

  // All available years from the database (used for the year selector)
  const [availableYears, setAvailableYears] = useState([]);

  // The year currently shown in the table
  const [selectedYear, setSelectedYear]     = useState(null);

  // Raw records returned by the GraphQL query for the selected year
  const [records, setRecords] = useState([]);

  // Loading / error flags
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingData,  setLoadingData]  = useState(false);
  const [error,        setError]        = useState("");

  // Search box text — filters rows client-side
  const [search, setSearch] = useState("");

  // Active sort column and direction
  // field must match one of the keys in a record object (camelCase from GraphQL)
  const [sortConfig, setSortConfig] = useState({ field: "country", direction: "asc" });

  // Current pagination page (1-indexed)
  const [currentPage, setCurrentPage] = useState(1);


  // ── Step 1: Fetch available years on mount ────────────────────────────────
  useEffect(() => {
    async function fetchYears() {
      try {
        setLoadingYears(true);
        const data = await client.request(GET_ALL_YEARS);

        const years = data.allYears; // sorted ascending by the backend
        setAvailableYears(years);

        // Default to the latest year (last element in the sorted list)
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);
      } catch (err) {
        setError("Failed to load years. Make sure the backend is running on port 8000.");
      } finally {
        setLoadingYears(false);
      }
    }
    fetchYears();
  }, []); // empty deps → runs once on mount


  // ── Step 2: Fetch records whenever selectedYear changes ───────────────────
  useEffect(() => {
    // Don't fetch until we have a valid year
    if (selectedYear === null) return;

    async function fetchRecords() {
      try {
        setLoadingData(true);
        setError("");
        setCurrentPage(1); // reset to page 1 when year changes

        // Send the year as a GraphQL variable (not string interpolation)
        const data = await client.request(GET_DEATHS_BY_YEAR, { year: selectedYear });
        setRecords(data.deathsByYear);
      } catch (err) {
        setError(`Failed to load data for year ${selectedYear}.`);
        setRecords([]);
      } finally {
        setLoadingData(false);
      }
    }
    fetchRecords();
  }, [selectedYear]); // re-runs every time the selected year changes


  // ── Sort handler ──────────────────────────────────────────────────────────
  // Toggles direction if the same column is clicked again;
  // otherwise switches to the new column with ascending direction.
  function handleSort(field) {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1); // reset pagination when sort changes
  }


  // ── Search handler ────────────────────────────────────────────────────────
  function handleSearch(value) {
    setSearch(value);
    setCurrentPage(1); // reset pagination when search text changes
  }


  // ── Derived data: filter → sort → paginate ────────────────────────────────
  // useMemo ensures we only recompute when the relevant state values change,
  // not on every render.
  const filteredAndSorted = useMemo(() => {
    const q = search.toLowerCase().trim();

    // Client-side filter: match any record whose country, code, or gender
    // contains the search string (case-insensitive)
    const filtered = q
      ? records.filter(
          (r) =>
            r.country.toLowerCase().includes(q) ||
            r.code.toLowerCase().includes(q)    ||
            r.gender.toLowerCase().includes(q)
        )
      : records;

    // Sort the filtered results by the active column
    return [...filtered].sort((a, b) => {
      const aVal = a[sortConfig.field];
      const bVal = b[sortConfig.field];

      // Use localeCompare for strings, subtraction for numbers
      let cmp = typeof aVal === "string"
        ? aVal.localeCompare(bVal)
        : aVal - bVal;

      // Flip sign for descending order
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [records, search, sortConfig]);


  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredAndSorted.length / ROWS_PER_PAGE);

  // Slice the sorted array to get only the rows for the current page
  const pageData = filteredAndSorted.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );


  // ── Sort icon component ────────────────────────────────────────────────────
  // Shows ↑ / ↓ for the active column, ↕ for all others
  function SortIcon({ field }) {
    if (sortConfig.field !== field) {
      return <span className={styles.sortIcon}>↕</span>;
    }
    return (
      <span className={styles.sortIconActive}>
        {sortConfig.direction === "asc" ? "↑" : "↓"}
      </span>
    );
  }


  // ── Column definitions ─────────────────────────────────────────────────────
  // field must match the camelCase key returned by GraphQL
  const COLUMNS = [
    { field: "country",   label: "Country"               },
    { field: "code",      label: "Code"                  },
    { field: "year",      label: "Year"                  },
    { field: "gender",    label: "Gender"                },
    { field: "deathRate", label: "Death Rate / 100 000"  },
  ];


  // ── Render ─────────────────────────────────────────────────────────────────

  // Show a loading spinner while years are being fetched
  if (loadingYears) return <div className={styles.status}>Loading…</div>;

  // Show an error message if anything went wrong
  if (error && records.length === 0) {
    return <div className={styles.errorPage}>{error}</div>;
  }

  return (
    <div className={styles.page}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <h1>📋 Data Table</h1>
        <p className={styles.sub}>
          Showing{" "}
          <strong>{filteredAndSorted.length.toLocaleString()}</strong>{" "}
          records for year <strong>{selectedYear}</strong>
          {search && ` matching "${search}"`}
        </p>
      </div>

      {/* ── Controls row: year selector + search box ─────────────────────── */}
      <div className={styles.controls}>

        {/* Year selector — fetches new data from the server on change */}
        <div className={styles.yearSelector}>
          <label className={styles.yearLabel}>Select Year:</label>
          <select
            className={styles.yearSelect}
            value={selectedYear ?? ""}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {/* Render one option per available year, latest first */}
            {[...availableYears].reverse().map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Search box — filters rows client-side, no server request */}
        <input
          className={styles.searchInput}
          type="text"
          placeholder="🔍  Search by country, code or gender…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Error banner (non-fatal) */}
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* ── Data table ──────────────────────────────────────────────────── */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>

          {/* Column headers — each is clickable to sort */}
          <thead>
            <tr>
              {COLUMNS.map(({ field, label }) => (
                <th
                  key={field}
                  className={styles.th}
                  onClick={() => handleSort(field)}
                  title={`Sort by ${label}`}
                >
                  {label} <SortIcon field={field} />
                </th>
              ))}
            </tr>
          </thead>

          {/* Table body */}
          <tbody>
            {loadingData ? (
              // Show a single full-width loading row while fetching
              <tr>
                <td colSpan={5} className={styles.loadingRow}>
                  Loading data for {selectedYear}…
                </td>
              </tr>
            ) : pageData.length === 0 ? (
              // No results row
              <tr>
                <td colSpan={5} className={styles.noData}>
                  No records found.
                </td>
              </tr>
            ) : (
              // Data rows — alternating background for readability
              pageData.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                  <td className={styles.td}>{row.country}</td>
                  <td className={styles.tdCenter}>{row.code}</td>
                  <td className={styles.tdCenter}>{row.year}</td>
                  <td className={styles.tdCenter}>
                    {/* Colour-coded gender badge */}
                    <span className={row.gender === "Male" ? styles.tagMale : styles.tagFemale}>
                      {row.gender}
                    </span>
                  </td>
                  {/* Right-align numeric values with 1 decimal place */}
                  <td className={styles.tdRight}>{row.deathRate.toFixed(1)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination controls ──────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          {/* First page */}
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            title="First page"
          >«</button>

          {/* Previous page */}
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage((p) => p - 1)}
            disabled={currentPage === 1}
            title="Previous page"
          >‹</button>

          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>

          {/* Next page */}
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage === totalPages}
            title="Next page"
          >›</button>

          {/* Last page */}
          <button
            className={styles.pageBtn}
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            title="Last page"
          >»</button>
        </div>
      )}

    </div>
  );
}