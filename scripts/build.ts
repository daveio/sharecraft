import { $ } from "bun"

async function runBuild() {
  try {
    console.log("🏗️  Bundling templates...")
    await $`bun run bundle`

    console.log("📦 Building worker...")
    await $`bun run wrangler deploy --dry-run --outdir=dist --no-bundle`

    console.log("✅ Build completed successfully!")
  } catch (error) {
    console.error("❌ Build failed:", error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Handle cleanup on interruption
process.on("SIGINT", () => {
  console.log("\n🛑 Build interrupted, cleaning up...")
  process.exit(0)
})

await runBuild()
