import 'server-only';

import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const adminApp =
  getApps()[0] ||
  initializeApp({
    credential: applicationDefault(),
    projectId: firebaseConfig.projectId,
  });

export const adminDb = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
