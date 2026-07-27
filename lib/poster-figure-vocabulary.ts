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

/**
 * Exact specification for any money that appears in a render.
 *
 * Image models default hard to American money — green banknotes, a $ sign, a
 * blank gold disc — because that is what dominates their training data. For a
 * CNBC × Bandhan campaign that is not a style slip, it is a credibility failure:
 * an Indian viewer clocks a dollar bill instantly. So the denominations are named
 * with their real colours and reverse motifs rather than left to "rupees, please",
 * and the coin metals are specified, because "a coin" renders as a generic gold
 * token every time.
 */
export const INDIAN_CURRENCY_SPEC = [
  "ALL MONEY IS INDIAN. Every note, coin, symbol and price in the image is Indian rupees. No other currency may appear anywhere, in any form, at any size.",
  "",
  "BANKNOTES — Mahatma Gandhi New Series, current circulating notes only. Each denomination has its own unmistakable base colour, and notes get physically larger as the value rises:",
  "- ₹10: chocolate brown, Konark Sun Temple wheel on the reverse. The smallest note.",
  "- ₹20: greenish yellow, Ellora Caves on the reverse.",
  "- ₹50: fluorescent cyan-blue, the stone chariot at Hampi on the reverse.",
  "- ₹100: soft lavender / mauve, Rani ki Vav stepwell on the reverse.",
  "- ₹200: bright saffron yellow, the Sanchi Stupa on the reverse.",
  "- ₹500: stone grey, the Red Fort with the Indian tricolour on the reverse. The largest circulating note.",
  "Every note's front carries the same elements: a right-facing Mahatma Gandhi portrait, the Ashoka Pillar lion capital to its lower right, the denomination in both Devanagari and Western numerals, the Reserve Bank of India seal and the Governor's signature, a colour-shifting security thread, and raised intaglio print. The reverse carries the motif above plus a language panel and the year.",
  "Notes are printed on cotton-rag paper, not glossy stock: matte, slightly fibrous, holding soft creases and worn corners rather than sitting perfectly flat like plastic.",
  "",
  "COINS — the current series, and the metal matters as much as the shape:",
  "- ₹1: ferritic stainless steel, cool neutral silver-grey, small and thin, ~22 mm.",
  "- ₹2: ferritic stainless steel, same cool silver-grey, ~25 mm.",
  "- ₹5: nickel-brass, distinctly WARM golden-brass — noticeably yellower than the ₹1 and ₹2, ~23 mm, thicker in the hand.",
  "- ₹10: bimetallic — a warm nickel-brass centre disc set inside a cool silver stainless-steel outer ring, ~27 mm. The two-tone ring is its signature.",
  "- ₹20: bimetallic and twelve-sided (dodecagonal), warm centre in a pale outer ring, ~27 mm.",
  "Every coin's obverse shows the Lion Capital of Ashoka above the Devanagari legend 'सत्यमेव जयते'. Every reverse shows the ₹ symbol beside the value in numerals. Struck relief, milled or plain edges, and real circulated wear — softened high points, faint scratches, warmer tarnish in the recesses — never a mirror-polished blank disc.",
  "",
  "THE RUPEE SYMBOL ₹: the Devanagari letter 'र' with two horizontal strokes across its top. When it appears as a dimensional object it is die-struck, embossed, cast or cut — with real thickness, bevelled edges and its own contact shadow — never a flat pasted glyph.",
  "",
  "PHYSICAL FIDELITY — the money must be the real object, not a symbol of money. Reproduce the actual engraved figures and the actual surface, at a level of detail where a viewer who handles this currency daily recognises the specific denomination without being told:",
  "- Notes: the engraved right-facing Mahatma Gandhi portrait built from real intaglio line-work, the correct reverse monument rendered as recognisable architecture rather than a vague shape, the raised ink you can feel across the portrait and the denomination block, cotton-rag paper with visible fibre and a faint mottled grain, the embedded colour-shifting security thread, the Gandhi watermark in the clear window, the see-through register mark, the guilloche rosettes and fine engine-turned line patterns across the field, and honest use: soft central fold, slightly furred edges, a rounded or bent corner, minor surface grime in the creases. Ink sits matte and slightly absorbed into the paper — never glossy, never printed on card, never crisp like freshly cut plastic.",
  "- Coins: struck relief with genuine depth — the Ashoka lion capital's manes and the abacus reading as modelled form, the ₹ symbol and numeral standing proud of the field with sharp die edges and their own tiny cast shadows, the raised rim, and the edge treatment (reeded on some, plain on others). Then real circulation: high points softened and burnished, faint hairline scratches across the field, darker tarnish settled into the recesses and around the lettering, and on bimetallic ₹10 and ₹20 a visible seam where the warm inner disc meets the cool outer ring, each metal holding its own reflectance. Never a smooth mirror-polished token.",
  "- Stacks and fans behave physically: coins in a stack sit slightly off-axis with visible edge reeding and dark contact lines between them; a fan or bundle of notes shows the paper's thickness, springs slightly rather than lying dead flat, and casts soft shadows between the leaves. A banded bundle is held by a real paper or rubber band that compresses the notes.",
  "",
  "MATERIAL TREATMENT FOLLOWS THE STYLE CATEGORY, IDENTITY DOES NOT. If the selected style is clay, paper or illustration, the money is built in that material — but it is still the correct denomination, still its correct colour, and still carries its correct motif and relief, pressed into clay or cut from card. Simplify the execution, never the identity. A stylised note that could be any country's money has failed.",
  "",
  "ONE EXCEPTION — TYPOGRAPHY, NOT IMAGERY. The poster's no-generated-text rule still applies to the printed WORDING: do not attempt legible denomination numerals, the fifteen-language panel, the Governor's signature or the year. Render those as accurate texture and structure at a scale, angle or depth of field where they read as fine print rather than as words, and never invent garbled pseudo-numerals or fake script. Everything pictorial — the portrait, the monument, the lion capital, the ₹ symbol, the guilloche — is required in full detail, because that is what makes the note real.",
  "",
  "NEVER RENDER: dollars, cents, euros, pounds, yen, dirhams or any foreign note or coin; a $, €, £ or ¢ sign anywhere; green-toned banknotes of any kind; blank unmarked gold or silver discs standing in for coins; a flat vector or emoji-style coin or note; a plain coloured rectangle standing in for a banknote; the withdrawn ₹2000 magenta note; the demonetised pre-2016 ₹500 and ₹1000 notes; invented denominations, fantasy currency or scrambled pseudo-numerals on a note face; money mixed from two different countries in one image.",
].join("\n");

