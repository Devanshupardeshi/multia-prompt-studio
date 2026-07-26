"use client";

import { useMemo, useState } from "react";
import {
  POSTER_BACKGROUND_COMBINATIONS,
  POSTER_CATEGORIES,
} from "@/lib/poster-reference-system";
import type {
  PosterBackgroundChoice,
  PosterBandhanLogoVariant,
  PosterCnbcLogoVariant,
  PosterModelCategory,
  PosterSize,
  PosterStudioPayload,
} from "@/lib/poster-types";

const BACKGROUND_CHOICES: Array<{
  id: PosterBackgroundChoice;
  label: string;
  swatch: string;
}> = [
  { id: "auto", label: "Auto (Prussian Blue default)", swatch: POSTER_BACKGROUND_COMBINATIONS["prussian-blue"].background },
  { id: "prussian-blue", label: POSTER_BACKGROUND_COMBINATIONS["prussian-blue"].name, swatch: POSTER_BACKGROUND_COMBINATIONS["prussian-blue"].background },
  { id: "maroon-navy", label: POSTER_BACKGROUND_COMBINATIONS["maroon-navy"].name, swatch: `linear-gradient(135deg, ${POSTER_BACKGROUND_COMBINATIONS["maroon-navy"].background}, ${POSTER_BACKGROUND_COMBINATIONS["prussian-blue"].background})` },
];

const CNBC_LOGO_CHOICES: Array<{ id: PosterCnbcLogoVariant; label: string }> = [
  { id: "tv18", label: "CNBC TV18" },
  { id: "awaaz", label: "CNBC-AWAAZ" },
];

const BANDHAN_LOGO_CHOICES: Array<{ id: PosterBandhanLogoVariant; label: string }> = [
  { id: "dark-bg", label: "White text (for dark background)" },
  { id: "light-bg", label: "Navy text (for light background)" },
];

interface PosterStudioFormProps {
  isLoading: boolean;
  onGenerate: (payload: PosterStudioPayload) => void;
}

const SIZE_PRESETS: Array<{ id: string; label: string; detail: string; size: PosterSize }> = [
  { id: "instagram", label: "Instagram 4:5", detail: "1080 × 1350", size: { width: 1080, height: 1350 } },
  { id: "production", label: "Production 4:5", detail: "2160 × 2700", size: { width: 2160, height: 2700 } },
  { id: "square", label: "Square", detail: "2160 × 2160", size: { width: 2160, height: 2160 } },
  { id: "story", label: "Story 9:16", detail: "2160 × 3840", size: { width: 2160, height: 3840 } },
];

const fieldClass = "input-multia poster-dark-input w-full px-4 py-3.5 text-[15px] leading-relaxed disabled:opacity-40";

function FieldLabel({ children, count }: { children: React.ReactNode; count?: string }) {
  return (
    <span className="poster-dark-label">
      <span>{children}</span>
      {count && <small>{count}</small>}
    </span>
  );
}

