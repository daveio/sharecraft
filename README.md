# `sharecraft`

A Cloudflare Worker that customizes social media preview cards for Notion pages. This worker intercepts requests from social media crawlers and serves custom meta tags for better social sharing previews.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Features

- Custom social preview metadata for specific pages
- Default fallback previews
- Admin panel for managing previews
- Support for multiple social platforms (X, Facebook, LinkedIn, etc.)
- Image upload and management
- Secure authentication
- Detects social media crawlers
- Modifies HTML responses to include custom metadata
- Serves images from R2
- Provides an admin interface

## Setup

### Admin Interface

A web-based dashboard that allows you to:

- Create and manage custom social previews for specific blog posts
- Upload custom preview images to R2
- Set a default social preview for posts without specific configurations

### Storage Solutions

- **D1 Database**: Stores your custom social preview metadata
- **R2 Bucket**: Hosts your preview images
- **KV Namespace**: Manages configuration and admin authentication

## Featires

- **Customized Social Sharing**: Full control over how your content appears when shared on social platforms
- **Easy Management**: User-friendly admin interface for non-technical users
- **Optimized Performance**: Leverages Cloudflare's edge network with proper caching
- **Cost-Effective**: Uses Cloudflare's generous free tier for most small to medium blogs

## Implementation

This will set up a custom social preview solution for your Notion-hosted blog using Cloudflare services. This solution allows you to intercept social media crawlers and serve custom Open Graph and X card metadata, replacing Notion's generic previews.

### Architecture Overview

This solution uses:

- **Cloudflare Workers**: To intercept requests and modify HTML responses
- **Cloudflare D1**: SQL database to store custom preview metadata
- **Cloudflare R2**: Object storage for preview images
- **Cloudflare KV**: To store configuration and session data

### Setup Instructions

#### 1. Set Up Cloudflare Resources

First, install the Wrangler CLI:

```bash
npm install
```

Then login to your Cloudflare account:

```bash
npx wrangler login
```

##### Create D1 Database

```bash
npx wrangler d1 create social_previews
```

Take note of the database ID from the output.

##### Create R2 Bucket

```bash
npx wrangler r2 bucket create preview-images
```

##### Create KV Namespace

```bash
npx wrangler kv:namespace create CONFIG
```

Take note of the namespace ID from the output.

#### 2. Configure wrangler.toml

Create a `wrangler.toml` file in your project root:

```toml
name = "notion-social-preview"
main = "src/index.js"
compatibility_date = "2023-05-01"

[[d1_databases]]
binding = "DB"
database_name = "social_previews"
database_id = "YOUR_DATABASE_ID_HERE"

[[r2_buckets]]
binding = "PREVIEW_IMAGES"
bucket_name = "preview-images"

[[kv_namespaces]]
binding = "CONFIG"
id = "YOUR_KV_NAMESPACE_ID_HERE"

# Routes
[routes]
pattern = "yourdomain.com/*"
zone_name = "yourdomain.com"
```

Replace the placeholders with your actual database ID, KV namespace ID, and domain name.

#### 3. Initialize the Database

Create a `migrations` directory and save the SQL migration script there:

```bash
mkdir migrations
```

Put the D1 migration script in `migrations/init.sql`.

Run the migration:

```bash
npx wrangler d1 execute social_previews --file=./migrations/init.sql
```

or maybe the following will be relevant?

```sql
CREATE TABLE social_previews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_default INTEGER DEFAULT 0
);
```

#### 4. Set Up KV Values

Generate a random password. You can use this script or generate your own.

JavaScript version:

```javascript
function generateSecurePassword(length = 32) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}
console.log(generateSecurePassword(32));
```

Shell oneliner using [`**oven-sh/bun**`](https://github.com/oven-sh/bun) - you can use `node -e` if you're boring:

```sh
bun -e "const g=n=>[...Array(n)].map(_=>('0z\$'[Math.random()*3|0]+String.fromCharCode(48+Math.random()*75|0)).slice(-1)).join('');console.log(g(32))"
```

Set the admin username.

```sh
npx wrangler kv:key put --binding=CONFIG "admin_username" "admin" --namespace-id=YOUR_NAMESPACE_ID
```

Set the admin password using the password you generated earlier.

```sh
npx wrangler kv:key put --binding=CONFIG "admin_password" "YOUR_PASSWORD" --namespace-id=YOUR_NAMESPACE_ID
```

Set your site domain.

```sh
npx wrangler kv:key put --binding=CONFIG "site_domain" "yourdomain.com" --namespace-id=YOUR_NAMESPACE_ID
```

Generated password (keep this secure!):

```sh
VFwGvc4x2L0JuNjLgEeBc4JAjlQQTzI9
```

#### 5. Create Worker Code

Create a `src` directory and put the worker code there:

```bash
mkdir src
```

Put the main worker code from the `worker-complete` artifact in `src/index.js`.

#### 6. Deploy the Worker

Deploy the worker to Cloudflare:

```bash
npx wrangler deploy # maybe `npm run deploy`?
```

#### 7. Configure DNS and Routes

Ensure your domain is using Cloudflare DNS, and that the worker route is correctly set to intercept all traffic to your domain.

### Using the Admin Panel

1. Access the admin panel at: `https://yourdomain.com/admin/login`
2. Log in with the credentials you set in KV
3. You can now:
   - Add new social preview configurations for specific blog posts
   - Set up a default social preview for pages without specific configurations
   - Upload custom preview images to R2

### How It Works

1. When a social media crawler (like Facebook's, X's, etc.) visits your blog:

   - The worker detects the crawler via User-Agent header
   - It fetches the corresponding social preview metadata from D1

- It modifies the HTML response to include your custom Open Graph and X card tags

2. For regular visitors:

   - The worker simply passes through the original Notion response without modification

3. For images:
   - Preview images are served directly from R2 via the `/images/` path
   - Images are cached for improved performance

### Customization

#### Adding More Social Crawlers

You can add more social crawler User-Agents to the `checkForSocialCrawler` function in the worker.

#### Enhancing Security

This implementation uses a simple session-based authentication system. For production use, you might want to:

- Implement stronger authentication mechanisms
- Add rate limiting to prevent brute force attempts
- Set up proper CORS headers

#### Performance Optimization

For high-traffic sites, consider:

- Increasing cache TTLs
- Adding edge caching for HTML responses
- Implementing response compression

### Troubleshooting

#### Preview Not Showing Up

1. Use social network debug tools to test:

   - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

2. Check the worker logs for errors:

   ```bash
   npx wrangler tail
   ```

3. Verify that the path in your configuration matches exactly with your blog's URL path.

#### Admin Panel Access Issues

If you can't log in to the admin panel:

1. Reset your admin credentials in KV
2. Clear browser cookies
3. Try accessing from an incognito/private window

#### Image Upload Problems

1. Check that your R2 bucket is correctly configured
2. Verify the permissions on your R2 bucket
3. Check maximum upload size limitations

### Maintenance Tasks

#### Backing Up Data

Periodically back up your D1 database:

```bash
npx wrangler d1 backup social_previews ./backup.sql
```

#### Monitoring Usage

Monitor your Cloudflare usage to avoid unexpected bills:

- Check R2 storage usage
- Monitor Worker requests
- Watch KV operations

### Support

For issues with:

- Cloudflare Workers: [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
- D1 Database: [D1 documentation](https://developers.cloudflare.com/d1/)
- R2 Storage: [R2 documentation](https://developers.cloudflare.com/r2/)
- KV: [KV documentation](https://developers.cloudflare.com/kv/)
