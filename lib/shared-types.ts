// Shared types and utilities used by BOTH server (gemini.ts, route.ts)
// and client (input-form.tsx, output-display.tsx) code.
// This file must NOT have "use client" or "use server" directives.

export type GenerationMode =
  | "standard" | "face_swap" | "mockup" | "poster_design"
  | "3d_website" | "awwwards_website" | "deep_research"
  | "video_standard" | "video_logo_animation" | "video_product_showcase";

const VIDEO_MODES: GenerationMode[] = ["video_standard", "video_logo_animation", "video_product_showcase"];
export const isVideoMode = (m: GenerationMode): boolean => VIDEO_MODES.includes(m);

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
  // Poster Design mode
  posterTemplate?: string;      // "mf_corner" (Bandhan × CNBC brand kit) | "custom"
  posterType?: string;          // episode_promo | guest_announcement | nfo_alert | concept_explainer | market_update
  headlineText?: string;
  subheadlineText?: string;
  guestDetails?: string;        // guest names + designations, one per line
  logoPlaceholders?: string;    // comma-separated logos to reserve blank space for
  logoMode?: string;            // "attach" (user uploads real logo files with the prompt) | "placeholder" (reserve blank zones)
  posterBackground?: string;    // deep_navy | teal | orange_gradient | pastel
  includeDisclaimer?: boolean;  // AMFI mutual-fund disclaimer strip
}

export interface CustomStyle {
  id: string;
  label: string;
  directive: string;
  thumbnail?: string;
}
