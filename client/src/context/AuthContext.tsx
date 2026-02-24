import { createContext, useContext } from "react";

export type AuthUser = { id: string; username: string; isAdmin: boolean; isMasterAdmin: boolean };
const AuthContext = createContext<AuthUser>({ id: "", username: "", isAdmin: false, isMasterAdmin: false });
export function useAuth() { return useContext(AuthContext); }
export { AuthContext };
