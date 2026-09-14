import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  type User
} from "firebase/auth";
import { initializeFirestore, getFirestore, Firestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

const targetDatabaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

let firestoreInstance: Firestore;
try {
  firestoreInstance = targetDatabaseId
    ? initializeFirestore(
        app,
        {
          ignoreUndefinedProperties: true,
          experimentalForceLongPolling: true,
        },
        targetDatabaseId
      )
    : initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        experimentalForceLongPolling: true,
      });
} catch (e) {
  try {
    firestoreInstance = targetDatabaseId
      ? getFirestore(app, targetDatabaseId)
      : getFirestore(app);
  } catch (err) {
    firestoreInstance = targetDatabaseId
      ? getFirestore(app, targetDatabaseId)
      : getFirestore();
  }
}

export const db = firestoreInstance;

export { 
  GoogleAuthProvider,
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  type User 
};
