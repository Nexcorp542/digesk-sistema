const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  throw new Error(
    'Faltan variables de entorno de Firebase (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Revisa api/.env'
  );
}

initializeApp({
  credential: cert(serviceAccount),
});

module.exports = getFirestore();