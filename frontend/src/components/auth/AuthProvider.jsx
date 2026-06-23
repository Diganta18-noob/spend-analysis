import React, { createContext, useContext } from "react";
import { ClerkProvider, useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/clerk-react";

const AuthContext = createContext({
  isClerkEnabled: false,
  isSignedIn: false,
  userId: null,
  userEmail: null,
  getToken: async () => null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function ClerkAuthShim({ children }) {
  const { isSignedIn, userId, getToken, signOut } = useClerkAuth();
  const { user } = useClerkUser();

  const value = {
    isClerkEnabled: true,
    isSignedIn: !!isSignedIn,
    userId: userId || null,
    userEmail: user?.primaryEmailAddress?.emailAddress || null,
    getToken: async () => {
      try {
        return await getToken();
      } catch (e) {
        return null;
      }
    },
    signOut: async () => {
      if (signOut) await signOut();
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }) {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    const fallbackValue = {
      isClerkEnabled: false,
      isSignedIn: false,
      userId: null,
      userEmail: null,
      getToken: async () => null,
      signOut: async () => {},
    };
    return (
      <AuthContext.Provider value={fallbackValue}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ClerkAuthShim>
        {children}
      </ClerkAuthShim>
    </ClerkProvider>
  );
}
