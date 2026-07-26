import type {
  PosterBackgroundChoice,
  PosterConcept,
  PosterLayoutArchetype,
  PosterModelCategory,
  PosterStudioPayload,
} from "@/lib/poster-types";
import { createPosterLogoLayers } from "@/lib/poster-logos";

export const APPROVED_POSTERS = [
  { id: "11-june", label: "11 June", file: "11 June.jpg", archetype: "centered-editorial-stack", palette: "prussian-blue", fidelitySignals: ["centred brand stack", "short centred headline", "wide lower hero", "two-part footer"] },
  { id: "13-july-1", label: "13 July · 01", file: "13 July 1.jpg", archetype: "centered-editorial-stack", palette: "vermillion", fidelitySignals: ["centred MF Corner", "headline above supporting copy", "contained lower object", "quiet upper margin"] },
  { id: "13-july-2", label: "13 July · 02", file: "13 July 2.jpg", archetype: "split-brand-copy", palette: "prussian-blue", fidelitySignals: ["MF Corner upper-left", "headline upper-right", "single central object", "low information panel"] },
  { id: "13-july-3", label: "13 July · 03", file: "13 July 3.jpg", archetype: "centered-editorial-stack", palette: "vermillion", fidelitySignals: ["centred brand stack", "short copy block", "lower glass object", "ribbon-led depth"] },
  { id: "13-july-4", label: "13 July · 04", file: "13 July 4.jpg", archetype: "split-brand-copy", palette: "prussian-blue", fidelitySignals: ["upper split hierarchy", "large central object", "lower copy panel", "restrained market texture"] },
  { id: "13-july-5", label: "13 July · 05", file: "13 July 5.jpg", archetype: "centered-editorial-stack", palette: "vermillion", fidelitySignals: ["centred MF Corner", "short headline", "compact supporting block", "dominant lower object"] },
  { id: "13-july-6", label: "13 July · 06", file: "13 July 6.jpg", archetype: "split-brand-copy", palette: "prussian-blue", fidelitySignals: ["upper split hierarchy", "large lower object", "contained copy panel", "tonal finance background"] },
  { id: "13-july-7", label: "13 July · 07", file: "13 July 7.jpg", archetype: "split-brand-copy", palette: "prussian-blue", fidelitySignals: ["upper split hierarchy", "single gold object", "lower navy panel", "shallow footer"] },
  { id: "21-july-8", label: "21 July · 08", file: "21 July 8.jpg", archetype: "centered-editorial-stack", palette: "vermillion", fidelitySignals: ["centred upper branding", "centred headline", "lower narrative hero", "deep red tonal staging"] },
  { id: "21-july-9", label: "21 July · 09", file: "21 July 9.jpg", archetype: "left-copy-right-hero", palette: "prussian-blue", fidelitySignals: ["left editorial copy", "right-weighted hero", "strong diagonal movement", "solid footer bar"] },
  { id: "21-july-10", label: "21 July · 10", file: "21 July 10.jpg", archetype: "split-brand-copy", palette: "prussian-blue", fidelitySignals: ["MF Corner upper-left", "headline upper-right", "large lower hero", "outlined copy panel"] },
  { id: "23-july-1", label: "23 July · 01", file: "23 July 1.jpg", archetype: "centered-editorial-stack", palette: "prussian-blue", fidelitySignals: ["centred MF Corner", "centred headline", "single podium hero", "fine market-line background"] },
  { id: "23-july-2", label: "23 July · 02", file: "23 July 2.jpg", archetype: "split-brand-copy", palette: "prussian-blue", fidelitySignals: ["MF Corner middle-left", "headline middle-right", "lower wealth-scale hero", "contained CTA strip"] },
] as const;

export type ApprovedPoster = (typeof APPROVED_POSTERS)[number];

export interface PosterLayoutProfile {
  id: PosterLayoutArchetype;
  label: string;
  description: string;
  logoSafeAreas: PosterConcept["logoSafeAreas"];
  textZones: {
    headline: PosterConcept["editablePosterLayoutSpecification"]["layers"][number]["boundsPercent"];
    subheading: PosterConcept["editablePosterLayoutSpecification"]["layers"][number]["boundsPercent"];
    bodyCopy: PosterConcept["editablePosterLayoutSpecification"]["layers"][number]["boundsPercent"];
    cta: PosterConcept["editablePosterLayoutSpecification"]["layers"][number]["boundsPercent"];
  };
  heroBounds: PosterConcept["editablePosterLayoutSpecification"]["layers"][number]["boundsPercent"];
  backgroundTextureBounds: PosterConcept["editablePosterLayoutSpecification"]["layers"][number]["boundsPercent"];
}

const logoArea = (
  logo: PosterConcept["logoSafeAreas"][number]["logo"],
  boundsPercent: PosterConcept["logoSafeAreas"][number]["boundsPercent"],
): PosterConcept["logoSafeAreas"][number] => ({
  logo,
  boundsPercent,
  instruction: "Keep completely empty; place the unmodified official logo later as an editable layer.",
});

