import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import DOMPurify from "dompurify";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Replaces placeholder tokens in text with actual values.
 * Supported placeholders (case-insensitive): {eventName}, {eventDate}, {eventLocation}, {eventTagline}
 * This is a static utility that needs the values passed in.
 */
export function replaceEventPlaceholders(
  text: string,
  values: {
    eventName?: string;
    eventDate?: string;
    eventLocation?: string;
    eventTagline?: string;
  }
): string {
  if (!text) return "";
  
  return text
    .replace(/{eventName}/gi, values.eventName || "")
    .replace(/{eventDate}/gi, values.eventDate || "")
    .replace(/{eventLocation}/gi, values.eventLocation || "")
    .replace(/{eventTagline}/gi, values.eventTagline || "");
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html - The HTML string to sanitize
 * @param mode - Sanitization mode: 'full' allows all formatting, 'paragraphs-only' only allows line breaks
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(html: string, mode: 'full' | 'paragraphs-only' = 'full'): string {
  if (mode === 'paragraphs-only') {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['br', 'p'],
      ALLOWED_ATTR: [],
      ALLOW_DATA_ATTR: false,
    });
  }
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'span', 'div', 'hr', 's', 'sub', 'sup'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel', 'style'],
    ALLOW_DATA_ATTR: false,
  });
}