/**
 * Condensed forms of the three specs, for the CONCEPT call.
 *
 * The full specs are ~11KB together. They belong in the render prompt, where they
 * govern actual pixels. Sending them to the concept model too made its already-slow
 * high-reasoning call ~11KB heavier for no gain: that model does not draw anything,
 * it writes the contract, and the render prompt restates the full specs itself. All
 * it needs is enough to avoid designing something the renderer must then refuse.
 */
export const CONCEPT_SPEC_BRIEFS = [
  "MONEY: all currency is Indian rupees, never any foreign note, coin or symbol. Notes are the real Mahatma Gandhi New Series denominations in their real colours (₹500 stone grey, ₹200 saffron, ₹100 lavender, ₹50 cyan-blue, ₹20 greenish yellow, ₹10 chocolate brown); coins are the real metals (cool steel ₹1/₹2, warm brass ₹5, two-tone bimetallic ₹10, twelve-sided ₹20) with the Ashoka lion capital and the ₹ symbol. Describe them as real, worn, physically detailed objects — never a blank gold disc or a plain coloured rectangle.",
  "PEOPLE: only include a person if the concept genuinely needs one. If it does, they are a real Indian person, photographically real and anatomically exact — correct hands above all — never a glossy avatar, cartoon character or Western businessman. If a hand cannot be justified, leave it out.",
  "COLOUR: the background field, type and logo zones use the approved palette only. The HERO is free to be its real colour — brass, terracotta, clay, paper stock, a note's true denomination hue, a real skin tone — and must not be repainted into a brand hue. Keep it tonally coherent with the approved background.",
].join("\n");

