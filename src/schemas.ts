import { z } from "zod"

export const PostMetadataSchema = z.object({
  id: z.number(),
  path: z.string(),
  title: z.string(),
  description: z.string(),
  image_url: z.string(),
  is_default: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
})

export const AdminUserSchema = z.object({
  username: z.string(),
  role: z.enum(["admin", "editor"])
})

export const AuthStatusSchema = z.object({
  authenticated: z.boolean(),
  user: AdminUserSchema.optional()
})

export const CreatePostSchema = PostMetadataSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export const UpdatePostSchema = CreatePostSchema.partial()

export type PostMetadata = z.infer<typeof PostMetadataSchema>
export type AdminUser = z.infer<typeof AdminUserSchema>
export type AuthStatus = z.infer<typeof AuthStatusSchema>
