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

  const aboutMeLine = aboutMe ? formatAboutMe(aboutMe, tone) : "";

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

function formatAboutMe(bio: string, tone: SearchCriteria["outreach"]["tone"]): string {
  const transformed = applyToneTransform(bio.trim(), tone);

  switch (tone) {
    case "formal":
      return (
        `I would also like to briefly introduce myself. ${transformed} ` +
        `I take great care of every property I have resided in and would welcome the opportunity to demonstrate that.`
      );
    case "casual":
      return (
        `Quick bit about me — ${lcFirst(transformed)} ` +
        `Easy-going tenant and I always pay on time.`
      );
    case "concise":
      return `A bit about me: ${transformed}`;
    case "enthusiastic":
      return (
        `I'd also love to share a little about myself — ${lcFirst(transformed)} ` +
        `I genuinely love taking care of a space and would be so thrilled to call your building home!`
      );
    default: // warm
      return (
        `I'd also love to share a little about myself — ${lcFirst(transformed)} ` +
        `I take good care of every place I've lived and would love to find somewhere I can really settle in.`
      );
  }
}

function applyToneTransform(text: string, tone: SearchCriteria["outreach"]["tone"]): string {
  if (tone === "formal") {
    return expandContractions(text)
      .replace(/\bmoving\b/gi, "relocating")
      .replace(/\bpretty\b/gi, "quite")
      .replace(/\bkids\b/gi, "children")
      .replace(/\blots of\b/gi, "a great deal of")
      .replace(/\bpup\b/gi, "dog");
  }
  if (tone === "casual") {
    return compressContractions(text)
      .replace(/\brelocating\b/gi, "moving")
      .replace(/\bI am currently\b/gi, "I'm currently")
      .replace(/\bwork from home\b/gi, "WFH")
      .replace(/\bwell-behaved dog\b/gi, "well-behaved pup");
  }
  if (tone === "concise") {
    return compressContractions(text)
      .replace(/\bwork from home\b/gi, "WFH")
      .replace(/\ba few days a week\b/gi, "part-time")
      .replace(/\bvery\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  if (tone === "enthusiastic") {
    return compressContractions(text)
      .replace(/\bgood\b/gi, "great")
      .replace(/\bnice\b/gi, "wonderful")
      .replace(/\bclean\b/gi, "very tidy")
      .replace(/\btidy\b/gi, "very tidy");
  }
  // warm — keep natural, just compress contractions
  return compressContractions(text);
}

function expandContractions(t: string): string {
  return t
    .replace(/\bI'm\b/g, "I am")
    .replace(/\bI've\b/g, "I have")
    .replace(/\bI'd\b/g, "I would")
    .replace(/\bI'll\b/g, "I will")
    .replace(/\bdon't\b/g, "do not")
    .replace(/\bcan't\b/g, "cannot")
    .replace(/\bwon't\b/g, "will not")
    .replace(/\bisn't\b/g, "is not")
    .replace(/\baren't\b/g, "are not")
    .replace(/\bdidn't\b/g, "did not")
    .replace(/\bdoesn't\b/g, "does not")
    .replace(/\bhadn't\b/g, "had not")
    .replace(/\bhasn't\b/g, "has not")
    .replace(/\bhaven't\b/g, "have not")
    .replace(/\bit's\b/g, "it is")
    .replace(/\bthey're\b/g, "they are")
    .replace(/\byou're\b/g, "you are")
    .replace(/\bwe're\b/g, "we are");
}

function compressContractions(t: string): string {
  return t
    .replace(/\bI am\b/g, "I'm")
    .replace(/\bI have\b/g, "I've")
    .replace(/\bI would\b/g, "I'd")
    .replace(/\bI will\b/g, "I'll")
    .replace(/\bdo not\b/g, "don't")
    .replace(/\bcannot\b/g, "can't")
    .replace(/\bwill not\b/g, "won't")
    .replace(/\bit is\b/g, "it's");
}

function lcFirst(s: string): string {
  // Don't lowercase the pronoun "I" at the start of a sentence.
  if (/^I[ ,'.]/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
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
