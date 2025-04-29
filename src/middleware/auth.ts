import type { Env } from "../types";

interface AuthResult {
  authenticated: boolean;
  sessionToken?: string;
}

export async function checkAuth(request: Request, env: Env): Promise<AuthResult> {
  // Extract session cookie
  const cookieHeader = request.headers.get("Cookie") || "";
  const sessionMatch = cookieHeader.match(/session=([^;]+)/);

  if (!sessionMatch) {
    return { authenticated: false };
  }

  const sessionToken = sessionMatch[1];
  const sessionValid = await env.CONFIG.get(`session_${sessionToken}`);

  return {
    authenticated: sessionValid === "valid",
    sessionToken,
  };
}