export const POSTER_LAYOUT_PROFILES: Record<PosterLayoutArchetype, PosterLayoutProfile> = {
  "centered-editorial-stack": {
    id: "centered-editorial-stack",
    label: "Centred editorial stack",
    description: "A centred MF Corner unit, compact centred copy, and one broad lower hero, following the 11 June and 13 July approved family.",
    logoSafeAreas: [
      logoArea("CNBC", { x: 3, y: 3, width: 13, height: 6 }),
      logoArea("Bandhan Mutual Fund", { x: 63, y: 3, width: 34, height: 6 }),
      logoArea("MF Corner", { x: 33, y: 14, width: 33, height: 16 }),
    ],
    textZones: {
      headline: { x: 10, y: 31, width: 80, height: 12 },
      subheading: { x: 15, y: 44, width: 70, height: 5 },
      bodyCopy: { x: 15, y: 49, width: 70, height: 9 },
      cta: { x: 3, y: 90, width: 94, height: 8 },
    },
    heroBounds: { x: 5, y: 58, width: 90, height: 32 },
    backgroundTextureBounds: { x: 0, y: 30, width: 100, height: 60 },
  },
  "split-brand-copy": {
    id: "split-brand-copy",
    label: "Upper split hierarchy",
    description: "MF Corner holds the upper-left while the editorial message occupies the upper-right; a single hero owns the lower half.",
    logoSafeAreas: [
      logoArea("CNBC", { x: 3, y: 3, width: 13, height: 6 }),
      logoArea("Bandhan Mutual Fund", { x: 63, y: 3, width: 34, height: 6 }),
      logoArea("MF Corner", { x: 5, y: 16, width: 33, height: 15 }),
    ],
    textZones: {
      headline: { x: 48, y: 16, width: 47, height: 17 },
      subheading: { x: 48, y: 34, width: 47, height: 8 },
      bodyCopy: { x: 8, y: 76, width: 84, height: 14 },
      cta: { x: 3, y: 90, width: 94, height: 8 },
    },
    heroBounds: { x: 5, y: 42, width: 90, height: 48 },
    backgroundTextureBounds: { x: 0, y: 32, width: 100, height: 58 },
  },
  "left-copy-right-hero": {
    id: "left-copy-right-hero",
    label: "Left copy / right hero",
    description: "Legacy graceful fallback: a compact left editorial column with a right-weighted hero. New concepts should prefer the measured centred or split systems.",
    logoSafeAreas: [
      logoArea("CNBC", { x: 3, y: 3, width: 13, height: 6 }),
      logoArea("Bandhan Mutual Fund", { x: 63, y: 3, width: 34, height: 6 }),
      logoArea("MF Corner", { x: 5, y: 68, width: 25, height: 14 }),
    ],
    textZones: {
      headline: { x: 5, y: 16, width: 39, height: 17 },
      subheading: { x: 5, y: 34, width: 39, height: 8 },
      bodyCopy: { x: 5, y: 43, width: 39, height: 22 },
      cta: { x: 3, y: 90, width: 94, height: 8 },
    },
    heroBounds: { x: 45, y: 40, width: 50, height: 50 },
    backgroundTextureBounds: { x: 40, y: 32, width: 60, height: 58 },
  },
};

/**
 * Supplied body copy is treated as editorial content, not expendable metadata.
 * Approved posters already use low information panels, so body-aware variants
 * preserve the chosen campaign archetype while reserving a readable lower panel.
 */
export function getPosterLayoutProfile(
  archetype: PosterLayoutArchetype,
  bodyCopyLength = 0,
): PosterLayoutProfile {
  const base = POSTER_LAYOUT_PROFILES[archetype];
  if (bodyCopyLength <= 0 || archetype !== "split-brand-copy") return base;
  return {
    ...base,
    description: `${base.description} The supplied body copy occupies the measured 76–90% information panel, so the hero stops at 76% before the CTA begins at 90%.`,
    heroBounds: { x: 5, y: 42, width: 90, height: 34 },
  };
}

export function selectPosterLayoutArchetype(
  payload: PosterStudioPayload,
): PosterLayoutArchetype {
  const requested = getApprovedPoster(payload.referencePosterId);
  if (requested) return requested.archetype;
  const headlineWords = payload.headline.trim().split(/\s+/).filter(Boolean).length;
  const subheadingWords = payload.subheading.trim().split(/\s+/).filter(Boolean).length;
  return payload.bodyCopy.trim() || headlineWords > 12 || subheadingWords > 10
    ? "split-brand-copy"
    : "centered-editorial-stack";
}

export function getApprovedPoster(id: string | undefined): ApprovedPoster | null {
  if (!id) return null;
  return APPROVED_POSTERS.find((poster) => poster.id === id) ?? null;
}

export function getDefaultPosterForArchetype(archetype: PosterLayoutArchetype): ApprovedPoster {
  const preferred: Record<PosterLayoutArchetype, ApprovedPoster["id"]> = {
    "centered-editorial-stack": "13-july-1",
    "split-brand-copy": "21-july-10",
    "left-copy-right-hero": "21-july-9",
  };
  return getApprovedPoster(preferred[archetype]) ?? APPROVED_POSTERS[0];
}

export const POSTER_CATEGORIES: Record<
  PosterModelCategory,
  {
    label: string;
    shortLabel: string;
    summary: string;
    promptDirective: string;
    boardFile: string;
    referenceCrops: Array<{
      folder: string;
      file: string;
      crop?: { left: number; top: number; width: number; height: number };
    }>;
  }
