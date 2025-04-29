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
    const cachedTemplate = templateCache.get(templatePath);
    if (!cachedTemplate) {
      throw new Error(`Template ${templatePath} not found in cache`);
    }
    return cachedTemplate;
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
  return template.replace(/\{\{([^}]+)\}\}/g, (match, variableKey) => {
    const trimmedKey = variableKey.trim();
    if (trimmedKey.startsWith("#if ")) {
      const condition = trimmedKey.slice(4);
      return variables[condition] ? "" : 'style="display: none;"';
    }
    if (trimmedKey.startsWith("#each ")) {
      const arrayKey = trimmedKey.slice(6);
      const array = (variables[arrayKey] as unknown[]) || [];
      return array.map((item) => renderTemplate(match, item as Record<string, unknown>)).join("");
    }
    return variables[trimmedKey] !== undefined ? String(variables[trimmedKey]) : match;
  });
}

/**
 * Load and render a template with variables
 * @param templatePath Path to the template relative to templates directory
 * @param variables Variables to replace in the template
 * @returns Rendered template
 */
export function renderHtmlTemplate(
  templatePath: string,
  variables: Record<string, unknown> = {}
): string {
  const template = loadTemplate(templatePath);
  return renderTemplate(template, variables);
}
