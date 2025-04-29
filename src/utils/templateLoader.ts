import Handlebars from "handlebars";
import { templates } from "./templates";

// Cache for compiled templates
const templateCache = new Map<string, Handlebars.TemplateDelegate>();

/**
 * Load and compile a template from the bundled templates
 * @param templatePath Path to the template relative to templates directory
 * @returns The compiled template function
 */
function loadTemplate(templatePath: string): Handlebars.TemplateDelegate {
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

  const compiledTemplate = Handlebars.compile(template);
  templateCache.set(templatePath, compiledTemplate);
  return compiledTemplate;
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
  return template(variables);
}
