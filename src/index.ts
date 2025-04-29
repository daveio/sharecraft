/// <reference types="@cloudflare/workers-types" />

import { Env } from "./types";
import { handleAdminRequest } from "./handlers/adminHandler";
import { handleApiRequest } from "./handlers/apiHandler";
import { handleImageRequest } from "./handlers/imageHandler";
import { handlePageRequest } from "./handlers/pageHandler";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle admin panel routes
    if (url.pathname.startsWith("/admin")) {
      return handleAdminRequest(request, env);
    }

    // Handle API routes
    if (url.pathname.startsWith("/api")) {
      return handleApiRequest(request, env);
    }

    // Handle image requests for R2
    if (url.pathname.startsWith("/images/")) {
      return handleImageRequest(request, env);
    }

    // Handle normal page requests with social preview modification
    return handlePageRequest(request, env);
  },
};
