// wrangler.toml configuration
// [[ This should go in wrangler.toml file ]]
// name = "notion-social-preview"
// main = "src/index.js"
// compatibility_date = "2023-05-01"
// 
// [[ D1 Database ]]
// [[d1_databases]]
// binding = "DB"
// database_name = "social_previews"
// database_id = "your-database-id"
// 
// [[ R2 Bucket ]]
// [[r2_buckets]]
// binding = "PREVIEW_IMAGES"
// bucket_name = "preview-images"
// 
// [[ KV Namespace ]]
// [[kv_namespaces]]
// binding = "CONFIG"
// id = "your-kv-namespace-id"

// Main Worker code
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})

async function handleRequest(event) {
  const request = event.request
  const url = new URL(request.url)
  
  // Handle admin panel routes
  if (url.pathname.startsWith('/admin')) {
    return handleAdminRequest(request, event.env)
  }
  
  // Handle API routes
  if (url.pathname.startsWith('/api')) {
    return handleApiRequest(request, event.env)
  }
  
  // Handle image requests for R2
  if (url.pathname.startsWith('/images/')) {
    return handleImageRequest(request, event.env)
  }
  
  // Handle normal page requests with social preview modification
  return handlePageRequest(request, event.env)
}

async function handlePageRequest(request, env) {
  // Get the original response from Notion
  const originalResponse = await fetch(request)
  
  // Check if this is a social media crawler
  const userAgent = request.headers.get('User-Agent') || ''
  const isSocialCrawler = checkForSocialCrawler(userAgent)
  
  // If not a social crawler, return original response
  if (!isSocialCrawler) {
    return originalResponse
  }
  
  // Get the URL path to identify the post
  const url = new URL(request.url)
  const path = url.pathname

  try {
    // Get custom metadata for this specific page from D1
    const metadata = await getMetadataForPage(path, env.DB)
    
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
    console.error('Error handling page request:', error)
    return originalResponse
  }
}

function checkForSocialCrawler(userAgent) {
  // Common social media crawler user agents
  const socialCrawlers = [
    'facebookexternalhit',
    'Twitterbot',
    'LinkedInBot',
    'WhatsApp',
    'Slackbot',
    'TelegramBot',
    'discord',
    'Discordbot',
    'Pinterest',
    'Googlebot'
  ]
  
  return socialCrawlers.some(crawler => userAgent.toLowerCase().includes(crawler.toLowerCase()))
}

async function getMetadataForPage(path, db) {
  try {
    // Query D1 database for post metadata
    const stmt = db.prepare('SELECT * FROM social_previews WHERE path = ?')
    const result = await stmt.bind(path).first()
    
    if (!result) {
      // Try to get default metadata
      const defaultStmt = db.prepare('SELECT * FROM social_previews WHERE is_default = 1')
      return await defaultStmt.first()
    }
    
    return result
  } catch (error) {
    console.error('Database error:', error)
    return null
  }
}

function replaceMetaTags(html, metadata) {
  let modifiedHtml = html
  
  // Generate full image URL
  const imageUrl = metadata.image_url
  
  // Replace Open Graph tags
  modifiedHtml = modifiedHtml.replace(/<meta property="og:title"[^>]*>/g, 
    `<meta property="og:title" content="${metadata.title}">`)
  modifiedHtml = modifiedHtml.replace(/<meta property="og:description"[^>]*>/g, 
    `<meta property="og:description" content="${metadata.description}">`)
  modifiedHtml = modifiedHtml.replace(/<meta property="og:image"[^>]*>/g, 
    `<meta property="og:image" content="${imageUrl}">`)
  
  // Add Twitter card tags if they don't exist
  if (!modifiedHtml.includes('twitter:card')) {
    const headEnd = modifiedHtml.indexOf('</head>')
    if (headEnd !== -1) {
      modifiedHtml = modifiedHtml.slice(0, headEnd) + 
        `<meta name="twitter:card" content="summary_large_image">
         <meta name="twitter:title" content="${metadata.title}">
         <meta name="twitter:description" content="${metadata.description}">
         <meta name="twitter:image" content="${imageUrl}">` + 
        modifiedHtml.slice(headEnd)
    }
  } else {
    // Replace Twitter tags
    modifiedHtml = modifiedHtml.replace(/<meta name="twitter:title"[^>]*>/g, 
      `<meta name="twitter:title" content="${metadata.title}">`)
    modifiedHtml = modifiedHtml.replace(/<meta name="twitter:description"[^>]*>/g, 
      `<meta name="twitter:description" content="${metadata.description}">`)
    modifiedHtml = modifiedHtml.replace(/<meta name="twitter:image"[^>]*>/g, 
      `<meta name="twitter:image" content="${imageUrl}">`)
  }
  
  return modifiedHtml
}

