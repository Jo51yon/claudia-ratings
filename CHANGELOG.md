# Changelog

Semantic versioning: MAJOR = a prop, exported type, or default behaviour changed in a way that
could break an existing consumer without any code change on their side. MINOR = additive only.
Consuming projects should pin to a tag (`#v1.0.0`), never `#main`.

## v1.0.0 — 2026-08-24

First release. `ClaudiaStarRating` -- found while checking SafeSpaces' real `blog_ratings`
table: its `rating_type` enum overlaps heavily with `@jo51yon/claudia-reactions` (`thumbs_up`,
`clap`, etc. are the same concept) -- only `star` is genuinely different in kind, a numeric
average rating rather than a discrete count. Rather than a redundant parallel table, this
reuses `claudia_reactions` directly, with `reaction_type='star'` and the real, additive
`rating_value` column `claudia-reactions` v1.1.0 shipped specifically for this.

A real, deliberately different interaction model from `ClaudiaReactions`' own emoji picker:
emoji reactions toggle; a star rating is a "set my rating to N" action. Uses a real
delete-then-insert flow rather than a raw `UPDATE`, reusing the exact same, already-proven
`insert_own`/`delete_own` RLS policies from `claudia-reactions` rather than adding new policy
surface. Verified before this UI was built: inserted a rating of 3, then changed it to 5,
confirmed the value genuinely changed -- not just that no error was thrown.

**Known consumers at this tag:** none yet at release.
