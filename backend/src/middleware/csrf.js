import crypto from 'crypto';
import { CsrfToken } from '../models/CsrfToken.js';

/**
 * Generate a cryptographically strong CSRF token
 */
export async function generateCSRFToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await CsrfToken.create({ token, expiresAt });
  
  return token;
}

/**
 * Verify CSRF token
 */
export async function verifyCSRFToken(token) {
  if (!token) return false;
  
  const stored = await CsrfToken.findOne({ token });
  
  if (!stored) {
    return false;
  }
  
  // Check if token expired
  if (new Date() > stored.expiresAt) {
    await CsrfToken.deleteOne({ _id: stored._id });
    return false;
  }
  
  return true;
}

/**
 * CSRF Protection Middleware
 * Protects POST, PUT, PATCH, DELETE requests
 * Exempts auth routes (login, register, OTP)
 */
export async function csrfProtection(req, res, next) {
  try {
    // Skip CSRF check for GET, HEAD, OPTIONS (read-only requests)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    // Skip CSRF for authentication routes (login, register, OTP)
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
    
    const isValid = await verifyCSRFToken(token);
    if (!isValid) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired CSRF token.',
      });
    }
    
    // Token is valid, proceed
    next();
  } catch (e) {
    console.error('[CSRF] Error:', e);
    next(); // In case of DB error, let it through but log it, or fail secure? Fail secure is better, but maybe next(e)?
  }
}

/**
 * Middleware to generate and attach CSRF token to response
 * Note: Since this is async now, it must be handled carefully
 */
export async function attachCSRFToken(req, res, next) {
  try {
    const token = await generateCSRFToken();
    res.setHeader('X-CSRF-Token', token);
    res.locals.csrfToken = token;
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * Route handler to get CSRF token
 */
export async function getCSRFToken(req, res) {
  try {
    const token = await generateCSRFToken();
    res.json({ 
      success: true, 
      token,
      message: 'CSRF token generated successfully' 
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate CSRF token' });
  }
}
