import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ApiError,
  getMe,
  login,
  logout,
  refreshSession,
  signup,
  updateMe,
  verifyEmail as verifyEmailRequest,
  resendVerificationEmail,
  changePassword as changePasswordRequest,
  deleteAccount as deleteAccountRequest,
  loginWithGoogle,
  type AuthIdentity,
  type AuthTokens,
} from "../services/auth/authApi";
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
} from "../services/auth/authStorage";

export type UserProfile = {
  id?: string;
  name: string;
  email: string;
  emailVerified: boolean;
  hasPassword: boolean;
};

export type ProfilePreferences = {
  dailyReminder: boolean;
  practiceReminder: boolean;
  haptics: boolean;
};

type AuthContextValue = {
  isLoading: boolean;
  user: UserProfile | null;
  preferences: ProfilePreferences;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (name: string, email: string, password: string) => Promise<{ emailDeliveryWarning?: string }>;
  signInWithGoogle: (idToken: string) => Promise<{ isNewUser: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (profile: { name: string }) => Promise<void>;
  updatePreference: (key: keyof ProfilePreferences, enabled: boolean) => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (confirmation: { password: string } | { googleIdToken: string }) => Promise<void>;
  runAuthenticated: <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;
};

const defaultPreferences: ProfilePreferences = {
  dailyReminder: true,
  practiceReminder: false,
  haptics: true,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getProfile(identity: AuthIdentity): UserProfile {
  return {
    id: identity.user.id,
    name: identity.user.name,
    email: identity.user.email,
    emailVerified: identity.user.emailVerified,
    hasPassword: identity.user.hasPassword,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const tokensRef = useRef<AuthTokens | null>(null);
  const restorationStarted = useRef(false);
  const refreshPromise = useRef<Promise<AuthTokens> | null>(null);

  const applyIdentity = useCallback((identity: AuthIdentity) => {
    setUser(getProfile(identity));
    setPreferences(identity.preferences);
  }, []);

  const applySession = useCallback(
    async (session: AuthIdentity & { tokens: AuthTokens }) => {
      await saveAuthSession(session.tokens);
      tokensRef.current = session.tokens;
      applyIdentity(session);
    },
    [applyIdentity]
  );

  const refreshAuthentication = useCallback(async () => {
    const currentTokens = tokensRef.current;
    if (!currentTokens) {
      throw new ApiError("Your session has ended. Please log in again.", 401);
    }

    if (!refreshPromise.current) {
      refreshPromise.current = refreshSession(currentTokens.refreshToken)
        .then(async (session) => {
          await applySession(session);
          return session.tokens;
        })
        .finally(() => {
          refreshPromise.current = null;
        });
    }

    return refreshPromise.current;
  }, [applySession]);

  const runAuthenticated = useCallback(
    async <T,>(operation: (accessToken: string) => Promise<T>) => {
      const currentTokens = tokensRef.current;
      if (!currentTokens) {
        throw new ApiError("Please log in to continue.", 401);
      }

      try {
        return await operation(currentTokens.accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedTokens = await refreshAuthentication();
        return operation(refreshedTokens.accessToken);
      }
    },
    [refreshAuthentication]
  );

  useEffect(() => {
    if (restorationStarted.current) {
      return;
    }
    restorationStarted.current = true;
    let isActive = true;

    const restore = async () => {
      const storedTokens = await loadAuthSession();
      if (!storedTokens) {
        return;
      }

      tokensRef.current = storedTokens;

      try {
        let identity: AuthIdentity;
        try {
          identity = await getMe(storedTokens.accessToken);
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) {
            throw error;
          }

          const session = await refreshSession(storedTokens.refreshToken);
          await saveAuthSession(session.tokens);
          tokensRef.current = session.tokens;
          identity = session;
        }

        if (isActive) {
          applyIdentity(identity);
        }
      } catch {
        tokensRef.current = null;
        await clearAuthSession();
      }
    };

    restore().finally(() => {
      if (isActive) {
        setIsLoading(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, [applyIdentity]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await login(email.trim(), password);
      await applySession(session);
      return session.user.emailVerified;
    },
    [applySession]
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const session = await signup(name.trim(), email.trim(), password);
      await applySession(session);
      return { emailDeliveryWarning: session.emailDeliveryWarning };
    },
    [applySession]
  );

  const signInWithGoogle = useCallback(async (idToken: string) => {
    const session = await loginWithGoogle(idToken);
    await applySession(session);
    return { isNewUser: session.isNewUser };
  }, [applySession]);

  const signOut = useCallback(async () => {
    const currentTokens = tokensRef.current;
    tokensRef.current = null;
    setUser(null);
    setPreferences(defaultPreferences);
    await clearAuthSession();

    if (currentTokens) {
      await logout(currentTokens.refreshToken).catch(() => undefined);
    }
  }, []);

  const updateProfile = useCallback(
    async ({ name }: { name: string }) => {
      const identity = await runAuthenticated((accessToken) =>
        updateMe(accessToken, { name: name.trim() })
      );
      applyIdentity(identity);
    },
    [applyIdentity, runAuthenticated]
  );

  const updatePreference = useCallback(
    async (key: keyof ProfilePreferences, enabled: boolean) => {
      const previousPreferences = preferences;
      setPreferences((current) => ({ ...current, [key]: enabled }));

      try {
        const identity = await runAuthenticated((accessToken) =>
          updateMe(accessToken, { preferences: { [key]: enabled } })
        );
        applyIdentity(identity);
      } catch (error) {
        setPreferences(previousPreferences);
        console.warn("Unable to save profile preference", error);
      }
    },
    [applyIdentity, preferences, runAuthenticated]
  );

  const verifyEmail = useCallback(async (code: string) => {
    const identity = await runAuthenticated((accessToken) => verifyEmailRequest(accessToken, code));
    applyIdentity(identity);
  }, [applyIdentity, runAuthenticated]);

  const resendVerification = useCallback(async () => {
    await runAuthenticated((accessToken) => resendVerificationEmail(accessToken));
  }, [runAuthenticated]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await runAuthenticated((accessToken) => changePasswordRequest(accessToken, currentPassword, newPassword));
  }, [runAuthenticated]);

  const deleteAccount = useCallback(async (confirmation: { password: string } | { googleIdToken: string }) => {
    await runAuthenticated((accessToken) => deleteAccountRequest(accessToken, confirmation));
    tokensRef.current = null;
    setUser(null);
    setPreferences(defaultPreferences);
    await clearAuthSession();
  }, [runAuthenticated]);

  const value = useMemo(
    () => ({
      isLoading,
      user,
      preferences,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      updateProfile,
      updatePreference,
      verifyEmail,
      resendVerification,
      changePassword,
      deleteAccount,
      runAuthenticated,
    }),
    [changePassword, deleteAccount, isLoading, preferences, resendVerification, runAuthenticated, signIn, signInWithGoogle, signOut, signUp, updatePreference, updateProfile, user, verifyEmail]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
