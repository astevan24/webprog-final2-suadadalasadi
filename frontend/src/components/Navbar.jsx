/**
 * Navbar.jsx
 * ----------
 * Sticky top navigation bar shared across all three pages.
 *
 * Props:
 *   activePage  {string}   — current page id: "home" | "table" | "chart"
 *   onNavigate  {function} — called with the target page id when a link is clicked
 *
 * The active link is highlighted with a different style so the user always
 * knows which page they are on.
 */

import React from "react";
import styles from "./Navbar.module.css";

// Page definitions — order determines the display order in the navbar
const PAGES = [
  { id: "home",  label: "🏠 Home"  },
  { id: "table", label: "📋 Table" },
  { id: "chart", label: "📈 Chart" },
];

export default function Navbar({ activePage, onNavigate }) {
  return (
    <nav className={styles.nav}>
      {/* Brand / logo area */}
      <div className={styles.brand}>🫀 CVD Explorer</div>

      {/* Navigation links — rendered as buttons to avoid full-page reloads */}
      <div className={styles.links}>
        {PAGES.map(({ id, label }) => (
          <button
            key={id}
            // Apply active style when this link matches the current page
            className={activePage === id ? styles.linkActive : styles.link}
            onClick={() => onNavigate(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}