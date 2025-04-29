import { $ } from "bun";

let devProcess: null | { kill: () => void; exited: Promise<number> } = null;

async function runDev() {
  try {
    console.log("🏗️  Building templates...");
    await $`bun run build:templates`;

    console.log("🚀 Starting development server...");
    // Store the dev process so we can clean it up if needed
    devProcess = Bun.spawn(["bun", "run", "wrangler", "dev"], {
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
    });

    // Wait for the dev process to exit
    const exitCode = await devProcess.exited;
    if (exitCode !== 0) {
      throw new Error(`Development server exited with code ${exitCode}`);
    }
  } catch (error) {
    console.error("❌ Development server failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Handle cleanup on interruption
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down development server...");
  if (devProcess) {
    devProcess.kill();
  }
  process.exit(0);
});

await runDev();
