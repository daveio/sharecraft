export function replaceMetaTags(html, metadata) {
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
