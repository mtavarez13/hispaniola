import 'server-only';

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const serviceAccountProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const serviceAccountClientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const serviceAccountPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

const adminCredential =
  serviceAccountProjectId && serviceAccountClientEmail && serviceAccountPrivateKey
    ? cert({
        projectId: serviceAccountProjectId,
        clientEmail: serviceAccountClientEmail,
        privateKey: serviceAccountPrivateKey,
      })
    : applicationDefault();

const adminApp =
  getApps()[0] ||
  initializeApp({
    credential: adminCredential,
    projectId: firebaseConfig.projectId,
  });

export const adminDb = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
export const adminAuth = getAuth(adminApp);
