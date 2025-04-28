import { readFileSync } from 'fs';
import { join } from 'path';

// Cache for loaded templates
const templateCache = new Map();

/**
 * Load a template from the templates directory
 * @param {string} templatePath - Path to the template relative to templates directory
 * @returns {string} The template content
 */
function loadTemplate(templatePath) {
  if (templateCache.has(templatePath)) {
    return templateCache.get(templatePath);
  }

  const fullPath = join(process.cwd(), 'src', 'templates', templatePath);
  const template = readFileSync(fullPath, 'utf-8');
  templateCache.set(templatePath, template);
  return template;
}

/**
 * Replace handlebars-style variables in a template
 * @param {string} template - Template string
 * @param {Object} variables - Variables to replace
 * @returns {string} Rendered template
 */
function renderTemplate(template, variables = {}) {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    key = key.trim();
    if (key.startsWith('#if ')) {
      const condition = key.slice(4);
      return variables[condition] ? '' : 'style="display: none;"';
    }
    if (key.startsWith('#each ')) {
      const arrayKey = key.slice(6);
      const array = variables[arrayKey] || [];
      return array.map(item => renderTemplate(match, item)).join('');
    }
    return variables[key] !== undefined ? variables[key] : match;
  });
}

/**
 * Load and render a template with variables
 * @param {string} templatePath - Path to the template relative to templates directory
 * @param {Object} variables - Variables to replace in the template
 * @returns {string} Rendered template
 */
export function renderHtmlTemplate(templatePath, variables = {}) {
  const template = loadTemplate(templatePath);
  return renderTemplate(template, variables);
}
