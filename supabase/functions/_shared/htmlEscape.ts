/**
 * HTML-escape a string to prevent special characters from being corrupted
 * when embedded in HTML email templates.
 * 
 * This is especially important for passwords containing characters like &, <, >, ", '
 * which would otherwise be interpreted as HTML entities or cause parsing issues.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape password for safe embedding in HTML emails.
 * Wraps the password in a monospace code block for better copy-paste experience.
 */
export function escapePasswordForEmail(password: string): string {
  return escapeHtml(password);
}
