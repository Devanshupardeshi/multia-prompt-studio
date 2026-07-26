import type { PosterStudioPayload } from "./poster-types";

/**
 * SUBJECT layer for the MF Corner campaign — what the hero IS.
 *
 * This is deliberately separate from POSTER_CATEGORIES, which is the STYLE layer
 * (material, camera, lighting, finish). The category must never choose the subject:
 * a Premium-3D poster and a Mixed-Media poster about SIPs should show the SAME
 * object rendered two different ways, not two unrelated objects.
 *
 * Why this file exists: the previous subject source described abstract apparatus —
 * "an input cradle, a constraint gate and an outcome tray", "a calibrated duration
 * lever", "contribution modules on a track". That is engineering-diagram language.
 * It renders as lab equipment, reads as nothing financial at thumbnail size, and is
 * culturally placeless. The audience here is Indian retail investors watching
 * CNBC-TV18, whose mental model of money is built from household and shop objects
 * they touch every day — a gullak, a taraju, a thali, a passbook, gold bangles —
 * not from Western abstractions or invented mechanisms.
 */

/** Culturally-legible Indian money props, grouped by where they come from in daily life. */
export const INDIAN_FINANCIAL_PROPS = {
  currency:
    "Indian banknotes with their real tonal identities (₹500 stone grey, ₹200 bright yellow, ₹100 lavender, ₹50 fluorescent blue, ₹10 chocolate brown), Indian coins bearing the Ashoka Lion Capital and Devanagari numerals, the ₹ rupee symbol as an embossed or die-struck form",
  householdSavings:
    "a gullak (clay or steel coin bank, the first savings vessel in most Indian homes), an earthen matka, a steel tijori or almirah safe, a locked steel cash box",
  shopAndMeasure:
    "a taraju (the two-pan shopkeeper balance found in every kirana store), graduated brass paili and seer grain measures in exact stepped sizes, a bahi-khata (red cloth-bound traditional ledger), a jute bora sack, a spike-file of bills",
  kitchenAndServing:
    "a steel thali with fitted katoris (separate compartments on one plate), stacked steel tiffin tiers of graduated diameter, brass and copper vessels",
  documents:
    "a bank passbook, a chequebook, a folio or account statement, a SIP mandate form, a fixed-deposit receipt, a physical share certificate, a rubber stamp and ink pad",
  gold:
    "gold bangles, a gold chain, gold coins in a small pouch, a jeweller's velvet tray and loupe",
  growth:
    "a banyan or peepal tree with visible aerial roots, a sapling in an earthen pot, sprouting grain, a monsoon-to-harvest seasonal cycle",
  digital:
    "a UPI QR code plate, a smartphone showing a payment confirmation, a debit card, a passbook-printing counter",
  market:
    "the BSE Phiroze Jeejeebhoy Towers silhouette, a trading-floor ticker board, a bell",
  festive:
    "a diya, a rangoli pattern, Dhanteras and Akshaya Tritiya gold-buying imagery",
} as const;

/**
 * Props that read as foreign, generic or non-compliant to this audience. Kept
 * explicit because image models default to Western finance stock imagery.
 */
export const AVOID_GLOBALLY = [
  // The default visual language of Indian mutual-fund marketing is stock-template
  // clip-art. Naming it explicitly matters: it is the single most likely thing the
  // model will reach for when asked for an "Indian mutual fund poster".
  "the generic Indian mutual-fund template look — flat vector clip-art, smiling cartoon families or businessmen, tiny icon sets, a tablet or phone showing a rising chart, confetti and starbursts. This campaign is premium editorial work, not a PosterMyWall or stock-template layout",
  "the Western cartoon piggy bank (use a gullak instead)",
  "dollar signs, dollar bills, euro symbols or any non-Indian currency",
  "the Wall Street charging bull, Western skyscraper skylines or glass-tower financial districts",
  "men in Western business suits shaking hands",
  "religious deities or devotional iconography (Lakshmi, Ganesha) — inappropriate for a regulated fund campaign",
  "identity documents (Aadhaar, PAN card) or anything resembling personal KYC data",
  "generic industrial or laboratory apparatus — gauges, dashboards, speedometers, levers, valves, sorting machines, conveyor tracks, 'cradles', 'gates' or invented mechanisms with no everyday financial identity",
] as const;

export interface TopicFigurePattern {
  id: string;
  match: RegExp;
  /** The financial idea the hero must make visible. */
  concept: string;
  /** Concrete, culturally-legible options. The model picks or adapts ONE. */
  figures: string[];
  /** Topic-specific traps, on top of AVOID_GLOBALLY. */
  avoid: string[];
}

