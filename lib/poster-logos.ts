import type {
  PercentBounds,
  PosterBandhanLogoVariant,
  PosterCnbcLogoVariant,
  PosterLayer,
  PosterLogoId,
  PosterSafeArea,
  PosterSize,
} from "./poster-types";

export interface PosterLogoAssetDefinition {
  id: PosterLogoId;
  safeAreaName: PosterSafeArea["logo"];
  brandName: string;
  assetPath: string;
  /** Filename inside `Poster Design/Logos/`, served by /api/poster-logo. Undefined until the brand team supplies that mark — the API route 404s and the editor falls back to the neutral placeholder. */
  sourceFile?: string;
}

interface PosterLogoVariantDefinition {
  brandName: string;
  sourceFile: string;
}

/**
 * Some official marks have more than one valid file — a different channel
 * sub-brand (CNBC TV18 vs CNBC-AWAAZ) or a different text colour meant for a
 * different background tone (Bandhan's white-text mark for dark posters vs
 * its navy-text mark for light ones). Both are real, unmodified brand
 * assets; which one is correct depends on context, so it's a choice, not a
 * single hardcoded file.
 */
export const POSTER_LOGO_VARIANTS: {
  "cnbc-tv18": Record<PosterCnbcLogoVariant, PosterLogoVariantDefinition>;
  "bandhan-mutual-fund": Record<PosterBandhanLogoVariant, PosterLogoVariantDefinition>;
} = {
  "cnbc-tv18": {
    tv18: { brandName: "CNBC TV18", sourceFile: "Group 1.png" },
    awaaz: { brandName: "CNBC-AWAAZ", sourceFile: "Layer_1.png" },
  },
  "bandhan-mutual-fund": {
    "dark-bg": { brandName: "Bandhan Mutual Fund + 25 Years", sourceFile: "Group.png" },
    "light-bg": { brandName: "Bandhan Mutual Fund + 25 Years", sourceFile: "Section.png" },
  },
};

export const DEFAULT_CNBC_LOGO_VARIANT: PosterCnbcLogoVariant = "tv18";
export const DEFAULT_BANDHAN_LOGO_VARIANT: PosterBandhanLogoVariant = "dark-bg";

export interface PosterLogoVariantChoice {
  cnbcLogoVariant?: PosterCnbcLogoVariant;
  bandhanLogoVariant?: PosterBandhanLogoVariant;
}

function resolveLogoAssets(choice: PosterLogoVariantChoice): Record<PosterLogoId, PosterLogoAssetDefinition> {
  const cnbcVariant = choice.cnbcLogoVariant ?? DEFAULT_CNBC_LOGO_VARIANT;
  const bandhanVariant = choice.bandhanLogoVariant ?? DEFAULT_BANDHAN_LOGO_VARIANT;
  const cnbc = POSTER_LOGO_VARIANTS["cnbc-tv18"][cnbcVariant];
  const bandhan = POSTER_LOGO_VARIANTS["bandhan-mutual-fund"][bandhanVariant];

  return {
    "cnbc-tv18": {
      id: "cnbc-tv18",
      safeAreaName: "CNBC",
      brandName: cnbc.brandName,
      assetPath: `/api/poster-logo?id=cnbc-tv18&variant=${cnbcVariant}`,
      sourceFile: cnbc.sourceFile,
    },
    "bandhan-mutual-fund": {
      id: "bandhan-mutual-fund",
      safeAreaName: "Bandhan Mutual Fund",
      brandName: bandhan.brandName,
      assetPath: `/api/poster-logo?id=bandhan-mutual-fund&variant=${bandhanVariant}`,
      sourceFile: bandhan.sourceFile,
    },
    "mf-corner": {
      id: "mf-corner",
      safeAreaName: "MF Corner",
      brandName: "MF Corner",
      assetPath: "/api/poster-logo?id=mf-corner",
    },
  };
}

export function getPosterLogoFile(id: string | undefined, variant: string | undefined): string | null {
  if (id === "mf-corner") return null;
  if (id === "cnbc-tv18") {
    return POSTER_LOGO_VARIANTS["cnbc-tv18"][(variant as PosterCnbcLogoVariant) ?? DEFAULT_CNBC_LOGO_VARIANT]
      ?.sourceFile ?? null;
  }
  if (id === "bandhan-mutual-fund") {
    return (
      POSTER_LOGO_VARIANTS["bandhan-mutual-fund"][
        (variant as PosterBandhanLogoVariant) ?? DEFAULT_BANDHAN_LOGO_VARIANT
      ]?.sourceFile ?? null
    );
  }
  return null;
}

function insetBounds(bounds: PercentBounds, insetX: number, insetY: number): PercentBounds {
  return {
    x: bounds.x + bounds.width * insetX,
    y: bounds.y + bounds.height * insetY,
    width: bounds.width * (1 - insetX * 2),
    height: bounds.height * (1 - insetY * 2),
  };
}

export function createPosterLogoLayers(
  safeAreas: PosterSafeArea[],
  canvas: PosterSize,
  logoVariants: PosterLogoVariantChoice = {},
): PosterLayer[] {
  const assets = resolveLogoAssets(logoVariants);
  return safeAreas.map((area, index) => {
    const definition = Object.values(assets).find(
      (candidate) => candidate.safeAreaName === area.logo,
    );
    if (!definition) {
      throw new Error(`No official-logo asset contract is defined for ${area.logo}.`);
    }

    const bounds = insetBounds(area.boundsPercent, 0.05, 0.1);
    const aspectRatio =
      (bounds.width * canvas.width) / (bounds.height * canvas.height);
    return {
      id: `logo-${definition.id}`,
      name: `${definition.brandName} logo`,
      type: "logo",
      zIndex: 20 + index,
      boundsPercent: bounds,
      editable: true,
      notes:
        `Official asset: ${definition.assetPath}. If absent, preview/export uses a neutral labelled placeholder; never redraw or approximate the mark.`,
      logo: {
        id: definition.id,
        brandName: definition.brandName,
        assetPath: definition.assetPath,
        safeAreaBoundsPercent: { ...area.boundsPercent },
        aspectRatioLocked: true,
        aspectRatio,
        fallback: "neutral-labelled-placeholder",
      },
    };
  });
}
