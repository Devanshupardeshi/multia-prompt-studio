import type {
  PosterModelCategory,
  PosterStudioPayload,
} from "../../lib/poster-types";

export const LARGE_MIDCAP_DETERMINISTIC_FIXTURE: PosterStudioPayload = {
  mode: "poster-design",
  topic: "Large & Midcap investing and balancing stability with growth",
  headline: "Can You Balance Stability with Growth?",
  subheading: "Understanding Large & Midcap Investing",
  bodyCopy:
    "Join Ankit Jain and Deepali Rana on CNBC-AWAAZ Faydemanda Funds, presented by Bandhan Mutual Fund, for a conversation on Large & Midcap investing, market outlook, portfolio allocation, and the role of balancing stability with growth in changing market conditions.",
  cta: "WATCH MF CORNER TODAY AT 2 PM",
  modelCategory: "mixed-media",
  visualDirection:
    "Use one physically credible balance mechanism and preserve all measured copy and logo exclusions.",
  outputSize: { width: 2160, height: 2700 },
  backgroundChoice: "auto",
  cnbcLogoVariant: "tv18-white",
  bandhanLogoVariant: "dark-bg",
};

export function withCategory(
  fixture: PosterStudioPayload,
  modelCategory: PosterModelCategory,
): PosterStudioPayload {
  return { ...fixture, modelCategory };
}

export const DETERMINISTIC_TOPIC_FIXTURES: PosterStudioPayload[] = [
  {
    ...LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
    topic: "Long-term investing through changing market cycles",
    headline: "Can You Stay Invested Through Every Market Phase?",
    subheading: "Understanding long-term investing through market cycles",
    bodyCopy:
      "A disciplined long-term plan continues through expansion, contraction and recovery without implying guaranteed returns.",
  },
  {
    ...LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
    topic: "Diversification and portfolio allocation",
    headline: "How Do Different Exposures Work Together?",
    subheading: "Understanding diversification and portfolio allocation",
    bodyCopy:
      "Distinct portfolio exposures remain connected to one allocation framework without pretending that diversification removes risk.",
  },
  {
    ...LARGE_MIDCAP_DETERMINISTIC_FIXTURE,
    topic: "SIP discipline and compounding over a long horizon",
    headline: "Can Regular Investing Build Long-Term Discipline?",
    subheading: "Understanding SIP discipline and compounding",
    bodyCopy:
      "Equal contributions enter at regular intervals and join one continuing sequence without inventing a return or guaranteed outcome.",
  },
];
