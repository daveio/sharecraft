import { Hono } from "hono"
import type { Env } from "../types"

type ImageBindings = {
  Bindings: Env
}

// Create image router
const images = new Hono<ImageBindings>()

// Handle image requests
images.get("/*", async (c) => {
  try {
    // Get the full path and remove the leading slash
    const fullPath = c.req.path
    // Since we're mounted at /images, we need to handle that in the path
    const imagePath = fullPath.startsWith("/") ? fullPath.slice(1) : fullPath

    // Get image from R2
    const object = await c.env.PREVIEW_IMAGES.get(imagePath)

    if (!object) {
      return c.notFound()
    }

    // Get the image data
    const data = await object.arrayBuffer()

    // Return the image with appropriate headers
    return new Response(data, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
        ETag: object.httpEtag
      }
    })
  } catch (error) {
    console.error("Error serving image:", error)
    return c.text("Error serving image", 500)
  }
})

export { images }
