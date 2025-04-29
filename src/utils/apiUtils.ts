import type { z } from "zod"
import type { CreatePostSchema, UpdatePostSchema } from "../schemas"
import type { Env, PostMetadata } from "../types"

type CreatePostData = z.infer<typeof CreatePostSchema>
type UpdatePostData = z.infer<typeof UpdatePostSchema> & { id: number }

interface DeletePostData {
  id: number
}

export async function handleGetPostsApi(env: Env): Promise<PostMetadata[]> {
  const stmt = env.D1_PREVIEWS.prepare("SELECT * FROM social_previews ORDER BY id DESC")
  const results = await stmt.all<PostMetadata>()
  return results.results
}

export async function handleCreatePostApi(data: CreatePostData, env: Env): Promise<PostMetadata> {
  // Check if path already exists
  const checkStmt = env.D1_PREVIEWS.prepare("SELECT id FROM social_previews WHERE path = ?")
  const existing = await checkStmt.bind(data.path).first<{ id: number }>()

  if (existing) {
    throw new Error("Path already exists")
  }

  // Insert new post
  const stmt = env.D1_PREVIEWS.prepare(`
    INSERT INTO social_previews (path, title, description, image_url, is_default)
    VALUES (?, ?, ?, ?, ?)
    RETURNING *
  `)

  const result = await stmt
    .bind(data.path, data.title, data.description, data.image_url, data.is_default ? 1 : 0)
    .first<PostMetadata>()

  if (!result) {
    throw new Error("Failed to create post")
  }

  return result
}

export async function handleUpdatePostApi(id: number, data: UpdatePostData, env: Env): Promise<PostMetadata> {
  // Update post
  const stmt = env.D1_PREVIEWS.prepare(`
    UPDATE social_previews
    SET path = ?, title = ?, description = ?, image_url = ?, is_default = ?
    WHERE id = ?
    RETURNING *
  `)

  const result = await stmt
    .bind(data.path, data.title, data.description, data.image_url, data.is_default ? 1 : 0, id)
    .first<PostMetadata>()

  if (!result) {
    throw new Error("Post not found")
  }

  return result
}

export async function handleDeletePostApi(data: DeletePostData, env: Env): Promise<void> {
  const stmt = env.D1_PREVIEWS.prepare("DELETE FROM social_previews WHERE id = ?")
  await stmt.bind(data.id).run()
}

export async function handleImageUploadApi(
  formData: FormData,
  env: Env,
  host: string
): Promise<{
  fileName: string
  url: string
}> {
  const file = formData.get("image") as unknown as File | null

  if (!file) {
    throw new Error("No file uploaded")
  }

  // Generate a unique filename
  const fileExtension = file.name.split(".").pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`

  // Upload to R2
  await env.R2_IMAGES.put(fileName, file.stream(), {
    httpMetadata: {
      contentType: file.type
    }
  })

  // Get site domain from KV or use request host
  const domain = (await env.KV_CONFIG.get("site_domain")) || host

  // Return the full URL to the uploaded image
  return {
    fileName,
    url: `https://${domain}/images/${fileName}`
  }
}
