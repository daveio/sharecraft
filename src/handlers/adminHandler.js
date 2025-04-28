import { checkAuth } from "../middleware/auth";
import { handleAdminLogin } from "../utils/auth";
import { renderHtmlTemplate } from "../utils/templateLoader";

export async function handleAdminRequest(request, env) {
  const url = new URL(request.url);

  // Handle login/auth
  if (url.pathname === "/admin/login") {
    return handleAdminLogin(request, env);
  }

  // Check if logged in
  const authStatus = await checkAuth(request, env);
  if (!authStatus.authenticated) {
    return Response.redirect(`${url.origin}/admin/login`, 302);
  }

  // Serve admin dashboard
  if (url.pathname === "/admin" || url.pathname === "/admin/") {
    // Get stats for the dashboard
    const totalPagesStmt = await env.DB.prepare("SELECT COUNT(*) as count FROM social_previews").first();
    const customPreviewsStmt = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM social_previews WHERE is_default = 0",
    ).first();

    const variables = {
      totalPages: totalPagesStmt.count,
      customPreviews: customPreviewsStmt.count,
      cacheHitRate: 95, // This could be calculated from actual metrics if available
      pages: await getRecentPages(env),
    };

    return new Response(renderHtmlTemplate("panel.html.hbs", variables), {
      headers: { "Content-Type": "text/html" },
    });
  }

  // Serve other admin pages
  if (url.pathname === "/admin/add") {
    return new Response(renderHtmlTemplate("add.html.hbs"), {
      headers: { "Content-Type": "text/html" },
    });
  }

  if (url.pathname === "/admin/edit") {
    const id = url.searchParams.get("id");
    if (!id) {
      return Response.redirect("/admin", 302);
    }

    try {
      const stmt = env.DB.prepare("SELECT * FROM social_previews WHERE id = ?");
      const post = await stmt.bind(id).first();

      if (!post) {
        return Response.redirect("/admin", 302);
      }

      return new Response(renderHtmlTemplate("edit.html.hbs", { post }), {
        headers: { "Content-Type": "text/html" },
      });
    } catch (error) {
      console.error("Error fetching post:", error);
      return Response.redirect("/admin", 302);
    }
  }

  // Default 404 for admin routes
  return new Response("Not found", { status: 404 });
}

async function getRecentPages(env) {
  const stmt = env.DB.prepare(`
    SELECT path as url,
           CASE WHEN is_default = 1 THEN 'Default' ELSE 'Custom' END as previewType,
           updated_at as lastModified
    FROM social_previews
    ORDER BY updated_at DESC
    LIMIT 10
  `);

  return await stmt.all();
}
