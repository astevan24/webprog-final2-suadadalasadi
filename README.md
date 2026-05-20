# Cardiovascular Death Rate Explorer

A full-stack data analysis and visualisation application exploring age-standardised
cardiovascular disease death rates across countries, years, and genders.

---

## 📂 Project Structure
```text
project/
├── backend/
│   ├── load_data.py     ← Fetch CSV from OWID → insert into SQLite
│   ├── database.py      ← Parameterized SQL queries
│   ├── schema.py        ← GraphQL types + resolvers (Strawberry)
│   ├── main.py          ← FastAPI server + CORS
│   ├── requirements.txt
│   └── data/
│       └── dataset.db   ← SQLite — generated, not in Git
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx     ← App entry point
│       ├── App.jsx      ← Hash router (#home / #table / #chart)
│       ├── index.css
│       ├── graphql/
│       │   ├── client.js    ← GraphQLClient → localhost:8000
│       │   └── queries.js   ← GET_META · GET_DEATHS · GET_DEATHS_BY_YEAR
│       ├── components/
│       │   └── Navbar.jsx   ← Top navigation bar
│       └── pages/
│           ├── HomePage.jsx   ← Intro + info cards
│           ├── TablePage.jsx  ← Year selector + search + sort + pagination
│           └── ChartPage.jsx  ← Filters + Line/Bar chart
└── README.md            ← Setup + usage guide
```
---

## Pages

| Page       | Description                                                              |
|------------|--------------------------------------------------------------------------|
| 🏠 Home    | Introduction, dataset overview, and navigation buttons                    |
| 📋 Table   | Data table for a selected year — search, sort (asc/desc), pagination     |
| 📈 Chart   | Line or Bar chart with country, gender, and year-range filters           |

---

## Tech Stack

| Layer        | Technology                                              |
|--------------|---------------------------------------------------------|
| Presentation | React 18, Recharts, CSS Modules, graphql-request        |
| Application  | Python 3.11+, FastAPI, Strawberry GraphQL               |
| Data         | SQLite (`dataset.db`)                                   |

---

## Dataset

- **Source:** Our World in Data — Age-standardised cardiovascular death rate (GHE)
- **URL:** https://ourworldindata.org/grapher/death-rate-from-cardiovascular-disease-age-standardized-ghe.csv
- **Coverage:** 180+ countries, **2000 to 2021**
- **Dimensions:** Country | Year | Gender (Male / Female)
- **Loading:** `load_data.py` fetches the CSV, filters out regional aggregates
  (keeps only rows with a valid 3-letter ISO code), splits the total death rate
  into Male (×1.25) and Female (×0.75) rows, and inserts everything into SQLite
  using parameterised queries.

---

## Setup Instructions

### 1 — Backend

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Download the dataset and load it into SQLite  (run once)
python load_data.py

# Start the GraphQL server
uvicorn main:app --reload --port 8000
```

GraphQL Playground → http://localhost:8000/graphql

### 2 — Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

App → http://localhost:5173

---

## How to Use

### Home page
Overview of the dataset and two quick-navigation buttons.

### Table page
1. Use the **year selector** (top-left) to choose any year from 2000 to 2021.
   The table loads all countries for that year automatically.
2. Type in the **search box** to filter rows by country name, ISO code, or gender.
3. Click any **column header** to sort ascending; click again to sort descending.
4. Use the **pagination controls** at the bottom to browse pages of 50 rows.

### Chart page
1. Choose a **country** from the dropdown — or leave it as "All Countries"
   to see the global average.
2. Select a **gender** (or leave as "Both").
3. Drag the **Year From / Year To** sliders to set the time range.
4. Toggle between **Line** and **Bar** chart types.
5. Click **Apply Filters** — the chart updates with the new data.



