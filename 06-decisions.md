# Decision log

This file records consequential product, brand, and design judgments as the work progresses. Each entry states the chosen direction, evidence, and the rejected alternative.

## 2026-07-28

### D-001: Stop after Phase 2 for the required checkpoint

**Decision:** Complete and save the audit and market research, then pause before naming and identity.

**Evidence:** The brief explicitly requires a pause after Phase 2 so positioning can be corrected before higher-cost work.

**Rejected:** Continuing directly into naming. It would make an expensive identity decision before the category and buyer are reviewed.

### D-002: Target recurring professional creative production

**Decision:** Primary ICP is boutique creative teams of 2 to 20 people and senior independent designers delivering recurring multi-format campaigns.

**Evidence:** [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md) names designers and campaign teams producing weekly assets and needing to avoid re-explaining the campaign system. The shipping app already spans image, website, and video workflows. [Sources: [`lib/shared-types.ts`](lib/shared-types.ts), [`components/prompt-studio/input-form.tsx`](components/prompt-studio/input-form.tsx)]

**Rejected:** Casual prompt hobbyists. PromptBase and AIPRM already serve that market with huge libraries and low prices, while it underuses the repository’s contract and campaign-system depth. [Sources: [PromptBase](https://promptbase.com/), [AIPRM](https://www.aiprm.com/)]

### D-003: Reframe the category

**Decision:** Working category is **model-agnostic creative specification workspace**.

**Evidence:** The repository’s highest-value capability is converting briefs and references into inspectable structured contracts, then carrying constraints into generation, refinement, and exports. [Sources: [`lib/poster-generation-prompt.ts`](lib/poster-generation-prompt.ts), [`lib/poster-geometry.ts`](lib/poster-geometry.ts), [`lib/studio-refine.ts`](lib/studio-refine.ts)]

**Rejected:** “AI prompt generator.” It is a low-price category that understates the product and attracts the wrong comparison set. [Sources: [`01-audit.md`](01-audit.md), [`02-market.md`](02-market.md)]

### D-004: Make the contract the signature product object

**Decision:** The future signature element will be a living visual contract that visibly inherits into image, web, and video outputs.

**Evidence:** The current product already generates structured JSON and preserves category, geometry, reference, and refinement rules, but the interface hides that value in code output. [Sources: [`components/prompt-studio/output-display.tsx`](components/prompt-studio/output-display.tsx), [`lib/poster-generation-prompt.ts`](lib/poster-generation-prompt.ts)]

**Rejected:** A generic cinematic AI-art hero. Competitors already use image mosaics and cinematic reels; that proves generation but not continuity. [Sources: official Krea, Magnific, Firefly, and Runway pages in [`02-market.md`](02-market.md)]

### D-005: Rename completely

**Decision:** Treat the naming brief as a full rename with no requirement to preserve “Multia,” “Prompt Studio,” or “BananaVault.”

**Evidence:** The live product exposes six overlapping names with no consistent hierarchy, and the current mark is a plain text lockup. [Sources: live crawl; [`components/prompt-studio/header.tsx`](components/prompt-studio/header.tsx); [`01-audit.md`](01-audit.md)]

**Rejected:** “Multia 2.0” or another “Prompt”-led name. Both preserve category confusion and weak distinctiveness.

### D-006: Preserve MF Corner as evidence, not architecture

**Decision:** Keep the underlying constrained poster system and use the campaign as a case study or template only if public-use permission is confirmed.

**Evidence:** The supplied 13-poster campaign, reference boards, geometry, and editor demonstrate real production rigor. [Sources: [`Poster Design`](Poster%20Design), [`public/poster-studio/reference-boards`](public/poster-studio/reference-boards), [`tests/poster-studio`](tests/poster-studio)]

**Rejected:** Keeping “Poster Design” as a peer top-level product. It exposes one client’s internal campaign system and fragments the general SaaS proposition.

### D-007: Choose the positioning axes around portability and repeatability

**Decision:** Market map axes are tool-bound execution to portable specification, and one-off output to reusable governed production.

**Evidence:** These axes separate the current prompt marketplaces, prompt-management tools, and creative suites while matching the repository’s multi-model, weekly campaign use case. [Source: [`02-market.md`](02-market.md)]

**Rejected:** Price versus feature count. Both are crowded, unstable, and reward the broad-suite competitors the product should not copy.

### D-008: Establish the provisional visual direction

**Decision:** Use an editorial production-instrument language: quiet, precise chrome around a high-density working surface, with customer work carrying most colour. Current working design dials: `DESIGN_VARIANCE 6`, `MOTION_INTENSITY 4`, `VISUAL_DENSITY 7`.

**Evidence:** The current dark restraint and editorial/technical type tension are worth preserving, while the target buyer needs more visible system state than a sparse marketing utility. [Sources: [`app/globals.css`](app/globals.css), [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md), [`01-audit.md`](01-audit.md)]

**Rejected:** A maximal AI spectacle or generic minimal SaaS shell. The first would compete with generated work; the second would hide the professional system.

### D-009: Keep model choice, but demote it

**Decision:** Model/provider remains an explicit execution setting and compatibility detail, not the primary CTA or identity.

**Evidence:** The current split between shared Gemini generation and ChatGPT-authenticated generation is operationally meaningful but confusing as two peer “Generate” actions. Multi-model competitors show that model access is now a convention rather than a durable brand idea. [Sources: [`components/prompt-studio/input-form.tsx`](components/prompt-studio/input-form.tsx), [`app/api/generate/route.ts`](app/api/generate/route.ts), [`app/api/generate-chatgpt/route.ts`](app/api/generate-chatgpt/route.ts), [`02-market.md`](02-market.md)]

**Rejected:** Building the brand around a specific model or “all models.” Both age with provider changes.

### D-010: Do not spend paid generation during research

**Decision:** Audit product structure, states, references, and live operations without triggering paid image or prompt generation.

**Evidence:** The brief asks for research first; paid calls are not required to verify the information architecture, and the live admin showed no healthy shared keys at crawl time.

**Rejected:** Generating sample assets before positioning. It would spend quota on the current fragmented art direction and could alter feedback/analytics.

### D-011: Treat engineering verification as mixed, not failed

**Decision:** Record the focused product logic as tested while flagging the broader UI foundation as not type/lint clean.

**Evidence:** `npm.cmd test` passed 185/185 and `npm.cmd run build` passed. The build skipped type validation; direct TypeScript failed on missing component-library dependencies and implicit types; lint could not start because ESLint is absent. [Source: local verification, 2026-07-28]

**Rejected:** Calling the whole codebase unstable or calling the green build production-safe. Neither matches the evidence.