/**
 * Which colours are brand-locked and which are the figure's own.
 *
 * The campaign palette exists to make the canvas recognisable as MF Corner, and
 * that job is done by the background field, the type and the logo zones. Applying
 * it to the hero as well was actively breaking things: a ₹100 note is lavender and
 * a ₹500 is stone grey, neither of which is a brand hue, and real Indian skin tones
 * are not in the palette at all. Forced onto the palette, a "real" note became a
 * Prussian-blue rectangle and a real person became a blue-tinted mannequin.
 *
 * So: the canvas stays locked, the figure is free to be the colour it actually is.
 */
export const HERO_COLOUR_FREEDOM = [
  "COLOUR AUTHORITY — two separate rules, do not mix them up.",
  "",
  "BRAND-LOCKED, no exceptions: the dominant background field and its gradient or vignette, the editable text colours, and everything inside the logo and copy-safe zones. These come from the approved palette only, and the background is always one of the rich primary hue families — never white, pale or a light neutral.",
  "",
  "THE HERO FIGURE IS FREE. The subject uses whatever colours its material and the selected style genuinely call for, whether or not those colours are in the brand palette. Real brass is warm yellow; real terracotta is orange-brown; real clay is putty or earth; real card stock is whatever the paper is; a ₹100 note is lavender and a ₹500 is stone grey; skin is a real Indian skin tone; a banyan's leaves are green. Render the true colour of the thing. A hero repainted into a brand hue reads as a plastic prop and defeats the realism this campaign depends on.",
  "",
  "WHAT STILL DISCIPLINES THE FIGURE — coherence, not the palette:",
  "- It must sit believably in the approved background: shared light direction and colour temperature, the background's hue reflected softly in shadows and on facing surfaces, and enough tonal separation from the field that the silhouette reads at thumbnail size.",
  "- Restraint over range. One or two dominant material colours plus their natural variation, not a rainbow. Saturation stays editorial, not candy.",
  "- Brand accents are still welcome as a deliberate touch on the hero — a rim light in an approved accent, a small painted tab, a coloured base — they are simply no longer mandatory across the whole object.",
  "- The style category still governs treatment. If the chosen style is deliberately desaturated or deliberately flat, that wins: this rule frees the figure from the BRAND palette, not from its own style.",
].join("\n");

/**
 * How a person renders when one appears in a poster.
 *
 * Two failures to prevent, and they are different problems. The first is the
 * uncanny one: image models produce glossy doll faces, plastic airbrushed skin and
 * six-fingered hands, and a single bad hand destroys the credibility of an
 * otherwise premium render. The second is cultural: left alone, the default face
 * is a Western one in a Western suit, which is wrong for this audience.
 *
 * Note the framing — this is the standard for a person who is already in the
 * concept, not an invitation to add one. AVOID_GLOBALLY still rules out the
 * smiling stock-photo family this campaign must never look like.
 */
