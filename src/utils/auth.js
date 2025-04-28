import { loginHtml } from '../templates/adminTemplates';

export async function handleAdminLogin(request, env) {
  if (request.method === 'POST') {
    const formData = await request.formData()
    const username = formData.get('username')
    const password = formData.get('password')

    // Get stored credentials from KV
    const storedUsername = await env.CONFIG.get('admin_username')
    const storedPassword = await env.CONFIG.get('admin_password')

    if (username === storedUsername && password === storedPassword) {
      // Generate a session token
      const sessionToken = crypto.randomUUID()

      // Store in KV with expiration (24 hours)
      await env.CONFIG.put(`session_${sessionToken}`, 'valid', { expirationTtl: 86400 })

      // Return a response with session cookie
      return new Response('Login successful, redirecting...', {
        status: 302,
        headers: {
          'Location': '/admin',
          'Set-Cookie': `session=${sessionToken}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`
        }
      })
    } else {
      return new Response(loginHtml('Invalid username or password'), {
        headers: { 'Content-Type': 'text/html' }
      })
    }
  }

  // Show login form
  return new Response(loginHtml(), {
    headers: { 'Content-Type': 'text/html' }
  })
}
