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
      "Execute Mixed Media Realism only: construct one oversized lower-centre hero from a real photographed object, hand or currency element with visible cut or torn edges, authentic grayscale/halftone surface detail, tactile paper or newsprint joins, and a soft grounded contact shadow. Reserve approved colour for small paper tabs, thin background geometry or labels outside the hero; never colourise the hero or full canvas. Use a straight-on or slight three-quarter product angle, coherent single-source studio light, simple flat or restrained-gradient background, and generous negative space. Every component must implement a named financial mapping and make credible physical contact. Forbid glossy CGI, plastic hands, chrome coins, cartoon cash icons, miniature architecture, cities, skylines, bridges, columns, infrastructure, unsupported pieces and copied reference wording or composition.\n\nCAMERA: straight-on or 10–15° three-quarter product angle, 50–85mm equivalent, f/8–f/11 deep focus so every torn edge and paper fibre stays sharp — never a shallow-DOF blur.\nLIGHTING: one soft studio key at 30–45° with gentle fill; no harsh specular hotspots, no coloured gels, no dramatic rim light.\nMATERIAL: real paper grain, visibly torn or cut edges with fibre texture, halftone/newsprint dot pattern at low opacity on any secondary element, one soft grounded contact shadow — never a hard drop shadow or a floating cutout.\nDEPTH: shallow layered-collage depth from 2–3 offset planes at most; this is a flat-lay/collage construction, not a deep 3D scene.\nFINISH: print-editorial magazine quality — restrained grain, matte paper sheen, never glossy CGI or plastic render finish.\nSTYLE ONLY: this category decides HOW the subject is rendered, never WHAT the subject is. The subject comes from the topic brief. Render whichever object that brief specifies as a tactile editorial collage — real photographed money material with torn/cut paper edges, halftone joins and a grounded contact shadow. Indian props render especially well here: currency notes with visible fibre, a bahi-khata's cloth binding, a jute sack's weave, a passbook's printed grain.",
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
      "Execute Premium 3D / Glassmorphism only: build one tightly framed, mechanically credible product-shot hero in near-neutral satin metal, pewter, frosted white-blue ceramic or matte black, using translucent glass only as a limited functional tray, panel or edge. Use a shallow three-quarter camera, one dominant soft key light, one controlled specular highlight band, gentle falloff, real contact points, soft diffuse shadows and restrained depth of field. Saturated approved colour belongs only in small accents, copy colour or a soft background glow, never across the hero material. Keep the background abstract and flat light-neutral or a rich approved dark gradient. Forbid candy-plastic sheen, disconnected floating parts, hard rainbow PNG cutouts, neon bloom, lens flare, mirror reflections, cityscapes and copied arrangements. A single giant floating coin with no other idea is a cliché to avoid — coins and currency are welcome as a real construction material (stacked, cast, embossed into a surface), never as one oversized lazy prop.\n\nCAMERA: shallow three-quarter product angle, 90–105mm-equivalent macro-adjacent framing, f/4–f/5.6 so the hero stays crisp while the background falls softly out of focus.\nLIGHTING: three-point studio setup — soft key from upper-left, a subtle rim light in one approved accent colour to separate the hero from the background, gentle ambient fill; exactly one controlled specular highlight band per major surface, never multiple competing hotspots.\nMATERIAL: frosted or satin glass with 4–8% surface micro-noise (never mirror-clean), brushed or polished metal with anisotropic (directional) reflection rather than a perfect chrome mirror, soft ambient occlusion at every real contact point.\nDEPTH: true dimensional construction from parts at different z-positions with credible contact shadows — never a flat cutout dressed up with a drop shadow.\nFINISH: award-tier product-render quality (the standard of a premium tech-brand hero shot), subtle chromatic falloff at edges, zero plastic-toy sheen.\nSTYLE ONLY: this category decides HOW the subject is rendered, never WHAT the subject is. The subject comes from the topic brief. Render whichever object that brief specifies as a physically based studio product shot — real materials, credible weight and contact, controlled specular behaviour. Indian props render especially well here: brass and copper with warm anisotropic sheen, struck-metal coin relief, gold with soft directional highlights, glazed terracotta, brushed steel.",
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
      "Execute Dimensional Editorial Illustration only: use one lower-third hero cluster with four to six total rounded geometric shapes, bold silhouettes, smooth continuous contours, flat approved colour blocks and only one or two adjacent tonal facets for shallow depth. Keep the full canvas a single uninterrupted approved flat colour and preserve a separate zero-overlap headline zone. Remap all reference hues to the Bandhan palette. Use economical financial symbolism that a financial editor can explain component by component. Forbid photoreal lighting, cast shadows, glass transparency or blur, full CGI, thick cartoon outlines, starburst call-outs, numbered badges, stock-icon dashboards, clutter, pure typography compositions and copied reference subjects.\n\nPERSPECTIVE: isometric or flat-orthographic view only — never a photographic camera angle or one-point/two-point perspective.\nSHADING: flat cel-style shading, exactly one shallow highlight facet plus one shadow facet per shape for dimension — never photoreal light falloff, gradients across a whole shape, or a cast shadow onto the background.\nCONSTRUCTION: geometric primitives only (circles, rounded rectangles, capsules, triangles) combined into 4–6 total shapes; depth comes only from layering and overlap plus the one or two tonal facets, never from blur or atmospheric perspective.\nFINISH: contemporary editorial spot-illustration quality — the standard of a Bloomberg Businessweek or Economist finance illustration, not a children's-book or corporate-clipart style.\nSTYLE ONLY: this category decides HOW the subject is rendered, never WHAT the subject is. The subject comes from the topic brief. Reduce whichever object that brief specifies to bold simplified geometry — but keep it identifiable: every primitive needs at least one concrete cue that names the real object (a coin's milled rim, a note's folded corner, a gullak's slot, a katori's curve, a passbook's binding). A plain circle or capsule with no such cue reads as generic UI iconography, not finance.",
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
        "One taraju — the two-pan balance from any Indian kirana shop — with a broad heavy coin stack seated on one pan and a group of three to five smaller coin stacks on the other, on one beam over one seated pivot and one grounded base.",
      visualMappings: [
        {
          element:
            "One broad, heavy stack of large coins resting fully on the first brass pan",
          financialMeaning:
            "Large-cap exposure: established scale and relative portfolio stability.",
        },
        {
          element:
            "Three to five smaller coin stacks grouped on the second brass pan",
          financialMeaning:
            "Mid-cap exposure: a wider set of developing businesses and growth potential.",
        },
        {
          element:
            "One continuous brass beam carrying both pans",
          financialMeaning:
            "Portfolio allocation holding both market-cap segments in a deliberate, complementary mix.",
        },
        {
          element: "One visible seated pivot at the centre of the beam",
          financialMeaning: "The fund manager's allocation judgement.",
        },
        {
          element: "One grounded wooden or brass base with a visible contact shadow",
          financialMeaning: "The fund's overall structural stability.",
        },
      ],
      relationship:
        "The beam sits visibly on its pivot; both pans hang from that same beam; every coin stack makes full contact with its pan; the base is grounded. The balance makes the mix visible without implying equal allocation or a guaranteed outcome.",
      guardrail:
        "Do not show guaranteed growth, exact allocation, performance numbers, risk-free large caps or inevitably growing mid caps. Forbid cities, buildings, bridges, architecture, independent columns, separate platforms, staircases, bar charts, floating blocks and unrelated sculptures.",
    };
  }

  if (/\b(?:cycle|volatil|changing market|market phase)\w*/.test(brief)) {
    return {
      investorQuestion:
        "How can an investor stay oriented while market conditions and phases change?",
      heroMetaphor:
        "One lattu — the wooden spinning top every Indian child knows — standing upright and steady on its tip while its painted bands blur with motion around it.",
      visualMappings: [
        {
          element: "The lattu's steady vertical axis and its single point of contact with the ground",
          financialMeaning: "Disciplined investment orientation held through changing conditions.",
        },
        {
          element: "The painted bands around its body, blurred by rotation",
          financialMeaning: "Market phases and volatility moving around the investor.",
        },
        {
          element: "The top staying upright rather than tilting toward any direction",
          financialMeaning: "Staying invested and rebalancing rather than predicting the market.",
        },
      ],
      relationship:
        "The blur belongs to the same single object that is standing still at its tip — motion and steadiness are one body, not two separate elements placed near each other.",
      guardrail:
        "No uninterrupted rising chart, return promise, prediction, numeric scale or claim of eliminating risk.",
    };
  }

  if (/\b(?:diversif|allocation|portfolio mix|asset mix)\w*/.test(brief)) {
    return {
      investorQuestion:
        "How do distinct exposures work together inside one considered portfolio?",
      heroMetaphor:
        "One steel thali with fitted katoris, each katori holding a visibly different money material — coins, grain, a small gold piece, a folded note — all carried on the same single plate.",
      visualMappings: [
        {
          element:
            "Three to five fitted katoris, each holding a clearly different material and fill level",
          financialMeaning: "Different portfolio exposures or allocation roles.",
        },
        {
          element: "The one steel thali that seats every katori in its own recess",
          financialMeaning: "Their combined role within one portfolio.",
        },
        {
          element: "The visibly unequal fill levels between katoris",
          financialMeaning: "The deliberate allocation decision between exposures.",
        },
      ],
      relationship:
        "Every katori sits in its own recess on the same plate and touches it; the differences between their contents and fill levels carry the meaning, not their arrangement in space.",
      guardrail:
        "No invented allocation percentages, guaranteed diversification benefit or unsupported product claim.",
    };
  }

  if (/\b(sip|systematic|discipline|regular invest|compounding|long term|long-term)\b/.test(brief)) {
    return {
      investorQuestion:
        "How can regular, time-based investing build participation without promising a result?",
      heroMetaphor:
        "One gullak with a queue of identical coins entering its slot at perfectly even spacing, the coins already inside visible through the opening.",
      visualMappings: [
        {
          element: "Identical coins queued at visibly regular, equal spacing",
          financialMeaning: "Regular investment discipline over time.",
        },
        {
          element: "The single slot every coin passes through, unchanged",
          financialMeaning: "Consistency and continuity of the SIP process.",
        },
        {
          element: "The gullak's grounded body filling steadily, without overflowing",
          financialMeaning: "Participation building across a longer horizon.",
        },
      ],
      relationship:
        "Every coin is the same size and heads into the same slot on the same vessel; the evenness of the spacing is the discipline. Nothing transforms, multiplies or grows on its own.",
      guardrail:
        "No guaranteed compounding curve, exact return, currency figure or effortless-wealth symbolism.",
    };
  }

  if (/\b(tax.?loss|loss harvesting|harvest tax|capital loss)\b/.test(brief)) {
    return {
      investorQuestion:
        "How can eligible investment losses be used against realised gains without implying that every loss creates a tax benefit?",
      heroMetaphor:
        "One bahi-khata ledger open flat with two facing pages, a small stack of coins set on each page and a single brass paperweight holding the book open at the join between them.",
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
        "One taraju whose two coin stacks hang at visibly different distances from the central pivot, the far stack swinging through a wider arc than the near one for the same small movement.",
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
        "One taraju mid-adjustment, its two coin stacks currently uneven, with a hand moving a single coin from the heavier pan to the lighter one to bring the beam back toward level.",
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
  // Deliberately NOT an invented mechanism. This fallback fires for most real MF
  // Corner topics, so it has to point at a nameable Indian money object; the
  // previous "input cradle / constraint gate / outcome tray" wording was an
  // engineering diagram and rendered as lab apparatus with no financial read.
  return {
    investorQuestion: `What decision about ${topic} should an investor understand before acting?`,
    heroMetaphor:
      `One everyday Indian money object chosen because its real structure explains ${topic} — for example a gullak, a taraju, a steel thali with katoris, graduated brass paili measures, a bank passbook, a bahi-khata ledger or a bound sheaf of currency notes — shown as a single grounded hero, not an invented mechanism.`,
    visualMappings: [
      {
        element: `The main body of one recognisable Indian money object, chosen to carry ${topic}`,
        financialMeaning: `The investment subject being explained: ${topic}.`,
      },
      {
        element: `One deliberate difference within that same object — two clearly different fill levels, two clearly different sizes, or an evenly spaced repetition — expressing ${supportingQuestion}`,
        financialMeaning: `The condition or trade-off the brief asks the investor to consider: ${supportingQuestion}.`,
      },
      {
        element:
          "The object's own grounded base or resting surface, with a visible contact shadow",
        financialMeaning:
          "The considered position after that condition has been weighed, not a promised result.",
      },
    ],
    relationship:
      "Every part belongs to the same single physical object and touches it — meaning comes from that object's real structure (its scale, fill level, compartments or repetition), never from separate pieces placed near each other or from an invented apparatus.",
    guardrail:
      `Do not invent figures, guarantees, endorsements, outcomes, labels or decorative finance symbols, and do not substitute a machine, instrument, gauge or mechanism for a real object. If no everyday money object can explain ${topic} specifically, reject it and request a more precise brief.`,
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

7. SUBJECT VERSUS STYLE — THE MOST IMPORTANT SEPARATION IN THIS BRIEF
- Two independent decisions. The TOPIC decides WHAT the hero is. The selected category decides only HOW that object is rendered — its material, camera, lighting, construction and finish. These must never be confused.
- The same topic must produce the SAME object across all three categories, rendered three different ways. A SIP poster is a gullak whether it is shot as tactile paper collage, as a physically based product render, or as flat dimensional illustration. If switching the category would change WHAT the object is, the subject was chosen wrongly.
- Never let the category suggest the subject. The category section below contains no subject vocabulary on purpose.

8. INDIAN MARKET AND INDIAN AUDIENCE
- This is CNBC-TV18 and Bandhan Mutual Fund, speaking to Indian retail investors. Their mental model of money is built from household and shop objects they handle every day — a gullak, a taraju, a steel thali, a bank passbook, gold bangles, brass measures, an earthen matka, a bahi-khata — not from Western finance abstractions.
- Prefer the Indian object over the international equivalent every time: a gullak, never a cartoon piggy bank; a taraju (kirana two-pan balance), never a laboratory scale; a bahi-khata, never a leather Western ledger; Indian banknotes and Ashoka-Lion-Capital coins with the ₹ symbol, never dollars or generic gold discs.
- Forbidden as culturally wrong or non-compliant here: dollar or euro symbols, the Wall Street charging bull, Western glass-tower skylines, men in Western suits shaking hands, religious deities or devotional iconography, and anything resembling Aadhaar, PAN or personal KYC data.
- Design for a phone screen in daylight: high contrast, bold silhouette, one clear subject. The poster is seen at social-media thumbnail size before anyone opens it full-screen, so the hero must be identifiable at that size.
- The one-second test, applied before you commit to any subject: could an Indian viewer scrolling past name this object and sense that it is about money, before reading a single word? If the object needs the headline to make sense, or would look equally at home advertising a car, a lab instrument or a fitness app, it is the wrong subject no matter how clever the underlying metaphor is.
- Never invent a mechanism, apparatus, instrument or machine to stand in for a financial idea. Do not describe parts by function — no cradles, gates, trays, modules, accumulators, levers, dividers or frames. Name real objects and their real parts (a pan, a beam, a slot, a lid, a katori, a page, a rim).
- No reference photographs are attached to this request. The written specs below are complete and authoritative on their own — do not ask for or assume a reference image; render entirely from the text plus the approved colour and layout data above.

SUBJECT BRIEF — derived from the topic. This decides WHAT the hero is.
`;
