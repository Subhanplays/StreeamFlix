"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import type { User } from "@/types";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { createUserProfile, getUserDocOnce } from "@/lib/firebase/users";
import { mapFirebaseAuthError } from "@/lib/firebase/authErrors";

export { ApiError } from "@/lib/errors";

type AuthState = {
  user: User | null;
  /** Legacy field; Firebase uses session cookies in the client. Kept for compatibility. */
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (fu) => {
      if (!fu) {
        setUser(null);
        setLoading(false);
        return;
      }
      let profile = await getUserDocOnce(fu.uid);
      if (!profile) {
        const name = fu.displayName || (fu.email?.split("@")[0] ?? "User");
        const email = fu.email ?? "";
        await createUserProfile(fu.uid, name, email);
        profile = await getUserDocOnce(fu.uid);
      }
      setUser({
        id: fu.uid,
        name: profile?.name ?? "",
        email: profile?.email ?? fu.email ?? "",
        role: (profile?.role === "admin" ? "admin" : "user") as User["role"],
      });
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    } catch (e) {
      throw new Error(mapFirebaseAuthError(e));
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
      await createUserProfile(cred.user.uid, name, email);
    } catch (e) {
      throw new Error(mapFirebaseAuthError(e));
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(getFirebaseAuth());
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token: user ? "firebase" : null,
      loading,
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useOptionalAuth() {
  return useContext(Ctx);
}