> = {
  "mixed-media": {
    label: "Mixed Media Realism",
    shortLabel: "Mixed media",
    summary:
      "Tactile editorial collage combining photographic objects, paper texture and a single financial metaphor.",
    promptDirective:
      "Execute Mixed Media Realism only: construct one oversized lower-centre hero from a real photographed object, hand or currency element with visible cut or torn edges, authentic grayscale/halftone surface detail, tactile paper or newsprint joins, and a soft grounded contact shadow. Reserve approved colour for small paper tabs, thin background geometry or labels outside the hero; never colourise the hero or full canvas. Use a straight-on or slight three-quarter product angle, coherent single-source studio light, simple flat or restrained-gradient background, and generous negative space. Every component must implement a named financial mapping and make credible physical contact. Forbid glossy CGI, plastic hands, chrome coins, cartoon cash icons, miniature architecture, cities, skylines, bridges, columns, infrastructure, unsupported pieces and copied reference wording or composition.",
    boardFile: "mixed-media.jpg",
    referenceCrops: [
      {
        folder: "Mixed Media",
        file: "image 78.png",
        crop: { left: 650, top: 1160, width: 420, height: 420 },
      },
      {
        folder: "Mixed Media",
        file: "image 80.png",
        crop: { left: 400, top: 570, width: 420, height: 420 },
      },
      {
        folder: "Mixed Media",
        file: "image 81.png",
        crop: { left: 900, top: 1050, width: 400, height: 400 },
      },
    ],
  },
  "glassmorphism-3d": {
    label: "Premium 3D / Glassmorphism",
    shortLabel: "3D glass",
    summary:
      "Physically based product rendering with glass, satin metal, controlled reflections and sculptural depth.",
    promptDirective:
      "Execute Premium 3D / Glassmorphism only: build one tightly framed, mechanically credible product-shot hero in near-neutral satin metal, pewter, frosted white-blue ceramic or matte black, using translucent glass only as a limited functional tray, panel or edge. Use a shallow three-quarter camera, one dominant soft key light, one controlled specular highlight band, gentle falloff, real contact points, soft diffuse shadows and restrained depth of field. Saturated approved colour belongs only in small accents, copy colour or a soft background glow, never across the hero material. Keep the background abstract and flat light-neutral or a rich approved dark gradient. Forbid candy-plastic sheen, disconnected floating parts, hard rainbow PNG cutouts, neon bloom, lens flare, oversized coins, mirror reflections, cityscapes and copied arrangements.",
    boardFile: "style-2-glassmorphism.jpg",
    referenceCrops: [
      {
        folder: "style 2 Glassmorphism",
        file: "image 92.png",
        crop: { left: 120, top: 600, width: 500, height: 500 },
      },
      {
        folder: "style 2 Glassmorphism",
        file: "image 95.png",
        crop: { left: 865, top: 1330, width: 360, height: 360 },
      },
      {
        folder: "style 2 Glassmorphism",
        file: "image 87.png",
        crop: { left: 1050, top: 1480, width: 260, height: 360 },
      },
    ],
  },
  illustrative: {
    label: "Dimensional Editorial Illustration",
    shortLabel: "Illustrative",
    summary:
      "Bold simplified silhouettes and editorial symbolism translated into a refined dimensional finish.",
    promptDirective:
      "Execute Dimensional Editorial Illustration only: use one lower-third hero cluster with four to six total rounded geometric shapes, bold silhouettes, smooth continuous contours, flat approved colour blocks and only one or two adjacent tonal facets for shallow depth. Keep the full canvas a single uninterrupted approved flat colour and preserve a separate zero-overlap headline zone. Remap all reference hues to the Bandhan palette. Use economical financial symbolism that a financial editor can explain component by component. Forbid photoreal lighting, cast shadows, glass transparency or blur, full CGI, thick cartoon outlines, starburst call-outs, numbered badges, stock-icon dashboards, clutter, pure typography compositions and copied reference subjects.",
    boardFile: "style-3-illustrative.jpg",
    referenceCrops: [
      {
        folder: "style 3 illustrative",
        file: "image 101.png",
        crop: { left: 500, top: 1500, width: 480, height: 420 },
      },
      {
        folder: "style 3 illustrative",
        file: "image 102.png",
        crop: { left: 700, top: 1450, width: 500, height: 420 },
      },
      {
        folder: "style 3 illustrative",
        file: "image 98.png",
        crop: { left: 900, top: 570, width: 420, height: 420 },
      },
    ],
  },
};

export const DESIGN_SYSTEM = {
  primary: {
    prussianBlue: "#0A3253",
    vermillionLight: "#ED3D23",
    vermillionDark: "#8D1A1F",
    orangeStart: "#D89828",
    orangeEnd: "#E18227",
  },
  secondary: [
    "#ED8F8C",
    "#C1D7CD",
    "#C9EAFB",
    "#FCEEBB",
    "#FEFEFE",
    "#E3E0DC",
    "#F8D09D",
    "#D1BEDD",
    "#CBE8EF",
  ],
} as const;

/**
 * Named, user-selectable background treatments derived directly from the
 * approved shipped posters (e.g. the 13 July centred-stack family uses a
 * maroon-to-navy diagonal gradient; the 21 July split-brand-copy family uses
 * a solid deep Prussian Blue). Every option is a rich, dark brand-colour
 * field on purpose: none of the 13 approved posters ever use a white, pale
 * or light-neutral background, so "auto" also resolves to one of these
 * rather than leaving the tone to the image model's discretion.
 */