export function PosterStudioForm({ isLoading, onGenerate }: PosterStudioFormProps) {
  const [headline, setHeadline] = useState("");
  const [subheading, setSubheading] = useState("");
  const [bodyCopy, setBodyCopy] = useState("");
  const [cta, setCta] = useState("Watch MF Corner today at 2 PM");
  const [topic, setTopic] = useState("");
  const [modelCategory, setModelCategory] = useState<PosterModelCategory>("glassmorphism-3d");
  const [backgroundChoice, setBackgroundChoice] = useState<PosterBackgroundChoice>("auto");
  const [cnbcLogoVariant, setCnbcLogoVariant] = useState<PosterCnbcLogoVariant>("tv18");
  const [bandhanLogoVariant, setBandhanLogoVariant] = useState<PosterBandhanLogoVariant>("dark-bg");
  const [visualDirection, setVisualDirection] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | undefined>();
  const [referenceImageName, setReferenceImageName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [sizePreset, setSizePreset] = useState("production");
  const [customWidth, setCustomWidth] = useState("2160");
  const [customHeight, setCustomHeight] = useState("2700");

  const outputSize = useMemo<PosterSize>(() => {
    const preset = SIZE_PRESETS.find((item) => item.id === sizePreset);
    return preset?.size ?? {
      width: Number(customWidth) || 2160,
      height: Number(customHeight) || 2700,
    };
  }, [customHeight, customWidth, sizePreset]);

  const validSize =
    Number.isInteger(outputSize.width) &&
    Number.isInteger(outputSize.height) &&
    outputSize.width >= 512 &&
    outputSize.height >= 512 &&
    outputSize.width <= 4096 &&
    outputSize.height <= 4096;
  const isValid = headline.trim().length > 0 && topic.trim().length > 0 && validSize;

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setUploadError("Reference poster must be smaller than 12 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(reader.result as string);
      setReferenceImageName(file.name);
      setUploadError("");
    };
    reader.readAsDataURL(file);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid || isLoading) return;
    onGenerate({
      mode: "poster-design",
      headline: headline.trim(),
      subheading: subheading.trim(),
      bodyCopy: bodyCopy.trim(),
      cta: cta.trim(),
      topic: topic.trim(),
      modelCategory,
      visualDirection: visualDirection.trim(),
      // No approved-poster picker anymore — nothing is sent to the model unless the
      // user explicitly uploads a reference image below.
      referencePosterId: undefined,
      referenceImage,
      outputSize,
      backgroundChoice,
      cnbcLogoVariant,
      bandhanLogoVariant,
    });
  };

  return (
    <form onSubmit={submit} className="poster-standard-form" aria-label="Poster design brief">
      <section className="poster-form-block">
        <div className="poster-block-heading">
          <div>
            <span>Poster brief</span>
            <h2>Communication</h2>
          </div>
          <p>Headline and topic are required. Supporting copy is optional.</p>
        </div>

        <div className="poster-fields-grid">
          <label className="poster-dark-field">
            <FieldLabel count={`${topic.length}/300`}>Poster topic *</FieldLabel>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              disabled={isLoading}
              maxLength={300}
              className={fieldClass}
              placeholder="e.g. Understanding business cycle funds"
            />
          </label>

          <label className="poster-dark-field poster-field-wide">
            <FieldLabel count={`${headline.length}/180`}>Headline *</FieldLabel>
            <textarea
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              disabled={isLoading}
              maxLength={180}
              rows={3}
              className={`${fieldClass} resize-y text-[17px] font-semibold`}
              placeholder="The single idea readers should understand first"
            />
          </label>

          <label className="poster-dark-field">
            <FieldLabel count={`${subheading.length}/280`}>Subheading</FieldLabel>
            <textarea
              value={subheading}
              onChange={(event) => setSubheading(event.target.value)}
              disabled={isLoading}
              maxLength={280}
              rows={3}
              className={`${fieldClass} resize-y`}
              placeholder="Supporting context, if essential"
            />
          </label>

          <label className="poster-dark-field">
            <FieldLabel count={`${cta.length}/180`}>CTA</FieldLabel>
            <textarea
              value={cta}
              onChange={(event) => setCta(event.target.value)}
              disabled={isLoading}
              maxLength={180}
              rows={3}
              className={`${fieldClass} resize-y`}
              placeholder="What should the reader do next?"
            />
          </label>

          <label className="poster-dark-field poster-field-wide">
            <FieldLabel count={`${bodyCopy.length}/1200`}>Body copy</FieldLabel>
            <textarea
              value={bodyCopy}
              onChange={(event) => setBodyCopy(event.target.value)}
              disabled={isLoading}
              maxLength={1200}
              rows={4}
              className={`${fieldClass} resize-y`}
              placeholder="Optional supporting copy. When supplied, it is included in full in a dedicated editorial panel."
            />
          </label>
        </div>
      </section>

      <section className="poster-form-block">
        <div className="poster-block-heading">
          <div>
            <span>Approved visual language</span>
            <h2>3D model reference category</h2>
          </div>
          <p>The selected board controls construction and finish, not composition.</p>
        </div>

        <div className="poster-dark-category-grid">
          {(Object.keys(POSTER_CATEGORIES) as PosterModelCategory[]).map((id) => {
            const category = POSTER_CATEGORIES[id];
            const selected = modelCategory === id;
            return (
              <button
                type="button"
                key={id}
                onClick={() => setModelCategory(id)}
                disabled={isLoading}
                aria-pressed={selected}
                className={`poster-dark-category ${selected ? "is-selected" : ""}`}
              >
                <img src={`/poster-studio/reference-boards/${category.boardFile}`} alt="" />
                <span aria-hidden="true" />
                <div>
                  <strong>{category.shortLabel}</strong>
                  <small>{selected ? "Selected reference" : "Select reference"}</small>
                </div>
              </button>
            );
          })}
        </div>

        <fieldset className="poster-dark-field poster-background-field">
          <FieldLabel>Background colour</FieldLabel>
          <div className="poster-background-choice-row" role="radiogroup" aria-label="Background colour">
            {BACKGROUND_CHOICES.map((choice) => (
              <button
                type="button"
                key={choice.id}
                onClick={() => setBackgroundChoice(choice.id)}
                disabled={isLoading}
                role="radio"
                aria-checked={backgroundChoice === choice.id}
                className={`poster-background-choice ${backgroundChoice === choice.id ? "is-selected" : ""}`}
              >
                <span className="poster-background-swatch" style={{ background: choice.swatch }} aria-hidden="true" />
                {choice.label}
              </button>
            ))}
          </div>
          <small>Matches the deep campaign colour scheme used in approved posters &mdash; never a white or light background.</small>
        </fieldset>

        <fieldset className="poster-dark-field poster-background-field">
          <FieldLabel>Logo marks</FieldLabel>
          <div className="poster-background-choice-row" role="radiogroup" aria-label="CNBC logo variant">
            {CNBC_LOGO_CHOICES.map((choice) => (
              <button
                type="button"
                key={choice.id}
                onClick={() => setCnbcLogoVariant(choice.id)}
                disabled={isLoading}
                role="radio"
                aria-checked={cnbcLogoVariant === choice.id}
                className={`poster-background-choice ${cnbcLogoVariant === choice.id ? "is-selected" : ""}`}
              >
                {choice.label}
              </button>
            ))}
          </div>
          <div className="poster-background-choice-row" role="radiogroup" aria-label="Bandhan Mutual Fund logo variant">
            {BANDHAN_LOGO_CHOICES.map((choice) => (
              <button
                type="button"
                key={choice.id}
                onClick={() => setBandhanLogoVariant(choice.id)}
                disabled={isLoading}
                role="radio"
                aria-checked={bandhanLogoVariant === choice.id}
                className={`poster-background-choice ${bandhanLogoVariant === choice.id ? "is-selected" : ""}`}
              >
                {choice.label}
              </button>
            ))}
          </div>
          <small>Both are real, unmodified brand marks &mdash; pick the CNBC channel sub-brand and the Bandhan text colour that matches your chosen background.</small>
        </fieldset>

        <label className="poster-dark-field poster-direction-field">
          <FieldLabel count={`${visualDirection.length}/1200`}>Optional visual direction</FieldLabel>
          <textarea
            value={visualDirection}
            onChange={(event) => setVisualDirection(event.target.value)}
            disabled={isLoading}
            maxLength={1200}
            rows={4}
            className={`${fieldClass} resize-y`}
            placeholder="e.g. Use an hourglass as the only metaphor; keep the upper third especially quiet"
          />
        </label>
      </section>

      <section className="poster-form-block">
        <div className="poster-block-heading">
          <div>
            <span>Campaign grounding</span>
            <h2>Reference image (optional)</h2>
          </div>
          <p>
            Its layout and visual tone are matched; its words, logos and hero object are never
            copied. Nothing is sent to the model unless you upload one here.
          </p>
        </div>

        <div className="poster-dark-reference-row">
          <div className="poster-dark-reference-preview">
            {referenceImage ? (
              <img src={referenceImage} alt="Uploaded poster reference" />
            ) : (
              <div><span>No reference</span><small>GPT-5.6 Sol works from the brief and the category spec alone</small></div>
            )}
          </div>

          <div className="poster-reference-controls">
            <div className="poster-reference-actions">
              <label className="poster-upload-dark">
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} disabled={isLoading} />
                {referenceImage ? "Replace reference" : "Upload reference image"}
              </label>
              {referenceImage && (
                <button type="button" onClick={() => { setReferenceImage(undefined); setReferenceImageName(""); }}>
                  Remove
                </button>
              )}
            </div>
            {referenceImageName && <p className="poster-file-note">{referenceImageName}</p>}
            {uploadError && <p className="poster-file-error">{uploadError}</p>}
          </div>
        </div>
      </section>

      <section className="poster-form-block">
        <div className="poster-block-heading">
          <div>
            <span>Output</span>
            <h2>Canvas size</h2>
          </div>
          <p>PNG export is resized to the exact requested dimensions.</p>
        </div>

        <div className="poster-dark-size-grid">
          {SIZE_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.id}
              disabled={isLoading}
              aria-pressed={sizePreset === preset.id}
              onClick={() => setSizePreset(preset.id)}
              className={sizePreset === preset.id ? "is-selected" : ""}
            >
              <strong>{preset.label}</strong><span>{preset.detail}</span>
            </button>
          ))}
          <button type="button" disabled={isLoading} aria-pressed={sizePreset === "custom"} onClick={() => setSizePreset("custom")} className={sizePreset === "custom" ? "is-selected" : ""}>
            <strong>Custom</strong><span>512–4096 px</span>
          </button>
        </div>

        {sizePreset === "custom" && (
          <div className="poster-custom-size">
            <label className="poster-dark-field"><FieldLabel>Width (px)</FieldLabel><input type="number" min={512} max={4096} value={customWidth} onChange={(event) => setCustomWidth(event.target.value)} className={fieldClass} /></label>
            <label className="poster-dark-field"><FieldLabel>Height (px)</FieldLabel><input type="number" min={512} max={4096} value={customHeight} onChange={(event) => setCustomHeight(event.target.value)} className={fieldClass} /></label>
          </div>
        )}
      </section>

      <div className="poster-dark-submit">
        <div><strong>GPT-5.6 Sol</strong><span>High reasoning · no fallback · exact JSON contract</span></div>
        <button type="submit" disabled={!isValid || isLoading} className={`btn-multia btn-multia-filled ${!isValid || isLoading ? "opacity-30 cursor-not-allowed" : ""}`}>
          {isLoading ? "Directing poster…" : "Generate poster"}
        </button>
      </div>
    </form>
  );
}