// Handle admin UI requests
async function handleAdminRequest(request, env) {
  const url = new URL(request.url)
  
  // Handle login/auth
  if (url.pathname === '/admin/login') {
    // Simple authentication (you should implement a more secure method)
    return handleAdminLogin(request, env)
  }
  
  // Check if logged in
  const authStatus = await checkAuth(request, env)
  if (!authStatus.authenticated) {
    return Response.redirect(`${url.origin}/admin/login`, 302)
  }
  
  // Serve admin dashboard
  if (url.pathname === '/admin' || url.pathname === '/admin/') {
    return serveAdminDashboard(env)
  }
  
  // Serve other admin pages
  if (url.pathname === '/admin/add') {
    return serveAddPostForm(env)
  }
  
  if (url.pathname === '/admin/edit') {
    return serveEditPostForm(request, env)
  }
  
  // Default 404 for admin routes
  return new Response('Not found', { status: 404 })
}

// Handle API requests
async function handleApiRequest(request, env) {
  const url = new URL(request.url)
  
  // Check if logged in for API requests
  const authStatus = await checkAuth(request, env)
  if (!authStatus.authenticated) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // API endpoints
  if (url.pathname === '/api/posts' && request.method === 'GET') {
    return handleGetPostsApi(env)
  }
  
  if (url.pathname === '/api/posts' && request.method === 'POST') {
    return handleCreatePostApi(request, env)
  }
  
  if (url.pathname === '/api/posts' && request.method === 'PUT') {
    return handleUpdatePostApi(request, env)
  }
  
  if (url.pathname === '/api/posts' && request.method === 'DELETE') {
    return handleDeletePostApi(request, env)
  }
  
  if (url.pathname === '/api/upload' && request.method === 'POST') {
    return handleImageUploadApi(request, env)
  }
  
  // Default 404 for API routes
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  })
}