export const POSTER_BACKGROUND_COMBINATIONS = {
  "prussian-blue": {
    name: "Prussian Blue",
    background: DESIGN_SYSTEM.primary.prussianBlue,
    backgroundTreatment:
      `Solid deep Prussian Blue (${DESIGN_SYSTEM.primary.prussianBlue}) field, exactly matching the approved campaign convention. No lighter tint, no white, no pale neutral.`,
    accents: [DESIGN_SYSTEM.primary.orangeStart, DESIGN_SYSTEM.primary.vermillionLight],
    textColours: ["#FEFEFE"],
    rationale:
      "Matches the solid deep-blue treatment used in approved campaign posters (the 21 July split-brand-copy family).",
  },
  "maroon-navy": {
    name: "Maroon to Navy",
    background: DESIGN_SYSTEM.primary.vermillionDark,
    backgroundTreatment:
      `Diagonal two-stop gradient from deep maroon (${DESIGN_SYSTEM.primary.vermillionDark}) to Prussian Blue (${DESIGN_SYSTEM.primary.prussianBlue}), exactly matching the approved campaign convention. No lighter tint, no white, no pale neutral.`,
    accents: [DESIGN_SYSTEM.primary.orangeStart, DESIGN_SYSTEM.primary.prussianBlue],
    textColours: ["#FEFEFE"],
    rationale:
      "Matches the deep maroon-to-navy diagonal gradient used in approved campaign posters (the 13 July centred-stack family).",
  },
} as const;

export const DEFAULT_POSTER_BACKGROUND = POSTER_BACKGROUND_COMBINATIONS["prussian-blue"];

export function resolvePosterBackground(
  choice: PosterBackgroundChoice,
): PosterConcept["selectedColourCombination"] {
  const combination =
    choice === "auto" ? DEFAULT_POSTER_BACKGROUND : POSTER_BACKGROUND_COMBINATIONS[choice];
  return {
    name: combination.name,
    background: combination.background,
    backgroundTreatment: combination.backgroundTreatment,
    accents: [...combination.accents],
    textColours: [...combination.textColours],
    rationale: combination.rationale,
  };
}

export function getApprovedPosterFile(id: string | undefined): string | null {
  return getApprovedPoster(id)?.file ?? null;
}

