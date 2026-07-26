"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  evaluatePosterTextFit,
  fitPosterTextTreatment,
  getPosterDownloadDescriptor,
  getPosterPreviewTextStyle,
  getPosterTextRenderMetrics,
  getTextMinimumFontSize,
  loadUbuntuPosterFonts,
  POSTER_CTA_DECORATION,
  scaleAspectLockedLogoBounds,
  type PosterEditableTextRole,
} from "@/lib/poster-editor-core";
import { POSTER_LOGO_VARIANT_OPTIONS } from "@/lib/poster-logos";
import {
  clampBoundsToContainer,
  validatePosterGeometry,
} from "@/lib/poster-geometry";
import type {
  PercentBounds,
  PosterConcept,
  PosterLayer,
  PosterStudioPayload,
  PosterTextTreatment,
} from "@/lib/poster-types";

export type PosterImageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error"; error: string }
  | {
      status: "success";
      image: string;
      width: number;
      height: number;
      sourceWidth: number;
      sourceHeight: number;
      upscaled: boolean;
      quality: "high";
      promptLengthBefore: number;
      compactContractLength: number;
      promptLengthAfter: number;
    };

type SuccessfulPosterImage = Extract<PosterImageState, { status: "success" }>;
type PosterPreviewMode = "poster" | "artwork" | "layout";
type EditableTextRole = PosterEditableTextRole;

interface EditableTextLayer {
  role: EditableTextRole;
  label: string;
  variant: EditableTextRole;
  treatment: PosterTextTreatment;
  bounds: PercentBounds;
}

type EditableTextLayers = Record<EditableTextRole, EditableTextLayer>;
type EditableLogoLayer = PosterLayer & {
  type: "logo";
  logo: NonNullable<PosterLayer["logo"]>;
};

interface EditableTextLayerPatch {
  treatment?: Partial<PosterTextTreatment>;
  bounds?: Partial<PercentBounds>;
}

