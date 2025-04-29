/// <reference path="../worker-configuration.d.ts" />

export interface Env {
  D1_PREVIEWS: D1Database
  R2_IMAGES: R2Bucket
  KV_CONFIG: KVNamespace
  SC_SHARECRAFT_ADMIN: string
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
