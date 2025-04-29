import { Env } from "../types";

export async function handleImageRequest(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const imagePath = url.pathname.replace("/images/", "");

    // Get image from R2
    const object = await env.PREVIEW_IMAGES.get(imagePath);

    if (!object) {
      return new Response("Image not found", { status: 404 });
    }

    // Get the image data
    const data = await object.arrayBuffer();

    // Return the image with appropriate headers
    return new Response(data, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
        ETag: object.httpEtag,
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return new Response("Error serving image", { status: 500 });
  }
}
