import crypto from 'crypto';

// In-memory CSRF token store (use Redis in production)
const csrfTokenStore = new Map();

/**
 * Generate a cryptographically strong CSRF token
 */
export function generateCSRFToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  csrfTokenStore.set(token, { expiresAt, createdAt: Date.now() });
  
  // Clean up old tokens periodically
  if (csrfTokenStore.size > 1000) {
    cleanupExpiredTokens();
  }
  
  return token;
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token) {
  if (!token) return false;
  
  const stored = csrfTokenStore.get(token);
  
  if (!stored) {
    return false;
  }
  
  // Check if token expired
  if (Date.now() > stored.expiresAt) {
    csrfTokenStore.delete(token);
    return false;
  }
  
  return true;
}

/**
 * CSRF Protection Middleware
 * Protects POST, PUT, PATCH, DELETE requests
 * Exempts auth routes (login, register, OTP)
 */
export function csrfProtection(req, res, next) {
  // Skip CSRF check for GET, HEAD, OPTIONS (read-only requests)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for authentication routes (login, register, OTP)
  // Check both /api/auth/* and /auth/* patterns
  if (req.path.includes('/auth/')) {
    return next();
  }
  
  // Get CSRF token from header
  const token = req.headers['x-csrf-token'];
  
  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing. Include X-CSRF-Token header in your request.',
    });
  }
  
  if (!verifyCSRFToken(token)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired CSRF token.',
    });
  }
  
  // Token is valid, proceed
  next();
}

/**
 * Middleware to generate and attach CSRF token to response
 */
export function attachCSRFToken(req, res, next) {
  const token = generateCSRFToken();
  
  // Attach to response header
  res.setHeader('X-CSRF-Token', token);
  
  // Also make it available in locals for templates
  res.locals.csrfToken = token;
  
  next();
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  const expiredTokens = [];
  
  for (const [token, data] of csrfTokenStore.entries()) {
    if (now > data.expiresAt) {
      expiredTokens.push(token);
    }
  }
  
  expiredTokens.forEach(token => csrfTokenStore.delete(token));
  
  console.log(`[CSRF] Cleaned up ${expiredTokens.length} expired tokens`);
}

// Clean up every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

/**
 * Route handler to get CSRF token
 */
export function getCSRFToken(req, res) {
  const token = generateCSRFToken();
  res.json({ 
    success: true, 
    token,
    message: 'CSRF token generated successfully' 
  });
}
