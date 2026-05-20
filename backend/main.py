"""
main.py
-------
FastAPI application entry point.

Responsibilities:
  1. Create the FastAPI app instance.
  2. Add CORS middleware so the React dev server (port 5173) can call this API.
  3. Mount the Strawberry GraphQL router at /graphql.
     The GraphiQL playground is enabled at the same URL for easy manual testing.
  4. Expose a simple health-check endpoint at GET /.

How to run:
  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from schema import schema   # the compiled Strawberry schema from schema.py

# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------

app = FastAPI(title="Cardiovascular Deaths API")

# ---------------------------------------------------------------------------
# CORS — allow the React dev server to make cross-origin requests
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    # Only the React Vite dev server origins are whitelisted.
    # In production, replace with your actual frontend domain.
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# GraphQL router
# ---------------------------------------------------------------------------

# graphiql=True enables the browser-based GraphQL playground at /graphql
# which is very useful for testing queries before connecting the frontend.
graphql_app = GraphQLRouter(schema, graphql_ide="graphiql")
app.include_router(graphql_app, prefix="/graphql")

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    """
    Simple health-check endpoint.
    Returns a JSON message confirming the API is running.
    """
    return {"message": "API is running. Visit /graphql for the playground."}