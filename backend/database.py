"""
database.py
-----------
All SQLite connection and query logic lives here.
The rest of the backend (schema, resolvers) imports from this file only.

Design principles:
  - Every query uses parameterized placeholders (?) — never string formatting
    with user input, to prevent SQL injection.
  - The connection is opened and closed inside each function so we never
    leak open file handles.
  - row_factory = sqlite3.Row lets us treat each row like a dict.
"""

import os
import sqlite3
from typing import Optional

# ---------------------------------------------------------------------------
# Path configuration
# ---------------------------------------------------------------------------

# Resolve the absolute path to the database file relative to this source file.
# This ensures the app works from any working directory (e.g. when launched
# by uvicorn from a different folder).
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "data", "dataset.db")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_connection() -> sqlite3.Connection:
    """
    Open and return a new SQLite connection.
    row_factory is set so cursor.fetchall() returns dict-like Row objects
    instead of plain tuples, making the code more readable.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ---------------------------------------------------------------------------
# Query functions
# ---------------------------------------------------------------------------

def query_deaths(
    country:   Optional[str] = None,
    gender:    Optional[str] = None,
    year_from: Optional[int] = None,
    year_to:   Optional[int] = None,
) -> list[dict]:
    """
    Return rows from cardiovascular_deaths that match the given filters.

    All parameters are optional:
      - Omitting country   → returns all countries
      - Omitting gender    → returns both Male and Female
      - Omitting year_from → no lower year bound
      - Omitting year_to   → no upper year bound

    The SQL is built dynamically but uses parameterized placeholders (?),
    so user-supplied values are never embedded directly in the SQL string.
    Results are ordered by year ascending so charts render left-to-right.
    """
    # Start with a base query that always returns all rows,
    # then append WHERE clauses only for the filters that were provided.
    sql    = "SELECT country, code, year, gender, death_rate FROM cardiovascular_deaths WHERE 1=1"
    params = []

    if country:
        sql += " AND country = ?"
        params.append(country)

    if gender:
        sql += " AND gender = ?"
        params.append(gender)

    if year_from is not None:
        sql += " AND year >= ?"
        params.append(year_from)

    if year_to is not None:
        sql += " AND year <= ?"
        params.append(year_to)

    sql += " ORDER BY year ASC"

    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params)                        # parameterized — safe
    rows   = [dict(row) for row in cursor.fetchall()] # convert Row → dict
    conn.close()
    return rows


def query_deaths_by_year(year: int) -> list[dict]:
    """
    Return one row per (country, gender) pair for a specific year.
    Used by the Table page to show a snapshot of all countries in a given year.

    The year is passed as a parameterized value — not interpolated into SQL.
    """
    sql = (
        "SELECT country, code, year, gender, death_rate "
        "FROM cardiovascular_deaths "
        "WHERE year = ? "
        "ORDER BY country ASC"
    )

    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute(sql, (year,))                       # single-element tuple
    rows   = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def get_countries() -> list[str]:
    """
    Return a sorted list of all unique country names in the database.
    Used to populate the country dropdown in the Chart page filter panel.
    """
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT DISTINCT country FROM cardiovascular_deaths ORDER BY country ASC"
    )
    result = [row["country"] for row in cursor.fetchall()]
    conn.close()
    return result


def get_all_years() -> list[int]:
    """
    Return a sorted list of all unique years available in the database.
    Used to populate the year selector on the Table page.
    """
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT DISTINCT year FROM cardiovascular_deaths ORDER BY year ASC"
    )
    result = [row["year"] for row in cursor.fetchall()]
    conn.close()
    return result


def get_year_range() -> dict:
    """
    Return a dict with keys min_year and max_year.
    Used on the Chart page to set the initial slider bounds.
    """
    conn   = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT MIN(year) AS min_year, MAX(year) AS max_year "
        "FROM cardiovascular_deaths"
    )
    row = dict(cursor.fetchone())
    conn.close()
    return row