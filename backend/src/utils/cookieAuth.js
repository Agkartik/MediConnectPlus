/**
 * Secure Cookie-based JWT Authentication
 * More secure than localStorage - immune to XSS attacks
 */

const JWT_COOKIE_NAME = 'mediconnect_auth';
const JWT_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Set authentication cookie (HTTP-only, secure)
 */
export function setAuthCookie(res, token) {
  res.cookie(JWT_COOKIE_NAME, token, {
    httpOnly: true,           // JavaScript cannot access this cookie
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',       // Prevents CSRF attacks
    maxAge: JWT_COOKIE_MAX_AGE,
    path: '/',                // Available on all routes
  });
}

/**
 * Clear authentication cookie (logout)
 */
export function clearAuthCookie(res) {
  res.clearCookie(JWT_COOKIE_NAME, {
    path: '/',
  });
}

/**
 * Get token from cookie (for auth middleware)
 */
export function getTokenFromCookie(req) {
  return req.cookies?.[JWT_COOKIE_NAME] || null;
}

/**
 * Cookie configuration info (for frontend)
 */
export function getCookieConfig() {
  return {
    name: JWT_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: JWT_COOKIE_MAX_AGE,
  };
}
