/// <reference types="@cloudflare/workers-types" />

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { admin } from "./handlers/adminHandler";
import { api } from "./handlers/apiHandler";
import { images } from "./handlers/imageHandler";
import { pages } from "./handlers/pageHandler";
import type { Env } from "./types";

// Create main app
const app = new Hono<{ Bindings: Env }>();

// Mount API routes
app.route("/api", api);

// Mount admin routes
app.route("/admin", admin);

// Mount image handler routes
app.route("/images", images);

// Mount page handler routes
app.route("", pages);

// Error handling
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
