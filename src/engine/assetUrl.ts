import versions from 'virtual:asset-versions';

const table = versions as Record<string, string>;

/** The URL to fetch a public asset from: rooted, with its content hash (see vite.config.ts) as `?v=`.
 * /assets/* is cached as immutable, so every asset request goes through here; a URL that already
 * carries a query, or names a file outside the table, is returned rooted and otherwise unchanged. */
export function assetUrl(path: string): string {
  const url = '/' + path.replace(/^\//, '');
  if (url.includes('?')) return url;
  const v = table[url];
  return v ? `${url}?v=${v}` : url;
}
