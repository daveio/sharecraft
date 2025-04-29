/// <reference types="@cloudflare/workers-types" />

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { handleAdminRequest } from "./handlers/adminHandler";
import { api } from "./handlers/apiHandler";
import { handleImageRequest } from "./handlers/imageHandler";
import { handlePageRequest } from "./handlers/pageHandler";
import type { Env } from "./types";

// Create main app
const app = new Hono<{ Bindings: Env }>();

// Mount API routes
app.route("/api", api);

// Handle admin panel routes
app.get("/admin/*", async (c) => {
  const request = new Request(c.req.url, {
    method: c.req.method,
    headers: new Headers(c.req.raw.headers),
  });
  return handleAdminRequest(request, c.env);
});

// Handle image requests for R2
app.get("/images/*", async (c) => {
  const request = new Request(c.req.url, {
    method: c.req.method,
    headers: new Headers(c.req.raw.headers),
  });
  return handleImageRequest(request, c.env);
});

// Handle normal page requests with social preview modification
app.get("*", async (c) => {
  const request = new Request(c.req.url, {
    method: c.req.method,
    headers: new Headers(c.req.raw.headers),
  });
  return handlePageRequest(request, c.env);
});

// Error handling
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