export const HUMAN_ELEMENT_SPEC = [
  "IF A PERSON, A FACE, A HAND OR ANY PART OF A BODY APPEARS, IT MUST BE PHOTOGRAPHICALLY REAL. Not a character, not an avatar, not a mascot. A real person, of the kind who actually watches this show.",
  "",
  "ANATOMY IS NON-NEGOTIABLE, in every style:",
  "- Hands are the single most common failure and the most damaging. Exactly five fingers per hand, correct relative lengths, three joints per finger and two on the thumb, nails with real nail beds and cuticles, tendons and knuckle creases visible, a plausible wrist angle, and a real grip — fingers wrapping an object with contact pressure and slight skin deformation where they press. If a hand cannot be rendered exactly, crop it out of frame or occlude it behind the hero rather than faking it.",
  "- Faces: correct eye spacing and matching iris size, both eyes focused on the same point, natural asymmetry between the two halves, real eyelid folds and lash lines, ears with correct helix and lobe structure, teeth of even count and natural shade if visible, and lips with real texture rather than a smooth painted shape.",
  "- Skin: visible pores, fine lines, small blemishes, faint hair, uneven tone across cheeks and neck, and genuine subsurface scattering where light passes through the ear rim, nostril or finger edge. Never airbrushed plastic, never wax, never a uniform matte fill.",
  "- Bodies: real proportion and weight, a spine and limbs under actual gravity, clothing that drapes with real fabric weight and creases where the body bends, and a pose a person could actually hold.",
  "- Expression: a natural, settled micro-expression — never a wide rictus stock-photo grin, never a dead neutral stare.",
  "",
  "THE PERSON IS INDIAN, and specifically so rather than generically 'ethnic':",
  "- The genuine range of Indian skin tones, from fair wheatish through to deep brown, with warm undertones and natural variation across the face — not one flattened mid-brown.",
  "- Black or very dark brown hair with real Indian hair texture — straight, wavy or coiled, with weight and individual strands at the hairline, not a moulded helmet.",
  "- Clothing appropriate to the person and the setting: a cotton or silk saree with real pleat structure, a salwar kameez with dupatta, a kurta, a formal shirt with a soft collar, a dhoti — chosen for who this person is, not a Western business suit by default.",
  "- Real, specific age: a shopkeeper's weathered hands read completely differently from a first-time investor's, and that difference should be visible and deliberate.",
  "",
  "STYLE GOVERNS THE MATERIAL, NEVER THE ANATOMY. In clay, paper, illustration or diorama the person is built from that material — but the hand still has five correctly jointed fingers, the face still has correct feature placement, the body still obeys gravity, and the person is still visibly Indian. Simplify the surface, never the structure. A clay figure with a malformed hand is still a malformed hand.",
  "",
  "NEVER RENDER: a glossy 3D avatar, Pixar or Disney-style character, videogame model, mannequin or wax figure; plastic, rubbery or airbrushed skin; malformed, extra, missing, fused or bent-backwards fingers; mismatched or misaligned eyes; a smiling Western businessman or a stock-photo family; a generic Western default face where the brief calls for an Indian one; a floating disembodied hand with no forearm or credible source; more than one person unless the concept explicitly requires them.",
].join("\n");

/**
 * How each style renders a person, given the shared anatomy rules above.
 *
 * Without this, a style category and "make the human realistic" contradict each
 * other and the model picks one — usually by dropping a photoreal head onto a clay
 * body. Each entry says which layer stays real and which follows the material.
 */
const CATEGORY_HUMAN_EXECUTION: Record<string, string> = {
  "mixed-media":
    "This style's person is a real photograph. Use a genuine editorial photograph of an Indian person or their hands, converted to black-and-white or heavily desaturated grayscale to match the rest of the collage, with the print's own grain and halftone. Full photographic skin detail — pores, hair, creases, subsurface light — survives the desaturation. Cut edges may be torn or scissored, but the anatomy inside the cutout is untouched photography. Never a rendered figure, never a colourised face.",
  "glassmorphism-3d":
    "This style's person is a physically based render at photoreal fidelity: real subsurface scattering through the ear rim and finger edges, individual hair strands with correct sheen, fabric with woven micro-detail and real drape, soft product lighting and true contact shadows where skin meets object. The surrounding props may carry translucent glass or acrylic detail; the SKIN NEVER DOES — skin is opaque, matte-to-satin and human. A glass or crystalline person is the exact failure this rule exists to prevent.",
  illustrative:
    "This style's person is reduced to simplified dimensional form with matte surfaces and a deliberate silhouette — but the reduction is in surface detail only. Feature placement, hand structure, proportion and posture stay anatomically exact, and the face keeps enough real modelling to read as a specific Indian person rather than a symbol. Simplify texture; never simplify structure into a cartoon or an icon of a person.",
  "soft-clay":
    "This style's person is modelled in matte polymer clay with visible thumbprints, tool marks and softly rounded edges. The clay may be a warm neutral or a naturalistic skin tone, but the sculpt must be an accurate one: correct facial proportion, a hand with five properly jointed fingers, clothing whose folds follow real fabric behaviour, and hair sculpted with real directional flow. Think a master stop-motion armature, not a child's plasticine figure — Aardman precision, not a lump with a smile.",
  "isometric-diorama":
    "This style's person is a precise scale miniature seen in true isometric or a clean 45-degree three-quarter view — a museum-quality architectural or railway figure, not a toy. At that reduced size the silhouette, posture and clothing must still read unmistakably as a specific Indian person, and hands stay correctly formed even when small. Physically based matte and satin surfaces with ambient occlusion at every contact point. Never a faceless grey scale-model dummy or a chunky game-piece figure.",
  "layered-paper":
    "This style's person is constructed from stacked planes of matte cut card, with visible paper fibre, crisp cut edges and short soft shadows between the layers. Depth comes only from the stacking, so the layer breakdown must follow real anatomy — separate planes for brow, cheek, jaw, each finger and each fold of cloth — so the assembled figure reads as a real Indian person in paper relief. Never a flat pictogram, silhouette or paper-doll cut-out.",
};

