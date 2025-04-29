import { $ } from "bun";

async function runDeploy() {
  try {
    console.log("🏗️  Building templates...");
    await $`bun run build:templates`;

    console.log("🚀 Deploying to Cloudflare...");
    await $`bun run wrangler deploy`;

    console.log("✅ Deployment completed successfully!");
  } catch (error) {
    console.error("❌ Deployment failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Handle cleanup on interruption
process.on("SIGINT", () => {
  console.log("\n🛑 Deployment interrupted, cleaning up...");
  process.exit(0);
});

await runDeploy();
