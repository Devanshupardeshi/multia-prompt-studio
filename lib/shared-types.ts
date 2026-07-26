// Shared types and utilities used by BOTH server (gemini.ts, route.ts)
// and client (input-form.tsx, output-display.tsx) code.
// This file must NOT have "use client" or "use server" directives.

export type GenerationMode =
  | "standard" | "face_swap" | "mockup"
  | "3d_website" | "awwwards_website" | "deep_research"
  | "video_standard" | "video_logo_animation" | "video_product_showcase";

const VIDEO_MODES: GenerationMode[] = ["video_standard", "video_logo_animation", "video_product_showcase"];
export const isVideoMode = (m: GenerationMode): boolean => VIDEO_MODES.includes(m);

// The modes whose output is a still image. These are the ones that can be handed
// to GPT Image 2 for rendering, and the only ones offering the GPT-5.6 Sol prompt
// engine. Kept here so the form, the output view and gemini.ts agree — the check
// used to be spelled out (negatively) in three places and drifted.
const IMAGE_MODES: GenerationMode[] = ["standard", "face_swap", "mockup"];
export const isImageMode = (m: GenerationMode): boolean => IMAGE_MODES.includes(m);

// Which model writes the prompt JSON. Both produce the same schema; "chatgpt-5.6-sol"
// runs through the user's own ChatGPT OAuth session instead of the Gemini key pool.
export type PromptEngine = "gemini" | "chatgpt-5.6-sol";

// State of the GPT Image 2 render that follows a GPT-5.6 Sol prompt. Only ever
// leaves "idle" on that path — the Gemini engine just emits the prompt.
export type ImageRenderState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error"; error: string }
  | {
      status: "success";
      /** Object URL for the PNG — same-origin, so it stays canvas-safe. */
      image: string;
      width: number;
      height: number;
      sourceWidth: number;
      sourceHeight: number;
      upscaled: boolean;
      quality: string;
    };

export interface GeneratePayload {
  mode: GenerationMode;
  description: string;
  styles: string[];
  characterName: string;
  useCharacter: boolean;
  referenceImages?: string[];
  sourceFaceImage?: string;
  targetPoseImage?: string;
  logoImage?: string;
  mockupReferenceImage?: string;
  logoDescription?: string;
  mockupCount?: number;
  mockupTypes?: string[];
  targetModel?: "nano-banana-pro" | "gpt-image";
  /**
   * Which ChatGPT model writes the prompt, when the ChatGPT engine is used.
   * Ignored by the Gemini path, which is driven by the admin key pool instead.
   */
  promptModel?: string;
  styleDirectives?: { label: string; directive: string }[];
  // 3D Website mode fields
  brandName?: string;
  tagline?: string;
  websiteType?: string;
  primaryColor?: string;
  accentColor?: string;
  bgColor?: string;
  headingFont?: string;
  bodyFont?: string;
  heroMediaUrl?: string;
  additionalMediaUrls?: string[];
  websiteSections?: string[];
  glassStyle?: string;
  animationIntensity?: number;
  animationNames?: string;
  additionalDetails?: string;
  designMdContent?: string;
  // Awwwards 3D (WebGL) mode fields
  siteCategory?: string;
  signatureMoment?: string;
  webglFeatures?: string[];
  referenceSites?: string;
  assetStrategy?: string;
  model3dUrl?: string;
  // Deep Research mode fields
  businessName?: string;
  industry?: string;
  marketRegion?: string;
  services?: string;
  competitorReferences?: string;
  researchDomains?: string[];
  targetAudience?: string;
  businessGoal?: string;
  brandPositioning?: string;
  toneOfVoice?: string;
  // Video mode fields (shared)
  targetVideoModel?: string;
  shotStructure?: string;
  duration?: string;
  aspectRatio?: string;
  resolution?: string;
  fps?: string;
  cameraMovement?: string;
  cameraSpeed?: string;
  cameraAngle?: string;
  focalLength?: string;
  motionIntensity?: number;
  motionStyle?: string;
  beatStructure?: string;
  timingScript?: string;
  loopable?: boolean;
  environmentDesc?: string;
  subjectMotion?: string;
  lightingType?: string;
  timeOfDay?: string;
  particleEffects?: string[];
  audioSync?: boolean;
  musicMood?: string;
  soundEffects?: string;
  // Video logo-animation
  animationPreset?: string;
  materialStyle?: string;
  revealDirection?: string;
  taglineText?: string;
  preserveLogoIntegrity?: boolean;
  // Video product-showcase
  productImage?: string;
  productDescription?: string;
  showcaseType?: string;
  platformTarget?: string;
  ctaText?: string;
  productMaterial?: string;
  backgroundScene?: string;
}

export interface CustomStyle {
  id: string;
  label: string;
  directive: string;
  thumbnail?: string;
}
