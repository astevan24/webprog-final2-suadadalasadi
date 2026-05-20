/**
 * client.js
 * ---------
 * Creates and exports a single GraphQLClient instance from the
 * 'graphql-request' library.
 *
 * Why graphql-request?
 *   It is a lightweight GraphQL client that handles:
 *     - Sending POST requests to the GraphQL endpoint
 *     - Setting the correct Content-Type header
 *     - Parsing the JSON response
 *     - Throwing on GraphQL errors (errors[])
 *
 * The single client instance is shared by all pages/components.
 * If you change the backend port, update GRAPHQL_URL here.
 */

import { GraphQLClient } from "graphql-request";

// The URL of the GraphQL server started by `uvicorn main:app --port 8000`
const GRAPHQL_URL = "http://localhost:8000/graphql";

// Create the client — no auth headers needed for this public API
const client = new GraphQLClient(GRAPHQL_URL);

export default client;