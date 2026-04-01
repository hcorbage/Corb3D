import { createContext, useContext } from "react";

export type UserRole = "super_admin" | "company_admin" | "employee";

export type AuthUser = {
  id: string;
  username: string;
  isAdmin: boolean;
  isMasterAdmin: boolean;
  role: UserRole;
  companyId: string;
  permissions: string[];
};

export type AuthContextType = AuthUser & {
  hasPermission: (module: string) => boolean;
};

const defaultUser: AuthContextType = {
  id: "",
  username: "",
  isAdmin: false,
  isMasterAdmin: false,
  role: "company_admin",
  companyId: "",
  permissions: [],
  hasPermission: () => false,
};

const AuthContext = createContext<AuthContextType>(defaultUser);

export function useAuth() {
  return useContext(AuthContext);
}

export { AuthContext };

export function buildAuthContext(user: AuthUser): AuthContextType {
  return {
    ...user,
    hasPermission: (module: string) => {
      if (!module) return true;          // módulo vazio = visível para todos
      if (user.isAdmin) return true;     // admin sempre passa
      return user.permissions.includes(module);
    },
  };
}