/** Style-specific instruction for rendering a person, on top of HUMAN_ELEMENT_SPEC. */
export function getCategoryHumanExecution(category: string): string {
  return CATEGORY_HUMAN_EXECUTION[category] ?? "";
}

/** Culturally-legible Indian money props, grouped by where they come from in daily life. */
export const INDIAN_FINANCIAL_PROPS = {
  currency:
    "Indian banknotes in their real denomination colours (₹500 stone grey, ₹200 saffron yellow, ₹100 lavender, ₹50 cyan-blue, ₹20 greenish yellow, ₹10 chocolate brown), Indian coins in their real metals (cool steel ₹1 and ₹2, warm brass ₹5, two-tone bimetallic ₹10 and twelve-sided ₹20) bearing the Ashoka Lion Capital and Devanagari numerals, the ₹ rupee symbol as a die-struck or embossed form — see the CURRENCY SPECIFICATION for exact detail",
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
  "dollar signs, dollar bills, green banknotes, euro or pound symbols, or any non-Indian currency — see the CURRENCY SPECIFICATION, which is absolute",
  "blank unmarked gold or silver discs used as stand-in coins — an Indian coin is identifiable by its metal, its Ashoka lion capital and its ₹ numeral",
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
  /** Rotation offset so the same topic does not always lead with the same example. */
  rotation: number;
  /** The designer's own visual direction, when they wrote one. Outranks the examples. */
  visualDirection: string | null;
}

/**
 * Small stable hash of the brief. Rotation has to vary per brief and per re-ask but
 * stay deterministic, or the same request would produce different prompts on retry
 * and nothing would be reproducible.
 */
