import React, { createContext, useContext, useEffect, useState } from "react";
import { AppSettings, Role, User } from "../types";
import { authApi, LoginPayload } from "../api/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: string[];
  settings: AppSettings | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: Role | Role[]) => boolean;
  hasPermission: (permissions: string | string[]) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isCashier: boolean;
  updateSettings: (newSettings: AppSettings) => void;
  formatMoney: (amount: number | string | null | undefined) => string;
}

const defaultSettings: AppSettings = {
  business_name: "Inventory System",
  currency_code: "USD",
  currency_symbol: "$",
  tax_rate: 0,
  default_reorder_level: 10,
  invoice_prefix: "INV",
  date_format: "YYYY-MM-DD",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("auth_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("auth_token"),
  );
  const [permissions, setPermissions] = useState<string[]>(() => {
    const saved = localStorage.getItem("auth_permissions");
    return saved ? JSON.parse(saved) : [];
  });
  const [settings, setSettings] = useState<AppSettings | null>(() => {
    const saved = localStorage.getItem("auth_settings");
    return saved ? JSON.parse(saved) : defaultSettings;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("auth_token");
      if (storedToken) {
        try {
          const res = await authApi.me();
          setUser(res.user);
          setPermissions(res.permissions || []);
          setSettings(res.settings || defaultSettings);

          localStorage.setItem("auth_user", JSON.stringify(res.user));
          localStorage.setItem(
            "auth_permissions",
            JSON.stringify(res.permissions || []),
          );
          localStorage.setItem(
            "auth_settings",
            JSON.stringify(res.settings || defaultSettings),
          );
        } catch {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          localStorage.removeItem("auth_permissions");
          localStorage.removeItem("auth_settings");
          setUser(null);
          setToken(null);
          setPermissions([]);
          setSettings(defaultSettings);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (payload: LoginPayload) => {
    const res = await authApi.login(payload);
    localStorage.setItem("auth_token", res.token);
    localStorage.setItem("auth_user", JSON.stringify(res.user));
    localStorage.setItem(
      "auth_permissions",
      JSON.stringify(res.permissions || []),
    );
    localStorage.setItem(
      "auth_settings",
      JSON.stringify(res.settings || defaultSettings),
    );

    setToken(res.token);
    setUser(res.user);
    setPermissions(res.permissions || []);
    setSettings(res.settings || defaultSettings);
  };

  const logout = async () => {
    try {
      if (token) {
        await authApi.logout();
      }
    } catch {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_permissions");
      localStorage.removeItem("auth_settings");
      setUser(null);
      setToken(null);
      setPermissions([]);
      setSettings(defaultSettings);
      window.location.href = "/login";
    }
  };

  const hasRole = (roles: Role | Role[]): boolean => {
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.role);
  };

  const hasPermission = (perms: string | string[]): boolean => {
    if (!user) return false;
    const required = Array.isArray(perms) ? perms : [perms];
    return required.some((perm) => permissions.includes(perm));
  };

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem("auth_settings", JSON.stringify(newSettings));
  };

  const formatMoney = (amount: number | string | null | undefined): string => {
    if (amount === null || amount === undefined || amount === "") return "-";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return "-";
    const symbol = settings?.currency_symbol ?? "$";
    return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isCashier = user?.role === "cashier";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        permissions,
        settings,
        isLoading,
        login,
        logout,
        hasRole,
        hasPermission,
        isAdmin,
        isManager,
        isCashier,
        updateSettings,
        formatMoney,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
