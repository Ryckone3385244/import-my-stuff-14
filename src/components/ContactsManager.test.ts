import { describe, it, expect } from "vitest";
import { z } from "zod";

// Replicate the contact schema from ContactsManager for testing
const contactSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  telephone: z.string().trim().max(20, "Telephone must be less than 20 characters").regex(/^[0-9+\-\s()]*$/, "Invalid telephone format").optional().or(z.literal("")),
  job_title: z.string().trim().max(100, "Job title must be less than 100 characters").optional().or(z.literal("")),
});

describe("Contact Validation Schema", () => {
  it("validates a complete valid contact", () => {
    const result = contactSchema.safeParse({
      full_name: "John Doe",
      email: "john@example.com",
      telephone: "+44 20 1234 5678",
      job_title: "Sales Manager",
    });
    expect(result.success).toBe(true);
  });

  it("requires full_name", () => {
    const result = contactSchema.safeParse({
      full_name: "",
      email: "john@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("requires valid email", () => {
    const result = contactSchema.safeParse({
      full_name: "John",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("allows empty telephone", () => {
    const result = contactSchema.safeParse({
      full_name: "John",
      email: "john@example.com",
      telephone: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid telephone format", () => {
    const result = contactSchema.safeParse({
      full_name: "John",
      email: "john@example.com",
      telephone: "abc-not-phone",
    });
    expect(result.success).toBe(false);
  });

  it("accepts various phone formats", () => {
    const validPhones = ["+44 20 1234 5678", "(123) 456-7890", "+1-555-555-5555", "02012345678"];
    validPhones.forEach((phone) => {
      const result = contactSchema.safeParse({
        full_name: "John",
        email: "john@example.com",
        telephone: phone,
      });
      expect(result.success).toBe(true);
    });
  });

  it("enforces max length on full_name", () => {
    const result = contactSchema.safeParse({
      full_name: "A".repeat(101),
      email: "john@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("enforces max length on email", () => {
    const result = contactSchema.safeParse({
      full_name: "John",
      email: "a".repeat(250) + "@example.com",
    });
    expect(result.success).toBe(false);
  });
});
