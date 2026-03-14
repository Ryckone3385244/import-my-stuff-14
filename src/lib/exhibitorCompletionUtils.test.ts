import { describe, it, expect } from "vitest";
import {
  calculateExhibitorCompletionSync,
  getExhibitorCompletionChecks,
  calculateSpeakerCompletion,
} from "./exhibitorCompletionUtils";

describe("calculateExhibitorCompletionSync", () => {
  it("returns 0% for empty exhibitor", () => {
    const result = calculateExhibitorCompletionSync({});
    expect(result.percentage).toBe(0);
    expect(result.completedCount).toBe(0);
    expect(result.totalCount).toBeGreaterThan(0);
  });

  it("calculates correct percentage with some fields", () => {
    const exhibitor = {
      logo_url: "https://example.com/logo.png",
      website: "https://example.com",
      description: "A long enough description that exceeds the fifty character minimum threshold for validation",
    };
    const result = calculateExhibitorCompletionSync(exhibitor);
    expect(result.completedCount).toBe(3);
    expect(result.percentage).toBeGreaterThan(0);
    expect(result.percentage).toBeLessThan(100);
  });

  it("counts address as complete when all fields present", () => {
    const exhibitor = {
      exhibitor_address: {
        street_line_1: "123 Test St",
        city: "London",
        postcode: "SW1A 1AA",
        country: "UK",
      },
    };
    const checks = getExhibitorCompletionChecks(exhibitor);
    const addressCheck = checks.find((c) => c.id === "address");
    expect(addressCheck?.completed).toBe(true);
  });

  it("counts address as incomplete when fields missing", () => {
    const exhibitor = {
      exhibitor_address: {
        street_line_1: "123 Test St",
      },
    };
    const checks = getExhibitorCompletionChecks(exhibitor);
    const addressCheck = checks.find((c) => c.id === "address");
    expect(addressCheck?.completed).toBe(false);
  });

  it("counts social media as complete with at least one link", () => {
    const exhibitor = {
      exhibitor_social_media: { linkedin: "https://linkedin.com/company/test" },
    };
    const checks = getExhibitorCompletionChecks(exhibitor);
    const socialCheck = checks.find((c) => c.id === "social");
    expect(socialCheck?.completed).toBe(true);
  });

  it("handles array format for one-to-one relations", () => {
    const exhibitor = {
      exhibitor_address: [{ street_line_1: "123", city: "London", postcode: "SW1", country: "UK" }],
    };
    const checks = getExhibitorCompletionChecks(exhibitor);
    const addressCheck = checks.find((c) => c.id === "address");
    expect(addressCheck?.completed).toBe(true);
  });

  it("adds conditional checks for speaking session", () => {
    const exhibitor = {
      speaking_session: true,
      exhibitor_speaker_submissions: [{ id: "1" }],
      speaker_submission_approved: true,
      exhibitor_speaker_headshots: [{ id: "1" }],
      headshot_submission_approved: true,
    };
    const result = calculateExhibitorCompletionSync(exhibitor);
    // Should have base checks + 2 conditional checks
    expect(result.totalCount).toBe(10); // 8 base + 2 conditional
  });

  it("adds conditional check for advertisement", () => {
    const exhibitor = {
      advertisement: true,
      exhibitor_advert_submissions: [{ id: "1" }],
      advert_submission_approved: true,
    };
    const result = calculateExhibitorCompletionSync(exhibitor);
    expect(result.totalCount).toBe(9); // 8 base + 1 conditional
  });

  it("supports pending_changes for address", () => {
    const exhibitor = {
      exhibitor_address: {
        pending_changes: {
          street_line_1: "123 Test St",
          city: "London",
          postcode: "SW1A 1AA",
          country: "UK",
        },
      },
    };
    const checks = getExhibitorCompletionChecks(exhibitor);
    const addressCheck = checks.find((c) => c.id === "address");
    expect(addressCheck?.completed).toBe(true);
  });
});

describe("calculateSpeakerCompletion", () => {
  it("returns 0% for empty speaker", () => {
    const result = calculateSpeakerCompletion({});
    expect(result.percentage).toBe(0);
    expect(result.completedCount).toBe(0);
  });

  it("calculates percentage with some fields", () => {
    const speaker = {
      photo_url: "https://example.com/photo.jpg",
      title: "CEO",
      company: "Test Corp",
      bio: "A detailed biography that is definitely longer than fifty characters to pass validation",
    };
    const result = calculateSpeakerCompletion(speaker);
    expect(result.completedCount).toBe(4);
    expect(result.percentage).toBeGreaterThan(0);
  });

  it("considers bulk-uploaded speakers as form-complete", () => {
    const speaker = {
      bio: "A detailed biography that is definitely longer than fifty characters to pass validation",
      seminar_title: "Advanced AI in Retail",
    };
    const result = calculateSpeakerCompletion(speaker);
    // Should have the bulk upload check counted as complete
    expect(result.completedCount).toBeGreaterThanOrEqual(3); // bio, seminar_title, and form complete
  });

  it("counts approved submission as form-complete", () => {
    const speaker = {
      name: "Test",
      speaker_submissions: [{ approval_status: "approved" }],
    };
    const result = calculateSpeakerCompletion(speaker);
    const totalWithSubmission = result.totalCount;
    expect(totalWithSubmission).toBe(9); // 8 base + 1 submission check
  });
});
