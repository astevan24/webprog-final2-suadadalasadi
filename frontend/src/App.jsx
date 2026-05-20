/**
 * App.jsx
 * -------
 * Root component of the application.
 *
 * Routing strategy:
 *   We use the URL hash (#) to track which page is active.
 *   Hash routing requires no server configuration — the browser handles it
 *   entirely on the client side, so a page refresh always returns to the
 *   correct page rather than resetting to Home.
 *
 *   URL examples:
 *     http://localhost:5173/        → Home page  (hash is empty or "#home")
 *     http://localhost:5173/#table  → Table page
 *     http://localhost:5173/#chart  → Chart page
 *
 * How it works:
 *   1. On mount, we read window.location.hash to set the initial page.
 *   2. When the user navigates, we update window.location.hash.
 *   3. We listen to the 'hashchange' event so the Back/Forward browser
 *      buttons also work correctly.
 */

import React, { useState, useEffect } from "react";
import Navbar    from "./components/Navbar.jsx";
import HomePage  from "./pages/HomePage.jsx";
import TablePage from "./pages/TablePage.jsx";
import ChartPage from "./pages/ChartPage.jsx";

// Valid page identifiers — must match the hash values used in the URL
const VALID_PAGES = ["home", "table", "chart"];

/**
 * Read the current page from the URL hash.
 * Returns "home" as the default if the hash is empty or unrecognised.
 */
function getPageFromHash() {
  // window.location.hash is "#table" → strip the leading "#"
  const hash = window.location.hash.replace("#", "");
  return VALID_PAGES.includes(hash) ? hash : "home";
}

export default function App() {
  // Initialise state from the URL hash so a refresh lands on the same page
  const [page, setPage] = useState(getPageFromHash);

  // ── Sync URL hash with page state ──────────────────────────────────────────
  // Whenever `page` changes (user clicks a nav link), update the hash.
  useEffect(() => {
    window.location.hash = page;
  }, [page]);

  // ── Listen for browser Back / Forward navigation ───────────────────────────
  // The 'hashchange' event fires when the user presses Back or Forward.
  // We read the new hash and update the React state accordingly.
  useEffect(() => {
    function onHashChange() {
      setPage(getPageFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    // Clean up the event listener when the component unmounts
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // ── Render the active page ──────────────────────────────────────────────────
  function renderPage() {
    if (page === "table") return <TablePage />;
    if (page === "chart") return <ChartPage />;
    // Default — render the Home page
    return <HomePage onNavigate={setPage} />;
  }

  return (
    <>
      {/* Sticky navigation bar — always visible at the top */}
      <Navbar activePage={page} onNavigate={setPage} />
      <main>{renderPage()}</main>
    </>
  );
}