function briefRotation(payload: PosterStudioPayload): number {
  const source = `${payload.topic}|${payload.headline}|${payload.subheading}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) + (payload.rejectedFigures?.length ?? 0);
}

function rotate<T>(items: T[], offset: number): T[] {
  if (items.length < 2) return items;
  const start = offset % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

/**
 * Picks the subject guidance for a brief from the topic and copy — never from the
 * selected style category. Falls back to a prop-anchored instruction that still
 * demands a concrete, recognisable Indian money object rather than an abstract
 * mechanism, so an unmatched topic degrades to "pick a real object" instead of
 * "invent an apparatus".
 */
/** Named objects offered when no topic pattern matches. Rotated per brief. */
const FALLBACK_PROP_EXAMPLES = [
  "a gullak",
  "a bank passbook",
  "graduated brass paili measures",
  "an earthen matka",
  "a bound sheaf of currency notes",
  "gold bangles",
  "a bahi-khata ledger",
  "a steel tiffin stack",
  "a jute bora sack",
  "a spike-file of bills",
];

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

  const rotation = briefRotation(payload);
  const visualDirection = payload.visualDirection.trim() || null;

  const matched = TOPIC_FIGURE_PATTERNS.find((pattern) => pattern.match.test(brief));
  if (matched) {
    return {
      matchedId: matched.id,
      concept: matched.concept,
      // Rotated so two posters on the same topic do not open with the same example,
      // and so "show me different options" genuinely reshuffles the starting point.
      figures: rotate(matched.figures, rotation),
      avoid: matched.avoid,
      indexNote,
      rotation,
      visualDirection,
    };
  }

  const topic = payload.topic.trim() || payload.headline.trim() || "this topic";
  return {
    matchedId: null,
    concept: `Make the specific financial idea in "${topic}" visible through ONE everyday Indian money object, chosen because its real physical structure explains that idea.`,
    figures: [
      // Rotated too: an unmatched topic used to always open with "a gullak, a taraju,
      // a steel thali with katoris", which is exactly how those three became the
      // house style for every brief that fell through to this fallback.
      `A single recognisable Indian money object whose natural structure carries the idea in "${topic}" — for example ${rotate(FALLBACK_PROP_EXAMPLES, rotation).join(", ")}`,
      "Where the idea is a comparison, show the same kind of object at two clearly different scales or two clearly different fill levels rather than two unrelated objects",
      "Where the idea is repetition over time, show one vessel plus an evenly spaced run of identical coins or notes",
    ],
    avoid: [
      "inventing a mechanism, instrument, apparatus or machine to represent the idea",
      "abstract parts described by function rather than by object — no cradles, gates, trays, modules, accumulators, levers or frames",
      "any object a viewer could not name in one second",
    ],
    indexNote,
    rotation,
    visualDirection,
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

const PROP_GROUP_LABELS: Record<keyof typeof INDIAN_FINANCIAL_PROPS, string> = {
  currency: "Currency and coins",
  householdSavings: "Household savings vessels",
  shopAndMeasure: "Shop, ledger and measure",
  kitchenAndServing: "Kitchen and serving",
  documents: "Bank and fund paperwork",
  gold: "Gold and jewellery",
  growth: "Growing and seasonal",
  digital: "Everyday digital money",
  market: "Market landmarks",
  festive: "Festive and seasonal",
};

/**
 * Renders the subject brief for the system prompt.
 *
 * Deliberately NOT a menu. An earlier version handed the model three fixed options
 * per topic and told it to "choose ONE", which made every poster on a topic reach
 * for the same prop — every diversification brief became a steel thali. The list
 * below is now framed as worked examples showing the required level of
 * concreteness, sitting under the full prop vocabulary, with an explicit
 * instruction to invent something specific to this brief. The examples also rotate
 * per brief so they do not always open on the same one.
 */
export function formatTopicFigureGuidance(guidance: TopicFigureGuidance): string {
  const vocabulary = (
    Object.keys(INDIAN_FINANCIAL_PROPS) as Array<keyof typeof INDIAN_FINANCIAL_PROPS>
  ).map((key) => `- ${PROP_GROUP_LABELS[key]}: ${INDIAN_FINANCIAL_PROPS[key]}`);

  return [
    `FINANCIAL IDEA TO MAKE VISIBLE: ${guidance.concept}`,
    ...(guidance.indexNote ? ["", `INDEX FACTS: ${guidance.indexNote}`] : []),
    // Placed above the examples and stated as binding. The designer's own direction
    // was previously only in the brief body, where it lost every argument against a
    // numbered worked example and the figure came back generic anyway.
    ...(guidance.visualDirection
      ? [
          "",
          `DESIGNER'S VISUAL DIRECTION — BINDING. This outranks every worked example and the vocabulary below. Follow it for the subject, and if it names, rules out or describes an object, obey that exactly; only fall back to the examples for whatever it leaves open:\n${guidance.visualDirection}`,
        ]
      : []),
    "",
    "INVENT THE SUBJECT FOR THIS SPECIFIC BRIEF. Choose the object because its real physical structure explains THIS headline — not because it appears in a list. Two posters on the same topic should not use the same object. If an example below already fits perfectly, use it; otherwise reach past the examples into the wider vocabulary, or combine two props into one credible object.",
    "",
    "INDIAN MONEY VOCABULARY — the range available to you, not a checklist:",
    ...vocabulary,
    "",
    // Always sent, not gated on the topic: notes and coins turn up as a secondary
    // element in almost every finance poster even when the hero is something else,
    // and that is exactly where a stray dollar bill slips in unnoticed.
    // Condensed on purpose. The full currency, human and colour specs live in the
    // render prompt, which is where they govern pixels; sending all ~11KB here made
    // the slow high-reasoning concept call heavier without changing what it writes.
    "NON-NEGOTIABLE MATERIAL RULES — the renderer enforces these in full, so do not design against them:",
    CONCEPT_SPEC_BRIEFS,
    "",
    "WORKED EXAMPLES — these show the level of concreteness required. Adapt or replace them; do not copy one verbatim unless it is genuinely the best fit for this headline:",
    ...guidance.figures.map((figure, index) => `${index + 1}. ${figure}`),
    "",
    "WRONG FOR THIS TOPIC:",
    ...guidance.avoid.map((item) => `- ${item}`),
    "",
    "ALSO WRONG FOR THIS AUDIENCE:",
    ...AVOID_GLOBALLY.map((item) => `- ${item}`),
  ].join("\n");
}