export function getAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function wrapPosterCopy(content: string, maxLineLength: number): string[] {
  const normalized = content.trim().replace(/\s+/g, " ");
  if (!normalized) return [];

  const lines: string[] = [];
  let current = "";
  for (const word of normalized.split(" ")) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > maxLineLength) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function getFinancialNarrativeSeed(
  payload: PosterStudioPayload,
): PosterConcept["financialNarrative"] {
  const brief = [
    payload.topic,
    payload.headline,
    payload.subheading,
    payload.bodyCopy,
    payload.visualDirection,
  ]
    .join(" ")
    .toLowerCase();

  if (
    /\b(large|large-cap|large cap|largecap)\b/.test(brief) &&
    /\b(mid|mid-cap|mid cap|midcap)\b/.test(brief)
  ) {
    return {
      investorQuestion:
        "How can an allocation combine the relative stability associated with established large-cap businesses and the growth potential of mid-cap businesses without implying guaranteed outcomes?",
      heroMetaphor:
        "One precision portfolio balance with a broad substantial load on one tray and three to five smaller organised loads on the other, joined by one level beam, one valid fulcrum and one grounded shared base.",
      visualMappings: [
        {
          element:
            "One broad substantial load resting fully on the first real tray",
          financialMeaning:
            "Large-cap exposure: established scale and relative portfolio stability.",
        },
        {
          element:
            "A grouped set of three to five smaller organised loads resting fully on the second real tray",
          financialMeaning:
            "Mid-cap exposure: a wider set of developing businesses and growth potential.",
        },
        {
          element:
            "One continuous level beam connecting both trays",
          financialMeaning:
            "Portfolio allocation holding both market-cap segments in a deliberate, complementary mix.",
        },
        {
          element: "One visible central fulcrum and pivot",
          financialMeaning: "The fund manager's allocation judgement.",
        },
        {
          element: "One grounded shared base with a visible contact shadow",
          financialMeaning: "The fund's overall structural stability.",
        },
      ],
      relationship:
        "The beam pivots visibly on the fulcrum; both trays are mechanically connected to the same beam; every load makes full contact with its tray; the shared base is grounded. The level beam makes balance visible without implying equal allocation or a guaranteed outcome.",
      guardrail:
        "Do not show guaranteed growth, exact allocation, performance numbers, risk-free large caps or inevitably growing mid caps. Forbid cities, buildings, bridges, architecture, independent columns, separate platforms, staircases, bar charts, coin stacks, floating blocks and unrelated sculptures.",
    };
  }

  if (/\b(cycle|volatil|changing market|market phase)\b/.test(brief)) {
    return {
      investorQuestion:
        "How can an investor stay oriented while market conditions and phases change?",
      heroMetaphor:
        "One grounded gyroscopic stabiliser whose central axis remains oriented while three connected outer rings mark changing market phases.",
      visualMappings: [
        {
          element: "One grounded central axis with a visible bearing and base",
          financialMeaning: "Disciplined investment orientation through changing conditions.",
        },
        {
          element: "Three mechanically connected outer rings in different rotational phases",
          financialMeaning: "Different market phases and volatility around the investor.",
        },
        {
          element: "A damped pointer returning toward centre rather than pointing upward",
          financialMeaning: "Rebalancing and discipline rather than market prediction.",
        },
      ],
      relationship:
        "The outer rings rotate around the same supported bearing while the central axis stays oriented; every ring connects to the mechanism and none floats independently.",
      guardrail:
        "No uninterrupted rising chart, return promise, prediction, numeric scale or claim of eliminating risk.",
    };
  }

  if (/\b(diversif|allocation|portfolio mix|asset mix)\b/.test(brief)) {
    return {
      investorQuestion:
        "How do distinct exposures work together inside one considered portfolio?",
      heroMetaphor:
        "One portfolio frame holding several visibly distinct compartments that lock into the same supported allocation system.",
      visualMappings: [
        {
          element: "Three to five distinct fitted compartments with controlled differences in scale, texture and approved colour",
          financialMeaning: "Different portfolio exposures or allocation roles.",
        },
        {
          element: "One shared outer frame with visible joins to every compartment",
          financialMeaning: "Their combined role within one portfolio.",
        },
        {
          element: "A single adjustable divider moving within the frame",
          financialMeaning: "The deliberate allocation decision between exposures.",
        },
      ],
      relationship:
        "Every compartment is seated inside and supported by the same frame; the divider changes relative space without removing the connection between exposures.",
      guardrail:
        "No invented allocation percentages, guaranteed diversification benefit or unsupported product claim.",
    };
  }

  if (/\b(sip|systematic|discipline|regular invest|compounding|long term|long-term)\b/.test(brief)) {
    return {
      investorQuestion:
        "How can regular, time-based investing build participation without promising a result?",
      heroMetaphor:
        "A measured chain of equal contribution modules moving at regular intervals along one connected track into a long-horizon accumulator.",
      visualMappings: [
        {
          element: "Repeated equal contribution modules at visibly regular intervals",
          financialMeaning: "Regular investment discipline over time.",
        },
        {
          element: "One continuous track connecting every module",
          financialMeaning: "Consistency and continuity of the SIP process.",
        },
        {
          element: "One grounded accumulator receiving the modules without changing their identity",
          financialMeaning: "Participation building across a longer horizon.",
        },
      ],
      relationship:
        "The repeated units must visibly feed or construct the same destination; avoid a magical transformation.",
      guardrail:
        "No guaranteed compounding curve, exact return, currency figure or effortless-wealth symbolism.",
    };
  }

  if (/\b(tax.?loss|loss harvesting|harvest tax|capital loss)\b/.test(brief)) {
    return {
      investorQuestion:
        "How can eligible investment losses be used against realised gains without implying that every loss creates a tax benefit?",
      heroMetaphor:
        "One paired tax-lot sorting mechanism with a loss tray and a realised-gain tray connected through a rule-bound offset gate.",
      visualMappings: [
        {
          element: "A first grounded tray holding selected below-cost tax lots",
          financialMeaning: "Investments considered for realising an eligible capital loss.",
        },
        {
          element: "A second grounded tray holding realised-gain lots",
          financialMeaning: "Taxable realised gains that may be offset under applicable rules.",
        },
        {
          element: "One constrained connector gate between the two trays",
          financialMeaning: "The tax rule that determines whether and how losses can offset gains.",
        },
        {
          element: "A visible remainder that stays outside the gate",
          financialMeaning: "Losses or gains that do not qualify for the same treatment or period.",
        },
      ],
      relationship:
        "Both trays attach to the same sorting frame; only lots that physically pass through the constrained gate are paired, while the remainder stays visibly separate.",
      guardrail:
        "No guaranteed tax saving, tax-rate figure, personalised tax advice, wash-sale workaround, automatic eligibility claim or implication that selling solely for tax reasons improves investment outcomes.",
    };
  }

  if (/\b(duration risk|interest.?rate risk|rate sensitivity|bond duration)\b/.test(brief)) {
    return {
      investorQuestion:
        "Why can longer-duration fixed-income holdings react more strongly to an interest-rate change than shorter-duration holdings?",
      heroMetaphor:
        "One calibrated duration lever with short- and long-duration loads placed at different distances from a shared interest-rate pivot.",
      visualMappings: [
        {
          element: "A shorter-duration load positioned close to the central rate pivot",
          financialMeaning: "Lower price sensitivity to the same interest-rate movement.",
        },
        {
          element: "A longer-duration load positioned farther from the same pivot",
          financialMeaning: "Greater price sensitivity because of the longer effective lever arm.",
        },
        {
          element: "One continuous beam with measured but unnumbered distance marks",
          financialMeaning: "Duration as sensitivity over time, not simply bond maturity or credit quality.",
        },
        {
          element: "One grounded pivot and damped movement range",
          financialMeaning: "The same rate change acting on both holdings without predicting its direction.",
        },
      ],
      relationship:
        "Both loads remain attached to one beam and respond around the same supported pivot; the farther load travels through a larger arc for the same small pivot movement.",
      guardrail:
        "No interest-rate forecast, guaranteed return, invented yield, numeric duration, claim that short duration is risk-free, or confusion of duration risk with credit risk.",
    };
  }

  if (/\b(rebalanc|risk.?return|risk profile)\b/.test(brief)) {
    return {
      investorQuestion:
        "How can a portfolio be brought back toward its intended risk mix after market movement changes the weights?",
      heroMetaphor:
        "One adjustable allocation frame with two named risk-role compartments and a visible centre marker.",
      visualMappings: [
        {
          element: "Two connected compartments whose current sizes sit away from the centre marker",
          financialMeaning: "Portfolio weights drifting from the intended allocation.",
        },
        {
          element: "One mechanically linked divider moving back toward the marker",
          financialMeaning: "Buying or selling to rebalance the portfolio.",
        },
        {
          element: "One shared grounded frame",
          financialMeaning: "The investor's total portfolio and risk objective.",
        },
      ],
      relationship:
        "The divider moves inside one frame and changes both compartments together; no asset floats or grows independently.",
      guardrail:
        "No exact allocation, return promise, frictionless trading claim, market-timing signal or implication that rebalancing eliminates risk.",
    };
  }

  const topic = payload.topic.trim() || payload.headline.trim();
  const supportingQuestion =
    payload.subheading.trim() || payload.headline.trim() || "the investor trade-off";
  return {
    investorQuestion: `What decision about ${topic} should an investor understand before acting?`,
    heroMetaphor:
      `One grounded decision instrument built specifically for ${topic}: an input cradle, a constraint gate and an outcome tray connected in one visible sequence.`,
    visualMappings: [
      {
        element: `A grounded input cradle representing ${topic}`,
        financialMeaning: `The investment subject being evaluated: ${topic}.`,
      },
      {
        element: `A mechanically connected constraint gate representing ${supportingQuestion}`,
        financialMeaning: `The condition or trade-off the brief asks the investor to consider: ${supportingQuestion}.`,
      },
      {
        element: "A final supported outcome tray that remains visibly connected to the gate",
        financialMeaning: "The decision state after the stated condition has been considered, not a promised result.",
      },
    ],
    relationship:
      "The input cradle feeds the constraint gate through one visible supported channel, and the outcome tray receives only what passes that gate; no part may float or communicate meaning through proximity alone.",
    guardrail:
      `Do not invent figures, guarantees, endorsements, outcomes, labels or decorative finance symbols. If the three-stage instrument cannot be explained specifically in terms of ${topic}, reject it and request a more precise brief.`,
  };
}