/**
 * Ordered most-specific-first; the first match wins. Every entry names real objects
 * an Indian viewer can identify in under a second, and ties the object's structure
 * to the financial idea so the poster explains itself.
 */
export const TOPIC_FIGURE_PATTERNS: TopicFigurePattern[] = [
  {
    id: "market-index",
    match: /\b(?:nifty|sensex|bank ?nifty|index\w*|indices|benchmark\w*)/i,
    concept:
      "An index is one basket that measures many companies together, weighted by size — not a single company and not a pie chart.",
    figures: [
      "One tokri (cane basket) or bound bundle holding a visibly large, uniform set of coin-discs of clearly different diameters — reading as 'many, held together, unequal weights', never as a countable few",
      "One fan or bound sheaf of identical currency slips clamped under a single band, the band being the index that holds them as one measure",
      "One taraju whose single pan carries a dense uniform crowd of small coins, showing that the reading comes from the whole crowd rather than any one coin",
    ],
    avoid: [
      "three or four coins standing in a row — an index is a large weighted crowd, not a trio",
      "pie charts, pie slices or segmented discs (an index is a weighted basket, not a share-of-total breakdown)",
      "candlestick charts, line graphs, arrows or any chart furniture standing in for the index",
    ],
  },
  {
    id: "market-cap-tiers",
    match: /\b(?:small ?cap|mid ?cap|large ?cap|micro ?cap|market ?cap|multi ?cap|flexi ?cap)\w*/i,
    concept:
      "Company-size tiers: the same kind of thing at clearly different scales, side by side, so the size difference itself is the message.",
    figures: [
      "Graduated brass paili/seer grain measures in a stepped row — the Indian shopkeeper's exact-size set — each holding coins, the vessel size carrying the cap tier",
      "Stacked steel tiffin tiers of visibly graduated diameter, the widest at the base, each tier holding coins",
      "Three gullaks of clearly different size in one row, identical in form so only scale differs",
    ],
    avoid: [
      "buildings, houses, city blocks, skylines, bridges, columns or any architecture standing in for company size",
      "tiers that look equal in size — the scale difference IS the subject and must be unmistakable at thumbnail size",
      "bar charts or stepped graphs substituting for physical size",
    ],
  },
  {
    id: "sip-systematic",
    match: /\bsip\b|\b(?:systematic invest|recurring|monthly invest|instal?ment|disciplin)\w*/i,
    concept:
      "A small, equal amount added at a regular interval — repetition over time, with no promise about the result.",
    figures: [
      "One gullak with a queue of identical coins entering its slot at even spacing, the evenness carrying the discipline",
      "A panchang or monthly calendar grid with one identical coin seated on a regular run of dates",
      "A brass tap releasing evenly spaced coins into an earthen matka that is filling, not overflowing",
    ],
    avoid: [
      "a magical or exploding growth curve, or coins multiplying on their own",
      "conveyor belts, tracks, chutes or industrial feed mechanisms",
      "any visible amount, percentage or return figure",
    ],
  },
  {
    id: "diversification",
    match: /\b(?:diversif|asset allocation|allocation|portfolio mix|asset mix|balanced fund|hybrid)\w*/i,
    concept:
      "One portfolio holding several genuinely different things at once — separate compartments, one plate.",
    figures: [
      "One steel thali with fitted katoris, each katori holding a visibly different asset — coins, grain, a small gold piece, a folded note — one plate carrying all of them",
      "One wooden or brass compartment tray (like a jeweller's or spice box) with distinct fitted sections, each filled differently",
      "One masala dabba with its separate wells, each well holding a different money material",
    ],
    avoid: [
      "pie charts or percentage rings",
      "identical compartments holding identical contents — the differences between holdings are the point",
      "abstract frames, dividers or 'allocation systems' with no everyday identity",
    ],
  },
  {
    id: "compounding-longterm",
    match: /\b(?:compound|long ?term|long horizon|wealth creation|power of time|stay invested)\w*/i,
    concept:
      "Time doing the work: something small becoming substantial through growth, with visible roots rather than a promised number.",
    figures: [
      "A banyan or peepal tree whose trunk rises out of a gullak or a single coin, aerial roots visible, scale showing years rather than a curve",
      "A sapling in an earthen pot beside the mature tree it becomes, the same plant at two ages",
      "Sprouting grain emerging from a coin bed, early shoots at clearly different stages",
    ],
    avoid: [
      "an exponential curve, hockey-stick graph or rising-arrow overlay",
      "money trees with banknotes as leaves (cliché and implies guaranteed returns)",
      "any figure, percentage or timeline number",
    ],
  },
  {
    id: "volatility-cycles",
    match: /\b(?:volatil|market cycle|cycle|correction|ups and downs|market phase|fluctuat|timing the market)\w*/i,
    concept:
      "Movement around a steady centre — conditions change while the investor's position holds.",
    figures: [
      "A lattu (wooden spinning top) upright and stable on its tip while its painted bands blur with motion",
      "A taraju whose pans are still swinging while the central beam and pivot stay firmly seated",
      "A monsoon-to-harvest seasonal ring where the field returns through the same phases without a straight upward path",
    ],
    avoid: [
      "an uninterrupted rising line or any directional market prediction",
      "storms, lightning, crashing waves or fear imagery",
      "gyroscopes, stabilisers or engineered instruments with no household identity",
    ],
  },
  {
    id: "risk-return",
    match: /\b(?:risk|volatility profile|risk profile|risk appetite|rebalanc|trade.?off)\w*/i,
    concept:
      "A visible trade-off being weighed — two real things on two real pans, unequal on purpose.",
    figures: [
      "A taraju (two-pan kirana balance) with a coin stack on one pan and a gold piece on the other, clearly unequal, the beam and pivot honestly loaded",
      "A taraju mid-adjustment, a hand moving one coin between pans to bring the beam back toward level",
      "Graduated brass weights beside a loaded pan, the weight sizes carrying the comparison",
    ],
    avoid: [
      "a perfectly level balance when the topic is about difference or trade-off",
      "dials, meters, gauges or risk-o-meter graphics",
      "anonymous slabs or blocks on the pans — both loads must be recognisable money material",
    ],
  },
  {
    id: "gold",
    match: /\b(?:gold|silver|precious metal|sovereign gold|gold etf|dhanteras|akshaya)\w*/i,
    concept:
      "Gold as an investment held two ways — the physical form Indian households know, and its paper or digital equivalent.",
    figures: [
      "Gold bangles and coins on a jeweller's velvet tray beside a folio statement representing the same holding on paper",
      "A small gold coin pouch beside a demat or fund statement, the two forms of the same asset in one frame",
      "Gold coins arranged on a weighing pan with graduated brass weights alongside",
    ],
    avoid: [
      "gold bullion vaults, Fort-Knox bars or Western bank-vault imagery",
      "overflowing treasure piles implying easy wealth",
      "any price, purity figure or return claim",
    ],
  },
  {
    id: "debt-equity",
    match: /\bfd\b|\b(?:debt fund|equit|fixed income|bond|fixed deposit|liquid fund|duration|interest rate)\w*/i,
    concept:
      "Two different kinds of holding placed side by side — one steady and predictable, one growth-oriented and more variable.",
    figures: [
      "A sturdy steel vessel beside an earthen pot holding a sapling — the steel reading as predictable, the sprouting pot as growth with variability",
      "A fixed-deposit receipt and a passbook laid beside a young plant in soil, paper certainty next to living growth",
      "A closed steel tijori beside an open basket of mixed coins",
    ],
    avoid: [
      "a see-saw, lever or fulcrum diagram of the two",
      "labelling either side as safe or risk-free",
      "yields, rate numbers or interest figures",
    ],
  },
  {
    id: "tax-saving",
    match: /\b(?:tax|elss|80c|deduction|lock.?in)\w*/i,
    concept:
      "A tax-linked investment with a real holding condition — the benefit and the lock-in shown together.",
    figures: [
      "A gullak with a visible brass lock and a small stamped seal, the lock reading as the holding period",
      "A stamped form and ink pad beside a coin stack, the stamp carrying the official benefit",
      "A sealed cloth money bag with a wax seal and a rubber-stamped receipt",
    ],
    avoid: [
      "invented tax figures, slab numbers or savings amounts",
      "anything resembling a real ITR form, PAN or Aadhaar",
      "implying tax benefit is guaranteed or universal",
    ],
  },
  {
    id: "nfo-new-fund",
    match: /\bnfo\b|\b(?:new fund|launch|first.?time invest|beginner|start invest|how to invest)\w*/i,
    concept:
      "A beginning — something newly opened, blank, or being started for the first time.",
    figures: [
      "A fresh bank passbook opened to its blank first page with a single coin resting on it",
      "A sealed lifafa (envelope) being opened, a folded note just visible at the mouth",
      "An empty gullak with the very first coin poised at its slot",
    ],
    avoid: [
      "ribbon-cutting, fireworks, launch rockets or countdown imagery",
      "implying a new fund is a better or timelier opportunity",
    ],
  },
  {
    id: "inflation",
    match: /\b(?:inflation|purchasing power|cost of living|rising price|value of money)\w*/i,
    concept:
      "The same money buying visibly less than it used to — the comparison is the whole idea.",
    figures: [
      "The same ₹ note beside two grain heaps or vegetable tokris of clearly different volume, the smaller one being today",
      "A brass paili filled to two visibly different levels for the same note laid alongside",
      "A coin beside a shrinking stack of everyday goods, the shortfall visible as empty space",
    ],
    avoid: [
      "melting, burning or dissolving money (alarmist and unclear)",
      "downward arrows or declining charts",
      "specific inflation percentages",
    ],
  },
  {
    id: "emergency-liquidity",
    match: /\b(?:emergenc|liquidit|contingenc|rainy day|withdraw|redeem|redempt|accessib)\w*/i,
    concept:
      "Money deliberately kept reachable — access is the feature being shown.",
    figures: [
      "An earthen matka with a small brass tap at its base, coins visible inside, the tap reading as easy access",
      "A gullak with an easy-lift lid set beside a sealed one, the openable vessel in front",
      "An open steel cash box with coins within immediate reach of a hand",
    ],
    avoid: [
      "bank-vault doors, combination locks or heavy security imagery (that is the opposite idea)",
      "disaster, flood or crisis scenes",
    ],
  },
  {
    id: "expense-fees",
    match: /\bfees?\b|\b(?:expense ratio|cost of invest|commission|direct plan|regular plan|exit load)\w*/i,
    concept:
      "A small deduction taken from a larger amount — the proportion must look small but real.",
    figures: [
      "A coin stack with one visibly thin coin set aside from it, the small separated slice reading as the cost",
      "A brass measure filled with grain, a single small scoop lifted clear of the top",
      "A bahi-khata page with a coin stack beside it and one coin held apart",
    ],
    avoid: [
      "invented percentage figures or fee numbers",
      "scissors cutting money, or aggressive 'hidden fee' imagery",
    ],
  },
];

