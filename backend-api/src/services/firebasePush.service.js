const User = require('../models/user.model');
const pushTokenService = require('./pushToken.service');

let firebaseApp = null;
let firebaseAdmin = null;

function getFirebaseAdmin() {
  if (firebaseAdmin) {
    return firebaseAdmin;
  }

  try {
    // Lazy-load để backend không bị crash nếu package chưa được cài trên máy hiện tại.
    firebaseAdmin = require('firebase-admin');
    return firebaseAdmin;
  } catch (error) {
    console.warn('[firebasePush] firebase-admin is not installed yet.');
    return null;
  }
}

function buildServiceAccountFromEnv() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    return JSON.parse(rawJson);
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n'),
    };
  }

  return null;
}

function getFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const admin = getFirebaseAdmin();
  if (!admin) {
    return null;
  }

  const serviceAccount = buildServiceAccountFromEnv();
  if (!serviceAccount) {
    return null;
  }

  firebaseApp = admin.apps.length
    ? admin.app()
    : admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

  return firebaseApp;
}

function isFirebaseConfigured() {
  try {
    return Boolean(buildServiceAccountFromEnv());
  } catch (error) {
    console.error('[firebasePush] Invalid Firebase config:', error.message);
    return false;
  }
}

async function sendToStudents({ title, body, data = {} }) {
  const app = getFirebaseApp();
  const admin = getFirebaseAdmin();
  if (!app || !admin) {
    return {
      sent: false,
      reason: 'firebase-not-configured',
    };
  }

  const students = await User.find({
    role: 'student',
    status: 'active',
    isActive: true,
  })
    .select('_id')
    .lean();

  const userIds = students.map((item) => item._id);
  const tokenRows = await pushTokenService.getActiveTokensForUsers(userIds);
  const tokens = tokenRows.map((item) => item.token).filter(Boolean);

  if (tokens.length === 0) {
    return {
      sent: false,
      reason: 'no-active-push-tokens',
    };
  }

  const messaging = admin.messaging(app);
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title,
      body,
    },
    data: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value ?? '')]),
    ),
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        sound: 'default',
      },
    },
  });

  const invalidTokens = [];
  response.responses.forEach((item, index) => {
    if (item.success) return;

    const errorCode = item.error?.code || '';
    if (
      errorCode.includes('registration-token-not-registered') ||
      errorCode.includes('invalid-argument')
    ) {
      invalidTokens.push(tokens[index]);
    }
  });

  if (invalidTokens.length > 0) {
    await pushTokenService.deactivateTokens(invalidTokens);
  }

  return {
    sent: response.successCount > 0,
    successCount: response.successCount,
    failureCount: response.failureCount,
    invalidatedTokens: invalidTokens.length,
  };
}

async function sendAnnouncementCreatedToStudents(announcement) {
  if (!announcement?._id) {
    return {
      sent: false,
      reason: 'invalid-announcement',
    };
  }

  const title = announcement.title || 'Thông báo mới từ nhà trường';
  const body = announcement.content
    ? String(announcement.content).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140)
    : 'Có thông báo mới vừa được đăng.';

  return sendToStudents({
    title,
    body,
    data: {
      type: 'announcement',
      screen: 'notification-detail',
      announcementId: announcement._id,
    },
  });
}

module.exports = {
  isFirebaseConfigured,
  sendAnnouncementCreatedToStudents,
};