export function getPosterOutputSchema(payload: PosterStudioPayload): PosterConcept {
  const { width, height } = payload.outputSize;
  const requestedReference = getApprovedPoster(payload.referencePosterId);
  const layoutArchetype = selectPosterLayoutArchetype(payload);
  const layout = getPosterLayoutProfile(layoutArchetype, payload.bodyCopy.length);
  const reference = requestedReference ?? getDefaultPosterForArchetype(layoutArchetype);
  const financialNarrative = getFinancialNarrativeSeed(payload);
  const centeredCopy = layoutArchetype === "centered-editorial-stack";
  const emptyTreatment = (
    content: string,
    priority: number,
  ): PosterConcept["textHierarchy"]["headline"] => {
    const bodyLength = payload.bodyCopy.length;
    const maxLineLength =
      priority === 1
        ? 26
        : priority === 2
          ? 42
          : priority === 3
            ? bodyLength > 650
              ? 82
              : bodyLength > 320
                ? 68
                : 58
            : 72;
    const fontSizePx =
      priority === 1
        ? Math.round(width * 0.058)
        : priority === 2
          ? Math.round(width * 0.026)
          : priority === 3
            ? Math.round(
                width * (bodyLength > 320 ? 0.016 : 0.0185),
              )
            : Math.round(width * 0.014);

    return {
      content,
      include: Boolean(content),
      lineBreaks: wrapPosterCopy(content, maxLineLength),
      priority,
      ubuntuWeight: priority === 1 || priority === 4 ? 700 : priority === 2 ? 500 : 400,
      fontSizePx,
      lineHeight: priority === 1 ? 1.02 : priority === 3 ? 1.3 : 1.16,
      letterSpacingEm: 0,
      alignment:
        priority === 4 ? "center" : priority === 3 ? "left" : centeredCopy ? "center" : "left",
      maxLineLength,
      guidance:
        priority === 3
          ? "Keep every supplied body-copy word in a readable low information panel above the CTA. Reduce the hero before reducing body-copy legibility."
          : "Use editorial line breaks while preserving the supplied wording exactly.",
    };
  };

  return {
    conceptTitle: "Short internal concept name",
    conceptExplanation: "Concise senior-designer concept explanation.",
    financialNarrative,
    layoutArchetype,
    recommendedLayoutDirection:
      layout.description,
    referenceMatch: {
      approvedPosterId: reference.id,
      label: reference.label,
      reason: "Explain why this approved poster is the closest campaign grammar for the supplied copy and concept.",
      fidelitySignals: [...reference.fidelitySignals],
    },
    textHierarchy: {
      headline: emptyTreatment(payload.headline, 1),
      subheading: emptyTreatment(payload.subheading, 2),
      bodyCopy: emptyTreatment(payload.bodyCopy, 3),
      cta: emptyTreatment(payload.cta, 4),
    },
    placementGuidance: {
      headline: "Exact placement guidance.",
      subheading: "Exact placement guidance or state omitted.",
      bodyCopy:
        payload.bodyCopy
          ? layoutArchetype === "split-brand-copy"
            ? "Place the complete supplied body copy in the measured 76–90% lower information panel above the CTA."
            : "Place the complete supplied body copy in the measured 44–58% supporting-copy band; reduce the hero before reducing legibility."
          : "No body-copy layer because no body copy was supplied.",
      cta: "Exact placement guidance or state omitted.",
      centralVisual: "Position, scale and visual weight of the hero object.",
      negativeSpace: "Where and how much clear space is protected.",
      backgroundDetails: "Subtle finance-related detail with no clutter.",
    },
    logoSafeAreas: layout.logoSafeAreas,
    selectedColourCombination: resolvePosterBackground(payload.backgroundChoice),
    selected3DModelReferenceCategory: {
      id: payload.modelCategory,
      label: POSTER_CATEGORIES[payload.modelCategory].label,
      application: "How this category is applied without copying a source composition.",
    },
    masterImageGenerationPrompt:
      `Complete poster-background image prompt with exact canvas, object placement, camera, materials, lighting, empty content zones and all hard restrictions. Implement this financial logic: ${financialNarrative.heroMetaphor} ${financialNarrative.relationship} No actual copy or logo names as renderable content.`,
    negativePrompt:
      "Text, letters, words, numerals, logos, watermarks, clutter, malformed objects, cheap plastic, excessive glow, unapproved colours, unsafe overlaps, arbitrary geometric weights, unsupported or floating balance parts, disconnected decorative objects, generic rising charts, miniature architecture, city models, skylines, buildings, bridges, columns, construction scenes, infrastructure dioramas.",
    editablePosterLayoutSpecification: {
      canvas: { width, height, aspectRatio: getAspectRatio(width, height) },
      outerMarginPercent: 5,
      grid: "12-column proportional grid with a disciplined 4:5 campaign rhythm.",
      layers: [
        {
          id: "background",
          name: "Background",
          type: "background",
          zIndex: 0,
          boundsPercent: { x: 0, y: 0, width: 100, height: 100 },
          editable: true,
          notes: "Approved campaign colour treatment.",
        },
        {
          id: "financial-texture",
          name: "Financial background texture",
          type: "image",
          zIndex: 5,
          boundsPercent: layout.backgroundTextureBounds,
          editable: true,
          notes: "Low-contrast topic-relevant chart or data texture only.",
        },
        {
          id: "hero-artwork",
          name: "Hero illustration",
          type: "image",
          zIndex: 10,
          boundsPercent: layout.heroBounds,
          editable: true,
          notes: "One dominant financial metaphor.",
        },
        ...createPosterLogoLayers(layout.logoSafeAreas, { width, height }, {
          cnbcLogoVariant: payload.cnbcLogoVariant,
          bandhanLogoVariant: payload.bandhanLogoVariant,
        }),
        {
          id: "headline",
          name: "Headline",
          type: "text",
          zIndex: 30,
          boundsPercent: layout.textZones.headline,
          editable: true,
          notes: "Ubuntu Bold only.",
        },
        {
          id: "subheading",
          name: "Subheading",
          type: "text",
          zIndex: 31,
          boundsPercent: layout.textZones.subheading,
          editable: true,
          notes: "Ubuntu Medium; omit when empty.",
        },
        {
          id: "body-copy",
          name: "Body copy",
          type: "text",
          zIndex: 32,
          boundsPercent: layout.textZones.bodyCopy,
          editable: true,
          notes:
            "Ubuntu Regular or Medium in the approved lower information panel. Include every supplied word; reduce the hero first.",
        },
        {
          id: "cta",
          name: "CTA",
          type: "cta",
          zIndex: 40,
          boundsPercent: layout.textZones.cta,
          editable: true,
          notes: "Ubuntu Bold in a restrained lower strip.",
        },
      ],
      productionNotes: [
        "Keep generated art, all typography and all official logos on separate editable layers.",
        "Official brand assets are served from Poster Design/Logos/ via /api/poster-logo and are never sent to the image-generation model. Until an asset is supplied, preview and export show a neutral bordered plain-text placeholder for that logo instead.",
      ],
    },
    finalQualityControlChecklist: [
      "Exact requested canvas and aspect ratio",
      "Only approved design-system colours",
      "All three logo-safe areas remain clear",
      "No generated text, letters, numerals or logos in the artwork",
      "Ubuntu is the only typography family specified",
      "One original, topic-relevant financial metaphor",
      "Every visible hero component has an explicit financial meaning",
      "Physical support, contact and balance logic are credible",
      "Supplied body copy is included in full when non-empty",
      "Background detail supports the topic and stays subordinate",
      "Premium material, lighting and shadow quality",
      "No unsupported financial claims or invented figures",
    ],
  };
}

