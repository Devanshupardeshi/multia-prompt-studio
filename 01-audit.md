# Multia Prompt Studio: Phase 1 audit

Audit date: 2026-07-28  
Live product: <https://multia-prompt-studio.vercel.app/>  
Repository: `C:\Users\devan\Desktop\MultiaPrompt`

## Executive read

Multia is trying to present a quiet, professional prompt generator. The repository contains something more valuable: a multi-format creative production engine with nine prompt workflows, reference-aware image generation, image refinement, a deeply constrained campaign-poster system, provider routing, and operational controls. The public site reduces that depth to a generic “describe your vision” utility and provides no commercial path, durable workspace, or proof that a buyer can trust. [Sources: [live home](https://multia-prompt-studio.vercel.app/), [`app/page.tsx`](app/page.tsx), [`components/prompt-studio/input-form.tsx`](components/prompt-studio/input-form.tsx), [`components/prompt-studio/output-display.tsx`](components/prompt-studio/output-display.tsx), [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md)]

The product should not compete as another prompt generator. Its defensible core is the inspectable creative contract: a brief and references become a structured specification that can preserve intent across image, website, and video production. That conclusion is grounded in the current JSON schemas, validation and repair paths, poster geometry, reference handling, refinement, and output exports. [Sources: [`lib/shared-types.ts`](lib/shared-types.ts), [`lib/gemini.ts`](lib/gemini.ts), [`lib/openai-poster.ts`](lib/openai-poster.ts), [`lib/poster-generation-prompt.ts`](lib/poster-generation-prompt.ts), [`lib/poster-geometry.ts`](lib/poster-geometry.ts), [`tests/poster-studio/poster-studio.test.ts`](tests/poster-studio/poster-studio.test.ts)]

## Evidence and method

The audit used:

- A same-domain crawl of `/`, `/poster-design`, `/admin`, `/admin/login`, and the default 404 state at 1440 px and 390 px. The app exposes no other linked customer-facing pages. [Source: live crawl, 2026-07-28]
- The tracked repository plus the untracked `Promptstudio test` prototype and its product/audit documents. Secret-bearing `.env.local` files were intentionally inventoried but not read. [Sources: local file inventory; [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md); [`Promptstudio test/SPEC.md`](Promptstudio%20test/SPEC.md)]
- The existing Graphify snapshot as a navigation aid, followed by direct source verification because the snapshot predates some current changes. [Sources: [`graphify-out/GRAPH_REPORT.md`](graphify-out/GRAPH_REPORT.md), [`graphify-out/graph.json`](graphify-out/graph.json)]
- Visual inspection of the supplied campaign boards and the original image folders. [Sources: [`public/poster-studio/reference-boards`](public/poster-studio/reference-boards), [`Poster Design`](Poster%20Design), [`Promptstudio test/POSTER_CATEGORY_DESIGN_SYSTEM.md`](Promptstudio%20test/POSTER_CATEGORY_DESIGN_SYSTEM.md)]
- Local verification: `npm.cmd test`, `npm.cmd run build`, `npx.cmd tsc --noEmit`, and `npm.cmd run lint` on 2026-07-28. [Source: local command output]

## Repository inventory

| Area | Inventory | What it means |
|---|---:|---|
| Git-tracked files | 216 | The shipping product is compact enough to refactor without a rewrite. [Source: `git ls-files`, 2026-07-28] |
| `app/` files | 33 | Two customer-facing studio pages, two admin pages, a 404, and 23 API endpoints/routes. [Sources: local file inventory; successful Next production build] |
| `components/` files | 68 | The real product components coexist with a broad, mostly unused shadcn-style component dump. [Sources: [`components/prompt-studio`](components/prompt-studio), [`components/ui`](components/ui)] |
| `lib/` files | 36 | Prompt contracts, provider routing, poster geometry, refinement, image handling, feedback, and admin services are already separated. [Source: [`lib`](lib)] |
| Test files | 9 | 185 focused tests cover model discovery, streaming, reference propagation, poster contracts, geometry, refinement, feedback, and image handling. [Sources: [`tests`](tests); `npm.cmd test`, 2026-07-28] |
| Tracked visual assets | 56 | Most are CNBC x Bandhan Mutual Fund campaign evidence, not a reusable Multia identity. [Sources: [`Poster Design`](Poster%20Design), [`public/poster-studio`](public/poster-studio)] |
| Additional prototype | `Promptstudio test/` | A duplicate/experimental subtree with valuable intent documents and an older audit. It should not remain a parallel product source of truth. [Sources: [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md), [`Promptstudio test/SPEC.md`](Promptstudio%20test/SPEC.md)] |

### Shipping route inventory

Customer-visible:

```text
/
└── Prompt Studio
    ├── Image: Standard, Face Swap, Mockup
    ├── Website: 3D Website, Awwwards 3D, Deep Research
    ├── Video: Standard, Logo Animation, Product Showcase
    └── Poster Design link

/poster-design
└── MF Corner campaign poster workflow

/admin/login
/admin
/_not-found
```

[Sources: [live home](https://multia-prompt-studio.vercel.app/), [live poster studio](https://multia-prompt-studio.vercel.app/poster-design), successful Next production build, [`lib/shared-types.ts`](lib/shared-types.ts)]

Operational APIs cover prompt generation, ChatGPT model discovery, enhancement, style extraction, image generation, poster concept and artwork generation, image refinement, feedback, poster references/logos, provider settings, key-pool management, analytics events, and admin authentication. [Source: [`app/api`](app/api)]

## Page-by-page audit

### `/`: Prompt Studio

**Current message.** “Describe your vision. Get a precise prompt.” The supporting copy says the product produces a structured JSON prompt for “any image generation model,” even though the same screen also contains website, research, and video workflows. [Sources: [live home](https://multia-prompt-studio.vercel.app/), [`components/prompt-studio/hero.tsx`](components/prompt-studio/hero.tsx)]

**Current interaction.** The page begins directly in a large form. Users choose one of nine modes, fill mode-specific controls, then choose between a shared Gemini-backed “Generate Prompt” path and, for image modes, a user-authenticated “Generate with GPT-5.6 Sol” path. Still-image modes can continue into GPT Image rendering and refinement; website/video modes primarily return structured text artifacts. [Sources: [`components/prompt-studio/input-form.tsx`](components/prompt-studio/input-form.tsx), [`app/page.tsx`](app/page.tsx), [`app/api/generate/route.ts`](app/api/generate/route.ts), [`app/api/generate-chatgpt/route.ts`](app/api/generate-chatgpt/route.ts), [`components/prompt-studio/output-display.tsx`](components/prompt-studio/output-display.tsx)]

**CTA structure.** The only conversion actions are generation actions inside the product. There is no marketing CTA, account creation, saved workspace, pricing, plan upgrade, demo, customer story, or email capture. The header includes “Disconnect ChatGPT,” a broken-looking “Today --” counter, a Poster link, and an external agency link. [Sources: [live home](https://multia-prompt-studio.vercel.app/), [`components/prompt-studio/header.tsx`](components/prompt-studio/header.tsx)]

**Proof and pricing.** No customer logos, testimonials, case studies, usage proof, security statement, public pricing, or trial framing appears. [Source: [live home](https://multia-prompt-studio.vercel.app/)]

**Empty/output state.** The initial output says only “Your generated JSON prompt will appear here.” That frames the value as text production rather than a reusable creative system or finished artifact. [Sources: [live home](https://multia-prompt-studio.vercel.app/), [`components/prompt-studio/output-display.tsx`](components/prompt-studio/output-display.tsx)]

**Mobile.** At the 390 px capture size, the mode strip and header controls extend beyond the visible canvas. Browser instrumentation measured the document wider than the viewport on the home page, and the capture shows clipped navigation and video-mode controls. [Sources: [`assets/audit/live-home-top-390.png`](assets/audit/live-home-top-390.png), live browser measurements, 2026-07-28]

### `/poster-design`: MF Corner campaign system

**Current message.** “Design the poster. Keep the campaign.” The product explicitly promises a strict JSON production prompt matched to approved CNBC x Bandhan Mutual Fund layouts, followed by editable poster-ready artwork. [Sources: [live poster studio](https://multia-prompt-studio.vercel.app/poster-design), [`app/poster-design/page.tsx`](app/poster-design/page.tsx)]

**Current interaction.** The workflow collects campaign copy, a finance topic, one of six model/reference categories, an approved or uploaded reference, art direction, palette, and output size. It can request clarification, generate a validated concept, stream reasoning/status, render artwork, compare up to four rolls, refine a marked region, edit type/logo layers, validate collisions, and export artwork, contract, specification, or a composed poster. [Sources: [`components/prompt-studio/poster-studio-form.tsx`](components/prompt-studio/poster-studio-form.tsx), [`app/poster-design/page.tsx`](app/poster-design/page.tsx), [`components/prompt-studio/poster-studio-output.tsx`](components/prompt-studio/poster-studio-output.tsx), [`lib/poster-geometry.ts`](lib/poster-geometry.ts)]

**Proof.** The page cites 13 approved posters, eight design-system assets, 18 illustration references, and Ubuntu typography. Those assets exist and show a coherent real campaign, but they prove a private client workflow rather than a general public SaaS. [Sources: [live poster studio](https://multia-prompt-studio.vercel.app/poster-design), [`Poster Design/Recent Made posters`](Poster%20Design/Recent%20Made%20posters), [`public/poster-studio/reference-boards/recent-made-posters.jpg`](public/poster-studio/reference-boards/recent-made-posters.jpg)]

**Category conflict.** A narrowly branded client production system sits beside a general prompt utility as if both were peer products. That exposes internal implementation history instead of explaining a scalable template or campaign-system capability. [Sources: [live home](https://multia-prompt-studio.vercel.app/), [live poster studio](https://multia-prompt-studio.vercel.app/poster-design), [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md)]

**Mobile.** The page becomes a long single column, but the shared header remains cramped and visibly clipped at the right edge in the 390 px capture. [Source: [`assets/audit/live-poster-top-390.png`](assets/audit/live-poster-top-390.png)]

### `/admin` and `/admin/login`

The login page is a minimal password gate. The authenticated console manages provider settings, key states, feedback, errors, event analytics, maintenance mode, and setup instructions. [Sources: live `/admin/login` and `/admin`, [`app/admin`](app/admin), [`app/admin/_components/dashboard.tsx`](app/admin/_components/dashboard.tsx)]

At crawl time, the dashboard showed 12 total shared keys, zero active, zero cooling, and 12 invalid. This does not prove every authenticated ChatGPT generation path is unavailable, but it does indicate that the default shared-provider path has no healthy key capacity at that moment. No paid generation was triggered during the audit. [Source: live `/admin`, 2026-07-28]

### 404

Unknown routes fall through to the raw Next.js “This page could not be found” screen. There is no brand recovery, navigation, search, or path back into the product. [Source: live unknown route, 2026-07-28]

## Product truth

The current product can already do more than its hero claims:

1. Produce structured image prompts for standard creation, face swaps, and logo mockups, with reference images and target-model controls. [Sources: [`lib/shared-types.ts`](lib/shared-types.ts), [`components/prompt-studio/input-form.tsx`](components/prompt-studio/input-form.tsx)]
2. Produce structured website specifications for 3D sites and higher-expression Awwwards-style experiences, including brand, media, section, motion, and technical guidance. [Sources: [`components/prompt-studio/input-form.tsx`](components/prompt-studio/input-form.tsx), [`components/prompt-studio/output-display.tsx`](components/prompt-studio/output-display.tsx)]
3. Produce research-led website strategy artifacts through a parallelized deep-research path. [Sources: [`app/api/generate/route.ts`](app/api/generate/route.ts), [`lib/gemini.ts`](lib/gemini.ts)]
4. Produce structured video prompts for general clips, logo animation, and product showcase work. [Sources: [`lib/shared-types.ts`](lib/shared-types.ts), [`lib/style-presets.ts`](lib/style-presets.ts)]
5. Render and refine images using a signed-in ChatGPT session, while preserving mode-specific invariants. [Sources: [`app/api/generate-image/route.ts`](app/api/generate-image/route.ts), [`app/api/refine-image/route.ts`](app/api/refine-image/route.ts), [`lib/studio-refine.ts`](lib/studio-refine.ts)]
6. Turn a campaign brief and references into a validated poster contract, generated artwork, editable overlay system, and multiple exports. [Sources: [`app/poster-design/page.tsx`](app/poster-design/page.tsx), [`lib/poster-generation-prompt.ts`](lib/poster-generation-prompt.ts), [`components/prompt-studio/poster-studio-output.tsx`](components/prompt-studio/poster-studio-output.tsx)]

The through-line is not “better prompts.” It is converting an underspecified creative brief into an inspectable production contract, then carrying the important constraints into execution. [Sources: [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md), [`lib/poster-generation-prompt.ts`](lib/poster-generation-prompt.ts), [`tests`](tests)]

## Current brand inventory

| Element | Current state | Audit |
|---|---|---|
| Names | “Multia.in,” “Multia Prompt Studio,” “BananaVault Engine,” “Prompt Studio,” “Poster Design,” and “MF Corner campaign system” all appear in the live experience. [Sources: live `/` and `/poster-design`; [`README.md`](README.md)] | The naming system reads as agency, internal engine, generic feature, and client tool at once. |
| Logo | A typographic “Multia.in” wordmark with no distinctive authored mark. [Source: [`components/prompt-studio/header.tsx`](components/prompt-studio/header.tsx)] | There is little visual equity to constrain a rename. |
| Colour | Near-black `#121212`, white, and grey dominate; the poster editor introduces client-specific Prussian blue, vermillion, and gold. [Sources: [`app/globals.css`](app/globals.css), [`app/poster-design.css`](app/poster-design.css), [`Promptstudio test/POSTER_CATEGORY_DESIGN_SYSTEM.md`](Promptstudio%20test/POSTER_CATEGORY_DESIGN_SYSTEM.md)] | The restraint is useful; the current values are implementation colours, not a complete identity. |
| Typography | Freight Display Pro for major display copy, Wix Madefor Display for interface/body, JetBrains Mono for technical output, and Ubuntu inside the poster workflow. Fonts are loaded from Typekit, Google, and `next/font`. [Sources: [`app/layout.tsx`](app/layout.tsx), [`app/globals.css`](app/globals.css), [`app/poster-design.css`](app/poster-design.css)] | The editorial serif plus technical mono creates useful tension, but external loading and four unrelated families weaken coherence and reliability. |
| Tone | Short, declarative, production-oriented labels coexist with generic AI language, internal engine naming, emojis, underscore-style mode names, and deeply technical JSON. [Sources: live `/`; [`components/prompt-studio`](components/prompt-studio)] | The best voice is the precise production language inside the poster system. |
| Motion | Timed hero entrance, fades, skeletons, hover shifts, scroll-linked header state, reasoning pulses, and smooth `scrollIntoView`. [Sources: [`components/prompt-studio/hero.tsx`](components/prompt-studio/hero.tsx), [`components/prompt-studio/header.tsx`](components/prompt-studio/header.tsx), [`app/globals.css`](app/globals.css), [`app/poster-design.css`](app/poster-design.css)] | Motion is inconsistent and partly ungoverned; reduced-motion coverage is not global. |
| Imagery | The general studio has no signature product visual. The poster page relies on real client boards and many unrelated third-party style references. [Sources: live `/`; [`public/poster-studio/reference-boards`](public/poster-studio/reference-boards)] | Strong evidence exists, but no ownable product art direction does. |

## What the site is trying to say vs. what it communicates

| Intended message | What a new visitor actually receives |
|---|---|
| “A precise professional system.” [Source: [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md)] | “A polished but generic dark prompt form.” [Source: live `/`] |
| “One contract can guide production.” [Sources: [`lib/poster-generation-prompt.ts`](lib/poster-generation-prompt.ts), [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md)] | “The output is a block of JSON.” [Source: live empty state and [`components/prompt-studio/output-display.tsx`](components/prompt-studio/output-display.tsx)] |
| “Works across image, web, and video.” [Sources: [`README.md`](README.md), [`lib/shared-types.ts`](lib/shared-types.ts)] | “A prompt generator for image models.” [Source: live hero copy] |
| “Built for recurring creative production.” [Source: [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md)] | “A one-off utility with no projects, assets, team, history, or saved system visible.” [Sources: live `/`; [`app/page.tsx`](app/page.tsx)] |
| “Trusted enough for campaign work.” [Sources: supplied poster assets and tests] | “No customer, security, reliability, or outcome proof.” [Source: live `/`] |

## The 10 highest-impact problems, ranked by revenue impact

| Rank | Problem | Revenue mechanism | Evidence |
|---:|---|---|---|
| 1 | There is no commercial journey: no sign-up product account, projects, pricing, trial frame, upgrade, demo, or checkout. | Visitors cannot become measurable activated users or customers, and generated work has no durable home. | Live `/`; [`app/page.tsx`](app/page.tsx); successful route inventory |
| 2 | The default shared-provider path had zero healthy keys at audit time. | A first-run failure destroys trust before value is demonstrated; recovery depends on a separate ChatGPT connection path the page does not frame as a plan choice. | Live `/admin`, 2026-07-28; [`app/api/generate/route.ts`](app/api/generate/route.ts); [`components/prompt-studio/input-form.tsx`](components/prompt-studio/input-form.tsx) |
| 3 | The category and ICP are undefined. | “Prompt generator” attracts price-sensitive prompt hobbyists while the repository’s deepest value serves recurring professional production. Messaging and product scope therefore pull toward different buyers. | Live hero; [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md); [`components/prompt-studio/input-form.tsx`](components/prompt-studio/input-form.tsx) |
| 4 | The hero understates and misstates the product. | Website and video buyers have no reason to continue, while image buyers expect a simpler tool than the form they receive. | Live hero; [`lib/shared-types.ts`](lib/shared-types.ts) |
| 5 | There is no public proof or trust layer. | Professional buyers cannot evaluate output quality, consistency, security, uptime, or business value; the real MF Corner work is not presented as a case study. | Live `/`; [`Poster Design/Recent Made posters`](Poster%20Design/Recent%20Made%20posters) |
| 6 | Web and video workflows primarily stop at a structured prompt rather than a managed production artifact. | The user must move the valuable context manually into another tool, breaking continuity and reducing willingness to pay for an ongoing workspace. | [`components/prompt-studio/output-display.tsx`](components/prompt-studio/output-display.tsx); [`app/page.tsx`](app/page.tsx) |
| 7 | One giant mode-switching form carries the whole IA. | Users must understand product architecture before seeing value; discovery, onboarding, reuse, and cross-sell all collapse into one crowded screen. | [`components/prompt-studio/input-form.tsx`](components/prompt-studio/input-form.tsx); live `/` |
| 8 | Brand architecture is fragmented and exposes internal/client labels. | The experience cannot build recall, word of mouth, or premium trust when the agency, engine, generic tool, and a client campaign all appear as peers. | Live `/` and `/poster-design`; [`README.md`](README.md) |
| 9 | Mobile and accessibility quality fall below a professional floor. | Clipped navigation and controls block creation on smaller screens; inconsistent focus, modal semantics, alt text, touch sizing, and reduced-motion coverage increase abandonment and procurement risk. | Mobile captures; [`components/prompt-studio/header.tsx`](components/prompt-studio/header.tsx); [`components/prompt-studio/feedback-prompt.tsx`](components/prompt-studio/feedback-prompt.tsx); [`app/globals.css`](app/globals.css); [`app/poster-design.css`](app/poster-design.css) |
| 10 | Build quality signals are contradictory. | The focused logic is well tested, but skipped type validation and a non-runnable lint script make broad UI expansion riskier and reduce confidence in a scalable component system. | `npm.cmd test` passed 185/185; `npm.cmd run build` passed while reporting “Skipping validation of types”; `npx.cmd tsc --noEmit` failed on missing UI dependencies/types; `npm.cmd run lint` failed because ESLint is absent, all on 2026-07-28 |

## Equity worth preserving

1. **The inspectable contract.** Structured, validated outputs with repair logic are more defensible than free-form prompt rewriting. [Sources: [`lib/gemini.ts`](lib/gemini.ts), [`lib/openai-prompt.ts`](lib/openai-prompt.ts), [`lib/openai-poster.ts`](lib/openai-poster.ts)]
2. **Reference-aware direction.** Image roles, style extraction, approved references, and campaign constraints already preserve more context than a plain text box. [Sources: [`app/api/extract-style/route.ts`](app/api/extract-style/route.ts), [`lib/openai-prompt.ts`](lib/openai-prompt.ts), [`lib/poster-reference-system.ts`](lib/poster-reference-system.ts)]
3. **Mode-specific expertise.** Face swap, mockup, website, research, and video modes encode real task knowledge rather than one universal prompt wrapper. [Sources: [`components/prompt-studio/input-form.tsx`](components/prompt-studio/input-form.tsx), [`lib/style-presets.ts`](lib/style-presets.ts)]
4. **Refinement with invariants.** Region-aware edits and mode-specific locks point toward a professional review loop. [Sources: [`app/api/refine-image/route.ts`](app/api/refine-image/route.ts), [`lib/studio-refine.ts`](lib/studio-refine.ts), [`tests/studio-refine.test.ts`](tests/studio-refine.test.ts)]
5. **Poster-system rigor.** Measured geometry, collision gates, category isolation, prompt budgeting, and preview/export logic prove the team can turn a brief into a governed artifact. [Sources: [`lib/poster-geometry.ts`](lib/poster-geometry.ts), [`lib/poster-image-prompt.ts`](lib/poster-image-prompt.ts), [`tests/poster-studio`](tests/poster-studio)]
6. **Quiet professional posture.** The near-black canvas, editorial display type, technical mono, and restrained chrome are a better starting point than a colourful generic AI dashboard. [Sources: live `/`; [`app/globals.css`](app/globals.css)]
7. **Operational recovery.** Provider health, cooling, maintenance mode, feedback, and error logging already anticipate real service operations. [Sources: [`app/admin`](app/admin), [`lib/api-keys.ts`](lib/api-keys.ts), [`lib/feedback.ts`](lib/feedback.ts)]

## What to kill or relocate

1. Retire “Multia Prompt Studio,” “Multia.in,” and “BananaVault Engine” from the customer brand after the rename. They do not form a coherent premium identity. [Sources: live `/`; [`README.md`](README.md)]
2. Move MF Corner out of primary navigation. Reframe it as a customer proof story and a reusable campaign-template example; keep the specialist workflow behind the product. [Sources: live `/poster-design`; supplied campaign assets]
3. Stop presenting raw JSON as the main outcome. Keep it as an inspectable/exportable layer beneath a visual brief, deliverable set, and execution history. [Source: [`components/prompt-studio/output-display.tsx`](components/prompt-studio/output-display.tsx)]
4. Replace the giant mode strip with project intent, templates, and progressive task flows. [Source: [`components/prompt-studio/input-form.tsx`](components/prompt-studio/input-form.tsx)]
5. Remove the competing engine CTAs from the primary decision point. Provider and model choice should be an explicit execution setting, not two versions of “Generate.” [Sources: live `/`; [`components/prompt-studio/input-form.tsx`](components/prompt-studio/input-form.tsx)]
6. Remove the “Today --” counter and external agency CTA from the product header unless they earn a clear user job. [Source: [`components/prompt-studio/header.tsx`](components/prompt-studio/header.tsx)]
7. Replace generic style names and emoji/hand-authored icon fragments with a smaller, authored visual vocabulary and a consistent icon set. [Sources: [`lib/style-presets.ts`](lib/style-presets.ts), [`components/prompt-studio`](components/prompt-studio)]
8. Remove the broad unused UI-component dump or install, type, document, and test the components that will form the real library. [Sources: [`components/ui`](components/ui); direct typecheck]
9. Replace global generic metadata and the framework 404 with product-specific states. [Sources: [`app/layout.tsx`](app/layout.tsx); live unknown route]
10. Consolidate all styling into the future token system. The current CSS contains many hard-coded colours, pixel values, radii, and ungoverned transitions. [Sources: [`app/globals.css`](app/globals.css), [`app/poster-design.css`](app/poster-design.css)]

## Audit conclusion

This is not a weak product that needs decorative polish. It is a capable internal production engine with a weak public category, acquisition layer, information architecture, and identity. The redesign should expose the contract-and-continuity value already present, build the commercial and workspace layers that are absent, and use the MF Corner system as evidence of repeatable campaign control rather than as the brand itself. [Sources: all evidence above]

## Captures

- [`assets/audit/live-home-top-1440.png`](assets/audit/live-home-top-1440.png)
- [`assets/audit/live-home-top-390.png`](assets/audit/live-home-top-390.png)
- [`assets/audit/live-poster-top-1440.png`](assets/audit/live-poster-top-1440.png)
- [`assets/audit/live-poster-top-390.png`](assets/audit/live-poster-top-390.png)
