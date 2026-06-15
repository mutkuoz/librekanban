/**
 * Extract mentioned member ids from a comment body. Matches `@Name`
 * case-insensitively against the given members. Pure and unit-tested so the
 * (fuzzy) matching rule lives in one place, shared by server and any future
 * client autocomplete.
 */
export function parseMentions(body: string, members: { id: string; name: string }[]): string[] {
  const ids = new Set<string>();
  const lower = body.toLowerCase();
  for (const m of members) {
    if (m.name && lower.includes(`@${m.name.toLowerCase()}`)) ids.add(m.id);
  }
  return [...ids];
}