/**
 * Named Indian indices and how many companies each actually measures. An index
 * poster is far more convincing when the count is real — "a bound sheaf of fifty"
 * is a designable instruction; "a crowd of coins" is not.
 */
const INDEX_CONSTITUENTS: Array<{ match: RegExp; label: string; count: number }> = [
  { match: /\bbank\s?nifty\b/i, label: "Bank Nifty", count: 12 },
  { match: /\bnifty\s?next\s?50\b/i, label: "Nifty Next 50", count: 50 },
  { match: /\bnifty\s?100\b/i, label: "Nifty 100", count: 100 },
  { match: /\bnifty\b/i, label: "Nifty 50", count: 50 },
  { match: /\bsensex\b/i, label: "Sensex", count: 30 },
];

export function getIndexConstituents(brief: string) {
  // Ordered specific-first, and each match consumes its own text so a broader
  // pattern cannot re-match it — otherwise "bank nifty" also reports Nifty 50,
  // and the poster would be built from the wrong number of parts.
  let remaining = brief;
  const found: typeof INDEX_CONSTITUENTS = [];

  for (const index of INDEX_CONSTITUENTS) {
    if (!index.match.test(remaining)) continue;
    found.push(index);
    remaining = remaining.replace(new RegExp(index.match.source, "gi"), " ");
  }

  return found;
}