// Simple auth functions
async function handleAdminLogin(request, env) {
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

async function checkAuth(request, env) {
  // Extract session cookie
  const cookieHeader = request.headers.get('Cookie') || ''
  const sessionMatch = cookieHeader.match(/session=([^;]+)/)
  
  if (!sessionMatch) {
    return { authenticated: false }
  }
  
  const sessionToken = sessionMatch[1]
  const sessionValid = await env.CONFIG.get(`session_${sessionToken}`)
  
  return { 
    authenticated: sessionValid === 'valid',
    sessionToken
  }
}

// API handlers
async function handleGetPostsApi(env) {
  try {
    const stmt = env.DB.prepare('SELECT * FROM social_previews ORDER BY id DESC')
    const results = await stmt.all()
    
    return new Response(JSON.stringify(results.results), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function handleCreatePostApi(request, env) {
  try {
    const data = await request.json()
    
    // Validate required fields
    if (!data.path || !data.title || !data.description || !data.image_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Check if path already exists
    const checkStmt = env.DB.prepare('SELECT id FROM social_previews WHERE path = ?')
    const existing = await checkStmt.bind(data.path).first()
    
    if (existing) {
      return new Response(JSON.stringify({ error: 'Path already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Insert new post
    const stmt = env.DB.prepare(`
      INSERT INTO social_previews (path, title, description, image_url, is_default)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    await stmt.bind(
      data.path,
      data.title,
      data.description,
      data.image_url,
      data.is_default ? 1 : 0
    ).run()
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function handleUpdatePostApi(request, env) {
  try {
    const data = await request.json()
    
    // Validate ID
    if (!data.id) {
      return new Response(JSON.stringify({ error: 'Missing ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Update post
    const stmt = env.DB.prepare(`
      UPDATE social_previews 
      SET path = ?, title = ?, description = ?, image_url = ?, is_default = ?
      WHERE id = ?
    `)
    
    await stmt.bind(
      data.path,
      data.title,
      data.description,
      data.image_url,
      data.is_default ? 1 : 0,
      data.id
    ).run()
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function handleDeletePostApi(request, env) {
  try {
    const data = await request.json()
    
    // Validate ID
    if (!data.id) {
      return new Response(JSON.stringify({ error: 'Missing ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Delete post
    const stmt = env.DB.prepare('DELETE FROM social_previews WHERE id = ?')
    await stmt.bind(data.id).run()
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function handleImageUploadApi(request, env) {
  try {
    const formData = await request.formData()
    const file = formData.get('image')
    
    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Generate a unique filename
    const fileExtension = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`
    
    // Upload to R2
    await env.PREVIEW_IMAGES.put(fileName, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      }
    })
    
    // Get site domain from KV
    const domain = await env.CONFIG.get('site_domain') || request.headers.get('host')
    
    // Return the full URL to the uploaded image
    const imageUrl = `https://${domain}/images/${fileName}`
    
    return new Response(JSON.stringify({ 
      success: true,
      fileName: fileName,
      url: imageUrl
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Admin UI HTML templates
function loginHtml(errorMessage = '') {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Login</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100 h-screen flex items-center justify-center">
      <div class="bg-white p-8 rounded shadow-md w-96">
        <h1 class="text-2xl font-bold mb-6 text-center">Social Preview Admin</h1>
        ${errorMessage ? `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">${errorMessage}</div>` : ''}
        <form method="POST" action="/admin/login">
          <div class="mb-4">
            <label class="block text-gray-700 mb-2" for="username">Username</label>
            <input class="w-full px-3 py-2 border rounded" id="username" name="username" type="text" required>
          </div>
          <div class="mb-6">
            <label class="block text-gray-700 mb-2" for="password">Password</label>
            <input class="w-full px-3 py-2 border rounded" id="password" name="password" type="password" required>
          </div>
          <button class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded" type="submit">
            Login
          </button>
        </form>
      </div>
    </body>
    </html>
  `;
}

async function serveAdminDashboard(env) {
  return new Response(adminDashboardHtml(), {
    headers: { 'Content-Type': 'text/html' }
  })
}

function adminDashboardHtml() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Social Preview Admin</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100 min-h-screen">
      <nav class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <h1 class="text-xl font-bold">Social Preview Admin</h1>
            </div>
            <div class="flex items-center">
              <button id="logout-btn" class="ml-4 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold">Manage Social Previews</h2>
          <a href="/admin/add" class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
            Add New Preview
          </a>
        </div>
        
        <div class="bg-white shadow rounded-lg p-6">
          <div id="status-message" class="hidden mb-4 p-4 rounded"></div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Default</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody id="posts-table-body" class="bg-white divide-y divide-gray-200">
                <!-- Posts will be loaded here -->
                <tr>
                  <td colspan="6" class="px-6 py-4 text-center">Loading...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <script>
        // Fetch and display posts
        async function loadPosts() {
          try {
            const response = await fetch('/api/posts');
            const posts = await response.json();
            
            const tableBody = document.getElementById('posts-table-body');
            
            if (posts.length === 0) {
              tableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center">No posts found. Add your first post!</td></tr>';
              return;
            }
            
            tableBody.innerHTML = posts.map(post => `
              <tr>
                <td class="px-6 py-4 whitespace-nowrap">${post.path}</td>
                <td class="px-6 py-4 whitespace-nowrap">${post.title.length > 20 ? post.title.substring(0, 20) + '...' : post.title}</td>
                <td class="px-6 py-4 whitespace-nowrap">${post.description.length > 30 ? post.description.substring(0, 30) + '...' : post.description}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <img src="${post.image_url}" alt="Preview" class="h-10 w-auto">
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  ${post.is_default ? 
                    '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Default</span>' : 
                    ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <a href="/admin/edit?id=${post.id}" class="text-blue-500 hover:text-blue-700 mr-3">Edit</a>
                  <button class="text-red-500 hover:text-red-700" onclick="deletePost(${post.id})">Delete</button>
                </td>
              </tr>
            `).join('');
          } catch (error) 
            console.error('Error loading posts:', error);
            showStatus('Error loading posts. Please try again.', 'error');
        }
        
        // Delete post
        async function deletePost(id) {
          if (!confirm('Are you sure you want to delete this post?')) {
            return;
          }
          
          try {
            const response = await fetch('/api/posts', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ id })
            });
            
            const result = await response.json();
            
            if (result.success) {
              showStatus('Post deleted successfully!', 'success');
              loadPosts();
            } else {
              showStatus('Error deleting post: ' + (result.error || 'Unknown error'), 'error');
            }
          } catch (error) {
            console.error('Error deleting post:', error);
            showStatus('Error deleting post. Please try again.', 'error');
          }
        }
        
        // Show status message
        function showStatus(message, type) {
          const statusElement = document.getElementById('status-message');
          statusElement.textContent = message;
          statusElement.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');
          
          if (type === 'success') {
            statusElement.classList.add('bg-green-100', 'text-green-700');
          } else {
            statusElement.classList.add('bg-red-100', 'text-red-700');
          }
          
          statusElement.classList.remove('hidden');
          
          // Hide after 5 seconds
          setTimeout(() => {
            statusElement.classList.add('hidden');
          }, 5000);
        }
        
        // Logout functionality
        document.getElementById('logout-btn').addEventListener('click', async () => {
          // Clear cookie
          document.cookie = 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          // Redirect to login
          window.location.href = '/admin/login';
        });
        
        // Load posts when page loads
        document.addEventListener('DOMContentLoaded', loadPosts);
      </script>
    </body>
    </html>
  `;
}

async function serveAddPostForm(env) {
  return new Response(addPostFormHtml(), {
    headers: { 'Content-Type': 'text/html' }
  })
}

function addPostFormHtml() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Add Social Preview</title>
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-100 min-h-screen">
      <nav class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <h1 class="text-xl font-bold">Social Preview Admin</h1>
            </div>
            <div class="flex items-center">
              <a href="/admin" class="text-gray-500 hover:text-gray-700">Back to Dashboard</a>
              <button id="logout-btn" class="ml-4 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <div class="max-w-7xl mx-auto px-4 py-6">
        <h2 class="text-2xl font-bold mb-6">Add New Social Preview</h2>
        
        <div class="bg-white shadow rounded-lg p-6">
          <div id="status-message" class="hidden mb-4 p-4 rounded"></div>
          
          <form id="post-form">
            <div class="mb-4">
              <label class="block text-gray-700 mb-2" for="path">Path</label>
              <input class="w-full px-3 py-2 border rounded" id="path" name="path" type="text" placeholder="/blog/post-slug" required>
              <p class="text-sm text-gray-500 mt-1">The URL path of your post (e.g., /blog/my-post)</p>
            </div>
            
            <div class="mb-4">
              <label class="block text-gray-700 mb-2" for="title">Title</label>
              <input class="w-full px-3 py-2 border rounded" id="title" name="title" type="text" required>
            </div>
            
            <div class="mb-4">
              <label class="block text-gray-700 mb-2" for="description">Description</label>
              <textarea class="w-full px-3 py-2 border rounded" id="description" name="description" rows="3" required></textarea>
            </div>
            
            <div class="mb-4">
              <label class="block text-gray-700 mb-2" for="image">Preview Image</label>
              <div class="flex items-center">
                <input class="hidden" id="image" name="image" type="file" accept="image/*">
                <button type="button" id="image-select-btn" class="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded">
                  Select Image
                </button>
                <span id="image-name" class="ml-3 text-gray-500">No image selected</span>
              </div>
              <div id="image-preview" class="mt-4 hidden">
                <img id="preview-img" src="" alt="Preview" class="max-h-40">
              </div>
              <input type="hidden" id="image-url" name="image_url">
            </div>
            
            <div class="mb-6">
              <label class="flex items-center">
                <input type="checkbox" id="is-default" name="is_default" class="mr-2">
                <span class="text-gray-700">Use as default social preview</span>
              </label>
              <p class="text-sm text-gray-500 mt-1">The default preview will be used for pages without a specific preview</p>
            </div>
            
            <div class="flex justify-end">
              <a href="/admin" class="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded mr-2">
                Cancel
              </a>
              <button type="submit" class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
                Save Preview
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <script>
        // Image upload functionality
        document.getElementById('image-select-btn').addEventListener('click', () => {
          document.getElementById('image').click();
        });
        
        document.getElementById('image').addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          // Show file name
          document.getElementById('image-name').textContent = file.name;
          
          // Preview image
          const reader = new FileReader();
          reader.onload = (e) => {
            document.getElementById('preview-img').src = e.target.result;
            document.getElementById('image-preview').classList.remove('hidden');
          };
          reader.readAsDataURL(file);
          
          // Upload to R2
          const formData = new FormData();
          formData.append('image', file);
          
          try {
            showStatus('Uploading image...', 'info');
            
            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
              document.getElementById('image-url').value = result.url;
              showStatus('Image uploaded successfully!', 'success');
            } else {
              showStatus('Error uploading image: ' + (result.error || 'Unknown error'), 'error');
            }
          } catch (error) {
            console.error('Error uploading image:', error);
            showStatus('Error uploading image. Please try again.', 'error');
          }
        });
        
        // Form submission
        document.getElementById('post-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const formData = {
            path: document.getElementById('path').value,
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            image_url: document.getElementById('image-url').value,
            is_default: document.getElementById('is-default').checked
          };
          
          // Validate image URL
          if (!formData.image_url) {
            showStatus('Please upload an image first', 'error');
            return;
          }
          
          try {
            const response = await fetch('/api/posts', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (result.success) {
              showStatus('Preview added successfully!', 'success');
              // Redirect to dashboard after a short delay
              setTimeout(() => {
                window.location.href = '/admin';
              }, 1000);
            } else {
              showStatus('Error adding preview: ' + (result.error || 'Unknown error'), 'error');
            }
          } catch (error) {
            console.error('Error adding preview:', error);
            showStatus('Error adding preview. Please try again.', 'error');
          }
        });
        
        // Show status message
        function showStatus(message, type) {
          const statusElement = document.getElementById('status-message');
          statusElement.textContent = message;
          statusElement.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700', 'bg-blue-100', 'text-blue-700');
          
          if (type === 'success') {
            statusElement.classList.add('bg-green-100', 'text-green-700');
          } else if (type === 'info') {
            statusElement.classList.add('bg-blue-100', 'text-blue-700');
          } else {
            statusElement.classList.add('bg-red-100', 'text-red-700');
          }
          
          statusElement.classList.remove('hidden');
        }
        
        // Logout functionality
        document.getElementById('logout-btn').addEventListener('click', () => {
          document.cookie = 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          window.location.href = '/admin/login';
        });
      </script>
    </body>
    </html>
  `;