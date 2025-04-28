export async function handleGetPostsApi(env) {
  try {
    const stmt = env.DB.prepare("SELECT * FROM social_previews ORDER BY id DESC");
    const results = await stmt.all();

    return new Response(JSON.stringify(results.results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleCreatePostApi(request, env) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.path || !data.title || !data.description || !data.image_url) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if path already exists
    const checkStmt = env.DB.prepare("SELECT id FROM social_previews WHERE path = ?");
    const existing = await checkStmt.bind(data.path).first();

    if (existing) {
      return new Response(JSON.stringify({ error: "Path already exists" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Insert new post
    const stmt = env.DB.prepare(`
      INSERT INTO social_previews (path, title, description, image_url, is_default)
      VALUES (?, ?, ?, ?, ?)
    `);

    await stmt.bind(data.path, data.title, data.description, data.image_url, data.is_default ? 1 : 0).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleUpdatePostApi(request, env) {
  try {
    const data = await request.json();

    // Validate ID
    if (!data.id) {
      return new Response(JSON.stringify({ error: "Missing ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update post
    const stmt = env.DB.prepare(`
      UPDATE social_previews
      SET path = ?, title = ?, description = ?, image_url = ?, is_default = ?
      WHERE id = ?
    `);

    await stmt.bind(data.path, data.title, data.description, data.image_url, data.is_default ? 1 : 0, data.id).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleDeletePostApi(request, env) {
  try {
    const data = await request.json();

    // Validate ID
    if (!data.id) {
      return new Response(JSON.stringify({ error: "Missing ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Delete post
    const stmt = env.DB.prepare("DELETE FROM social_previews WHERE id = ?");
    await stmt.bind(data.id).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleImageUploadApi(request, env) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate a unique filename
    const fileExtension = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;

    // Upload to R2
    await env.PREVIEW_IMAGES.put(fileName, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Get site domain from KV
    const domain = (await env.CONFIG.get("site_domain")) || request.headers.get("host");

    // Return the full URL to the uploaded image
    const imageUrl = `https://${domain}/images/${fileName}`;

    return new Response(
      JSON.stringify({
        success: true,
        fileName: fileName,
        url: imageUrl,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