export interface TopicFigureGuidance {
  matchedId: string | null;
  concept: string;
  figures: string[];
  avoid: string[];
  /** Real constituent counts when the topic names an index. */
  indexNote: string | null;
}

/**
 * Picks the subject guidance for a brief from the topic and copy — never from the
 * selected style category. Falls back to a prop-anchored instruction that still
 * demands a concrete, recognisable Indian money object rather than an abstract
 * mechanism, so an unmatched topic degrades to "pick a real object" instead of
 * "invent an apparatus".
 */
export function getTopicFigureGuidance(payload: PosterStudioPayload): TopicFigureGuidance {
  const brief = [
    payload.topic,
    payload.headline,
    payload.subheading,
    payload.bodyCopy,
    payload.visualDirection,
  ]
    .join(" ")
    .toLowerCase();

  const indices = getIndexConstituents(brief);
  const indexNote = indices.length
    ? `${indices
        .map((index) => `${index.label} measures ${index.count} companies`)
        .join("; ")}. Use that real count as the design instruction — build the hero from that many parts (or an unmistakably dense set of roughly that many where the number is large), so the poster is factually about this index and not a generic "many coins" image. Never render the number as a digit.`
    : null;

  const matched = TOPIC_FIGURE_PATTERNS.find((pattern) => pattern.match.test(brief));
  if (matched) {
    return {
      matchedId: matched.id,
      concept: matched.concept,
      figures: matched.figures,
      avoid: matched.avoid,
      indexNote,
    };
  }

  const topic = payload.topic.trim() || payload.headline.trim() || "this topic";
  return {
    matchedId: null,
    concept: `Make the specific financial idea in "${topic}" visible through ONE everyday Indian money object, chosen because its real physical structure explains that idea.`,
    figures: [
      `A single recognisable Indian money object whose natural structure carries the idea in "${topic}" — for example a gullak, a taraju, a steel thali with katoris, graduated brass paili measures, a bank passbook, a bahi-khata ledger, gold bangles, an earthen matka or a bound sheaf of currency notes`,
      "Where the idea is a comparison, show the same kind of object at two clearly different scales or two clearly different fill levels rather than two unrelated objects",
      "Where the idea is repetition over time, show one vessel plus an evenly spaced run of identical coins or notes",
    ],
    avoid: [
      "inventing a mechanism, instrument, apparatus or machine to represent the idea",
      "abstract parts described by function rather than by object — no cradles, gates, trays, modules, accumulators, levers or frames",
      "any object a viewer could not name in one second",
    ],
    indexNote,
  };
}

