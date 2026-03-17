const admin = require('firebase-admin');

let firebaseApp;

const initFirebase = () => {
  if (!firebaseApp) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY
          ?.replace(/^["']|["']$/g, '')   // strip accidental surrounding quotes
          ?.replace(/\\n/g, '\n'),         // convert literal \n to real newlines
      }),
    });
  }
  return firebaseApp;
};

const getFirestore = () => { initFirebase(); return admin.firestore(); };
const getMessaging = () => { initFirebase(); return admin.messaging(); };
const getAuth     = () => { initFirebase(); return admin.auth(); };

module.exports = { initFirebase, getFirestore, getMessaging, getAuth };
