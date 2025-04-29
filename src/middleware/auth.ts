import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { AuthStatus } from "../schemas";
import type { Env } from "../types";

type AuthBindings = {
  Bindings: Env;
  Variables: {
    authStatus: AuthStatus;
  };
};

export const checkAuth: MiddlewareHandler<AuthBindings> = async (
  c: Context<AuthBindings>,
  next
) => {
  // Get auth token from cookie
  const authToken = getCookie(c, "auth_token");
  if (!authToken) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  // Verify token from KV store
  const userJson = await c.env.CONFIG.get(`user:${authToken}`);
  if (!userJson) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  try {
    const user = JSON.parse(userJson);
    const authStatus: AuthStatus = {
      authenticated: true,
      user,
    };

    // Add auth status to context for downstream handlers
    c.set("authStatus", authStatus);
    await next();
  } catch (err) {
    throw new HTTPException(401, { message: "Invalid auth data" });
  }
};
