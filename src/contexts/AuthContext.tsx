import React, { createContext, useCallback, useContext, useState } from 'react';

interface AuthContextType {
  refreshAuthState: () => void;
  authRefreshKey: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authRefreshKey, setAuthRefreshKey] = useState(0);

  const refreshAuthState = useCallback(() => {
    setAuthRefreshKey(prev => prev + 1);
  }, []);

  return (
    <AuthContext.Provider value={{ refreshAuthState, authRefreshKey }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthRefresh = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthRefresh must be used within AuthProvider');
  }
  return context;
};