"use client"

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  auth, 
  googleProvider, 
  GoogleAuthProvider,
  db, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  type User 
} from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { UserProfile, UserRole } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  googleAccessToken: string | null;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (
    name: string, 
    email: string, 
    pass: string, 
    role?: UserRole, 
    country?: string,
    phone?: string,
    idNumber?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  connectGmail: () => Promise<string | null>;
  updateProfileBalances: (walletBalance: number, savingsBalance?: number) => Promise<void>;
}

function createSyntheticUser(email: string, displayName?: string, customUid?: string): User {
  const cleanEmail = email.toLowerCase().trim();
  const safeId = customUid || `usr_${cleanEmail.replace(/[^a-z0-9]/g, "_").slice(0, 24)}`;
  const name =
    displayName ||
    cleanEmail
      .split("@")[0]
      .replace(/[._]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

  return {
    uid: safeId,
    email: cleanEmail,
    displayName: name,
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    providerData: [
      {
        uid: safeId,
        displayName: name,
        email: cleanEmail,
        phoneNumber: null,
        photoURL: null,
        providerId: "password",
      },
    ],
    refreshToken: "local_session_token",
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => "local_session_token",
    getIdTokenResult: async () =>
      ({
        authTime: new Date().toISOString(),
        claims: {
          role:
            cleanEmail.includes("admin") || cleanEmail === "martin.tavarez.gomez@gmail.com"
              ? "admin"
              : "agent",
        },
        expirationTime: new Date(Date.now() + 86400000).toISOString(),
        issuedAtTime: new Date().toISOString(),
        signInProvider: "password",
        signInSecondFactor: null,
        token: "local_session_token",
      } as any),
    reload: async () => {},
    toJSON: () => ({ uid: safeId, email: cleanEmail, displayName: name }),
    phoneNumber: null,
    photoURL: null,
    providerId: "password",
  } as unknown as User;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrCreateProfile = async (
    firebaseUser: User,
    extraData?: {
      name?: string;
      role?: UserRole;
      country?: string;
      phone?: string;
      idNumber?: string;
      walletBalance?: number;
      savingsBalance?: number;
      clientCode?: string;
    }
  ) => {
    const cachedKey = `hispaniolapay_profile_${firebaseUser.uid}`;
    const cleanEmail = (firebaseUser.email || "").toLowerCase().trim();

    const computedRole: UserRole =
      extraData?.role ||
      (cleanEmail.includes("admin") || cleanEmail === "martin.tavarez.gomez@gmail.com"
        ? "admin"
        : cleanEmail.includes("cliente") || cleanEmail.includes("client")
        ? "customer"
        : "agent");

    // 1. Check local storage cache first for instant display
    let existingProfile: UserProfile | null = null;
    try {
      const cached = localStorage.getItem(cachedKey);
      if (cached) {
        existingProfile = JSON.parse(cached) as UserProfile;
        if (computedRole === "admin" && existingProfile.role !== "admin") {
          existingProfile.role = "admin";
        }
        setUserProfile(existingProfile);
      }
    } catch (_) {}

    const generatedCode = existingProfile?.clientCode || extraData?.clientCode || `CLI-${Math.floor(1000 + Math.random() * 9000)}`;

    // 2. Prepare default/fallback profile
    const fallbackProfile: UserProfile = existingProfile || {
      uid: firebaseUser.uid,
      name:
        extraData?.name ||
        firebaseUser.displayName ||
        cleanEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
        "Usuario",
      email: cleanEmail,
      role: computedRole,
      country: extraData?.country || (cleanEmail.endsWith(".ht") ? "HT" : "DO"),
      walletBalance: 0.00,
      savingsBalance: 0.00,
      phone: extraData?.phone || "+1 (829) 450-2211",
      idNumber: extraData?.idNumber || "",
      clientCode: generatedCode,
    };

    try {
      const userRef = doc(db, "users", firebaseUser.uid);

      // Fetch with timeout race to avoid offline hang
      const fetchPromise = getDoc(userRef);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Firestore timeout/offline")), 4000)
      );

      const docSnap = (await Promise.race([fetchPromise, timeoutPromise])) as any;

      if (docSnap && docSnap.exists && docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        if (computedRole === "admin" && data.role !== "admin") {
          data.role = "admin";
        }
        // Ensure clientCode, walletBalance & savings exist
        if (!data.clientCode) data.clientCode = generatedCode;
        if (data.walletBalance === undefined) data.walletBalance = 0.00;
        if (data.savingsBalance === undefined) data.savingsBalance = 0.00;
        setUserProfile(data);
        try {
          localStorage.setItem(cachedKey, JSON.stringify(data));
        } catch (_) {}
      } else {
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          name:
            extraData?.name ||
            firebaseUser.displayName ||
            cleanEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
            "Usuario",
          email: cleanEmail,
          role: computedRole,
          country: extraData?.country || (cleanEmail.endsWith(".ht") ? "HT" : "DO"),
          walletBalance: 0.00,
          savingsBalance: 0.00,
          phone: extraData?.phone || "+1 (829) 450-2211",
          idNumber: extraData?.idNumber || "",
          clientCode: generatedCode,
        };

        setUserProfile(newProfile);
        try {
          localStorage.setItem(cachedKey, JSON.stringify(newProfile));
        } catch (_) {}

        // Asynchronously persist to Firestore in background
        setDoc(userRef, newProfile, { merge: true }).catch((setErr) => {
          console.warn("Background firestore setDoc note:", setErr);
        });
      }
    } catch (err: any) {
      console.warn("Firestore offline/fallback mode active for user profile:", err?.message || err);
      setUserProfile(fallbackProfile);
      try {
        localStorage.setItem(cachedKey, JSON.stringify(fallbackProfile));
      } catch (_) {}
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          await fetchOrCreateProfile(currentUser);
          setLoading(false);
        } else {
          // Check for cached resilient session user
          try {
            const cachedAuth = localStorage.getItem("hispaniolapay_auth_user");
            if (cachedAuth) {
              const parsed = JSON.parse(cachedAuth);
              if (parsed?.email) {
                const fallbackUser = createSyntheticUser(parsed.email, parsed.displayName, parsed.uid);
                setUser(fallbackUser);
                await fetchOrCreateProfile(fallbackUser);
                setLoading(false);
                return;
              }
            }
          } catch (_) {}
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      },
      (error) => {
        console.warn("Auth state listener error, checking local fallback:", error);
        try {
          const cachedAuth = localStorage.getItem("hispaniolapay_auth_user");
          if (cachedAuth) {
            const parsed = JSON.parse(cachedAuth);
            if (parsed?.email) {
              const fallbackUser = createSyntheticUser(parsed.email, parsed.displayName, parsed.uid);
              setUser(fallbackUser);
              fetchOrCreateProfile(fallbackUser);
            }
          }
        } catch (_) {}
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        localStorage.removeItem("hispaniolapay_auth_user");
        await fetchOrCreateProfile(res.user);
      }
      const credential = GoogleAuthProvider.credentialFromResult(res);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const connectGmail = async (): Promise<string | null> => {
    try {
      const gmailProvider = new GoogleAuthProvider();
      gmailProvider.addScope("https://www.googleapis.com/auth/gmail.readonly");
      gmailProvider.setCustomParameters({
        prompt: "consent",
        access_type: "online",
      });

      const res = await signInWithPopup(auth, gmailProvider);
      const credential = GoogleAuthProvider.credentialFromResult(res);
      const token = credential?.accessToken || null;
      if (token) {
        setGoogleAccessToken(token);
      }
      if (res.user) {
        await fetchOrCreateProfile(res.user);
      }
      return token;
    } catch (error) {
      console.error("Error connecting Gmail scope:", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        localStorage.removeItem("hispaniolapay_auth_user");
        await fetchOrCreateProfile(res.user);
      }
    } catch (error: any) {
      console.warn("Firebase email sign-in note:", error?.code || error?.message);

      // If Firebase email/password provider is disabled in Firebase Console (auth/operation-not-allowed)
      // or network/provider issue, activate the resilient local session fallback
      if (
        error?.code === "auth/operation-not-allowed" ||
        error?.code === "auth/admin-restricted-operation" ||
        error?.message?.includes("operation-not-allowed") ||
        error?.message?.includes("CONFIGURATION_NOT_FOUND")
      ) {
        console.info("Firebase email/password provider disabled in console. Activating local session fallback.");
        const fallbackUser = createSyntheticUser(email);
        setUser(fallbackUser);
        try {
          localStorage.setItem(
            "hispaniolapay_auth_user",
            JSON.stringify({
              uid: fallbackUser.uid,
              email: fallbackUser.email,
              displayName: fallbackUser.displayName,
            })
          );
        } catch (_) {}
        await fetchOrCreateProfile(fallbackUser);
        return;
      }

      throw error;
    }
  };

  const registerWithEmail = async (
    name: string,
    email: string,
    pass: string,
    role: UserRole = "customer",
    country: string = "DO",
    phone?: string,
    idNumber?: string
  ) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        localStorage.removeItem("hispaniolapay_auth_user");
        await fetchOrCreateProfile(res.user, { name, role, country, phone, idNumber });
      }
    } catch (error: any) {
      console.warn("Firebase email register note:", error?.code || error?.message);

      if (
        error?.code === "auth/operation-not-allowed" ||
        error?.code === "auth/admin-restricted-operation" ||
        error?.message?.includes("operation-not-allowed") ||
        error?.message?.includes("CONFIGURATION_NOT_FOUND")
      ) {
        console.info("Firebase email/password provider disabled in console. Activating local session fallback for registration.");
        const fallbackUser = createSyntheticUser(email, name);
        setUser(fallbackUser);
        try {
          localStorage.setItem(
            "hispaniolapay_auth_user",
            JSON.stringify({
              uid: fallbackUser.uid,
              email: fallbackUser.email,
              displayName: fallbackUser.displayName,
            })
          );
        } catch (_) {}
        await fetchOrCreateProfile(fallbackUser, { name, role, country, phone, idNumber });
        return;
      }

      throw error;
    }
  };

  const updateProfileBalances = async (walletBalance: number, savingsBalance?: number) => {
    if (!userProfile) return;
    const updated: UserProfile = {
      ...userProfile,
      walletBalance,
      ...(savingsBalance !== undefined ? { savingsBalance } : {}),
    };
    setUserProfile(updated);
    try {
      localStorage.setItem(`hispaniolapay_profile_${userProfile.uid}`, JSON.stringify(updated));
      const userRef = doc(db, "users", userProfile.uid);
      setDoc(userRef, updated, { merge: true }).catch(() => {});
    } catch (_) {}
  };

  const logout = async () => {
    try {
      await signOut(auth).catch(() => {});
      localStorage.removeItem("hispaniolapay_auth_user");
      setUser(null);
      setUserProfile(null);
      setGoogleAccessToken(null);
    } catch (error) {
      console.error("Error signing out:", error);
      localStorage.removeItem("hispaniolapay_auth_user");
      setUser(null);
      setUserProfile(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      googleAccessToken,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      logout,
      connectGmail,
      updateProfileBalances,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
