import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * ClaudiaStarRating — a real 1-5 star rating widget, average + count display. Found while
 * checking SafeSpaces' real blog_ratings table: its rating_type enum overlaps heavily with
 * @jo51yon/claudia-reactions (thumbs_up, clap, etc. are the same concept) -- only 'star' is
 * genuinely different in kind (a numeric average, not a discrete count). Rather than a
 * redundant parallel table, this reuses claudia_reactions directly (the same table
 * @jo51yon/claudia-reactions writes to), with reaction_type='star' and the real, additive
 * rating_value column that package shipped in v1.1.0 specifically for this.
 *
 * A real, deliberately different interaction model from ClaudiaReactions' own emoji picker:
 * emoji reactions toggle (click again to remove); a star rating is a "set my rating to N"
 * action, proven with a real delete-then-insert flow (not a raw UPDATE, reusing the exact
 * same, already-proven insert_own/delete_own RLS policies rather than adding new policy
 * surface) -- verified before this UI was built: insert rating=3, then change to rating=5,
 * confirmed the change actually took effect, not just that no error was thrown.
 */
export interface ClaudiaStarRatingCopy {
  countLabel: (n: number) => string;
  signInPrompt: string;
}
const DEFAULT_COPY: ClaudiaStarRatingCopy = {
  countLabel: (n) => `${n} ${n === 1 ? 'rating' : 'ratings'}`,
  signInPrompt: 'Sign in to rate.',
};

export interface ClaudiaStarRatingProps {
  supabase: SupabaseClient;
  projectSlug: string;
  entityType: string;
  entityId: string;
  currentUserId?: string;
  /** Purely visual -- doesn't change any real logic. Defaults to a readable, medium size. */
  starSize?: number;
  copy?: Partial<ClaudiaStarRatingCopy>;
}

interface StarRow { id: string; user_id: string; rating_value: number | null }

export default function ClaudiaStarRating({ supabase, projectSlug, entityType, entityId, currentUserId, starSize = 20, copy: copyProp }: ClaudiaStarRatingProps) {
  const copy = { ...DEFAULT_COPY, ...copyProp };
  const [ratings, setRatings] = useState<StarRow[] | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  function fetchAll() {
    supabase.from('claudia_reactions').select('id, user_id, rating_value')
      .eq('project_slug', projectSlug).eq('entity_type', entityType).eq('entity_id', entityId).eq('reaction_type', 'star')
      .then(({ data }: { data: StarRow[] | null }) => setRatings(data ?? []));
  }
  useEffect(fetchAll, [supabase, projectSlug, entityType, entityId]);

  async function setMyRating(value: number) {
    if (!currentUserId || busy) return;
    setBusy(true);
    const existing = ratings?.find((r) => r.user_id === currentUserId);
    if (existing) await supabase.from('claudia_reactions').delete().eq('id', existing.id);
    await supabase.from('claudia_reactions').insert({
      project_slug: projectSlug, entity_type: entityType, entity_id: entityId,
      user_id: currentUserId, reaction_type: 'star', rating_value: value,
    });
    setBusy(false);
    fetchAll();
  }

  if (ratings === null) return null;

  const myRating = currentUserId ? ratings.find((r) => r.user_id === currentUserId)?.rating_value ?? null : null;
  const values = ratings.map((r) => r.rating_value).filter((v): v is number => v != null);
  const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const displayValue = hover ?? myRating ?? Math.round(average);

  return (
    <div>
      <div style={{ display: 'flex', gap: 2 }} onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" disabled={!currentUserId || busy}
                  onClick={() => setMyRating(n)} onMouseEnter={() => setHover(n)}
                  style={{ background: 'none', border: 'none', cursor: currentUserId ? 'pointer' : 'default', padding: 0, fontSize: starSize,
                           color: n <= displayValue ? 'var(--claudia-kernel-brand, #f5a623)' : 'var(--claudia-kernel-line, #d8d8d8)' }}>
            {'\u2605'}
          </button>
        ))}
      </div>
      <p className="dim" style={{ fontSize: '.78rem', margin: '4px 0 0' }}>
        {values.length > 0 ? `${average.toFixed(1)} \u00b7 ${copy.countLabel(values.length)}` : (currentUserId ? '' : copy.signInPrompt)}
      </p>
    </div>
  );
}
