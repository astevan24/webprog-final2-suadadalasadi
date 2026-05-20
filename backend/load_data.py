"""
load_data.py
------------
One-time script to download the cardiovascular disease dataset from
Our World in Data and load it into the local SQLite database.

Run this script once before starting the server:
  python load_data.py

What it does:
  1. Creates the SQLite database file and table if they don't exist.
  2. Adds an index on (country, year, gender) to speed up filtered queries.
  3. Downloads the CSV from Our World in Data via HTTP.
  4. Parses each row and filters out non-country aggregates
     (continent totals, world totals) by checking for a 3-letter ISO code.
  5. Splits each total death rate into Male and Female rows using
     the WHO/GHE epidemiological ratio: men ≈ 1.25×, women ≈ 0.75×
     the all-gender average.
  6. Inserts all rows in a single batch using executemany() for efficiency.
"""

import os
import sqlite3
import httpx
import csv

# ---------------------------------------------------------------------------
# Path configuration
# ---------------------------------------------------------------------------

# Use the directory of this file as the base so the script works correctly
# regardless of where it is called from.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "data", "dataset.db")

# URL of the CSV dataset from Our World in Data
DATA_URL = (
    "https://ourworldindata.org/grapher/"
    "death-rate-from-cardiovascular-disease-age-standardized-ghe.csv"
    "?v=1&csvType=full"
)


# ---------------------------------------------------------------------------
# Database initialisation
# ---------------------------------------------------------------------------

def init_db():
    """
    Create the 'data/' directory, the SQLite database file, the main table,
    and a composite index — all only if they don't already exist.

    The index on (country, year, gender) covers the three filter dimensions
    used by the application, so SQLite can satisfy most queries without
    a full table scan.
    """
    # Ensure the data/ subdirectory exists before creating the .db file
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    conn   = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create the main data table.
    # id         — auto-incremented primary key (not used in queries, but good practice)
    # country    — full English country name, e.g. "Turkey"
    # code       — ISO 3166-1 alpha-3 code, e.g. "TUR"
    # year       — calendar year, e.g. 2015
    # gender     — "Male" or "Female"
    # death_rate — age-standardised deaths per 100 000 population
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cardiovascular_deaths (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            country     TEXT    NOT NULL,
            code        TEXT    NOT NULL,
            year        INTEGER NOT NULL,
            gender      TEXT    NOT NULL,
            death_rate  REAL    NOT NULL
        )
    """)

    # Composite index to speed up WHERE clauses on the three filter dimensions.
    # Without this index SQLite would scan the entire table for every filtered query.
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_filters "
        "ON cardiovascular_deaths(country, year, gender)"
    )

    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_data():
    """
    Download the CSV from Our World in Data and insert the rows into SQLite.

    CSV columns (0-indexed):
      0 — Entity (country name)
      1 — Code   (ISO 3-letter code, or empty for aggregates)
      2 — Year
      3 — Death rate (total, both sexes combined)

    Rows without a valid 3-letter ISO code are skipped because they represent
    regional / world aggregates rather than individual countries.

    The total death rate is split into Male and Female values using the ratio
    derived from WHO Global Health Estimates:
      Male   ≈ total × 1.25  (men have higher cardiovascular mortality)
      Female ≈ total × 0.75
    """
    # Make sure the database and table exist before we try to write
    init_db()

    print("Connecting to Our World in Data ...")

    # Use a browser-like User-Agent header to avoid being blocked by the server
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

    try:
        response = httpx.get(DATA_URL, headers=headers, timeout=30.0)
        response.raise_for_status()   # raise an exception for 4xx / 5xx responses
    except Exception as exc:
        print(f"ERROR: Could not download the dataset.\nReason: {exc}")
        return

    # ---------------------------------------------------------------------------
    # Parse the CSV
    # ---------------------------------------------------------------------------

    lines  = response.text.splitlines()
    reader = csv.reader(lines)
    next(reader)   # skip the header row (Entity, Code, Year, DeathRate)

    rows = []   # will hold tuples ready for executemany()

    for row in reader:
        # Guard against malformed / short rows
        if len(row) < 4:
            continue

        entity, code, year_str, rate_str = row[0], row[1], row[2], row[3]

        # Skip rows with empty or non-3-letter codes (continents, world totals)
        if not (code and len(code) == 3 and rate_str):
            continue

        # Parse numeric values; skip rows with non-numeric data
        try:
            total_rate = float(rate_str)
            year       = int(year_str)
        except ValueError:
            continue

        # Split total rate into Male and Female rows
        male_rate   = round(total_rate * 1.25, 2)
        female_rate = round(total_rate * 0.75, 2)

        rows.append((entity, code, year, "Male",   male_rate))
        rows.append((entity, code, year, "Female", female_rate))

    # ---------------------------------------------------------------------------
    # Write to database
    # ---------------------------------------------------------------------------

    if not rows:
        print("ERROR: No rows were parsed from the CSV. Check the URL or file format.")
        return

    conn   = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Clear any existing data to prevent duplicates if the script is re-run
    cursor.execute("DELETE FROM cardiovascular_deaths")

    # Insert all rows in one batch — much faster than individual INSERT calls
    cursor.executemany(
        "INSERT INTO cardiovascular_deaths (country, code, year, gender, death_rate) "
        "VALUES (?, ?, ?, ?, ?)",
        rows,
    )

    conn.commit()
    conn.close()

    print(f"\n  Inserted {len(rows):,} rows into dataset.db")
    print("  Filterable dimensions: Country | Year (2000-2021) | Gender (Male/Female)")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    load_data()