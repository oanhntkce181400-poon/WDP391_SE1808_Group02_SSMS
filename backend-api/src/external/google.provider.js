let OAuth2Client;

try {
  ({ OAuth2Client } = require('google-auth-library'));
} catch (err) {
  OAuth2Client = null;
}

function normalizeClientId(value) {
  return String(value || '').trim();
}

function splitClientIds(value) {
  return String(value || '')
    .split(',')
    .map((item) => normalizeClientId(item))
    .filter(Boolean);
}

function getGoogleAudiences() {
  return Array.from(
    new Set(
      [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_WEB_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID,
        ...splitClientIds(process.env.GOOGLE_ALLOWED_CLIENT_IDS),
      ]
        .map((value) => normalizeClientId(value))
        .filter(Boolean),
    ),
  );
}

function getGoogleClient() {
  const audiences = getGoogleAudiences();
  if (!audiences.length) {
    console.warn(
      'Google client IDs are not configured - Google login will be disabled.',
    );
    return null;
  }

  if (!OAuth2Client) {
    throw new Error(
      'google-auth-library is not installed. Run: npm install google-auth-library',
    );
  }

  return new OAuth2Client(audiences[0]);
}

async function verifyGoogleIdToken(idToken) {
  if (!idToken) {
    throw new Error('Missing Google ID token.');
  }

  const audiences = getGoogleAudiences();
  const client = getGoogleClient();
  if (!client) {
    throw new Error(
      'Google login is not configured. Please set GOOGLE_CLIENT_ID or the platform-specific Google client IDs.',
    );
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: audiences,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('Invalid Google ID token payload.');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified,
    fullName: payload.name,
    avatarUrl: payload.picture,
  };
}

module.exports = {
  verifyGoogleIdToken,
};