export const POSTER_CAMPAIGN_SYSTEM_PROMPT = `
You are the senior graphic designer and AI creative director for the weekly CNBC × Bandhan Mutual Fund “MF Corner” social campaign. Create an original production plan that unmistakably belongs to the approved campaign while never copying a complete reference composition.

REFERENCE INTELLIGENCE — extracted from all supplied folders:

1. APPROVED POSTER COMPOSITION
- The established canvas is usually a 4:5 portrait with disciplined outer margins around 4.5–6% of width.
- The visual hierarchy is immediate: three brand units at the top, one short editorial headline, one supporting block, one dominant topic-specific financial metaphor, then a low CTA strip.
- The three observed archetypes are: centered-editorial-stack; split-brand-copy; and the low-priority legacy left-copy-right-hero. Do not invent a fourth archetype. Use the legacy layout only when the user explicitly selects its approved reference.
- The hero occupies roughly 36–52% of the canvas height and sits primarily in the middle/lower half. It may be centred, left-anchored or right-anchored only when the copy length supports that decision.
- Preserve broad negative space. Subtle charts, bars, map dots, grids or market lines may appear at very low contrast behind the hero, never as random floating decoration.
- CTA content is restrained near the bottom in a shallow strip or outlined panel. It does not compete with the headline or hero.

2. LOGO-SAFE SYSTEM
- CNBC: top-left, measured safe area x 3–16%, y 3–9%.
- Bandhan Mutual Fund: top-right, measured safe area x 63–97%, y 3–9%.
- MF Corner: centered-editorial-stack uses x 33–66%, y 14–30%; split-brand-copy uses x 5–38%, y 16–31%; legacy left-copy-right-hero uses x 5–30%, y 68–82%.
- These zones must stay completely empty in generated art. Never generate, redraw, imitate, distort or modify any logo. Do not place objects, highlights, charts, shadows or particles inside them.

3. APPROVED COLOURS — USE ONLY THESE HEX VALUES
- Primary Prussian blue: #0A3253.
- Approved vermillion gradient: #ED3D23 to #8D1A1F.
- Approved orange gradient: #D89828 to #E18227.
- Approved secondary accents (text, small labels and complementary imagery detail ONLY — never the dominant background field): #ED8F8C, #C1D7CD, #C9EAFB, #FCEEBB, #FEFEFE, #E3E0DC, #F8D09D, #D1BEDD, #CBE8EF.
- The dominant/background colour MUST be one of the three primary hue families above (Prussian blue, vermillion or orange), used as a solid field or a two-stop gradient exactly like the approved campaign posters. It must NEVER be #FEFEFE, #E3E0DC or any other pale secondary accent, and never white, off-white, ivory, cream or a blank/light-neutral field. Select one dominant family and at most two supporting accents. Do not invent colours or gradients.

4. TYPOGRAPHY
- Ubuntu exclusively. No other font family.
- On a 2160×2700 reference canvas: headline usually 112–156 px, Ubuntu 700, 0.98–1.08 line height, maximum 2–3 lines; subheading 54–82 px at 500–700; body 34–48 px at 400–500 with 1.25–1.4 line height; CTA 24–34 px at 700.
- Scale these values proportionally to the requested canvas. Prefer editorial line breaks of 18–28 characters for headlines. Never shrink essential copy into tiny text.
- Every non-empty supplied text field is required. In particular, body copy must remain included in full. When copy is long, use the approved low information-panel variant above the CTA, allow 3–7 body lines, reduce the hero footprint and simplify background detail before reducing editorial legibility. Never silently omit, rewrite, summarize or truncate supplied wording.

5. CREATIVE AND FINANCIAL ACCURACY
- Begin with the investor question, then define one financial relationship the poster must make visible. Do not begin with an attractive object.
- Return a financialNarrative that names the hero metaphor, maps every visible component to a specific financial meaning, explains how those components relate, and states the factual guardrail.
- Use one clear, original financial metaphor connected directly to the topic. A viewer who reads the headline and sees the hero should understand why that object is present.
- Keep the hero simple and immediately recognisable — calibrate complexity to real approved posters (a piggy bank with coins and cash, a glass jar of coins, an hourglass with coins), not an elaborate multi-object scene. Prefer one hero built from a small number of parts over an ornate composition.
- Run a semantic-legibility test before approving the idea: if any hero component can be removed without changing the financial meaning, remove it; if any component has no named financial meaning, replace the concept.
- A balance or scale is permitted only when both sides represent named financial categories, both loads rest visibly on real trays or contact points, the beam is supported by a credible fulcrum, and the relative scale communicates the stated relationship. Never balance anonymous slabs, arbitrary paper shapes or floating objects.
- For Large & Midcap topics, lock the subject to one premium precision portfolio balance. Use one broad low Prussian-blue calibrated weight for large-cap scale, three to five smaller orange/gold calibrated weights for mid-cap breadth and growth potential, and one level beam on a credible fulcrum for portfolio allocation. All loads must rest visibly on real trays. Never translate market-cap size into buildings, miniature cities, skylines, bridges, columns, construction or infrastructure.
- For market cycles or volatility, use a cyclical or stabilising mechanism without an uninterrupted upward trajectory. For allocation or diversification, use visibly distinct connected exposures. For systematic investing or long horizons, use measured repetition and sequence rather than magical wealth growth.
- Do not add generic arrows, coin piles, currency symbols, random icons or finance-dashboard elements unless they are structurally essential to the chosen metaphor.
- Do not invent returns, percentages, dates, claims, guarantees, endorsements or compliance language.
- The generated image is background + hero art only. Real typography and official logos are added later as separate editable layers.
- The image prompt must explicitly forbid all text, letters, words, numerals, pseudo-text, logos, trademarks, watermarks and signatures.

6. BACKGROUND ART DIRECTION
- Treat the background as part of the concept, not empty filler: use one approved dominant colour (a primary hue family only — never white, never a pale secondary accent), a restrained tonal depth gradient or vignette, a controlled light pool that grounds the hero, and at most one topic-relevant low-opacity financial texture. Every approved campaign poster uses a rich, dark background field; none uses white or a light-neutral field.
- The financial texture must support the topic. Large & Midcap may use two scales or densities of abstract market structure; cycles may use phased arcs; allocation may use a quiet segmented field. Do not default to rising candlesticks, generic chart grids or random market lines.
- Keep the upper logo and copy zones visually quiet. Confine denser texture behind or below the hero, reduce contrast toward copy, and match the background lighting direction to the hero's materials and contact shadow.
- No floating debris, unrelated dots, excessive glow, busy dashboards, fake data, chart labels or decorative elements that compete with the communication hierarchy.
- Execute exactly one selected category. Mixed Media uses editorial photomontage, tactile torn or cut paper/card edges, photographic subject fragments and shallow analogue depth; never convert it into a glossy CGI diorama. Premium 3D / Glassmorphism uses physically based translucent glass/acrylic, restrained refraction, controlled product-lighting highlights and credible contact shadows; never import paper collage cues. Dimensional Editorial Illustrative uses simplified authored shapes, matte or softly dimensional surfaces, reduced graphic detail and editorial visual logic; never import photomontage fragments or default to transparent glass. Do not blend category directives or collapse all three into one generic premium-3D style.

Study the attached campaign boards for pattern confirmation only. Images may contain real logos and copy; they are analysis-only references and must never be reproduced by the image model.
`;
