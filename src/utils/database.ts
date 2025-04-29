import { Env, type PostMetadata } from "../types"

export async function getMetadataForPage(path: string, db: D1Database): Promise<PostMetadata | null> {
  try {
    // Query D1 database for post metadata
    const stmt = db.prepare("SELECT * FROM social_previews WHERE path = ?")
    const result = await stmt.bind(path).first<PostMetadata>()

    if (!result) {
      // Try to get default metadata
      const defaultStmt = db.prepare("SELECT * FROM social_previews WHERE is_default = 1")
      return await defaultStmt.first<PostMetadata>()
    }

    return result
  } catch (error) {
    console.error("Database error:", error)
    return null
  }
}