/**
 * Optional art direction. Both default to "auto", where the style category decides.
 * A material choice is stated as a preference the style overrides when they
 * genuinely conflict — clay and papercraft ARE their material, so a brass request
 * cannot win there without breaking the style contract.
 */
const HERO_MATERIALS: Record<string, string> = {
  brass: "aged brass with warm anisotropic sheen, fine turning marks and darkened recesses",
  steel: "brushed stainless steel with a cool matte finish and soft directional highlights",
  terracotta: "unglazed terracotta with a fine matte grain, gently chipped edges and earthen warmth",
  gold: "warm 22-carat gold with soft directional highlights, restrained rather than glittering",
  "paper-currency": "real Indian banknote paper with visible fibre, printed guilloche detail and soft folds",
};

const LIGHTING_MOODS: Record<string, string> = {
  "studio-neutral":
    "neutral studio light — balanced white key, gentle fill, no colour cast; the reference default",
  "warm-festive":
    "warm festive light with a low golden key and a soft amber bounce, as if lit by diyas just off-frame; celebratory without turning orange",
  "cool-editorial":
    "cool editorial light — slightly blue-neutral key, crisper falloff and deeper shadow, serious and news-like",
};

export function formatArtDirection(
  heroMaterial: string | undefined,
  lightingMood: string | undefined,
): string | null {
  const lines: string[] = [];
  const material = heroMaterial && heroMaterial !== "auto" ? HERO_MATERIALS[heroMaterial] : null;
  const mood = lightingMood && lightingMood !== "auto" ? LIGHTING_MOODS[lightingMood] : null;

  if (material) {
    lines.push(
      `HERO MATERIAL: render the hero object in ${material}. This is a preference, not an override — where the selected style already defines its own material (clay must stay clay, cut paper must stay paper), keep the style and ignore this line.`,
    );
  }
  if (mood) {
    lines.push(
      `LIGHTING MOOD: ${mood}. Apply it as a colour-temperature and contrast shift only; keep the style's own lighting setup, direction and shadow behaviour.`,
    );
  }

  return lines.length ? lines.join("\n") : null;
}

/** Renders the subject brief for the system prompt. */
export function formatTopicFigureGuidance(guidance: TopicFigureGuidance): string {
  return [
    `FINANCIAL IDEA TO MAKE VISIBLE: ${guidance.concept}`,
    ...(guidance.indexNote ? ["", `INDEX FACTS: ${guidance.indexNote}`] : []),
    "",
    "SUBJECT OPTIONS — choose ONE and commit to it, or adapt one into a closer fit for this exact brief:",
    ...guidance.figures.map((figure, index) => `${index + 1}. ${figure}`),
    "",
    "WRONG FOR THIS TOPIC:",
    ...guidance.avoid.map((item) => `- ${item}`),
    "",
    "ALSO WRONG FOR THIS AUDIENCE:",
    ...AVOID_GLOBALLY.map((item) => `- ${item}`),
  ].join("\n");
}
