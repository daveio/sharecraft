import { templates } from "./templates";

// Cache for loaded templates
const templateCache = new Map<string, string>();

/**
 * Load a template from the bundled templates
 * @param templatePath Path to the template relative to templates directory
 * @returns The template content
 */
function loadTemplate(templatePath: string): string {
  if (templateCache.has(templatePath)) {
    return templateCache.get(templatePath)!;
  }

  const template = templates[templatePath];
  if (!template) {
    throw new Error(`Template ${templatePath} not found`);
  }

  templateCache.set(templatePath, template);
  return template;
}

/**
 * Replace handlebars-style variables in a template
 * @param template Template string
 * @param variables Variables to replace
 * @returns Rendered template
 */
function renderTemplate(template: string, variables: Record<string, unknown> = {}): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    key = key.trim();
    if (key.startsWith("#if ")) {
      const condition = key.slice(4);
      return variables[condition] ? "" : 'style="display: none;"';
    }
    if (key.startsWith("#each ")) {
      const arrayKey = key.slice(6);
      const array = (variables[arrayKey] as unknown[]) || [];
      return array.map((item) => renderTemplate(match, item as Record<string, unknown>)).join("");
    }
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
}

/**
 * Load and render a template with variables
 * @param templatePath Path to the template relative to templates directory
 * @param variables Variables to replace in the template
 * @returns Rendered template
 */
export function renderHtmlTemplate(templatePath: string, variables: Record<string, unknown> = {}): string {
  const template = loadTemplate(templatePath);
  return renderTemplate(template, variables);
}
