import { createContext, useContext, useState, ReactNode } from "react";

interface AuthContextType {
  isLoggedIn: boolean;
  isDemo: boolean;
  user: { name: string; email: string } | null;
  login: () => void;
  logout: () => void;
  setDemoMode: (demo: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDemo, setIsDemo] = useState(true); // 기본값: 데모 모드
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  const login = () => {
    setIsLoggedIn(true);
    setIsDemo(false);
    setUser({ name: "김사장", email: "ceo@example.com" });
  };

  const logout = () => {
    setIsLoggedIn(false);
    setIsDemo(true);
    setUser(null);
  };

  const setDemoMode = (demo: boolean) => {
    setIsDemo(demo);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isDemo, user, login, logout, setDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
