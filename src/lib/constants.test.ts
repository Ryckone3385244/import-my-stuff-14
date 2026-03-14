import { describe, it, expect } from "vitest";
import { VALIDATION_LIMITS, DEFAULT_EVENT, ROLE_DISPLAY_NAMES, QUERY_KEYS } from "./constants";

describe("VALIDATION_LIMITS", () => {
  it("has all expected validation limits defined", () => {
    expect(VALIDATION_LIMITS.COMPANY_NAME).toBe(200);
    expect(VALIDATION_LIMITS.EMAIL).toBe(255);
    expect(VALIDATION_LIMITS.BOOTH_NUMBER).toBe(50);
    expect(VALIDATION_LIMITS.POSTCODE).toBe(20);
    expect(VALIDATION_LIMITS.WEBSITE_URL).toBe(500);
  });

  it("limits are all positive numbers", () => {
    Object.values(VALIDATION_LIMITS).forEach((limit) => {
      expect(limit).toBeGreaterThan(0);
      expect(typeof limit).toBe("number");
    });
  });
});

describe("DEFAULT_EVENT", () => {
  it("has required event details", () => {
    expect(DEFAULT_EVENT.NAME).toBeDefined();
    expect(DEFAULT_EVENT.DATE).toBeDefined();
    expect(DEFAULT_EVENT.LOCATION).toBeDefined();
    expect(DEFAULT_EVENT.EMAIL).toBeDefined();
  });
});

describe("ROLE_DISPLAY_NAMES", () => {
  it("maps customer_service to Client Relations Manager", () => {
    expect(ROLE_DISPLAY_NAMES.customer_service).toBe("Client Relations Manager");
  });

  it("has all expected roles", () => {
    expect(ROLE_DISPLAY_NAMES.admin).toBeDefined();
    expect(ROLE_DISPLAY_NAMES.exhibitor).toBeDefined();
    expect(ROLE_DISPLAY_NAMES.speaker).toBeDefined();
  });
});

describe("QUERY_KEYS", () => {
  it("has all expected query keys", () => {
    expect(QUERY_KEYS.EVENT_SETTINGS).toBe("event-settings");
    expect(QUERY_KEYS.EXHIBITORS).toBe("exhibitors");
    expect(QUERY_KEYS.SPEAKERS).toBe("speakers");
    expect(QUERY_KEYS.USER_ROLE).toBe("user-role");
  });
});
