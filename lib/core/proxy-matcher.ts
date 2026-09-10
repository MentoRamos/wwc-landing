/**
 * Which requests reach the proxy.
 *
 * Kept in its own module so the pattern can be asserted in a test: the proxy
 * is what renews the session cookie, and a matcher that quietly stops covering
 * a route throws no error — people simply start getting logged out there.
 *
 * Everything is covered except Next's own build output and any request for a
 * file with an extension, which is how `/photos/*.png` and `/icon.svg` are
 * served straight off disk.
 */
export const PROXY_MATCHER = ['/((?!_next/static|_next/image|.*\\.[\\w]+$).*)'];
