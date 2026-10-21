import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  COMMENT_MAX_LENGTH,
  RADIUS_MAX_METERS,
  RADIUS_MIN_METERS,
  type Category,
} from '@ideas-map/shared';

export interface RequestDraft {
  lat: number | null;
  lng: number | null;
  category: string;
  radiusMeters: number;
  comment: string;
}

interface Props {
  draft: RequestDraft;
  categories: Category[];
  onChange: (patch: Partial<RequestDraft>) => void;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
}

export function formatRadius(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

export function RequestForm({ draft, categories, onChange, onSubmit, onCancel }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPoint = draft.lat !== null && draft.lng !== null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel request-form" onSubmit={handleSubmit} aria-label="New demand request">
      <h2>What do you want nearby?</h2>
      <p className={hasPoint ? 'muted small' : 'hint'}>
        {hasPoint
          ? `Pin at ${draft.lat!.toFixed(5)}, ${draft.lng!.toFixed(5)}. Click the map to move it.`
          : 'Click on the map to drop a pin.'}
      </p>

      <fieldset className="category-grid">
        <legend>Category</legend>
        {categories.map((c) => (
          <label key={c.slug} className={draft.category === c.slug ? 'chip active' : 'chip'}>
            <input
              type="radio"
              name="category"
              value={c.slug}
              checked={draft.category === c.slug}
              onChange={() => onChange({ category: c.slug })}
            />
            <span aria-hidden>{c.icon}</span> {c.name}
          </label>
        ))}
      </fieldset>

      <label>
        <span>
          Within <strong>{formatRadius(draft.radiusMeters)}</strong>
        </span>
        <input
          type="range"
          min={RADIUS_MIN_METERS}
          max={RADIUS_MAX_METERS}
          step={50}
          value={draft.radiusMeters}
          onChange={(e) => onChange({ radiusMeters: Number(e.target.value) })}
        />
      </label>

      <label>
        <span>
          Comment <span className="muted small">(optional)</span>
        </span>
        <textarea
          rows={3}
          maxLength={COMMENT_MAX_LENGTH}
          placeholder="e.g. A quiet cafe with good coffee and wifi"
          value={draft.comment}
          onChange={(e) => onChange({ comment: e.target.value })}
        />
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!hasPoint || !draft.category || submitting}
        >
          {submitting ? 'Saving...' : 'Submit request'}
        </button>
      </div>
    </form>
  );
}
