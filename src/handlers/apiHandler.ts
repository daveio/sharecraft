import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { checkAuth } from "../middleware/auth"
import { type AuthStatus, CreatePostSchema, UpdatePostSchema } from "../schemas"
import type { Env } from "../types"
import {
  handleCreatePostApi,
  handleDeletePostApi,
  handleGetPostsApi,
  handleImageUploadApi,
  handleUpdatePostApi
} from "../utils/apiUtils"

type ApiBindings = {
  Bindings: Env
  Variables: {
    authStatus: AuthStatus
  }
}

// Create API router
const api = new Hono<ApiBindings>()

// Apply auth middleware to all routes
api.use("*", checkAuth)

// Posts endpoints
api.get("/posts", async (c) => {
  const posts = await handleGetPostsApi(c.env)
  return c.json(posts)
})

api.post("/posts", zValidator("json", CreatePostSchema), async (c) => {
  const data = await c.req.json()
  const post = await handleCreatePostApi(data, c.env)
  return c.json(post, 201)
})

api.put("/posts/:id", zValidator("json", UpdatePostSchema), async (c) => {
  const id = Number.parseInt(c.req.param("id"))
  const data = await c.req.json()
  const post = await handleUpdatePostApi(id, data, c.env)
  return c.json(post)
})

api.delete("/posts/:id", async (c) => {
  const id = Number.parseInt(c.req.param("id"))
  await handleDeletePostApi({ id }, c.env)
  return c.json({ success: true })
})

// Image upload endpoint
api.post("/upload", async (c) => {
  const formData = await c.req.formData()
  const host = c.req.header("host") || ""
  const result = await handleImageUploadApi(formData, c.env, host)
  return c.json(result)
})

export { api }
