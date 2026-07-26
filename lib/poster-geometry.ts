import type {
  PercentBounds,
  PosterConcept,
  PosterLogoId,
  PosterSafeArea,
} from "./poster-types";

const EPSILON = 0.0001;

export type PosterGeometryKind = "hero" | "text" | "cta" | "logo";

export interface PosterGeometryItem {
  id: string;
  label: string;
  kind: PosterGeometryKind;
  bounds: PercentBounds;
  logoId?: PosterLogoId;
}

export interface PosterGeometryValidation {
  valid: boolean;
  errors: string[];
  items: PosterGeometryItem[];
}

export function isBoundsInsideCanvas(bounds: PercentBounds) {
  return (
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    bounds.x >= 0 &&
    bounds.y >= 0 &&
    bounds.width > 0 &&
    bounds.height > 0 &&
    bounds.x + bounds.width <= 100 + EPSILON &&
    bounds.y + bounds.height <= 100 + EPSILON
  );
}

export function rectanglesIntersect(a: PercentBounds, b: PercentBounds) {
  const overlapWidth =
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapHeight =
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return overlapWidth > EPSILON && overlapHeight > EPSILON;
}

export function boundsContains(container: PercentBounds, child: PercentBounds) {
  return (
    child.x >= container.x - EPSILON &&
    child.y >= container.y - EPSILON &&
    child.x + child.width <= container.x + container.width + EPSILON &&
    child.y + child.height <= container.y + container.height + EPSILON
  );
}

export function clampBoundsToContainer(
  bounds: PercentBounds,
  container: PercentBounds,
): PercentBounds {
  const width = Math.min(Math.max(bounds.width, EPSILON), container.width);
  const height = Math.min(Math.max(bounds.height, EPSILON), container.height);
  return {
    x: Math.min(
      container.x + container.width - width,
      Math.max(container.x, bounds.x),
    ),
    y: Math.min(
      container.y + container.height - height,
      Math.max(container.y, bounds.y),
    ),
    width,
    height,
  };
}

function logoIdForSafeArea(area: PosterSafeArea): PosterLogoId {
  if (area.logo === "CNBC") return "cnbc-tv18";
  if (area.logo === "Bandhan Mutual Fund") return "bandhan-mutual-fund";
  return "mf-corner";
}

function findLayer(
  concept: PosterConcept,
  predicate: (layer: PosterConcept["editablePosterLayoutSpecification"]["layers"][number]) => boolean,
) {
  return concept.editablePosterLayoutSpecification.layers.find(predicate);
}

export function getPosterGeometryItems(concept: PosterConcept): PosterGeometryItem[] {
  const layers = concept.editablePosterLayoutSpecification.layers;
  const hero = findLayer(
    concept,
    (layer) => layer.id === "hero-artwork" || layer.name.toLowerCase().includes("hero"),
  );
  const items: PosterGeometryItem[] = [];

  if (hero) {
    items.push({
      id: hero.id,
      label: hero.name,
      kind: "hero",
      bounds: hero.boundsPercent,
    });
  }

  const textLayers = [
    ["headline", concept.textHierarchy.headline, "headline"],
    ["subheading", concept.textHierarchy.subheading, "subheading"],
    ["body-copy", concept.textHierarchy.bodyCopy, "body"],
    ["cta", concept.textHierarchy.cta, "cta"],
  ] as const;

  for (const [id, treatment, needle] of textLayers) {
    if (!treatment.include || !treatment.content) continue;
    const layer = layers.find(
      (candidate) =>
        candidate.id === id || candidate.name.toLowerCase().includes(needle),
    );
    if (!layer) continue;
    items.push({
      id,
      label: layer.name,
      kind: id === "cta" ? "cta" : "text",
      bounds: layer.boundsPercent,
    });
  }

  for (const layer of layers) {
    if (layer.type !== "logo" || !layer.logo) continue;
    items.push({
      id: layer.id,
      label: layer.name,
      kind: "logo",
      bounds: layer.boundsPercent,
      logoId: layer.logo.id,
    });
  }

  return items;
}

export function validatePosterGeometry(concept: PosterConcept): PosterGeometryValidation {
  const items = getPosterGeometryItems(concept);
  const errors: string[] = [];

  for (const item of items) {
    if (!isBoundsInsideCanvas(item.bounds)) {
      errors.push(`${item.label} leaves the 0–100% canvas.`);
    }
  }

  const logoSafeAreas = new Map(
    concept.logoSafeAreas.map((area) => [logoIdForSafeArea(area), area]),
  );
  for (const item of items.filter((candidate) => candidate.kind === "logo")) {
    const safeArea = item.logoId ? logoSafeAreas.get(item.logoId) : undefined;
    if (!safeArea || !boundsContains(safeArea.boundsPercent, item.bounds)) {
      errors.push(`${item.label} must remain fully inside its measured logo safe area.`);
    }
  }

  for (let index = 0; index < items.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < items.length; otherIndex += 1) {
      const first = items[index];
      const second = items[otherIndex];
      if (rectanglesIntersect(first.bounds, second.bounds)) {
        errors.push(`${first.label} intersects ${second.label}.`);
      }
    }
  }

  const hero = items.find((item) => item.kind === "hero");
  if (hero) {
    for (const area of concept.logoSafeAreas) {
      if (rectanglesIntersect(hero.bounds, area.boundsPercent)) {
        errors.push(`${hero.label} intersects the ${area.logo} logo safe area.`);
      }
    }
  }

  return { valid: errors.length === 0, errors: Array.from(new Set(errors)), items };
}

export function getPosterGeometryErrors(concept: PosterConcept) {
  return validatePosterGeometry(concept).errors;
}
