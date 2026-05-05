import type { Listing, OutreachAction, SearchCriteria } from "@/lib/types";

// Mock outreach generation. Future integration would replace this with an
// LLM-backed draft generator and an actual delivery channel (with explicit
// user confirmation per send).

export function generateOutreach(
  listing: Listing,
  criteria: SearchCriteria,
): { subject: string; body: string } {
  const tone = criteria.outreach.tone;
  const sig = criteria.outreach.introLine.trim() || "— a HomeHound user";
  const aboutMe = criteria.outreach.aboutMe?.trim() || "";

  const firstName = listing.contact.landlordName.split(" ")[0];

  const subject =
    tone === "formal"
      ? `Inquiry: ${listing.title} availability`
      : tone === "concise"
        ? `Quick question on ${listing.address.split(",")[0]}`
        : tone === "enthusiastic"
          ? `Love the look of ${listing.address.split(",")[0]}!`
          : `Hi from a HomeHound looking at ${listing.address.split(",")[0]}`;

  const opener =
    tone === "formal"
      ? `Dear ${listing.contact.landlordName},`
      : tone === "concise"
        ? `Hi ${firstName},`
        : tone === "casual"
          ? `Hey ${firstName}!`
          : tone === "enthusiastic"
            ? `Hi ${firstName} — I'm so excited to reach out about this listing!`
            : `Hi ${firstName} — hope your week's going well.`;

  const intro =
    tone === "formal"
      ? `I'm writing to inquire about ${listing.title} at ${listing.address}.`
      : tone === "enthusiastic"
        ? `I just came across ${listing.title} (${listing.address}) and it immediately jumped out as exactly what I've been searching for!`
        : tone === "casual"
          ? `Saw ${listing.title} at ${listing.address} and it looks like a great fit.`
          : `I came across ${listing.title} (${listing.address}) and it lines up with what I'm looking for.`;

  const moveIn = new Date(criteria.moveInBy).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  const situationLine = `${tone === "casual" || tone === "enthusiastic" ? "Quick background: " : "A bit about my situation: "}${bedroomPhrase(criteria.bedrooms)}, budget around $${criteria.budgetMax.toLocaleString()}/mo, hoping to move in by ${moveIn}.`;

  const commuteLine = criteria.commute.destination
    ? `I'd be commuting to ${criteria.commute.destination} (${criteria.commute.mode}), so the location is a real fit.`
    : "";

  const aboutMeLine = aboutMe
    ? tone === "formal"
      ? `About me: ${aboutMe}`
      : `A little about me: ${aboutMe}`
    : "";

  const closing =
    tone === "formal"
      ? "Thank you for your time."
      : tone === "enthusiastic"
        ? "Thanks so much — really hoping to connect soon!"
        : "Thanks so much!";

  const body = [
    opener,
    "",
    intro,
    "",
    situationLine,
    commuteLine,
    aboutMeLine,
    "",
    "Could you let me know:",
    "  • Is the unit still available?",
    "  • Are tours possible this week or next?",
    "  • Anything I should know about the application or building?",
    "",
    closing,
    "",
    sig,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, body };
}

function bedroomPhrase(b: number) {
  if (b === 0) return "looking for a studio";
  if (b === 1) return "looking for a 1BR";
  return `looking for a ${b}BR`;
}

export function newOutreachAction(
  listing: Listing,
  criteria: SearchCriteria,
): OutreachAction {
  const { subject, body } = generateOutreach(listing, criteria);
  const now = new Date().toISOString();
  return {
    id: `out-${listing.id}-${Date.now()}`,
    listingId: listing.id,
    status: "draft_ready",
    draftSubject: subject,
    draftBody: body,
    createdAt: now,
    updatedAt: now,
    nextStep:
      "Review the draft, edit anything that doesn't sound like you, then mark as sent once you've reached out.",
  };
}

export function statusLabel(status: OutreachAction["status"]): string {
  switch (status) {
    case "not_started":
      return "Not started";
    case "draft_ready":
      return "Draft ready";
    case "sent":
      return "Sent";
    case "replied":
      return "Replied";
    case "tour_scheduled":
      return "Tour scheduled";
    case "passed":
      return "Passed";
  }
}

export function nextStepFor(status: OutreachAction["status"]): string {
  switch (status) {
    case "not_started":
      return "Generate a draft to start outreach.";
    case "draft_ready":
      return "Review the draft, edit anything that doesn't sound like you, then mark as sent.";
    case "sent":
      return "Wait 2-3 business days; HomeHound will nudge if no reply.";
    case "replied":
      return "Confirm a tour time and add the unit to your shortlist.";
    case "tour_scheduled":
      return "Bring questions about lease length, deposits, and shared utilities.";
    case "passed":
      return "Archive — HomeHound won't surface this listing again.";
  }
}
