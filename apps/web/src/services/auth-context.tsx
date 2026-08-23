import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api-client';

export interface PatientProfile {
  id: string;
  displayName: string;
  dateOfBirth?: string | null;
  isDobApproximate: boolean;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
  bloodGroup?: string | null;
  language: string;
  timezone: string;
  isPrimary: boolean;
}

export interface UserAccount {
  id: string;
  email: string;
  isVerified: boolean;
  status: string;
  isAdmin: boolean;
  patientProfiles: PatientProfile[];
}

interface AuthContextType {
  user: UserAccount | null;
  activeProfile: PatientProfile | null;
  isLoading: boolean;
  setActiveProfile: (profile: PatientProfile) => void;
  refreshMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [activeProfile, setActiveProfile] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const res = await api.get<{ account: UserAccount; csrfToken?: string }>('/api/v1/auth/me');
      if (res.csrfToken) {
        api.setCsrfToken(res.csrfToken);
      }
      setUser(res.account);

      if (res.account.patientProfiles && res.account.patientProfiles.length > 0) {
        // Keep existing active profile if still in list, else set primary
        setActiveProfile((prev) => {
          if (prev) {
            const found = res.account.patientProfiles.find((p) => p.id === prev.id);
            if (found) return found;
          }
          const primary = res.account.patientProfiles.find((p) => p.isPrimary);
          return primary || res.account.patientProfiles[0] || null;
        });
      }
    } catch {
      setUser(null);
      setActiveProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ account: UserAccount; csrfToken: string }>('/api/v1/auth/login', {
      email,
      password,
    });
    api.setCsrfToken(res.csrfToken);
    await refreshMe();
  };

  const register = async (email: string, password: string, displayName?: string) => {
    await api.post('/api/v1/auth/register', { email, password, displayName });
    await login(email, password);
  };

  const logout = async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } finally {
      api.setCsrfToken(null);
      setUser(null);
      setActiveProfile(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeProfile,
        isLoading,
        setActiveProfile,
        refreshMe,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
