# Market research and positioning

Research date: 2026-07-28  
Pricing currency: USD unless noted  
Evidence policy: product and price claims use current official vendor pages. Strategic interpretations are labelled `INFERENCE`; unsupported customer-language hypotheses are labelled `ASSUMPTION`.

## Category definition

### Current category

The live product currently competes as an **AI prompt generator**: a user describes an image, website, or video and receives a structured prompt. That is the category named in the metadata, README, hero, and primary empty state. [Sources: [live product](https://multia-prompt-studio.vercel.app/), [`README.md`](README.md), [`app/layout.tsx`](app/layout.tsx), [`components/prompt-studio/output-display.tsx`](components/prompt-studio/output-display.tsx)]

This category is structurally weak for this product. Prompt marketplaces sell tested prompts for roughly $2.99 to $9.99 each, PromptBase Select bundles ten downloads plus generation credits from $14/month, and prompt-management tools start around $12/month. Competing on “better prompts” would pull the product toward low-cost inventory or developer operations rather than the higher-value recurring creative work already present in the repository. [Sources: [PromptBase marketplace](https://promptbase.com/), [PromptBase Select](https://promptbase.com/blog/promptbase-select), [PromptHub pricing](https://www.prompthub.us/pricing)]

### Recommended category

**DECISION: Model-agnostic creative specification workspace.**

A creative specification workspace turns a brief, references, brand rules, and delivery constraints into one inspectable creative contract, then derives coordinated image, website, and video executions from it. The contract remains visible, editable, reusable, and exportable rather than disappearing inside one model run. [Sources supporting existing capability: [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md), [`lib/shared-types.ts`](lib/shared-types.ts), [`lib/poster-generation-prompt.ts`](lib/poster-generation-prompt.ts), [`lib/poster-geometry.ts`](lib/poster-geometry.ts), [`lib/studio-refine.ts`](lib/studio-refine.ts)]

`INFERENCE:` This category occupies the space between prompt operations and creative generation suites. PromptHub versions and deploys prompts but is oriented to LLM workflows; Krea, Magnific, Firefly, Runway, and Framer create strong outputs but keep the working intelligence inside their own execution environment. None of the reviewed public propositions makes a portable, cross-format creative contract the primary artifact. [Sources: [PromptHub](https://www.prompthub.us/), [Krea](https://www.krea.ai/), [Magnific](https://www.magnific.com/), [Adobe Firefly](https://www.adobe.com/products/firefly.html), [Runway](https://runway.com/), [Framer](https://www.framer.com/)]

### What this category is not

- Not a prompt marketplace: it does not sell static recipes. [Contrast: [PromptBase](https://promptbase.com/)]
- Not prompt DevOps: it does not begin with API deployment, traces, or eval pipelines. [Contrast: [PromptHub](https://www.prompthub.us/), [PromptLayer](https://www.promptlayer.com/prompt-management/)]
- Not another all-model generator: it can execute work, but its primary value is preserving the decision system across tools and formats. [Contrast: [Krea](https://www.krea.ai/), [Magnific](https://www.magnific.com/), [Adobe Firefly](https://www.adobe.com/products/firefly.html)]
- Not a replacement for Photoshop, Framer, or Runway: it prepares, governs, and hands off production-ready direction to specialist surfaces. [Contrast: [Adobe Firefly](https://www.adobe.com/products/firefly.html), [Framer](https://www.framer.com/), [Runway](https://runway.com/)]

## Market structure

The market separates into three jobs:

1. **Acquire a prompt:** PromptBase and AIPRM reduce blank-page effort through libraries and templates. [Sources: [PromptBase](https://promptbase.com/), [AIPRM](https://www.aiprm.com/)]
2. **Manage a prompt system:** PromptHub and PromptLayer provide versions, tests, deployment, analytics, and team controls for LLM prompts. [Sources: [PromptHub](https://www.prompthub.us/), [PromptLayer](https://www.promptlayer.com/prompt-management/)]
3. **Make the asset:** Krea, Magnific, Firefly, Runway, and Framer generate or edit the final creative artifact in their own environment. [Sources: [Krea](https://www.krea.ai/), [Magnific](https://www.magnific.com/), [Adobe Firefly](https://www.adobe.com/products/firefly.html), [Runway](https://runway.com/), [Framer](https://www.framer.com/)]

`INFERENCE:` The opening is the handoff between jobs 2 and 3 for non-technical creative teams: preserve why the work should look and behave a certain way, not only the prompt text or the final pixels.

## Competitor set

### 1. PromptBase: direct, prompt marketplace

- **Positioning line:** “Explore the Marketplace. Browse 310k+ quality, tested prompts.” [Source: [PromptBase](https://promptbase.com/)]
- **ICP:** Prompt buyers, prompt sellers, and creators seeking a fast recipe for a named model or output style. This is inferred from marketplace categories, buy/sell flows, prompt stores, and per-item pricing. [Source: [PromptBase marketplace](https://promptbase.com/marketplace)]
- **Pricing:** Most visible prompts are $2.99 to $9.99; Select is $14/month with annual billing or $19/month monthly for ten eligible downloads, plus 1,000 generation credits. [Sources: [PromptBase](https://promptbase.com/), [PromptBase Select](https://promptbase.com/blog/promptbase-select), [Select launch](https://promptbase.com/blog/promptbase-select-creators)]
- **Observed visual language:** High-density thumbnail marketplace, model badges, rankings, prices, search, filters, and creator inventory. The visual product is the prompt’s sample image. [Source: [PromptBase](https://promptbase.com/)]
- **Does well:** Immediate comprehension, enormous choice, visible price, model-specific discovery, and creator economics. [Sources: [PromptBase](https://promptbase.com/), [PromptBase support](https://promptbase.com/support)]
- **Gap left open:** Prompts are treated as purchasable one-off assets. There is no public proposition around ingesting a brand system, maintaining a campaign contract, or coordinating image, web, and video work over time. [Source: [PromptBase](https://promptbase.com/); `INFERENCE` from reviewed offer]

### 2. AIPRM: direct, reusable prompt library

- **Positioning line:** “Your Cheat Code for ChatGPT.” It sells access to a large prompt library plus private/team prompt organization. [Source: [AIPRM](https://www.aiprm.com/)]
- **ICP:** Small-business operators, marketers, and general ChatGPT/Claude users who want repeatable productivity without learning prompting. [Sources: [AIPRM](https://www.aiprm.com/), [AIPRM business plans](https://www.aiprm.com/en-ie/pricing-business/)]
- **Pricing:** Free tier; the official pricing FAQ identifies Plus at $10 and Pro at $33, with annual discounts and larger Elite/Titan/business tiers. [Source: [AIPRM pricing](https://app.aiprm.com/pricing?lang=en)]
- **Observed visual language:** Content-heavy utility marketing with large usage counters, media proof, testimonials, feature lists, and extension screenshots. [Source: [AIPRM](https://www.aiprm.com/)]
- **Does well:** Distribution inside tools people already use, reusable private prompts, community inventory, teams, and low learning cost. [Sources: [AIPRM](https://www.aiprm.com/), [AIPRM pricing](https://app.aiprm.com/pricing?lang=en)]
- **Gap left open:** Its promise is broad productivity and content acceleration, not art direction, visual references, campaign continuity, or coordinated creative outputs. [Source: [AIPRM](https://www.aiprm.com/); `INFERENCE` from reviewed offer]

### 3. PromptHub: direct, prompt management and deployment

- **Positioning line:** “The home for prompt engineering: discover, manage, version, test, and deploy prompts.” [Source: [PromptHub](https://www.prompthub.us/)]
- **ICP:** AI product teams, prompt engineers, and domain experts who need Git-style prompt history, evals, model comparison, branches, and API deployment. [Source: [PromptHub](https://www.prompthub.us/)]
- **Pricing:** Free with public prompts and 2,000 requests/month; Pro $12/month; Team $20/user/month; Enterprise custom. Annual equivalents shown are $9 and $15 respectively. LLM provider costs are separate. [Source: [PromptHub pricing](https://www.prompthub.us/pricing)]
- **Observed visual language:** Purple-accented B2B SaaS, product screenshots, code/API examples, diff views, pipeline diagrams, and customer logos. [Source: [PromptHub](https://www.prompthub.us/)]
- **Does well:** Versioning, testing, guardrails, model comparison, branches, collaboration, and deployment are explicit, tangible product concepts. [Source: [PromptHub](https://www.prompthub.us/)]
- **Gap left open:** The system manages LLM prompts as software assets. It does not publicly frame visual references, art direction, campaign systems, or editable image/web/video deliverables as the core workflow. [Source: [PromptHub](https://www.prompthub.us/); `INFERENCE` from reviewed offer]

### 4. Krea: adjacent, multi-model creative suite

- **Positioning line:** “The world’s most powerful creative AI suite.” It generates, enhances, and edits images, video, and 3D in one subscription. [Source: [Krea](https://www.krea.ai/)]
- **ICP:** Individual creators through agencies and enterprises that want fast access to many models, real-time generation, editing, upscaling, LoRA training, and workflow nodes. [Sources: [Krea](https://www.krea.ai/), [Krea pricing](https://www.krea.ai/pricing)]
- **Pricing:** Free; Basic $9/month; Pro $35; Max $105; Business $200/month with up to 50 seats; Enterprise custom. [Source: [Krea](https://www.krea.ai/)]
- **Observed visual language:** Dark, image-led, gallery-rich, highly visual, with minimal interface chrome, model names, short proof metrics, and large generated examples. [Source: [Krea](https://www.krea.ai/)]
- **Does well:** Immediate visual reward, real-time exploration, broad model access, editing, asset management, model training, and a generous team package. [Sources: [Krea](https://www.krea.ai/), [Krea pricing](https://www.krea.ai/pricing)]
- **Gap left open:** Krea optimizes generation and iteration inside Krea. Its public promise does not make an inspectable, portable brief-to-contract artifact the centre of cross-format production. [Source: [Krea](https://www.krea.ai/); `INFERENCE` from reviewed offer]

### 5. Magnific, formerly Freepik: adjacent, full creative production platform

- **Positioning line:** “The creative platform to direct your best work.” It offers every major media format, intelligent workflows, collaboration, brand knowledge, agents, stock, and multi-model execution. [Source: [Magnific](https://www.magnific.com/)]
- **ICP:** Professional creators, agencies, brand teams, and enterprises scaling on-brand image, video, audio, 3D, and design production. [Sources: [Magnific](https://www.magnific.com/), [Magnific pricing](https://www.magnific.com/pricing)]
- **Pricing:** Premium $14.50/month billed annually; Premium+ $33.75; Pro $210; Business $55/seat/month billed annually with two users; Enterprise custom. [Source: [Magnific pricing](https://www.magnific.com/pricing)]
- **Observed visual language:** High-production media, bold dark/light contrast, large showreel moments, a very broad mega-menu, model marquees, workflow canvases, and enterprise proof. [Source: [Magnific](https://www.magnific.com/)]
- **Does well:** This is the closest strategic competitor: brand books, memory, agents, node workflows, reusable apps, shared spaces, stock, plugins, APIs, and end-to-end execution already support repeatable brand production. [Source: [Magnific](https://www.magnific.com/)]
- **Gap left open:** Its advantage is breadth and integrated execution; that breadth also creates a large suite to adopt. A smaller product can only win by making the pre-production contract clearer, faster, more inspectable, and more portable than a node canvas. [Source: [Magnific](https://www.magnific.com/); `INFERENCE`]

### 6. Adobe Firefly: adjacent, commercially safe creative AI

- **Positioning line:** “Create stunning content faster.” Firefly combines Adobe and partner models for image, video, audio, design, ideation, and editing. [Source: [Adobe Firefly](https://www.adobe.com/products/firefly.html)]
- **ICP:** Individual creators, art directors, marketers, video editors, design teams, Creative Cloud customers, and enterprises that value commercial safety and existing production integrations. [Sources: [Adobe Firefly](https://www.adobe.com/products/firefly.html), [Firefly plans](https://www.adobe.com/products/firefly/plans.html)]
- **Pricing:** Free; Standard $9.99/month; Pro $19.99; Pro Plus $49.99 regular; Premium $199.99; team tiers begin at $19.99 per license. Promotional prices can temporarily be lower. [Source: [Firefly plans](https://www.adobe.com/products/firefly/plans.html)]
- **Observed visual language:** Alternating black and white stages, vivid editorial output carousels, embedded prompt controls, familiar Adobe product framing, and polished workflow demonstrations. [Source: [Adobe Firefly](https://www.adobe.com/products/firefly.html)]
- **Does well:** Commercial-use confidence, Content Credentials, Creative Cloud handoff, partner-model choice, brand ideation boards, and a clear path from generation into professional editing. [Sources: [Adobe Firefly](https://www.adobe.com/products/firefly.html), [Firefly plans](https://www.adobe.com/products/firefly/plans.html)]
- **Gap left open:** Firefly is an Adobe production surface. A model-neutral contract that can direct Adobe, Runway, Framer, or another tool is outside its public centre of gravity. [Source: [Adobe Firefly](https://www.adobe.com/products/firefly.html); `INFERENCE`]

### 7. Runway: adjacent, video-first creative production

- **Positioning line:** Corporate: “Building Real-World Intelligence.” Product: “Your complete Creative Suite with everything you need, to make anything you want.” [Source: [Runway](https://runway.com/)]
- **ICP:** Video creators, studios, agencies, enterprises, developers, and high-volume AI media teams. [Sources: [Runway](https://runway.com/), [Runway pricing](https://runway.com/pricing?tool=runway)]
- **Pricing:** Free with 125 one-time credits; Standard $12/month billed annually; Pro $28; Max $76; Enterprise custom. [Source: [Runway pricing](https://runway.com/pricing?tool=runway)]
- **Observed visual language:** Cinematic black canvas, sparse institutional copy, motion-led campaign work, research authority, and large high-fidelity video moments. [Source: [Runway](https://runway.com/)]
- **Does well:** Video-generation authority, editing, custom workflows, developer APIs, enterprise partnerships, and model/research credibility. [Sources: [Runway](https://runway.com/), [Runway pricing](https://runway.com/pricing?tool=runway)]
- **Gap left open:** The product is strongest from shot generation through video production. It does not publicly solve one governed campaign specification across website, image, and video delivery. [Source: [Runway](https://runway.com/); `INFERENCE`]

### 8. Framer: adjacent, website design and publishing

- **Positioning line:** “The AI website builder for standout sites.” Its agents design, write, code, manage CMS content, and modify a live editable canvas. [Source: [Framer](https://www.framer.com/)]
- **ICP:** Designers, freelancers, small studios, agencies, startups, scale-ups, and enterprises publishing professional marketing sites. [Sources: [Framer](https://www.framer.com/), [Framer pricing](https://www.framer.com/pricing)]
- **Pricing:** Free; Basic $10/month billed yearly; Pro $30; Enterprise custom; full editors $20/month and content editors $10/month. [Source: [Framer pricing](https://www.framer.com/pricing)]
- **Observed visual language:** Monochrome product theatre, live interface choreography, real shipped-site showcases, dense-but-calm canvas UI, and precise microcopy. [Source: [Framer](https://www.framer.com/)]
- **Does well:** Prompt-to-editable-output continuity, responsive design, code, CMS, collaboration, publishing, and proof through real sites. [Source: [Framer](https://www.framer.com/)]
- **Gap left open:** Framer’s artifact is a Framer website. It does not preserve one creative contract across image campaigns and video production. [Source: [Framer](https://www.framer.com/); `INFERENCE`]

## Competitor matrix

Legend: **Core** = central to the public proposition; **Part** = supported but secondary; **No** = not evident in the reviewed public offer. This is a public-positioning comparison, not a claim about every hidden product feature.

| Competitor | Prompt acquisition | Prompt governance | Image execution | Website execution | Video execution | Brand/campaign memory | Portable contract |
|---|---|---|---|---|---|---|---|
| PromptBase | **Core** | No | Part | No | Part | No | No |
| AIPRM | **Core** | Part | No | No | No | Part | Part |
| PromptHub | Part | **Core** | No | No | No | No | Part |
| Krea | Part | Part | **Core** | No | **Core** | Part | No |
| Magnific | Part | **Core** | **Core** | Part | **Core** | **Core** | Part |
| Adobe Firefly | Part | Part | **Core** | No | **Core** | Part | No |
| Runway | Part | Part | Part | No | **Core** | Part | No |
| Framer | Part | Part | Part | **Core** | Part | Part | No |
| Recommended product | Part | **Core** | Part | Part | Part | **Core** | **Core** |

[Sources: official product pages linked in the competitor profiles; final row is the recommended strategy.]

## Positioning map

### Axes

- **Horizontal: tool-bound execution to portable specification.** The left side creates inside a specific suite; the right side lets the core instruction system travel between providers and outputs. This matters because the repository already targets multiple models and three media classes. [Sources: [`lib/shared-types.ts`](lib/shared-types.ts), [Krea](https://www.krea.ai/), [Magnific](https://www.magnific.com/), [PromptHub](https://www.prompthub.us/)]
- **Vertical: one-off output to reusable governed system.** The bottom solves a single generation or purchase; the top preserves versions, brand rules, roles, memory, and repeatable workflows. This matters because the internal product brief explicitly describes weekly campaign production without re-explaining the system. [Sources: [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md), [PromptBase](https://promptbase.com/), [PromptHub](https://www.prompthub.us/), [Magnific](https://www.magnific.com/)]

```text
                 REUSABLE, GOVERNED PRODUCTION SYSTEM
                                  ↑
                                  |
     Framer        Adobe      Magnific          PromptHub
                                  |             (LLM/dev)
       Runway          Krea       |                  ★ Recommended:
                                  |                  portable creative
                                  |                  specification
                                  |                  workspace
                           AIPRM  |
                                  |
     TOOL-BOUND EXECUTION  ←──────┼──────→  PORTABLE SPECIFICATION
                                  |
                                  |
                         PromptBase
                                  |
                                  ↓
                         ONE-OFF OUTPUT
```

`INFERENCE:` PromptHub is closest on governance but misses the creative artifact. Magnific is closest on campaign memory and execution but is a broad suite. The recommended position combines creative-system depth with portability and should avoid trying to match either competitor feature for feature.

## Category conventions

These patterns are common enough that ignoring them would create unnecessary friction:

1. **Start free.** Every reviewed creation suite offers a free plan or free daily/one-time usage. [Sources: [Krea pricing](https://www.krea.ai/pricing), [Firefly plans](https://www.adobe.com/products/firefly/plans.html), [Runway pricing](https://runway.com/pricing?tool=runway), [Framer pricing](https://www.framer.com/pricing), [PromptHub pricing](https://www.prompthub.us/pricing)]
2. **Show the product immediately.** Krea, Firefly, Magnific, PromptHub, and Framer all place real output or interface evidence close to the primary proposition. [Sources: official home pages]
3. **Make model choice legible.** Multi-model suites name supported providers and models, while prompt tools expose model comparison or model-specific inventory. [Sources: [Krea](https://www.krea.ai/), [Magnific](https://www.magnific.com/), [Adobe Firefly](https://www.adobe.com/products/firefly.html), [PromptHub](https://www.prompthub.us/), [PromptBase](https://promptbase.com/)]
4. **Provide editing after generation.** Serious creative tools sell control, refinement, and continuity, not only first-pass generation. [Sources: [Krea](https://www.krea.ai/), [Magnific](https://www.magnific.com/), [Adobe Firefly](https://www.adobe.com/products/firefly.html), [Framer](https://www.framer.com/)]
5. **Use credits or usage units, then translate them into outputs.** Krea, Firefly, Runway, and Magnific explain plan capacity through compute/credits and approximate media output. [Sources: their official pricing pages]
6. **Add workspaces, assets, and history.** Professional tools make generated work persistent and collaborative. [Sources: [Krea pricing](https://www.krea.ai/pricing), [Magnific](https://www.magnific.com/), [Framer](https://www.framer.com/), [PromptHub](https://www.prompthub.us/)]
7. **Earn enterprise trust.** SSO, roles, audit logs, no-training terms, data controls, indemnification, and support are normal premium signals. [Sources: [Krea pricing](https://www.krea.ai/pricing), [Magnific pricing](https://www.magnific.com/pricing), [Firefly plans](https://www.adobe.com/products/firefly/plans.html), [Runway pricing](https://runway.com/pricing?tool=runway)]
8. **Prove outcomes with recognizable work or customers.** Competitors use shipped sites, campaign stories, user counts, customer logos, and named testimonials. [Sources: [Framer](https://www.framer.com/), [Runway](https://runway.com/), [Magnific](https://www.magnific.com/), [PromptHub](https://www.prompthub.us/)]

## Category clichés

`INFERENCE:` These are repeated public patterns that create an opening rather than mandatory conventions:

1. **“Make anything” positioning.** Krea, Magnific, Firefly, and Runway all make breadth claims. Breadth is expected, so another breadth headline would be indistinguishable. [Sources: official home pages]
2. **Model-logo marquees as strategy.** A long list of current models signals access but ages quickly and says little about the quality of the working system. [Sources: [Krea](https://www.krea.ai/), [Magnific](https://www.magnific.com/), [Adobe Firefly](https://www.adobe.com/products/firefly.html)]
3. **Random-output galleries.** Highly varied art proves possibility but not whether one campaign stays coherent across ten assets and three formats. [Sources: [Krea](https://www.krea.ai/), [Adobe Firefly](https://www.adobe.com/products/firefly.html), [PromptBase](https://promptbase.com/)]
4. **Prompt-as-commodity framing.** Marketplaces and giant community libraries compete on count, popularity, and low price rather than proprietary context. [Sources: [PromptBase](https://promptbase.com/), [AIPRM](https://www.aiprm.com/)]
5. **Credit opacity.** The buyer must translate credits into real deliverables, often across models with different costs. Runway and Magnific mitigate this with output tables; simpler tools frequently do not. [Sources: [Runway pricing](https://runway.com/pricing?tool=runway), [Magnific pricing](https://www.magnific.com/pricing)]
6. **Generic AI visual spectacle.** Cinematic reels and colourful image mosaics are now baseline in this market. They should be evidence inside the system, not the identity itself. [Sources: reviewed Krea, Magnific, Firefly, and Runway pages]
7. **Tool-first IA.** Mega-menus organized by Image, Video, Audio, 3D, Edit, Upscale, and Models force the buyer to assemble a workflow mentally. [Sources: [Magnific](https://www.magnific.com/), [Adobe Firefly](https://www.adobe.com/products/firefly.html), [Krea](https://www.krea.ai/)]

## What “premium” means in this market

Premium does not mean a darker page, a larger typeface, or more cinematic AI art. In this category, premium is **controlled continuity under real production constraints**. [Sources: recurring control, team, and trust claims across [Magnific](https://www.magnific.com/), [Adobe Firefly](https://www.adobe.com/products/firefly.html), [Krea pricing](https://www.krea.ai/pricing), and the repository’s [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md)]

### Specific premium signals

1. **Density with hierarchy:** a calm professional workspace can hold brief, references, constraints, outputs, versions, and approvals without becoming a dashboard wall. Framer and PromptHub show that advanced state can remain legible. [Sources: [Framer](https://www.framer.com/), [PromptHub](https://www.prompthub.us/); `INFERENCE`]
2. **Visible controllability:** references have named roles; every constraint can be inspected; changes show what they affect; output can be refined without starting over. [Sources: [Framer](https://www.framer.com/), [Krea](https://www.krea.ai/), current [`lib/studio-refine.ts`](lib/studio-refine.ts)]
3. **Continuity proof:** show one brief producing a coherent image set, launch page direction, and video storyboard, including the contract shared between them. Random unrelated output is insufficient. [Source: current cross-format modes and supplied campaign work; `INFERENCE`]
4. **Restraint around the work:** quiet chrome, neutral surfaces, precise type, and one authored signature device let customer work carry colour. This is visible in Framer’s canvas theatre and Runway’s cinematic framing. [Sources: [Framer](https://www.framer.com/), [Runway](https://runway.com/); `INFERENCE`]
5. **Purposeful motion:** transitions should explain version change, inheritance, and handoff. Spectacle should be reserved for the one signature “contract becoming deliverables” moment. [Sources: product workflows in repository; `INFERENCE`]
6. **Outcome-based price framing:** professional buyers should understand projects, seats, included executions, and provider costs without decoding an abstract credit economy. Current competitors demonstrate both the prevalence and complexity of credits. [Sources: official Krea, Firefly, Runway, and Magnific pricing; `INFERENCE`]
7. **Proof before claims:** use a real before/contract/after case study, measurable revision reduction, and named output exports. The existing MF Corner work is the first candidate once client-use permission is confirmed. [Sources: supplied assets; [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md); `ASSUMPTION:` public case-study permission has not been provided]
8. **Procurement readiness:** no-training policy, data ownership, provider disclosure, roles, audit history, retention controls, and clear security documentation. These are explicit in higher-tier competitor offers. [Sources: [Krea pricing](https://www.krea.ai/pricing), [Magnific pricing](https://www.magnific.com/pricing), [Firefly plans](https://www.adobe.com/products/firefly/plans.html)]

### Price signal

The reviewed ladder runs from roughly $10 to $35/month for serious individual prompt/creative tools, $55 to $200/month or per seat for professional production/team plans, and custom enterprise contracts. [Sources: [PromptHub pricing](https://www.prompthub.us/pricing), [Krea pricing](https://www.krea.ai/pricing), [Magnific pricing](https://www.magnific.com/pricing), [Firefly plans](https://www.adobe.com/products/firefly/plans.html), [Runway pricing](https://runway.com/pricing?tool=runway), [Framer pricing](https://www.framer.com/pricing)]

`INFERENCE:` A premium version of this product should not launch as a bargain prompt subscription. It should price against saved production/revision time and governed campaign reuse, with provider execution shown separately and transparently.

## ICP and personas

### Primary ICP

**Boutique creative teams of 2 to 20 people, plus senior independent designers who deliver recurring multi-format campaigns.**

The repository’s only explicit user definition is “Multia designers and campaign teams producing weekly CNBC x Bandhan Mutual Fund social assets” who need a dependable prompt, layout plan, and editable production asset “without re-explaining the campaign system every week.” That is strong evidence for recurring professional production rather than casual prompting. [Source: [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md)]

The ICP is widened from one internal campaign team to boutique studios and senior independents because the general product already contains image, web, and video modes, while Krea, Magnific, Framer, and Runway explicitly sell to creators, agencies, and professional teams. [Sources: repository modes; official competitor pages; `INFERENCE`]

### Persona 1: Creative production lead at a boutique agency

- **Job to be done:** Turn one approved brief and brand/reference set into a coherent campaign system that designers, motion artists, and web builders can execute without reinterpretation. [Source: [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md)]
- **Trigger event:** A weekly or launch campaign needs many assets, the client expects consistency, and the team is losing time restating the same rules. [Source: [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md)]
- **Objections that kill the deal:** “This is another generator,” client work may train a model, the output is not editable, the team cannot review what changed, or provider costs are unpredictable. [Evidence for market-standard objections: no-training, editability, roles, audit, and cost controls on [Krea](https://www.krea.ai/), [Magnific](https://www.magnific.com/), [Adobe Firefly](https://www.adobe.com/products/firefly.html); `INFERENCE`]
- **Words they already use:** “dependable prompt,” “layout plan,” “editable production asset,” “approved copy,” “visual references,” and “without re-explaining the campaign system every week.” [Source: [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md)]

### Persona 2: Senior independent multi-disciplinary designer

- **Job to be done:** Move from a client brief to image directions, site structure, and motion prompts quickly while keeping enough control to put their name on the work. `ASSUMPTION:` no direct user interview exists in the folder.
- **Trigger event:** A client asks for a campaign system rather than one deliverable, and the designer must switch between several AI and production tools. `ASSUMPTION:`
- **Objections that kill the deal:** Generic-looking outputs, too much setup, another credit subscription, weak export, or a product that removes rather than amplifies their judgment. `ASSUMPTION:` This is directionally supported by competitor emphasis on control, editing, export, and professional plans. [Sources: [Framer](https://www.framer.com/), [Krea](https://www.krea.ai/), [Runway](https://runway.com/)]
- **Words to validate in interviews:** “I need a direction I can build from,” “keep the look consistent,” “show me what changed,” “let me take it into my tools,” and “don’t make me start over.” `ASSUMPTION:`

### Persona 3: In-house brand or growth design lead

- **Job to be done:** Scale campaign production across internal and external makers while preserving brand rules, approvals, and traceability. `ASSUMPTION:` no direct in-house buyer interview exists in the folder.
- **Trigger event:** A rebrand, product launch, localization push, or content-volume increase exposes inconsistent agency/model output. `ASSUMPTION:`
- **Objections that kill the deal:** No SSO or roles, unclear data retention/training, no audit trail, no provider governance, no business case, or no support. These are evidenced as standard enterprise requirements across the market. [Sources: [Krea pricing](https://www.krea.ai/pricing), [Magnific pricing](https://www.magnific.com/pricing), [Runway pricing](https://runway.com/pricing?tool=runway), [Firefly plans](https://www.adobe.com/products/firefly/plans.html)]
- **Words to validate in interviews:** “approved system,” “on-brand at scale,” “one source of truth,” “review before production,” “who changed this,” and “what leaves our workspace.” `ASSUMPTION:`

### Deliberate non-ICP

Casual prompt collectors and novelty-image users are not the primary buyer. PromptBase and AIPRM already serve low-friction prompt acquisition at massive scale and low price; matching them would discard the repository’s strongest production-system equity. [Sources: [PromptBase](https://promptbase.com/), [AIPRM](https://www.aiprm.com/), [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md); `INFERENCE`]

## Open market gap

The product should own this problem:

> Creative teams lose the original decisions between the brief and the tools. The result is prompt drift, inconsistent outputs, and repeated explanation.

The repository directly documents the repeated-explanation problem and already solves part of it for one campaign through a strict production contract, approved references, geometry, and editable layers. [Sources: [`Promptstudio test/PRODUCT.md`](Promptstudio%20test/PRODUCT.md), [`lib/poster-generation-prompt.ts`](lib/poster-generation-prompt.ts), [`lib/poster-reference-system.ts`](lib/poster-reference-system.ts)]

`INFERENCE:` The strongest differentiated promise is therefore not faster ideation. It is **one creative intent, carried intact into every format**.

## Strategic implications for the next phases

1. Name the category before naming the company: “creative specification workspace” is the working category. [Decision based on analysis above]
2. Target boutique creative teams and senior independents first; preserve enterprise-readiness in the architecture without writing enterprise-first marketing. [Sources: internal user definition; competitor ladders; `INFERENCE`]
3. Make the visual contract, not the prompt box, the signature product object. [Sources: repository contract depth; category cliché analysis; `INFERENCE`]
4. Show a coherent image/web/video campaign from one brief as the hero proof. [Sources: existing cross-format modes; category proof conventions; `INFERENCE`]
5. Turn MF Corner into a permission-dependent case study/template proof, not the public product identity. [Sources: supplied campaign assets; `ASSUMPTION:` public permission remains unconfirmed]
6. Keep provider/model choice available but subordinate it to intent, portability, and execution settings. [Sources: current dual-engine confusion; multi-model conventions; `INFERENCE`]
7. Build persistence, projects, brand/reference libraries, versions, and team review before expanding the number of generation modes. [Sources: current absence; category conventions; `INFERENCE`]
8. Frame pricing around professional projects/workspaces with transparent execution usage, not per-prompt inventory. [Sources: market price ladder; `INFERENCE`]

## Research limitations to resolve later

- No analytics export, customer interviews, revenue data, conversion funnel, support transcript, or public case-study permission was present in the folder. Any persona language not sourced to `PRODUCT.md` is marked `ASSUMPTION`.
- Public competitor pages describe their current offer but cannot prove every private or enterprise feature. The matrix compares public positioning only.
- Prices are point-in-time observations from 2026-07-28 and should be refreshed before launch.
- Domain and trademark checks belong to Phase 3 naming and have not been pre-empted here.
