import { Hono } from "hono"
import { checkAuth } from "../middleware/auth"
import type { Env } from "../types"
import { handleAdminLogin } from "../utils/auth"
import { renderHtmlTemplate } from "../utils/templateLoader"

interface PageStats {
  count: number
}

interface RecentPage {
  url: string
  previewType: "Default" | "Custom"
  lastModified: string
}

type AdminBindings = {
  Bindings: Env
}

// Create admin router
const admin = new Hono<AdminBindings>()

// Handle login/auth
admin.get("/login", async (c) => {
  return handleAdminLogin(c.req.raw, c.env)
})

// Apply auth middleware to all other routes
admin.use("*", checkAuth)

// Serve admin dashboard
admin.get("/", async (c) => {
  // Get stats for the dashboard
  const totalPagesStmt = await c.env.DB.prepare("SELECT COUNT(*) as count FROM social_previews").first<PageStats>()
  const customPreviewsStmt = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM social_previews WHERE is_default = 0"
  ).first<PageStats>()

  const variables = {
    totalPages: totalPagesStmt?.count ?? 0,
    customPreviews: customPreviewsStmt?.count ?? 0,
    cacheHitRate: 95, // This could be calculated from actual metrics if available
    pages: await getRecentPages(c.env)
  }

  return new Response(renderHtmlTemplate("panel.html.hbs", variables), {
    headers: { "Content-Type": "text/html" }
  })
})

// Serve add page
admin.get("/add", async (c) => {
  return new Response(renderHtmlTemplate("add.html.hbs"), {
    headers: { "Content-Type": "text/html" }
  })
})

// Serve edit page
admin.get("/edit", async (c) => {
  const id = c.req.query("id")
  if (!id) {
    return Response.redirect("/admin", 302)
  }

  try {
    const stmt = c.env.DB.prepare("SELECT * FROM social_previews WHERE id = ?")
    const post = await stmt.bind(id).first()

    if (!post) {
      return Response.redirect("/admin", 302)
    }

    return new Response(renderHtmlTemplate("edit.html.hbs", { post }), {
      headers: { "Content-Type": "text/html" }
    })
  } catch (error) {
    console.error("Error fetching post:", error)
    return Response.redirect("/admin", 302)
  }
})

async function getRecentPages(env: Env): Promise<RecentPage[]> {
  const stmt = env.DB.prepare(`
    SELECT path as url,
           CASE WHEN is_default = 1 THEN 'Default' ELSE 'Custom' END as previewType,
           updated_at as lastModified
    FROM social_previews
    ORDER BY updated_at DESC
    LIMIT 10
  `)

  const result = await stmt.all<RecentPage>()
  return result.results ?? []
}

export { admin }