const TEXT_LAYER_CONFIG: Array<{
  role: EditableTextRole;
  label: string;
  needle: string;
  treatmentKey: "headline" | "subheading" | "bodyCopy" | "cta";
}> = [
  { role: "headline", label: "Headline", needle: "headline", treatmentKey: "headline" },
  { role: "subheading", label: "Subheading", needle: "subheading", treatmentKey: "subheading" },
  { role: "body", label: "Body copy", needle: "body", treatmentKey: "bodyCopy" },
  { role: "cta", label: "CTA", needle: "cta", treatmentKey: "cta" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fitDefaultTextLayers(
  layers: EditableTextLayers,
  canvasWidth: number,
  canvasHeight: number,
) {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return layers;

  return Object.fromEntries(
    TEXT_LAYER_CONFIG.map(({ role }) => {
      const layer = layers[role];
      const { treatment, bounds, variant } = layer;
      if (!treatment.include || !treatment.content) return [role, layer];
      const fit = fitPosterTextTreatment(
        {
          role: variant,
          treatment,
          bounds,
          canvas: { width: canvasWidth, height: canvasHeight },
        },
        (line, candidate) => {
          context.font = `${candidate.ubuntuWeight} ${candidate.fontSizePx}px "Ubuntu"`;
          return context.measureText(line).width;
        },
      );
      return [
        role,
        fit.treatment.fontSizePx !== treatment.fontSizePx
          ? { ...layer, treatment: fit.treatment }
          : layer,
      ];
    }),
  ) as EditableTextLayers;
}

function createEditableTextLayers(concept: PosterConcept): EditableTextLayers {
  const layers = concept.editablePosterLayoutSpecification.layers;
  const editableLayers = Object.fromEntries(
    TEXT_LAYER_CONFIG.map((config) => {
      const treatment = concept.textHierarchy[config.treatmentKey];
      const layer = findLayer(layers, config.needle);
      return [
        config.role,
        {
          role: config.role,
          label: config.label,
          variant: config.role,
          treatment: { ...treatment, lineBreaks: [...treatment.lineBreaks] },
          bounds: { ...(layer?.boundsPercent ?? { x: 5, y: 5, width: 90, height: 10 }) },
        },
      ];
    }),
  ) as unknown as EditableTextLayers;
  return editableLayers;
}

function createEditableLogoLayers(concept: PosterConcept): EditableLogoLayer[] {
  return concept.editablePosterLayoutSpecification.layers
    .filter(
      (layer): layer is EditableLogoLayer =>
        layer.type === "logo" && Boolean(layer.logo),
    )
    .map((layer) => ({
      ...layer,
      boundsPercent: { ...layer.boundsPercent },
      logo: {
        ...layer.logo,
        safeAreaBoundsPercent: { ...layer.logo.safeAreaBoundsPercent },
      },
    }));
}

interface PosterStudioOutputProps {
  concept: PosterConcept | null;
  promptJson: string | null;
  payload: PosterStudioPayload | null;
  isLoading: boolean;
  error: string | null;
  imageState: PosterImageState;
  onRegenerate: () => void;
  onRetryImage: () => void;
}

function downloadText(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function downloadPoster(image: string, width: number, height: number) {
  const anchor = document.createElement("a");
  anchor.href = image;
  anchor.download = `mf-corner-poster-${width}x${height}-${Date.now()}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function loadPosterImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The poster artwork could not be loaded for export."));
    image.src = source;
  });
}

function drawFinalTextLayer(
  context: CanvasRenderingContext2D,
  layer: EditableTextLayer,
  canvasWidth: number,
  canvasHeight: number,
  colour: string,
) {
  const { treatment, bounds, variant } = layer;
  if (!treatment.content || !treatment.include) return;
  const metrics = getPosterTextRenderMetrics({
    role: variant,
    treatment,
    bounds,
    canvas: { width: canvasWidth, height: canvasHeight },
  });
  if (!metrics.lines.length) return;

  context.save();
  if (variant === "cta") {
    const borderWidth = Math.max(
      1,
      canvasWidth * POSTER_CTA_DECORATION.borderWidthCanvasRatio,
    );
    const radius = metrics.height * POSTER_CTA_DECORATION.radiusHeightRatio;
    context.beginPath();
    context.roundRect(
      metrics.left + borderWidth / 2,
      metrics.top + borderWidth / 2,
      metrics.width - borderWidth,
      metrics.height - borderWidth,
      radius,
    );
    context.fillStyle = POSTER_CTA_DECORATION.background;
    context.fill();
    context.strokeStyle = POSTER_CTA_DECORATION.borderColour;
    context.lineWidth = borderWidth;
    context.stroke();
  }
  context.beginPath();
  context.rect(metrics.left, metrics.top, metrics.width, metrics.height);
  context.clip();
  context.fillStyle = colour;
  context.textBaseline = "middle";
  context.textAlign = treatment.alignment;
  const letterSpacingContext = context as CanvasRenderingContext2D & {
    letterSpacing?: string;
  };
  if ("letterSpacing" in letterSpacingContext) {
    letterSpacingContext.letterSpacing = `${treatment.letterSpacingEm}em`;
  }

  context.font = `${treatment.ubuntuWeight} ${treatment.fontSizePx}px "Ubuntu"`;
  metrics.lines.forEach((line, index) => {
    context.fillText(
      line,
      metrics.textX,
      metrics.firstLineCenterY + index * metrics.lineBoxHeight,
    );
  });
  context.restore();
}

function drawNeutralLogoPlaceholder(
  context: CanvasRenderingContext2D,
  layer: EditableLogoLayer,
  canvasWidth: number,
  canvasHeight: number,
) {
  const { boundsPercent: bounds, logo } = layer;
  const left = (bounds.x / 100) * canvasWidth;
  const top = (bounds.y / 100) * canvasHeight;
  const width = (bounds.width / 100) * canvasWidth;
  const height = (bounds.height / 100) * canvasHeight;
  context.save();
  context.fillStyle = "rgba(10, 50, 83, 0.58)";
  context.strokeStyle = "rgba(254, 254, 254, 0.78)";
  context.lineWidth = Math.max(1, canvasWidth * 0.001);
  context.fillRect(left, top, width, height);
  context.strokeRect(left, top, width, height);
  context.fillStyle = "#FEFEFE";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const fontSize = Math.max(
    10,
    Math.min(height * 0.28, width / Math.max(8, logo.brandName.length * 0.62)),
  );
  context.font = `500 ${fontSize}px "Ubuntu"`;
  context.fillText(logo.brandName, left + width / 2, top + height / 2);
  context.restore();
}

function drawOfficialLogo(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  layer: EditableLogoLayer,
  canvasWidth: number,
  canvasHeight: number,
) {
  const bounds = layer.boundsPercent;
  const left = (bounds.x / 100) * canvasWidth;
  const top = (bounds.y / 100) * canvasHeight;
  const width = (bounds.width / 100) * canvasWidth;
  const height = (bounds.height / 100) * canvasHeight;
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    left + (width - drawWidth) / 2,
    top + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

async function downloadFinalPoster(
  concept: PosterConcept,
  imageState: SuccessfulPosterImage,
  textLayers: EditableTextLayers,
  logoLayers: EditableLogoLayer[],
) {
  const specification = concept.editablePosterLayoutSpecification;
  const { width, height } = specification.canvas;
  await loadUbuntuPosterFonts(document.fonts);
  const artwork = await loadPosterImage(imageState.image);
  const logos = await Promise.all(
    logoLayers.map(async (layer) => {
      try {
        return { layer, image: await loadPosterImage(layer.logo.assetPath) };
      } catch {
        return { layer, image: null };
      }
    }),
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not create the final poster canvas.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(artwork, 0, 0, width, height);

  logos
    .sort((first, second) => first.layer.zIndex - second.layer.zIndex)
    .forEach(({ layer, image }) => {
      if (image) drawOfficialLogo(context, image, layer, width, height);
      else drawNeutralLogoPlaceholder(context, layer, width, height);
    });

  const colour = concept.selectedColourCombination.textColours[0] ?? "#FEFEFE";
  TEXT_LAYER_CONFIG.forEach(({ role }) => {
    drawFinalTextLayer(context, textLayers[role], width, height, colour);
  });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error("The final poster PNG could not be encoded.")),
      "image/png",
    );
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `mf-corner-final-poster-${width}x${height}-${Date.now()}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function syntaxHighlight(json: string): string {
  const escaped = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let className = "json-number";
      if (/^"/.test(match)) className = /:$/.test(match) ? "json-key" : "json-string";
      else if (/true|false/.test(match)) className = "json-boolean";
      else if (/null/.test(match)) className = "json-null";
      return `<span class="${className}">${match}</span>`;
    },
  );
}

function boundsStyle(bounds: PercentBounds): React.CSSProperties {
  return {
    left: `${bounds.x}%`,
    top: `${bounds.y}%`,
    width: `${bounds.width}%`,
    height: `${bounds.height}%`,
  };
}

function findLayer(layers: PosterLayer[], needle: string) {
  return layers.find((layer) => layer.name.toLowerCase().includes(needle));
}

function PreviewTextLayer({
  layer,
  canvasWidth,
  colour,
  selected,
  onSelect,
  onMove,
}: {
  layer: EditableTextLayer;
  canvasWidth: number;
  colour: string;
  selected: boolean;
  onSelect: (role: EditableTextRole) => void;
  onMove: (role: EditableTextRole, bounds: PercentBounds) => void;
}) {
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    bounds: PercentBounds;
  } | null>(null);
  const { treatment, bounds, variant, role, label } = layer;
  if (!treatment.content || !treatment.include) return null;
  const lines = treatment.lineBreaks.length > 0 ? treatment.lineBreaks : [treatment.content];

  const moveBy = (deltaX: number, deltaY: number) => {
    onMove(role, {
      ...bounds,
      x: clamp(bounds.x + deltaX, 0, 100 - bounds.width),
      y: clamp(bounds.y + deltaY, 0, 100 - bounds.height),
    });
  };

  return (
    <div
      className={`poster-live-text poster-live-${variant}${selected ? " is-selected" : ""}`}
      style={{
        ...boundsStyle(bounds),
        color: colour,
        ...getPosterPreviewTextStyle(variant, treatment, canvasWidth),
      }}
      role="button"
      tabIndex={0}
      aria-label={`Move ${label} text layer. Use arrow keys for precise positioning.`}
      aria-pressed={selected}
      onFocus={() => onSelect(role)}
      onPointerDown={(event) => {
        onSelect(role);
        event.currentTarget.setPointerCapture(event.pointerId);
        dragState.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          bounds: { ...bounds },
        };
      }}
      onPointerMove={(event) => {
        const drag = dragState.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const canvas = event.currentTarget.closest<HTMLElement>(".poster-dark-preview-canvas");
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        onMove(role, {
          ...drag.bounds,
          x: clamp(drag.bounds.x + ((event.clientX - drag.startX) / rect.width) * 100, 0, 100 - drag.bounds.width),
          y: clamp(drag.bounds.y + ((event.clientY - drag.startY) / rect.height) * 100, 0, 100 - drag.bounds.height),
        });
      }}
      onPointerUp={(event) => {
        if (dragState.current?.pointerId === event.pointerId) dragState.current = null;
      }}
      onPointerCancel={() => { dragState.current = null; }}
      onKeyDown={(event) => {
        const distance = event.shiftKey ? 1 : 0.25;
        if (event.key === "ArrowLeft") moveBy(-distance, 0);
        else if (event.key === "ArrowRight") moveBy(distance, 0);
        else if (event.key === "ArrowUp") moveBy(0, -distance);
        else if (event.key === "ArrowDown") moveBy(0, distance);
        else return;
        event.preventDefault();
      }}
    >
      {lines.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}
    </div>
  );
}

function PreviewLogoLayer({
  layer,
  selected,
  onSelect,
  onMove,
}: {
  layer: EditableLogoLayer;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, bounds: PercentBounds) => void;
}) {
  const [assetMissing, setAssetMissing] = useState(false);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    bounds: PercentBounds;
  } | null>(null);
  const moveBy = (deltaX: number, deltaY: number) => {
    onMove(
      layer.id,
      clampBoundsToContainer(
        {
          ...layer.boundsPercent,
          x: layer.boundsPercent.x + deltaX,
          y: layer.boundsPercent.y + deltaY,
        },
        layer.logo.safeAreaBoundsPercent,
      ),
    );
  };

  return (
    <button
      type="button"
      className={`poster-live-logo${selected ? " is-selected" : ""}`}
      style={boundsStyle(layer.boundsPercent)}
      aria-label={`Move ${layer.logo.brandName} official-logo layer`}
      onFocus={() => onSelect(layer.id)}
      onPointerDown={(event) => {
        onSelect(layer.id);
        event.currentTarget.setPointerCapture(event.pointerId);
        dragState.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          bounds: { ...layer.boundsPercent },
        };
      }}
      onPointerMove={(event) => {
        const drag = dragState.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const canvas = event.currentTarget.closest<HTMLElement>(
          ".poster-dark-preview-canvas",
        );
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        onMove(
          layer.id,
          clampBoundsToContainer(
            {
              ...drag.bounds,
              x:
                drag.bounds.x +
                ((event.clientX - drag.startX) / rect.width) * 100,
              y:
                drag.bounds.y +
                ((event.clientY - drag.startY) / rect.height) * 100,
            },
            layer.logo.safeAreaBoundsPercent,
          ),
        );
      }}
      onPointerUp={(event) => {
        if (dragState.current?.pointerId === event.pointerId) {
          dragState.current = null;
        }
      }}
      onPointerCancel={() => {
        dragState.current = null;
      }}
      onKeyDown={(event) => {
        const distance = event.shiftKey ? 1 : 0.25;
        if (event.key === "ArrowLeft") moveBy(-distance, 0);
        else if (event.key === "ArrowRight") moveBy(distance, 0);
        else if (event.key === "ArrowUp") moveBy(0, -distance);
        else if (event.key === "ArrowDown") moveBy(0, distance);
        else return;
        event.preventDefault();
      }}
    >
      {!assetMissing ? (
        <img
          src={layer.logo.assetPath}
          alt={layer.logo.brandName}
          draggable={false}
          onLoad={() => setAssetMissing(false)}
          onError={() => setAssetMissing(true)}
        />
      ) : (
        <span className="poster-logo-placeholder">
          {layer.logo.brandName}
          <small>official asset pending</small>
        </span>
      )}
    </button>
  );
}

