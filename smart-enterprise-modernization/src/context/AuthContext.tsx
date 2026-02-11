'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FUser } from 'firebase/auth';
import { auth } from '../lib/firebaseClient';
import type { User } from '../types/user';

interface AuthCtx {
  currentUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthCtx>({
  currentUser: null,
  loading: true,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u: FUser | null) => {
      if (u) {
        setCurrentUser({
          uid: u.uid,
          email: u.email || '',
          name: u.displayName || 'User',
          role: 'employee',
          createdAt: u.metadata.creationTime || new Date().toISOString(),
        });
      } else setCurrentUser(null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const logout = async () => {
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
