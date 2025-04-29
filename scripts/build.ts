import { join } from "path";
import { readdir, readFile, writeFile } from "fs/promises";

async function buildTemplates() {
  // Create templates object
  const templates: Record<string, string> = {};
  const templatesDir = join(import.meta.dir, "src", "templates");

  try {
    // Read all .hbs files from templates directory
    const files = await readdir(templatesDir);
    const hbsFiles = files.filter((file) => file.endsWith(".hbs"));

    // Read each template file
    await Promise.all(
      hbsFiles.map(async (file) => {
        const content = await readFile(join(templatesDir, file), "utf-8");
        templates[file] = content;
      }),
    );

    // Create templates.ts in src/utils
    const outputFile = join(import.meta.dir, "src", "utils", "templates.ts");
    const templateContent = `// This file is auto-generated. Do not edit manually.
export const templates: Record<string, string> = ${JSON.stringify(templates, null, 2)};
`;

    await writeFile(outputFile, templateContent);
    console.log("Templates bundled successfully!");
  } catch (error) {
    console.error("Error bundling templates:", error);
    process.exit(1);
  }
}

// Run the build script
buildTemplates();