function PosterTypographyInspector({
  layers,
  selectedRole,
  onSelect,
  onChange,
  onResetLayer,
  onResetAll,
  canvasWidth,
}: {
  layers: EditableTextLayers;
  selectedRole: EditableTextRole;
  onSelect: (role: EditableTextRole) => void;
  onChange: (role: EditableTextRole, patch: EditableTextLayerPatch) => void;
  onResetLayer: (role: EditableTextRole) => void;
  onResetAll: () => void;
  canvasWidth: number;
}) {
  const layer = layers[selectedRole];
  const updateNumber = (
    field: keyof PosterTextTreatment,
    value: number,
  ) => {
    if (Number.isFinite(value)) onChange(selectedRole, { treatment: { [field]: value } });
  };
  const updateBound = (field: keyof PercentBounds, value: number) => {
    if (Number.isFinite(value)) onChange(selectedRole, { bounds: { [field]: value } });
  };
  const editableLayers = TEXT_LAYER_CONFIG.filter(({ role }) => layers[role].treatment.include);

  return (
    <aside className="poster-type-inspector" aria-label="Poster typography editor">
      <div className="poster-inspector-heading">
        <div><span>Typography editor</span><strong>{layer.label}</strong></div>
        <button type="button" onClick={onResetAll}>Reset all</button>
      </div>

      <div className="poster-layer-tabs" role="tablist" aria-label="Text layer">
        {editableLayers.map(({ role, label }) => (
          <button
            type="button"
            role="tab"
            aria-selected={selectedRole === role}
            className={selectedRole === role ? "is-active" : ""}
            key={role}
            onClick={() => onSelect(role)}
          >{label}</button>
        ))}
      </div>

      <label className="poster-inspector-field poster-inspector-copy">
        <span>Text and line breaks</span>
        <textarea
          rows={4}
          value={(layer.treatment.lineBreaks.length ? layer.treatment.lineBreaks : [layer.treatment.content]).join("\n")}
          onChange={(event) => {
            const lines = event.currentTarget.value.split("\n");
            onChange(selectedRole, {
              treatment: {
                content: lines.join(" ").trim(),
                lineBreaks: lines,
              },
            });
          }}
        />
      </label>

      <div className="poster-ubuntu-lock">
        <div><span>Font family</span><strong>Ubuntu</strong></div>
        <a href="https://fonts.google.com/specimen/Ubuntu" target="_blank" rel="noreferrer">Locked font ↗</a>
      </div>

      <div className="poster-inspector-grid">
        <label className="poster-inspector-field">
          <span>Size (px)</span>
          <input type="number" min={getTextMinimumFontSize(selectedRole, canvasWidth)} max="480" step="1" value={layer.treatment.fontSizePx} onChange={(event) => updateNumber("fontSizePx", Number(event.currentTarget.value))} />
        </label>
        <label className="poster-inspector-field">
          <span>Weight</span>
          <select value={layer.treatment.ubuntuWeight} onChange={(event) => onChange(selectedRole, { treatment: { ubuntuWeight: Number(event.currentTarget.value) as 400 | 500 | 700 } })}>
            <option value="400">Regular 400</option>
            <option value="500">Medium 500</option>
            <option value="700">Bold 700</option>
          </select>
        </label>
        <label className="poster-inspector-field">
          <span>Line height</span>
          <input type="number" min="0.8" max="2" step="0.01" value={layer.treatment.lineHeight} onChange={(event) => updateNumber("lineHeight", Number(event.currentTarget.value))} />
        </label>
        <label className="poster-inspector-field">
          <span>Tracking (em)</span>
          <input type="number" min="-0.04" max="0.3" step="0.005" value={layer.treatment.letterSpacingEm} onChange={(event) => updateNumber("letterSpacingEm", Number(event.currentTarget.value))} />
        </label>
      </div>

      <fieldset className="poster-align-control">
        <legend>Alignment</legend>
        <div>
          {(["left", "center", "right"] as const).map((alignment) => (
            <button
              type="button"
              key={alignment}
              className={layer.treatment.alignment === alignment ? "is-active" : ""}
              onClick={() => onChange(selectedRole, { treatment: { alignment } })}
            >{alignment}</button>
          ))}
        </div>
      </fieldset>

      <div className="poster-position-heading"><span>Position and frame (%)</span><small>Drag on canvas or enter values</small></div>
      <div className="poster-inspector-grid poster-position-grid">
        {(["x", "y", "width", "height"] as const).map((field) => (
          <label className="poster-inspector-field" key={field}>
            <span>{field === "x" || field === "y" ? field.toUpperCase() : field[0].toUpperCase() + field.slice(1)}</span>
            <input type="number" min={field === "width" || field === "height" ? 2 : 0} max="100" step="0.25" value={Number(layer.bounds[field].toFixed(2))} onChange={(event) => updateBound(field, Number(event.currentTarget.value))} />
          </label>
        ))}
      </div>

      <p className="poster-nudge-note">Arrow keys nudge 0.25%. Hold Shift for 1%.</p>
      <button type="button" className="poster-reset-layer" onClick={() => onResetLayer(selectedRole)}>Reset {layer.label.toLowerCase()}</button>
    </aside>
  );
}

