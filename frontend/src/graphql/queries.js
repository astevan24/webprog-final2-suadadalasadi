/**
 * queries.js
 * ----------
 * All GraphQL query strings used by the application.
 *
 * We use the `gql` tag from graphql-request so the strings are
 * properly formatted and can be syntax-highlighted in editors
 * that support GraphQL language extensions.
 *
 * Naming convention:
 *   GET_<WHAT>  — read-only queries
 */

import { gql } from "graphql-request";

// ---------------------------------------------------------------------------
// GET_META
// Used by: ChartPage (on mount)
// Fetches the list of countries and the min/max year from the database.
// This runs once when the Chart page loads to populate the filter controls.
// ---------------------------------------------------------------------------
export const GET_META = gql`
  query GetMeta {
    countries
    yearRange {
      minYear
      maxYear
    }
  }
`;

// ---------------------------------------------------------------------------
// GET_ALL_YEARS
// Used by: TablePage (on mount)
// Fetches the sorted list of all years available in the database.
// Used to populate the year selector dropdown on the Table page.
// ---------------------------------------------------------------------------
export const GET_ALL_YEARS = gql`
  query GetAllYears {
    allYears
  }
`;

// ---------------------------------------------------------------------------
// GET_DEATHS_BY_YEAR
// Used by: TablePage (on year change)
// Fetches all (country, gender) rows for a specific calendar year.
// The `year` variable is an Int passed from the year selector.
// ---------------------------------------------------------------------------
export const GET_DEATHS_BY_YEAR = gql`
  query GetDeathsByYear($year: Int!) {
    deathsByYear(year: $year) {
      country
      code
      year
      gender
      deathRate
    }
  }
`;

// ---------------------------------------------------------------------------
// GET_DEATHS
// Used by: ChartPage (when user clicks "Apply Filters")
// Fetches records filtered by country, gender, and/or year range.
// All filter fields are optional — omitting one means "no filter on that field".
// ---------------------------------------------------------------------------
export const GET_DEATHS = gql`
  query GetDeaths($filters: DeathFilter) {
    deaths(filters: $filters) {
      country
      code
      year
      gender
      deathRate
    }
  }
`;