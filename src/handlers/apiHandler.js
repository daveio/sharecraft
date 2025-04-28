import { checkAuth } from '../middleware/auth';
import {
  handleGetPostsApi,
  handleCreatePostApi,
  handleUpdatePostApi,
  handleDeletePostApi,
  handleImageUploadApi
} from '../utils/apiUtils';

export async function handleApiRequest(request, env) {
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
