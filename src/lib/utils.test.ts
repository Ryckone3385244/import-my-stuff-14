import { describe, it, expect } from "vitest";
import { replaceEventPlaceholders, sanitizeHtml } from "./utils";

describe("replaceEventPlaceholders", () => {
  const values = {
    eventName: "Grab & Go Expo",
    eventDate: "29 & 30 September 2026",
    eventLocation: "ExCeL London",
    eventTagline: "The future of food",
  };

  it("replaces all placeholders", () => {
    const text = "Welcome to {eventName} at {eventLocation} on {eventDate}. {eventTagline}";
    const result = replaceEventPlaceholders(text, values);
    expect(result).toBe("Welcome to Grab & Go Expo at ExCeL London on 29 & 30 September 2026. The future of food");
  });

  it("is case insensitive", () => {
    expect(replaceEventPlaceholders("{EVENTNAME}", values)).toBe("Grab & Go Expo");
    expect(replaceEventPlaceholders("{EventName}", values)).toBe("Grab & Go Expo");
  });

  it("returns empty string for null/undefined input", () => {
    expect(replaceEventPlaceholders("", values)).toBe("");
    expect(replaceEventPlaceholders(null as any, values)).toBe("");
    expect(replaceEventPlaceholders(undefined as any, values)).toBe("");
  });

  it("replaces with empty string when value is undefined", () => {
    const result = replaceEventPlaceholders("{eventName}", {});
    expect(result).toBe("");
  });
});

describe("sanitizeHtml", () => {
  it("allows safe HTML in full mode", () => {
    const html = '<p><strong>Bold</strong> and <em>italic</em></p>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("strips script tags", () => {
    const html = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<script>");
    expect(result).toContain("<p>Hello</p>");
  });

  it("strips event handlers", () => {
    const html = '<p onclick="alert(1)">Click me</p>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("onclick");
  });

  it("paragraphs-only mode strips formatting", () => {
    const html = '<p><strong>Bold</strong> and <a href="evil.com">link</a></p>';
    const result = sanitizeHtml(html, "paragraphs-only");
    expect(result).not.toContain("<strong>");
    expect(result).not.toContain("<a");
    expect(result).toContain("<p>");
  });

  it("allows links and images in full mode", () => {
    const html = '<a href="https://example.com">Link</a><img src="test.jpg" alt="test" />';
    const result = sanitizeHtml(html);
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('src="test.jpg"');
  });
});
