import 'server-only';

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

const serviceAccountProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const serviceAccountClientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

function normalizePrivateKey(rawValue: string | undefined): string | undefined {
  if (!rawValue) return undefined;

  let value = rawValue.trim();

  // Hosting dashboards often store PEM values as JSON strings or as a complete
  // service-account JSON document. Support both without ever logging the secret.
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed === 'string') {
      value = parsed;
    } else if (parsed && typeof parsed === 'object' && 'private_key' in parsed) {
      const privateKey = (parsed as { private_key?: unknown }).private_key;
      if (typeof privateKey === 'string') value = privateKey;
    }
  } catch {
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
  }

  // Decode a Base64-encoded PEM when that format was used in the provider UI.
  if (!value.includes('BEGIN PRIVATE KEY')) {
    try {
      const decoded = Buffer.from(value, 'base64').toString('utf8').trim();
      if (decoded.includes('BEGIN PRIVATE KEY')) value = decoded;
    } catch {
      // Keep the original value; Firebase Admin will provide the validation error.
    }
  }

  value = value.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n');

  // Some dashboards collapse a multiline PEM into one line. Rebuild the body
  // with canonical 64-character lines so OpenSSL can parse it reliably.
  const pemMatch = value.match(
    /-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/,
  );
  if (pemMatch) {
    const body = pemMatch[1].replace(/\s+/g, '');
    const lines = body.match(/.{1,64}/g)?.join('\n') ?? body;
    return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;
  }

  return value;
}

const serviceAccountPrivateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

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
export const adminMessaging = getMessaging(adminApp);
