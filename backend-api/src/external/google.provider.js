let OAuth2Client;

try {
  ({ OAuth2Client } = require('google-auth-library'));
} catch (err) {
  OAuth2Client = null;
}

function getGoogleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Missing GOOGLE_CLIENT_ID in environment variables.');
  }

  if (!OAuth2Client) {
    throw new Error(
      'google-auth-library is not installed. Run: npm install google-auth-library',
    );
  }

  return new OAuth2Client(clientId);
}

async function verifyGoogleIdToken(idToken) {
  if (!idToken) {
    throw new Error('Missing Google ID token.');
  }

  const client = getGoogleClient();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
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

