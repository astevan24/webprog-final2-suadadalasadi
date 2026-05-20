/**
 * HomePage.jsx
 * ------------
 * The landing page of the application.
 * Displays a brief introduction to the dataset and the application,
 * along with two buttons that navigate to the Table and Chart pages.
 *
 * Props:
 *   onNavigate {function} — called with "table" or "chart" when a button is clicked
 */

import React from "react";
import styles from "./HomePage.module.css";

export default function HomePage({ onNavigate }) {
  return (
    <div className={styles.page}>

      {/* ── Hero section ─────────────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroIcon}>🫀</div>
        <h1 className={styles.heroTitle}>Cardiovascular Death Rate Explorer</h1>
        <p className={styles.heroSub}>
          Explore age-standardised cardiovascular disease death rates across
          countries, years, and genders — powered by Our World in Data.
        </p>
      </div>

      {/* ── Information cards ─────────────────────────────────────────────── */}
      <div className={styles.cards}>

        {/* Card 1 — About the dataset */}
        <div className={styles.card}>
          <span className={styles.cardIcon}>📊</span>
          <h2>About the Dataset</h2>
          <p>
            Data comes from the <strong>Global Health Estimates (GHE)</strong> compiled
            by the World Health Organization and published through Our World in Data.
            It covers <strong>180+ countries</strong> from <strong>2000 to 2021</strong>.
          </p>
        </div>

        {/* Card 2 — Filterable dimensions */}
        <div className={styles.card}>
          <span className={styles.cardIcon}>🔍</span>
          <h2>Three Filterable Dimensions</h2>
          <ul className={styles.list}>
            <li><strong>Country</strong> — select any country or view all</li>
            <li><strong>Year</strong> — 2000 through 2021</li>
            <li><strong>Gender</strong> — Male, Female, or both</li>
          </ul>
        </div>

        {/* Card 3 — Key insight */}
        <div className={styles.card}>
          <span className={styles.cardIcon}>💡</span>
          <h2>Key Insight</h2>
          <p>
            Cardiovascular diseases are the <strong>leading cause of death</strong> worldwide.
            Rates vary dramatically by region and gender — men consistently show higher
            death rates than women across all regions.
          </p>
        </div>

      </div>

      {/* ── Navigation buttons ────────────────────────────────────────────── */}
      <div className={styles.actions}>
        {/* Navigate to the Table page */}
        <button className={styles.btnPrimary} onClick={() => onNavigate("table")}>
          📋 Browse Data Table
        </button>
        {/* Navigate to the Chart page */}
        <button className={styles.btnSecondary} onClick={() => onNavigate("chart")}>
          📈 View Charts
        </button>
      </div>

      {/* ── Data source attribution ───────────────────────────────────────── */}
      <div className={styles.source}>
        <p>
          Data source:{" "}
          <a
            href="https://ourworldindata.org/cardiovascular-disease"
            target="_blank"
            rel="noreferrer"
          >
            Our World in Data — Cardiovascular Disease
          </a>
        </p>
      </div>

    </div>
  );
}