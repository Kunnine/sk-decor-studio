import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppSettings, Role, User } from "../types";
import { authApi, LoginPayload } from "../api/auth";
import { AUTH_FORBIDDEN_EVENT, AUTH_SYNC_EVENT } from "../api/client";

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
  business_name: "Maison Decor Studio",
  currency_code: "USD",
  currency_symbol: "$",
  tax_rate: 0,
  default_reorder_level: 10,
  invoice_prefix: "MDS",
  date_format: "YYYY-MM-DD",
};

const AUTH_STORAGE_KEYS = [
  "auth_token",
  "auth_user",
  "auth_permissions",
  "auth_settings",
];

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function clearAuthStorage(): void {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("auth_permissions");
  localStorage.removeItem("auth_settings");
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

interface AuthProviderProps {
  children: React.ReactNode;
  onSessionChange?: () => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  onSessionChange,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    if (!localStorage.getItem("auth_token")) return null;
    return safeParseJson<User | null>(localStorage.getItem("auth_user"), null);
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("auth_token"),
  );
  const [permissions, setPermissions] = useState<string[]>(() => {
    if (!localStorage.getItem("auth_token")) return [];
    return safeParseJson<string[]>(
      localStorage.getItem("auth_permissions"),
      [],
    );
  });
  const [settings, setSettings] = useState<AppSettings | null>(() =>
    safeParseJson<AppSettings>(
      localStorage.getItem("auth_settings"),
      defaultSettings,
    ),
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const onSessionChangeRef = useRef(onSessionChange);
  onSessionChangeRef.current = onSessionChange;

  const lastForbiddenRefreshAtRef = useRef<number>(0);

  const authStateRef = useRef({
    token,
    userId: user?.id ?? null,
    userRole: user?.role ?? null,
    permissionsJson: JSON.stringify(permissions),
    settingsJson: JSON.stringify(settings ?? defaultSettings),
  });
  authStateRef.current = {
    token,
    userId: user?.id ?? null,
    userRole: user?.role ?? null,
    permissionsJson: JSON.stringify(permissions),
    settingsJson: JSON.stringify(settings ?? defaultSettings),
  };

  const resetToUnauthenticated = useCallback(() => {
    const hadSession =
      authStateRef.current.token !== null ||
      authStateRef.current.userId !== null ||
      authStateRef.current.permissionsJson !== "[]";

    clearAuthStorage();
    authStateRef.current = {
      token: null,
      userId: null,
      userRole: null,
      permissionsJson: "[]",
      settingsJson: JSON.stringify(defaultSettings),
    };
    setUser(null);
    setToken(null);
    setPermissions([]);
    setSettings(defaultSettings);

    if (hadSession) {
      onSessionChangeRef.current?.();
    }
  }, []);

  const refreshMe = useCallback(
    async (
      expectedToken: string,
      clearOnAnyError: boolean,
      isCancelled?: () => boolean,
    ) => {
      try {
        const res = await authApi.me();
        if (
          isCancelled?.() ||
          localStorage.getItem("auth_token") !== expectedToken
        ) {
          return;
        }

        const nextPermissions = res.permissions || [];
        const nextSettings = res.settings || defaultSettings;
        const nextPermJson = JSON.stringify(nextPermissions);
        const nextSettingsJson = JSON.stringify(nextSettings);

        const identityChanged =
          authStateRef.current.token !== expectedToken ||
          authStateRef.current.userId !== (res.user?.id ?? null) ||
          authStateRef.current.userRole !== (res.user?.role ?? null) ||
          authStateRef.current.permissionsJson !== nextPermJson;

        localStorage.setItem("auth_user", JSON.stringify(res.user));
        localStorage.setItem("auth_permissions", nextPermJson);
        localStorage.setItem("auth_settings", nextSettingsJson);

        authStateRef.current = {
          token: expectedToken,
          userId: res.user?.id ?? null,
          userRole: res.user?.role ?? null,
          permissionsJson: nextPermJson,
          settingsJson: nextSettingsJson,
        };

        setToken(expectedToken);
        setUser(res.user);
        setPermissions(nextPermissions);
        setSettings(nextSettings);

        if (identityChanged) {
          onSessionChangeRef.current?.();
        }
      } catch (err: any) {
        if (isCancelled?.()) return;
        const status = err?.response?.status;
        if (
          (clearOnAnyError || status === 401) &&
          localStorage.getItem("auth_token") === expectedToken
        ) {
          resetToUnauthenticated();
        }
      }
    },
    [resetToUnauthenticated],
  );

  const syncFromStorage = useCallback(
    (forceLoggedOut = false): { storedToken: string; tokenChanged: boolean } | null => {
      const storedToken = forceLoggedOut
        ? null
        : localStorage.getItem("auth_token");

      if (!storedToken) {
        resetToUnauthenticated();
        return null;
      }

      const storedUser = safeParseJson<User | null>(
        localStorage.getItem("auth_user"),
        null,
      );
      const storedPermissions = safeParseJson<string[]>(
        localStorage.getItem("auth_permissions"),
        [],
      );
      const storedSettings = safeParseJson<AppSettings>(
        localStorage.getItem("auth_settings"),
        defaultSettings,
      );

      const nextPermJson = JSON.stringify(storedPermissions);
      const nextSettingsJson = JSON.stringify(storedSettings);

      const tokenChanged = storedToken !== authStateRef.current.token;
      const identityChanged =
        tokenChanged ||
        (storedUser?.id ?? null) !== authStateRef.current.userId ||
        (storedUser?.role ?? null) !== authStateRef.current.userRole ||
        nextPermJson !== authStateRef.current.permissionsJson;
      const settingsChanged =
        nextSettingsJson !== authStateRef.current.settingsJson;

      if (identityChanged || settingsChanged) {
        authStateRef.current = {
          token: storedToken,
          userId: storedUser?.id ?? null,
          userRole: storedUser?.role ?? null,
          permissionsJson: nextPermJson,
          settingsJson: nextSettingsJson,
        };
        setToken(storedToken);
        setUser(storedUser);
        setPermissions(storedPermissions);
        setSettings(storedSettings);

        if (identityChanged) {
          onSessionChangeRef.current?.();
        }
      }

      return { storedToken, tokenChanged };
    },
    [resetToUnauthenticated],
  );

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      const storedToken = localStorage.getItem("auth_token");
      if (storedToken) {
        await refreshMe(storedToken, true, () => cancelled);
      } else {
        clearAuthStorage();
      }
      if (!cancelled) {
        setIsLoading(false);
      }
    };

    initAuth();

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && !AUTH_STORAGE_KEYS.includes(event.key)) {
        return;
      }
      const tokenWasRemoved =
        event.key === "auth_token" && event.newValue === null;
      const result = syncFromStorage(tokenWasRemoved);
      if (result?.tokenChanged) {
        void refreshMe(result.storedToken, false, () => cancelled);
      }
    };

    const handleVisibilityOrFocus = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      const result = syncFromStorage();
      if (result?.tokenChanged) {
        void refreshMe(result.storedToken, false, () => cancelled);
      }
    };

    const handleAuthSync = () => {
      syncFromStorage();
    };

    const handleAuthForbidden = () => {
      const result = syncFromStorage();
      const activeToken = localStorage.getItem("auth_token");
      if (!activeToken) return;

      const now = Date.now();
      if (
        result?.tokenChanged ||
        now - lastForbiddenRefreshAtRef.current > 5000
      ) {
        lastForbiddenRefreshAtRef.current = now;
        void refreshMe(activeToken, false, () => cancelled);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener(AUTH_SYNC_EVENT, handleAuthSync);
    window.addEventListener(AUTH_FORBIDDEN_EVENT, handleAuthForbidden);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener(AUTH_SYNC_EVENT, handleAuthSync);
      window.removeEventListener(AUTH_FORBIDDEN_EVENT, handleAuthForbidden);
    };
  }, [refreshMe, syncFromStorage]);

  const login = async (payload: LoginPayload) => {
    const res = await authApi.login(payload);
    const nextPermissions = res.permissions || [];
    const nextSettings = res.settings || defaultSettings;
    const nextPermJson = JSON.stringify(nextPermissions);
    const nextSettingsJson = JSON.stringify(nextSettings);

    // Persist metadata before writing auth_token so cross-tab listeners always see matching user/permissions
    localStorage.setItem("auth_user", JSON.stringify(res.user));
    localStorage.setItem("auth_permissions", nextPermJson);
    localStorage.setItem("auth_settings", nextSettingsJson);
    localStorage.setItem("auth_token", res.token);

    authStateRef.current = {
      token: res.token,
      userId: res.user?.id ?? null,
      userRole: res.user?.role ?? null,
      permissionsJson: nextPermJson,
      settingsJson: nextSettingsJson,
    };

    setToken(res.token);
    setUser(res.user);
    setPermissions(nextPermissions);
    setSettings(nextSettings);
    onSessionChangeRef.current?.();
  };

  const logout = async () => {
    try {
      if (token) {
        await authApi.logout();
      }
    } catch {
      // Ignore errors on logout
    } finally {
      resetToUnauthenticated();
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
