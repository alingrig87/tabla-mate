/**
 * AuthContext — wraps Firebase Auth state so any component can call useAuth().
 *
 * Exports:
 *   AuthProvider      — wrap <App> with this
 *   useAuth()         — { user, loading, loginWithGoogle, logout, googleAccessToken }
 *
 * Login is optional — the app works fully without authentication.
 * When a user logs in, their Google display name / avatar appear in the toolbar.
 *
 * The People API scope (contacts.readonly) is requested at login so the
 * SharePanel can autocomplete from the user's Google contacts.
 * The access token is persisted in sessionStorage across page refreshes (same
 * browser session) but cleared on logout.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { clearContactsCache } from '../lib/contacts';

const SESSION_TOKEN_KEY = 'tabla_gat'; // "google access token"

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  googleAccessToken: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  googleAccessToken: null,
  loginWithGoogle: async () => {},
  logout: async () => {},
});

const googleProvider = new GoogleAuthProvider();
// Request the contacts read scope so the invite panel can autocomplete
googleProvider.addScope('https://www.googleapis.com/auth/contacts.readonly');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Restore token from sessionStorage so it survives page refresh within a session
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() =>
    sessionStorage.getItem(SESSION_TOKEN_KEY)
  );

  useEffect(() => {
    // onAuthStateChanged returns an unsubscribe function — perfect for useEffect cleanup
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      // If Firebase says logged-out (e.g. session expired) but we had a token, clear it
      if (!u) {
        setGoogleAccessToken(null);
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
      }
    });
  }, []);

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Extract the OAuth access token (for People API calls)
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken ?? null;
      setGoogleAccessToken(token);
      if (token) {
        sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      }
    } catch (err) {
      // User closed the popup — not an error worth surfacing
      console.error('[Auth] login error:', err);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setGoogleAccessToken(null);
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      clearContactsCache();
    } catch (err) {
      console.error('[Auth] logout error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, googleAccessToken, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
