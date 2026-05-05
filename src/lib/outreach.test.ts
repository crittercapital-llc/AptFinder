import { describe, expect, it } from "vitest";
import { LISTINGS } from "@/lib/data/listings";
import { DEFAULT_CRITERIA } from "@/lib/defaults";
import { generateOutreach, newOutreachAction, statusLabel, nextStepFor } from "@/lib/outreach";

describe("generateOutreach", () => {
  it("includes the landlord name and address", () => {
    const listing = LISTINGS[0];
    const { subject, body } = generateOutreach(listing, DEFAULT_CRITERIA);
    expect(subject.length).toBeGreaterThan(0);
    expect(body).toContain(listing.contact.landlordName.split(" ")[0]);
    expect(body).toContain(listing.address.split(",")[0]);
  });

  it("varies tone-dependent phrasing", () => {
    const listing = LISTINGS[0];
    const warm = generateOutreach(listing, { ...DEFAULT_CRITERIA, outreach: { ...DEFAULT_CRITERIA.outreach, tone: "warm" } });
    const formal = generateOutreach(listing, { ...DEFAULT_CRITERIA, outreach: { ...DEFAULT_CRITERIA.outreach, tone: "formal" } });
    expect(warm.body).not.toEqual(formal.body);
    expect(formal.body.startsWith("Dear")).toBe(true);
  });
});

describe("newOutreachAction", () => {
  it("creates a draft_ready action with subject and body", () => {
    const listing = LISTINGS[0];
    const action = newOutreachAction(listing, DEFAULT_CRITERIA);
    expect(action.status).toBe("draft_ready");
    expect(action.draftSubject.length).toBeGreaterThan(0);
    expect(action.draftBody.length).toBeGreaterThan(0);
    expect(action.listingId).toBe(listing.id);
  });
});

describe("status helpers", () => {
  it("labels every status", () => {
    expect(statusLabel("sent")).toBe("Sent");
    expect(statusLabel("tour_scheduled")).toBe("Tour scheduled");
  });
  it("provides a next step for every status", () => {
    expect(nextStepFor("draft_ready").length).toBeGreaterThan(0);
    expect(nextStepFor("replied").length).toBeGreaterThan(0);
    expect(nextStepFor("passed").length).toBeGreaterThan(0);
  });
});
