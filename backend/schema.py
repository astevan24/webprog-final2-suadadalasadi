"""
schema.py
---------
Defines the GraphQL schema using the Strawberry library.

Structure:
  - Output types  : DeathRecord, YearRange   (what the API returns)
  - Input types   : DeathFilter              (what the client sends as filters)
  - Query class   : all resolver methods live here

Strawberry automatically converts snake_case Python field names to
camelCase in the GraphQL schema (e.g. death_rate → deathRate),
which is the convention expected by the React frontend.
"""

import strawberry
from typing import Optional, List

# Import all database query functions from database.py
from database import (
    query_deaths,
    query_deaths_by_year,
    get_countries,
    get_all_years,
    get_year_range,
)


# ---------------------------------------------------------------------------
# Output types — shape of data returned to the client
# ---------------------------------------------------------------------------

@strawberry.type
class DeathRecord:
    """
    A single row in the cardiovascular_deaths table.
    Returned by the `deaths` and `deathsByYear` queries.
    """
    country:    str    # e.g. "Turkey"
    code:       str    # ISO 3-letter code, e.g. "TUR"
    year:       int    # e.g. 2015
    gender:     str    # "Male" or "Female"
    death_rate: float  # age-standardised deaths per 100 000 population


@strawberry.type
class YearRange:
    """
    Minimum and maximum year present in the database.
    Used by the Chart page to initialise the year-range sliders.
    """
    min_year: int
    max_year: int


# ---------------------------------------------------------------------------
# Input type — filter parameters sent by the client
# ---------------------------------------------------------------------------

@strawberry.input
class DeathFilter:
    """
    All fields are optional.  The resolver treats None as "no filter applied".
    Example GraphQL usage:
      deaths(filters: { country: "Turkey", gender: "Male", yearFrom: 2010, yearTo: 2020 })
    """
    country:   Optional[str] = None   # exact country name
    gender:    Optional[str] = None   # "Male" | "Female"
    year_from: Optional[int] = None   # inclusive lower bound
    year_to:   Optional[int] = None   # inclusive upper bound


# ---------------------------------------------------------------------------
# Query resolvers
# ---------------------------------------------------------------------------

@strawberry.type
class Query:

    @strawberry.field
    def deaths(self, filters: Optional[DeathFilter] = None) -> List[DeathRecord]:
        """
        Return death records that match the supplied filters.
        Used by the Chart page.

        Validation rules:
          - gender must be "Male", "Female", or omitted
          - year_from must be <= year_to when both are provided
        """
        # Default to an empty filter object when the client omits the argument
        if filters is None:
            filters = DeathFilter()

        # --- Input validation ---
        if filters.gender and filters.gender not in ("Male", "Female"):
            raise ValueError("gender must be 'Male' or 'Female'")

        if (
            filters.year_from is not None
            and filters.year_to is not None
            and filters.year_from > filters.year_to
        ):
            raise ValueError("year_from must be <= year_to")

        # Delegate the actual SQL query to database.py
        rows = query_deaths(
            country   = filters.country,
            gender    = filters.gender,
            year_from = filters.year_from,
            year_to   = filters.year_to,
        )

        # Convert each dict row to a DeathRecord type
        return [DeathRecord(**r) for r in rows]

    @strawberry.field
    def deaths_by_year(self, year: int) -> List[DeathRecord]:
        """
        Return all (country, gender) rows for a specific year.
        Used by the Table page to show a snapshot of every country.

        The year argument is validated to be a positive integer before
        being passed to the SQL layer.
        """
        if year <= 0:
            raise ValueError("year must be a positive integer")

        rows = query_deaths_by_year(year)
        return [DeathRecord(**r) for r in rows]

    @strawberry.field
    def countries(self) -> List[str]:
        """
        Return a sorted list of all country names in the database.
        Used to populate the country dropdown in the Chart page filter panel.
        """
        return get_countries()

    @strawberry.field
    def all_years(self) -> List[int]:
        """
        Return a sorted list of all years present in the database.
        Used to populate the year selector on the Table page.
        """
        return get_all_years()

    @strawberry.field
    def year_range(self) -> YearRange:
        """
        Return the minimum and maximum year in the database.
        Used to set the initial bounds of the year-range sliders on the Chart page.
        """
        r = get_year_range()
        return YearRange(min_year=r["min_year"], max_year=r["max_year"])


# ---------------------------------------------------------------------------
# Build the schema — this object is imported by main.py
# ---------------------------------------------------------------------------

schema = strawberry.Schema(query=Query)