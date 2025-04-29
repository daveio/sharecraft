/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database
  PREVIEW_IMAGES: R2Bucket
  CONFIG: KVNamespace
}

export interface PostMetadata {
  id: number
  path: string
  title: string
  description: string
  image_url: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface AdminUser {
  username: string
  role: "admin" | "editor"
}

export interface AuthStatus {
  authenticated: boolean
  user?: AdminUser
}
