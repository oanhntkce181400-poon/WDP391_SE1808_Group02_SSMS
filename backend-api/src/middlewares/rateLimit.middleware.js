const rateLimit = require('express-rate-limit');

// express-rate-limit v8 requires using this helper for IPv6-safe keys
const ipKeyGenerator = rateLimit.ipKeyGenerator;

function buildLimiter({
  windowMs,
  max,
  message,
  keyPrefix,
}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ipKey = ipKeyGenerator(req) || 'unknown';
      return `${keyPrefix}:${ipKey}`;
    },
    handler: (req, res) =>
      res.status(429).json({
        message,
      }),
  });
}

const authLoginLimiter = buildLimiter({
  windowMs: Number(process.env.RATE_LIMIT_AUTH_LOGIN_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_AUTH_LOGIN_MAX || 20),
  message: 'Too many login attempts. Please try again later.',
  keyPrefix: 'auth-login',
});

const authRefreshLimiter = buildLimiter({
  windowMs: Number(process.env.RATE_LIMIT_AUTH_REFRESH_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_AUTH_REFRESH_MAX || 60),
  message: 'Too many refresh requests. Please slow down.',
  keyPrefix: 'auth-refresh',
});

const authForgotPasswordLimiter = buildLimiter({
  windowMs: Number(process.env.RATE_LIMIT_AUTH_FORGOT_WINDOW_MS || 60 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_AUTH_FORGOT_MAX || 5),
  message: 'Too many OTP requests. Please try again later.',
  keyPrefix: 'auth-forgot',
});

const authResetPasswordLimiter = buildLimiter({
  windowMs: Number(process.env.RATE_LIMIT_AUTH_RESET_WINDOW_MS || 60 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_AUTH_RESET_MAX || 10),
  message: 'Too many reset attempts. Please try again later.',
  keyPrefix: 'auth-reset',
});

module.exports = {
  authLoginLimiter,
  authRefreshLimiter,
  authForgotPasswordLimiter,
  authResetPasswordLimiter,
};
