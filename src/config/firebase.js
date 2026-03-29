// Firebase Admin SDK — FCM (push notifications) only.
// Firestore, Auth, and Storage are not used; all persistent data lives in MySQL.
const admin = require('firebase-admin');
const logger = require('../utils/logger');

let firebaseApp;
let _disabled = false;

const initFirebase = () => {
  if (_disabled) return null;
  if (!firebaseApp) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!projectId || !clientEmail || !privateKey) {
      _disabled = true;
      logger.warn('Firebase credentials missing — FCM disabled');
      return null;
    }
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey
          .replace(/^["']|["']$/g, '')
          .replace(/\\n/g, '\n'),
      }),
    });
  }
  return firebaseApp;
};

const getMessaging = () => { const app = initFirebase(); return app ? admin.messaging() : null; };

module.exports = { initFirebase, getMessaging };