/** Reads the ?variant= back off an asset path so the dropdown reflects the layer. */
function variantOf(assetPath: string): string {
  return new URLSearchParams(assetPath.split("?")[1] ?? "").get("variant") ?? "";
}

function PosterLogoInspector({
  layers,
  selectedId,
  onSelect,
  onMove,
  onScale,
  onReset,
  onChangeVariant,
}: {
  layers: EditableLogoLayer[];
  selectedId: string;
  onSelect: (id: string) => void;
  onMove: (id: string, bounds: PercentBounds) => void;
  onScale: (id: string, widthPercent: number) => void;
  onReset: (id: string) => void;
  onChangeVariant: (id: string, variant: string) => void;
}) {
  const layer = layers.find((candidate) => candidate.id === selectedId) ?? layers[0];
  if (!layer) return null;
  return (
    <aside className="poster-type-inspector poster-logo-inspector" aria-label="Official-logo editor">
      <div className="poster-inspector-heading">
        <div><span>Official-logo editor</span><strong>{layer.logo.brandName}</strong></div>
        <button type="button" onClick={() => onReset(layer.id)}>Reset</button>
      </div>
      <div className="poster-layer-tabs" role="tablist" aria-label="Logo layer">
        {layers.map((candidate) => (
          <button
            type="button"
            role="tab"
            aria-selected={candidate.id === layer.id}
            className={candidate.id === layer.id ? "is-active" : ""}
            key={candidate.id}
            onClick={() => onSelect(candidate.id)}
          >
            {candidate.logo.brandName}
          </button>
        ))}
      </div>
      <label className="poster-inspector-field poster-logo-variant-field">
        <span>Logo version</span>
        <select
          value={variantOf(layer.logo.assetPath)}
          onChange={(event) => onChangeVariant(layer.id, event.currentTarget.value)}
        >
          {(POSTER_LOGO_VARIANT_OPTIONS[layer.logo.id] ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="poster-ubuntu-lock poster-logo-asset-contract">
        <div><span>Expected official asset</span><strong>{layer.logo.assetPath}</strong></div>
        <small>Missing files use a neutral labelled placeholder in preview and export.</small>
      </div>
      <div className="poster-position-heading">
        <span>Position and scale (%)</span>
        <small>Aspect ratio locked</small>
      </div>
      <div className="poster-inspector-grid poster-position-grid">
        {(["x", "y"] as const).map((field) => (
          <label className="poster-inspector-field" key={field}>
            <span>{field.toUpperCase()}</span>
            <input
              type="number"
              min={layer.logo.safeAreaBoundsPercent[field]}
              max={
                layer.logo.safeAreaBoundsPercent[field] +
                layer.logo.safeAreaBoundsPercent[
                  field === "x" ? "width" : "height"
                ]
              }
              step="0.25"
              value={Number(layer.boundsPercent[field].toFixed(2))}
              onChange={(event) =>
                onMove(
                  layer.id,
                  clampBoundsToContainer(
                    {
                      ...layer.boundsPercent,
                      [field]: Number(event.currentTarget.value),
                    },
                    layer.logo.safeAreaBoundsPercent,
                  ),
                )
              }
            />
          </label>
        ))}
        <label className="poster-inspector-field poster-logo-scale-field">
          <span>Width</span>
          <input
            type="range"
            min="1"
            max={layer.logo.safeAreaBoundsPercent.width}
            step="0.25"
            value={layer.boundsPercent.width}
            onChange={(event) =>
              onScale(layer.id, Number(event.currentTarget.value))
            }
          />
          <output>{layer.boundsPercent.width.toFixed(2)}%</output>
        </label>
      </div>
      <p className="poster-nudge-note">Arrow keys nudge 0.25%. Hold Shift for 1%.</p>
    </aside>
  );
}

function PosterPreview({
  concept,
  imageState,
  mode,
  textLayers,
  logoLayers,
  selectedRole,
  selectedLogoId,
  onSelect,
  onSelectLogo,
  onMove,
  onMoveLogo,
  onScaleLogo,
  onChangeLogoVariant,
  onResetLogo,
  onChange,
  onResetLayer,
  onResetAll,
}: {
  concept: PosterConcept;
  imageState: PosterImageState;
  mode: PosterPreviewMode;
  textLayers: EditableTextLayers;
  logoLayers: EditableLogoLayer[];
  selectedRole: EditableTextRole;
  selectedLogoId: string;
  onSelect: (role: EditableTextRole) => void;
  onSelectLogo: (id: string) => void;
  onMove: (role: EditableTextRole, bounds: PercentBounds) => void;
  onMoveLogo: (id: string, bounds: PercentBounds) => void;
  onScaleLogo: (id: string, widthPercent: number) => void;
  onChangeLogoVariant: (id: string, variant: string) => void;
  onResetLogo: (id: string) => void;
  onChange: (role: EditableTextRole, patch: EditableTextLayerPatch) => void;
  onResetLayer: (role: EditableTextRole) => void;
  onResetAll: () => void;
}) {
  const specification = concept.editablePosterLayoutSpecification;
  const textColour = concept.selectedColourCombination.textColours[0] ?? "#FEFEFE";
  return (
    <div className={`poster-dark-preview-shell${mode === "artwork" ? " is-artwork" : ""}`}>
      <div className="poster-preview-stage">
        <div
          className="poster-dark-preview-canvas"
          style={{
            aspectRatio: `${specification.canvas.width} / ${specification.canvas.height}`,
            background: concept.selectedColourCombination.background,
            containerType: "inline-size",
            "--poster-aspect": specification.canvas.width / specification.canvas.height,
          } as React.CSSProperties}
        >
          {imageState.status === "success" ? (
            <img src={imageState.image} alt="Generated poster background and hero artwork" />
          ) : (
            <div className="poster-dark-preview-empty">
              <span />
              <b>{imageState.status === "loading" ? "Rendering artwork" : "Artwork pending"}</b>
            </div>
          )}

          {imageState.status === "loading" && (
            <div className="poster-dark-rendering" role="status"><i /><span>Building the campaign visual</span></div>
          )}

          {mode !== "artwork" && (
            <div className={`poster-layout-overlay${mode === "layout" ? " is-layout" : ""}`}>
              {mode === "layout" && concept.logoSafeAreas.map((area) => (
                <div key={area.logo} className="poster-logo-zone" style={boundsStyle(area.boundsPercent)}>
                  <span>{area.logo}</span><small>logo safe</small>
                </div>
              ))}
              {logoLayers.map((layer) => (
                <PreviewLogoLayer
                  key={layer.id}
                  layer={layer}
                  selected={selectedLogoId === layer.id}
                  onSelect={onSelectLogo}
                  onMove={onMoveLogo}
                />
              ))}
              {TEXT_LAYER_CONFIG.map(({ role }) => (
                <PreviewTextLayer
                  key={role}
                  layer={textLayers[role]}
                  canvasWidth={specification.canvas.width}
                  colour={textColour}
                  selected={selectedRole === role}
                  onSelect={onSelect}
                  onMove={onMove}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {mode !== "artwork" && (
        <div className="poster-editor-inspectors">
          <PosterTypographyInspector
            layers={textLayers}
            selectedRole={selectedRole}
            onSelect={onSelect}
            onChange={onChange}
            onResetLayer={onResetLayer}
            onResetAll={onResetAll}
            canvasWidth={specification.canvas.width}
          />
          <PosterLogoInspector
            layers={logoLayers}
            selectedId={selectedLogoId}
            onSelect={onSelectLogo}
            onMove={onMoveLogo}
            onScale={onScaleLogo}
            onReset={onResetLogo}
            onChangeVariant={onChangeLogoVariant}
          />
        </div>
      )}
    </div>
  );
}

function applyEditorStateToConcept(
  concept: PosterConcept,
  textLayers: EditableTextLayers,
  logoLayers: EditableLogoLayer[],
): PosterConcept {
  return {
    ...concept,
    textHierarchy: {
      headline: textLayers.headline.treatment,
      subheading: textLayers.subheading.treatment,
      bodyCopy: textLayers.body.treatment,
      cta: textLayers.cta.treatment,
    },
    editablePosterLayoutSpecification: {
      ...concept.editablePosterLayoutSpecification,
      layers: concept.editablePosterLayoutSpecification.layers.map((layer) => {
        if (layer.type === "logo") {
          const editedLogo = logoLayers.find(
            (candidate) => candidate.id === layer.id,
          );
          return editedLogo
            ? {
                ...layer,
                boundsPercent: { ...editedLogo.boundsPercent },
                logo: editedLogo.logo
                  ? {
                      ...editedLogo.logo,
                      safeAreaBoundsPercent: {
                        ...editedLogo.logo.safeAreaBoundsPercent,
                      },
                    }
                  : layer.logo,
              }
            : layer;
        }
        const config = TEXT_LAYER_CONFIG.find(
          ({ role, needle }) =>
            layer.id === (role === "body" ? "body-copy" : role) ||
            layer.name.toLowerCase().includes(needle),
        );
        return config
          ? {
              ...layer,
              boundsPercent: { ...textLayers[config.role].bounds },
            }
          : layer;
      }),
    },
  };
}

function getTextFitErrors(
  textLayers: EditableTextLayers,
  canvas: { width: number; height: number },
) {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return ["Text fit could not be measured in this browser."];
  return TEXT_LAYER_CONFIG.flatMap(({ role, label }) => {
    const layer = textLayers[role];
    if (!layer.treatment.include || !layer.treatment.content) return [];
    const result = evaluatePosterTextFit(
      {
        role,
        treatment: layer.treatment,
        bounds: layer.bounds,
        canvas,
      },
      (line, treatment) => {
        context.font = `${treatment.ubuntuWeight} ${treatment.fontSizePx}px "Ubuntu"`;
        return context.measureText(line).width;
      },
    );
    return result.fits
      ? []
      : [
          `${label} text is clipped at ${layer.treatment.fontSizePx}px; enlarge its collision-free frame or shorten its editable line breaks.`,
        ];
  });
}

function Detail({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="poster-production-detail" open={open}>
      <summary>{title}<span aria-hidden="true">+</span></summary>
      <div className="poster-production-detail-body">{children}</div>
    </details>
  );
}

function BoundsCode({ bounds }: { bounds: PercentBounds }) {
  return <code>x {bounds.x}% · y {bounds.y}% · w {bounds.width}% · h {bounds.height}%</code>;
}

export function PosterStudioOutput({
  concept,
  promptJson,
  payload,
  isLoading,
  error,
  imageState,
  onRegenerate,
  onRetryImage,
}: PosterStudioOutputProps) {
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<PosterPreviewMode>("poster");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [textLayers, setTextLayers] = useState<EditableTextLayers | null>(null);
  const [defaultTextLayers, setDefaultTextLayers] =
    useState<EditableTextLayers | null>(null);
  const [logoLayers, setLogoLayers] = useState<EditableLogoLayer[] | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);
  const [editorWarning, setEditorWarning] = useState<string | null>(null);
  const [selectedTextRole, setSelectedTextRole] = useState<EditableTextRole>("headline");
  const [selectedLogoId, setSelectedLogoId] = useState("");

  const rawDefaultTextLayers = useMemo(
    () => concept ? createEditableTextLayers(concept) : null,
    [concept],
  );
  const rawDefaultLogoLayers = useMemo(
    () => (concept ? createEditableLogoLayers(concept) : []),
    [concept],
  );
  const activeTextLayers =
    textLayers ?? defaultTextLayers ?? rawDefaultTextLayers;
  const activeLogoLayers = logoLayers ?? rawDefaultLogoLayers;

  useEffect(() => {
    let cancelled = false;
    setDefaultTextLayers(null);
    setTextLayers(null);
    setLogoLayers(rawDefaultLogoLayers);
    setSelectedLogoId(rawDefaultLogoLayers[0]?.id ?? "");
    setFontsReady(false);
    setFontError(null);
    setEditorWarning(null);
    if (!concept || !rawDefaultTextLayers) return () => {
      cancelled = true;
    };
    const firstIncluded = TEXT_LAYER_CONFIG.find(
      ({ role }) => rawDefaultTextLayers[role].treatment.include,
    );
    setSelectedTextRole(firstIncluded?.role ?? "headline");
    void loadUbuntuPosterFonts(document.fonts)
      .then(() => {
        if (cancelled) return;
        const fitted = fitDefaultTextLayers(
          rawDefaultTextLayers,
          concept.editablePosterLayoutSpecification.canvas.width,
          concept.editablePosterLayoutSpecification.canvas.height,
        );
        setDefaultTextLayers(fitted);
        setTextLayers(fitted);
        setFontsReady(true);
      })
      .catch((value) => {
        if (cancelled) return;
        setFontError(
          value instanceof Error
            ? value.message
            : "Ubuntu could not be loaded for poster measurement.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [concept, rawDefaultLogoLayers, rawDefaultTextLayers]);

  const updateTextLayer = useCallback((role: EditableTextRole, patch: EditableTextLayerPatch) => {
    if (!concept || !activeTextLayers) return;
    const current = activeTextLayers[role];
    const treatment = { ...current.treatment, ...patch.treatment };
    treatment.fontSizePx = clamp(
      treatment.fontSizePx,
      getTextMinimumFontSize(
        role,
        concept.editablePosterLayoutSpecification.canvas.width,
      ),
      480,
    );
    treatment.lineHeight = clamp(treatment.lineHeight, 0.8, 2);
    treatment.letterSpacingEm = clamp(treatment.letterSpacingEm, -0.04, 0.3);

    const bounds = { ...current.bounds, ...patch.bounds };
    bounds.width = clamp(bounds.width, 2, 100);
    bounds.height = clamp(bounds.height, 2, 100);
    bounds.x = clamp(bounds.x, 0, 100 - bounds.width);
    bounds.y = clamp(bounds.y, 0, 100 - bounds.height);
    const candidate = {
      ...activeTextLayers,
      [role]: { ...current, treatment, bounds },
    };
    const geometry = validatePosterGeometry(
      applyEditorStateToConcept(concept, candidate, activeLogoLayers),
    );
    if (!geometry.valid) {
      setEditorWarning(
        `Move blocked: ${geometry.errors[0] ?? "the layer would leave the canvas or collide."}`,
      );
      return;
    }
    setEditorWarning(null);
    setTextLayers(candidate);
  }, [activeLogoLayers, activeTextLayers, concept]);

  const moveTextLayer = useCallback((role: EditableTextRole, bounds: PercentBounds) => {
    updateTextLayer(role, { bounds });
  }, [updateTextLayer]);

  const resetTextLayer = useCallback((role: EditableTextRole) => {
    if (!defaultTextLayers) return;
    setTextLayers((currentLayers) => {
      const baseLayers = currentLayers ?? defaultTextLayers;
      const initial = defaultTextLayers[role];
      return {
        ...baseLayers,
        [role]: {
          ...initial,
          treatment: { ...initial.treatment, lineBreaks: [...initial.treatment.lineBreaks] },
          bounds: { ...initial.bounds },
        },
      };
    });
  }, [defaultTextLayers]);

  const resetAllTextLayers = useCallback(() => {
    if (defaultTextLayers) setTextLayers(defaultTextLayers);
  }, [defaultTextLayers]);

  const moveLogoLayer = useCallback((id: string, bounds: PercentBounds) => {
    if (!concept || !activeTextLayers) return;
    const current = activeLogoLayers.find((layer) => layer.id === id);
    if (!current) return;
    const next = clampBoundsToContainer(
      bounds,
      current.logo.safeAreaBoundsPercent,
    );
    const candidate = activeLogoLayers.map((layer) =>
      layer.id === id ? { ...layer, boundsPercent: next } : layer,
    );
    const geometry = validatePosterGeometry(
      applyEditorStateToConcept(concept, activeTextLayers, candidate),
    );
    if (!geometry.valid) {
      setEditorWarning(
        `Move blocked: ${geometry.errors[0] ?? "the logo would leave its safe area or collide."}`,
      );
      return;
    }
    setEditorWarning(null);
    setLogoLayers(candidate);
  }, [activeLogoLayers, activeTextLayers, concept]);

  const scaleLogoLayer = useCallback((id: string, widthPercent: number) => {
    if (!concept) return;
    const current = activeLogoLayers.find((layer) => layer.id === id);
    if (!current) return;
    moveLogoLayer(
      id,
      scaleAspectLockedLogoBounds(
        current.boundsPercent,
        current.logo.safeAreaBoundsPercent,
        current.logo.aspectRatio,
        concept.editablePosterLayoutSpecification.canvas,
        widthPercent,
      ),
    );
  }, [activeLogoLayers, concept, moveLogoLayer]);

  // Swapping the variant only rewrites the asset URL and the display name — bounds,
  // scale and position stay exactly as the designer left them. The preview <img>
  // and the export canvas both read assetPath, so this is all that is needed.
  const changeLogoVariant = useCallback((id: string, variant: string) => {
    setLogoLayers((current) =>
      (current ?? rawDefaultLogoLayers).map((layer) => {
        if (layer.id !== id) return layer;
        const option = (POSTER_LOGO_VARIANT_OPTIONS[layer.logo.id] ?? []).find(
          (candidate) => candidate.value === variant,
        );
        if (!option) return layer;
        const [base] = layer.logo.assetPath.split("?");
        return {
          ...layer,
          logo: {
            ...layer.logo,
            brandName: option.label,
            assetPath: `${base}?id=${encodeURIComponent(layer.logo.id)}&variant=${encodeURIComponent(variant)}`,
          },
        };
      }),
    );
  }, [rawDefaultLogoLayers]);

  const resetLogoLayer = useCallback((id: string) => {
    const initial = rawDefaultLogoLayers.find((layer) => layer.id === id);
    if (!initial) return;
    setLogoLayers((current) =>
      (current ?? rawDefaultLogoLayers).map((layer) =>
        layer.id === id
          ? {
              ...initial,
              boundsPercent: { ...initial.boundsPercent },
              logo: {
                ...initial.logo,
                safeAreaBoundsPercent: {
                  ...initial.logo.safeAreaBoundsPercent,
                },
              },
            }
          : layer,
      ),
    );
    setEditorWarning(null);
  }, [rawDefaultLogoLayers]);

  const editedConcept = useMemo(() => {
    if (!concept || !activeTextLayers) return concept;
    return applyEditorStateToConcept(
      concept,
      activeTextLayers,
      activeLogoLayers,
    );
  }, [activeLogoLayers, activeTextLayers, concept]);
  const geometryErrors = useMemo(
    () =>
      editedConcept
        ? validatePosterGeometry(editedConcept).errors
        : [],
    [editedConcept],
  );
  const textFitErrors = useMemo(
    () =>
      fontsReady && activeTextLayers && concept
        ? getTextFitErrors(
            activeTextLayers,
            concept.editablePosterLayoutSpecification.canvas,
          )
        : [],
    [activeTextLayers, concept, fontsReady],
  );
  const exportBlockers = [
    ...(!fontsReady
      ? [
          fontError ??
            "Ubuntu 400, 500 and 700 are still loading; final export is blocked.",
        ]
      : []),
    ...geometryErrors,
    ...textFitErrors,
  ];

  const prettyJson = useMemo(() => {
    if (!promptJson) return "";
    try { return JSON.stringify(JSON.parse(promptJson), null, 2); } catch { return promptJson; }
  }, [promptJson]);
  const schemaVersion = useMemo(() => {
    if (!promptJson) return "multia.poster-generation.v6";
    try {
      const value = JSON.parse(promptJson) as { schema_version?: unknown };
      return typeof value.schema_version === "string"
        ? value.schema_version
        : "multia.poster-generation.v6";
    } catch {
      return "multia.poster-generation.v6";
    }
  }, [promptJson]);

  const copyJson = useCallback(async () => {
    if (!promptJson) return;
    await navigator.clipboard.writeText(promptJson);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, [promptJson]);

  const exportFinalPoster = useCallback(async () => {
    if (!editedConcept || !activeTextLayers || imageState.status !== "success" || isExporting) return;
    if (exportBlockers.length > 0) {
      setExportError(`Export blocked: ${exportBlockers.join(" ")}`);
      return;
    }
    setIsExporting(true);
    setExportError(null);
    try {
      await downloadFinalPoster(
        editedConcept,
        imageState,
        activeTextLayers,
        activeLogoLayers,
      );
    } catch (value) {
      setExportError(value instanceof Error ? value.message : "The final poster could not be exported.");
    } finally {
      setIsExporting(false);
    }
  }, [activeLogoLayers, activeTextLayers, editedConcept, exportBlockers, imageState, isExporting]);

  if (!concept && !isLoading && !error) {
    return (
      <section className="poster-dark-empty" aria-live="polite">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 8h8M8 12h5M8 17h8"/></svg>
        <p>Your structured poster JSON and campaign artwork will appear here</p>
      </section>
    );
  }

  if (isLoading && !concept) {
    return (
      <section className="poster-dark-loading" aria-live="polite">
        <div className="poster-output-title"><span /><small>Generated Prompt</small></div>
        <div className="code-block">
          <div className="code-block-header"><span className="font-mono text-xs text-white/40">poster.prompt.json</span><span className="text-[11px] text-white/25">GPT-5.6 Sol · high reasoning</span></div>
          <div className="code-block-body space-y-2">{[73, 58, 84, 46, 69, 78, 52, 88, 64, 72, 49, 81].map((width, index) => <div key={`${width}-${index}`} className="skeleton-pulse h-4 rounded" style={{ width: `${width}%`, animationDelay: `${index * 0.08}s` }} />)}</div>
        </div>
      </section>
    );
  }

  if (error && !concept) {
    return (
      <section className="poster-dark-error" role="alert">
        <p>{error}</p>
        <button type="button" onClick={onRegenerate} className="btn-multia btn-multia-sm">Try again</button>
      </section>
    );
  }

  if (!concept || !editedConcept || !activeTextLayers || !payload || !promptJson) return null;
  const referenceImage = `/api/poster-reference?id=${encodeURIComponent(concept.referenceMatch.approvedPosterId)}`;
  const hierarchy = [
    ["Headline", activeTextLayers.headline.treatment],
    ["Subheading", activeTextLayers.subheading.treatment],
    ["Body copy", activeTextLayers.body.treatment],
    ["CTA", activeTextLayers.cta.treatment],
  ] as const;
  const placements = [
    ["Headline", concept.placementGuidance.headline], ["Subheading", concept.placementGuidance.subheading],
    ["Body copy", concept.placementGuidance.bodyCopy], ["CTA", concept.placementGuidance.cta],
    ["Hero", concept.placementGuidance.centralVisual], ["Negative space", concept.placementGuidance.negativeSpace],
    ["Background", concept.placementGuidance.backgroundDetails],
  ];
  const paletteColours = Array.from(new Set([
    concept.selectedColourCombination.background,
    ...concept.selectedColourCombination.accents,
    ...concept.selectedColourCombination.textColours,
  ]));
  const qualityChecklist = Array.from(
    new Set(concept.finalQualityControlChecklist),
  );
  const finalDownload = getPosterDownloadDescriptor("final");
  const artworkDownload = getPosterDownloadDescriptor("artwork");

  return (
    <section className="poster-dark-result" aria-live="polite">
      <div className="poster-output-title"><span /><small>Generated Prompt</small></div>

      <div className="code-block poster-json-block">
        <div className="code-block-header">
          <span className="font-mono text-xs text-white/40">poster.prompt.json</span>
          <div className="poster-code-actions">
            <button type="button" onClick={copyJson}>{copied ? "Copied" : "Copy"}</button>
            <button type="button" onClick={() => downloadText(promptJson, `poster-prompt-${Date.now()}.json`, "application/json")}>Download</button>
            <button type="button" onClick={onRegenerate}>Regenerate</button>
          </div>
        </div>
        <div className="code-block-body custom-scrollbar poster-json-body"><pre><code dangerouslySetInnerHTML={{ __html: syntaxHighlight(prettyJson) }} /></pre></div>
        <div className="poster-json-meta"><span>{new TextEncoder().encode(promptJson).length} bytes</span><span>Schema {schemaVersion}</span></div>
      </div>

      <div className="poster-reference-lock">
        <img src={referenceImage} alt={`${concept.referenceMatch.label} layout template`} />
        {/* This is layout-geometry grounding only — auto-matched from copy length
            against the 13 internal templates, unrelated to any reference image the
            user did or didn't upload. No visual content is copied; it only decides
            where headline/hero/logo zones sit. */}
        <div><span>Layout template match</span><strong>{concept.referenceMatch.label}</strong><p>{concept.referenceMatch.reason}</p></div>
        <dl><div><dt>Layout</dt><dd>{concept.layoutArchetype.replaceAll("-", " ")}</dd></div><div><dt>Model style</dt><dd>{concept.selected3DModelReferenceCategory.label}</dd></div><div><dt>Palette</dt><dd>{concept.selectedColourCombination.name}</dd></div></dl>
      </div>

      <div className="poster-generated-card">
        <div className="poster-generated-header">
          <div><span>Generated artwork</span><strong>{concept.conceptTitle}</strong></div>
          <div className="poster-preview-toggle" role="group" aria-label="Preview mode">
            <button type="button" className={previewMode === "poster" ? "is-active" : ""} onClick={() => setPreviewMode("poster")}>Final poster</button>
            <button type="button" className={previewMode === "artwork" ? "is-active" : ""} onClick={() => setPreviewMode("artwork")}>Artwork</button>
            <button type="button" className={previewMode === "layout" ? "is-active" : ""} onClick={() => setPreviewMode("layout")}>Layout</button>
          </div>
        </div>
        <PosterPreview
          concept={concept}
          imageState={imageState}
          mode={previewMode}
          textLayers={activeTextLayers}
          logoLayers={activeLogoLayers}
          selectedRole={selectedTextRole}
          selectedLogoId={selectedLogoId}
          onSelect={setSelectedTextRole}
          onSelectLogo={setSelectedLogoId}
          onMove={moveTextLayer}
          onMoveLogo={moveLogoLayer}
          onScaleLogo={scaleLogoLayer}
          onChangeLogoVariant={changeLogoVariant}
          onResetLogo={resetLogoLayer}
          onChange={updateTextLayer}
          onResetLayer={resetTextLayer}
          onResetAll={resetAllTextLayers}
        />
        {(editorWarning || exportBlockers.length > 0) && (
          <div className="poster-editor-validation" role="alert">
            {editorWarning && <p>{editorWarning}</p>}
            {exportBlockers.map((blocker, index) => (
              <p key={`${blocker}-${index}`}>{blocker}</p>
            ))}
          </div>
        )}
        <div className="poster-image-status">
          {imageState.status === "loading" && <p><i />Rendering the complete poster artwork from the approved composition…</p>}
          {imageState.status === "signed-out" && <p>Sign in with ChatGPT to render the artwork.</p>}
          {imageState.status === "error" && <div><p>{imageState.error}</p><button type="button" onClick={onRetryImage}>Retry artwork</button></div>}
          {imageState.status === "success" && <div><p>Exact {imageState.width} × {imageState.height} PNG · artwork source {imageState.sourceWidth} × {imageState.sourceHeight}{imageState.upscaled ? " · resized to requested output" : ""} · prompt {imageState.promptLengthBefore.toLocaleString()} → {imageState.compactContractLength.toLocaleString()} contract chars → {imageState.promptLengthAfter.toLocaleString()} provider chars</p><span className="poster-download-actions"><button type="button" className="is-primary" disabled={isExporting || exportBlockers.length > 0} onClick={exportFinalPoster}>{isExporting ? "Exporting…" : finalDownload.label}</button><button type="button" onClick={() => downloadPoster(imageState.image, imageState.width, imageState.height)}>{artworkDownload.label}</button></span></div>}
          {exportError && <p className="poster-export-error">{exportError}</p>}
        </div>
      </div>

      <div className="poster-production-heading">
        <div><span>Production plan</span><h2>All decisions, still editable</h2></div>
        <button type="button" onClick={() => downloadText(JSON.stringify({ brief: payload, prompt: JSON.parse(promptJson), concept: editedConcept, editor: { fontFamily: "Ubuntu", fontWeights: [400, 500, 700], fontsReady, textLayers: activeTextLayers, logoLayers: activeLogoLayers, validation: { geometryErrors, textFitErrors } } }, null, 2), `poster-production-spec-${Date.now()}.json`, "application/json")}>Download full spec</button>
      </div>

      <div className="poster-production-details">
        <Detail title="01 · Concept explanation" open>
          <p>{concept.conceptExplanation}</p>
          <div className="poster-placement-dark">
            <div><strong>Investor question</strong><p>{concept.financialNarrative.investorQuestion}</p></div>
            <div><strong>Hero metaphor</strong><p>{concept.financialNarrative.heroMetaphor}</p></div>
            {concept.financialNarrative.visualMappings.map((mapping, index) => (
              <div key={`${mapping.element}-${index}`}>
                <strong>{mapping.element}</strong>
                <p>{mapping.financialMeaning}</p>
              </div>
            ))}
            <div><strong>Relationship</strong><p>{concept.financialNarrative.relationship}</p></div>
            <div><strong>Financial guardrail</strong><p>{concept.financialNarrative.guardrail}</p></div>
          </div>
        </Detail>
        <Detail title="02 · Recommended layout direction"><p>{concept.recommendedLayoutDirection}</p></Detail>
        <Detail title="03 · Text hierarchy and line breaks"><div className="poster-hierarchy-table">{hierarchy.map(([label, treatment]) => <div key={label}><div><strong>{label}</strong><span className={treatment.include ? "is-included" : "is-omitted"}>{treatment.include ? "Included" : "Omitted"}</span></div><p>{treatment.lineBreaks.length ? treatment.lineBreaks.join(" / ") : "No visual layer"}</p><small>Ubuntu {treatment.ubuntuWeight} · {treatment.fontSizePx}px · {treatment.alignment} · line height {treatment.lineHeight}</small></div>)}</div></Detail>
        <Detail title="04 · Placement guidance"><div className="poster-placement-dark">{placements.map(([label, value]) => <div key={label}><strong>{label}</strong><p>{value}</p></div>)}</div></Detail>
        <Detail title="05 · Official-logo layers and safe areas"><div className="poster-safe-dark">{activeLogoLayers.map((layer) => <div key={layer.id}><strong>{layer.logo.brandName}</strong><BoundsCode bounds={layer.boundsPercent}/><p>Safe area: x {layer.logo.safeAreaBoundsPercent.x}% · y {layer.logo.safeAreaBoundsPercent.y}% · w {layer.logo.safeAreaBoundsPercent.width}% · h {layer.logo.safeAreaBoundsPercent.height}%</p><p>Expected asset: {layer.logo.assetPath}; neutral placeholder used when absent.</p></div>)}</div></Detail>
        <Detail title="06 · Selected colour combination"><div className="poster-colour-dark"><div>{paletteColours.map((colour) => <span key={colour} style={{ background: colour }} title={colour} />)}</div><strong>{concept.selectedColourCombination.name}</strong><p>{concept.selectedColourCombination.rationale}</p></div></Detail>
        <Detail title="07 · Selected 3D model reference category"><strong>{concept.selected3DModelReferenceCategory.label}</strong><p>{concept.selected3DModelReferenceCategory.application}</p></Detail>
        <Detail title="08 · Master image-generation prompt"><pre className="poster-plain-prompt">{concept.masterImageGenerationPrompt}</pre></Detail>
        <Detail title="09 · Negative prompt"><pre className="poster-plain-prompt poster-negative-prompt">{concept.negativePrompt}</pre></Detail>
        <Detail title="10 · Editable poster layout specification"><div className="poster-layer-dark">{editedConcept.editablePosterLayoutSpecification.layers.map((layer, index) => <div key={`${layer.zIndex}-${layer.name}-${index}`}><span>{String(layer.zIndex).padStart(2, "0")}</span><strong>{layer.name}</strong><BoundsCode bounds={layer.boundsPercent}/><p>{layer.notes}</p></div>)}</div></Detail>
        <Detail title="11 · Final quality-control checklist"><div className="poster-qc-dark">{qualityChecklist.map((item) => <label key={item}><input type="checkbox"/><span>{item}</span></label>)}</div></Detail>
      </div>
    </section>
  );
}
