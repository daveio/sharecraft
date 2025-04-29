import { Hono } from "hono"
import type { Env } from "../types"
import { checkForSocialCrawler } from "../utils/crawlerDetection"
import { getMetadataForPage } from "../utils/database"
import { replaceMetaTags } from "../utils/metaTags"

type PageBindings = {
  Bindings: Env
}

// Create page router
const pages = new Hono<PageBindings>()

// Handle page requests
pages.get("*", async (c) => {
  // Create a new request with the original URL and headers
  const originalRequest = new Request(c.req.url, {
    method: c.req.method,
    headers: new Headers(c.req.raw.headers)
  })

  // Get the original response from Notion
  const originalResponse = await fetch(originalRequest)

  // Check if this is a social media crawler
  const userAgent = c.req.header("User-Agent") || ""
  const isSocialCrawler = checkForSocialCrawler(userAgent)

  // If not a social crawler, return original response
  if (!isSocialCrawler) {
    return originalResponse
  }

  // Get the URL path to identify the post
  const path = c.req.path

  try {
    // Get custom metadata for this specific page from D1
    const metadata = await getMetadataForPage(path, c.env.D1_PREVIEWS)

    if (!metadata) {
      // No custom metadata found, return original
      return originalResponse
    }

    // For social crawlers, modify the HTML
    const originalText = await originalResponse.text()
    const modifiedHtml = replaceMetaTags(originalText, metadata)

    // Return modified response
    return new Response(modifiedHtml, {
      headers: originalResponse.headers
    })
  } catch (error) {
    console.error("Error handling page request:", error)
    return originalResponse
  }
})

export { pages }
