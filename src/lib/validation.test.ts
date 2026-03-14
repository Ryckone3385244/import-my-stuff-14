import { describe, it, expect } from "vitest";
import { exhibitorSchema, speakerSchema, supplierSchema, userCreationSchema, countWords } from "./validation";

describe("countWords", () => {
  it("counts words correctly", () => {
    expect(countWords("hello world")).toBe(2);
    expect(countWords("  hello  world  ")).toBe(2);
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("one")).toBe(1);
  });
});

describe("exhibitorSchema", () => {
  const validExhibitor = {
    name: "Test Company",
    account_number: "ACC001",
    booth_number: "B42",
    contact_full_name: "John Doe",
    contact_mobile: "+44 123 456 7890",
    contact_email: "john@example.com",
    address_street: "123 Test Street",
    address_city: "London",
    address_postcode: "SW1A 1AA",
    address_country: "United Kingdom",
  };

  it("validates a complete valid exhibitor", () => {
    const result = exhibitorSchema.safeParse(validExhibitor);
    expect(result.success).toBe(true);
  });

  it("requires company name", () => {
    const result = exhibitorSchema.safeParse({ ...validExhibitor, name: "" });
    expect(result.success).toBe(false);
  });

  it("requires valid email", () => {
    const result = exhibitorSchema.safeParse({ ...validExhibitor, contact_email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("allows optional website when empty", () => {
    const result = exhibitorSchema.safeParse({ ...validExhibitor, website: "" });
    expect(result.success).toBe(true);
  });

  it("validates website URL format", () => {
    const result = exhibitorSchema.safeParse({ ...validExhibitor, website: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("accepts valid website URL", () => {
    const result = exhibitorSchema.safeParse({ ...validExhibitor, website: "https://example.com" });
    expect(result.success).toBe(true);
  });

  it("allows null description", () => {
    const result = exhibitorSchema.safeParse({ ...validExhibitor, description: null });
    expect(result.success).toBe(true);
  });

  it("trims whitespace from fields", () => {
    const result = exhibitorSchema.safeParse({ ...validExhibitor, name: "  Test Company  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Test Company");
    }
  });
});

describe("speakerSchema", () => {
  it("validates a minimal valid speaker", () => {
    const result = speakerSchema.safeParse({ name: "Jane Speaker", company: "Test Corp" });
    expect(result.success).toBe(true);
  });

  it("requires speaker name", () => {
    const result = speakerSchema.safeParse({ name: "", company: "Test Corp" });
    expect(result.success).toBe(false);
  });

  it("requires company", () => {
    const result = speakerSchema.safeParse({ name: "Jane", company: "" });
    expect(result.success).toBe(false);
  });

  it("allows optional email empty", () => {
    const result = speakerSchema.safeParse({ name: "Jane", company: "Corp", email: "" });
    expect(result.success).toBe(true);
  });

  it("validates email format when provided", () => {
    const result = speakerSchema.safeParse({ name: "Jane", company: "Corp", email: "invalid" });
    expect(result.success).toBe(false);
  });

  it("validates linkedin URL format when provided", () => {
    const result = speakerSchema.safeParse({ name: "Jane", company: "Corp", linkedin_url: "not-url" });
    expect(result.success).toBe(false);
  });
});

describe("supplierSchema", () => {
  it("validates a minimal supplier", () => {
    const result = supplierSchema.safeParse({ name: "Supplier Co" });
    expect(result.success).toBe(true);
  });

  it("requires supplier name", () => {
    const result = supplierSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("validates button URL format", () => {
    const result = supplierSchema.safeParse({ name: "Supplier", button_url: "bad-url" });
    expect(result.success).toBe(false);
  });
});

describe("userCreationSchema", () => {
  it("validates valid user creation data", () => {
    const result = userCreationSchema.safeParse({ email: "user@test.com", password: "secure123" });
    expect(result.success).toBe(true);
  });

  it("requires valid email", () => {
    const result = userCreationSchema.safeParse({ email: "invalid", password: "secure123" });
    expect(result.success).toBe(false);
  });

  it("requires minimum password length", () => {
    const result = userCreationSchema.safeParse({ email: "user@test.com", password: "12345" });
    expect(result.success).toBe(false);
  });

  it("accepts 6-character password", () => {
    const result = userCreationSchema.safeParse({ email: "user@test.com", password: "123456" });
    expect(result.success).toBe(true);
  });
});
