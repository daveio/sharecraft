import type { Env } from "../types";
import { checkForSocialCrawler } from "../utils/crawlerDetection";
import { getMetadataForPage } from "../utils/database";
import { replaceMetaTags } from "../utils/metaTags";

export async function handlePageRequest(request: Request, env: Env): Promise<Response> {
  // Get the original response from Notion
  const originalResponse = await fetch(request);

  // Check if this is a social media crawler
  const userAgent = request.headers.get("User-Agent") || "";
  const isSocialCrawler = checkForSocialCrawler(userAgent);

  // If not a social crawler, return original response
  if (!isSocialCrawler) {
    return originalResponse;
  }

  // Get the URL path to identify the post
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // Get custom metadata for this specific page from D1
    const metadata = await getMetadataForPage(path, env.DB);

    if (!metadata) {
      // No custom metadata found, return original
      return originalResponse;
    }

    // For social crawlers, modify the HTML
    const originalText = await originalResponse.text();
    const modifiedHtml = replaceMetaTags(originalText, metadata);

    // Return modified response
    return new Response(modifiedHtml, {
      headers: originalResponse.headers,
    });
  } catch (error) {
    console.error("Error handling page request:", error);
    return originalResponse;
  }
}
