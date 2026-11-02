/**
 * isPlayableVideoUrl — pure guard for exercise demo video URLs.
 *
 * The mobile app must never render a video player (nor reserve a black
 * 16/9 block) for a URL that cannot actually be played. A value is playable
 * only when it is a non-empty string, contains no whitespace, and parses to an
 * absolute `http`/`https` URL with a non-empty host.
 *
 * Any other value (null, undefined, empty, whitespace, relative URL,
 * `ftp://…`, protocol-relative `//host/x`, malformed) is NOT playable.
 */

// Absolute http(s) URL with a mandatory non-empty host. The host cannot
// contain whitespace, `/`, `?` or `#`.
const ABSOLUTE_HTTP_URL = /^https?:\/\/[^\s/?#]+/i;

export function isPlayableVideoUrl(url: string | null | undefined): url is string {
  if (typeof url !== 'string') return false;
  if (url.length === 0) return false;
  // Any whitespace anywhere (leading, trailing, embedded) invalidates the URL.
  if (/\s/.test(url)) return false;

  // The regex requires an absolute scheme plus at least one host character.
  return ABSOLUTE_HTTP_URL.test(url);
}
