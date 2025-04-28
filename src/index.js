// Main Worker entry point
import { handleAdminRequest } from "./handlers/adminHandler";
import { handleApiRequest } from "./handlers/apiHandler";
import { handleImageRequest } from "./handlers/imageHandler";
import { handlePageRequest } from "./handlers/pageHandler";

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
  const request = event.request;
  const url = new URL(request.url);

  // Handle admin panel routes
  if (url.pathname.startsWith("/admin")) {
    return handleAdminRequest(request, event.env);
  }

  // Handle API routes
  if (url.pathname.startsWith("/api")) {
    return handleApiRequest(request, event.env);
  }

  // Handle image requests for R2
  if (url.pathname.startsWith("/images/")) {
    return handleImageRequest(request, event.env);
  }

  // Handle normal page requests with social preview modification
  return handlePageRequest(request, event.env);
}
