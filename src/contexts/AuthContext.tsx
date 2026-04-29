import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { getStoredToken, setStoredToken } from "@/lib/api";
import { authMe, type AuthMeUser } from "@/services/medicalService";

export type UserRole = "patient" | "doctor" | "admin";

export interface AuthUser extends Omit<AuthMeUser, "role"> {
  role: UserRole;
}

interface AuthContextType {
  isAuthenticated: boolean;
  role: UserRole | null;
  userName: string;
  userId: string | null;
  email: string | null;
  approved: boolean;
  isFaceVerified: boolean;
  setFaceVerified: (v: boolean) => void;
  patientProfile: Pick<AuthMeUser, "age" | "dob" | "phone" | "gender" | "bloodGroup" | "condition" | "healthStatus" | "hasLocation" | "latitude" | "longitude"> | null;
  avatar: string | null;
  ready: boolean;
  loginWithToken: (token: string, user: AuthUser) => void;
  login: (role: UserRole, name: string) => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

function isApprovedUser(user: { role: string; approved?: boolean }) {
  if (user.role === "admin" || user.role === "patient") return true;
  return user.approved !== false;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [approved, setApproved] = useState(true);
  // Persist face verification across page reloads within the same session
  const [isFaceVerified, setIsFaceVerified] = useState(() => sessionStorage.getItem("mc_face_verified") === "1");
  const [patientProfile, setPatientProfile] = useState<AuthContextType["patientProfile"]>(null);

  const setFaceVerified = useCallback((v: boolean) => {
    setIsFaceVerified(v);
    if (v) sessionStorage.setItem("mc_face_verified", "1");
    else sessionStorage.removeItem("mc_face_verified");
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setRole(null);
    setUserName("");
    setUserId(null);
    setEmail(null);
    setAvatar(null);
    setIsAuthenticated(false);
    setApproved(true);
    setIsFaceVerified(false);
    sessionStorage.removeItem("mc_face_verified");
    setPatientProfile(null);
  }, []);

  const loginWithToken = useCallback((token: string, user: AuthUser) => {
    setStoredToken(token);
    setRole(user.role);
    setUserName(user.name);
    setUserId(user.id);
    setEmail(user.email);
    setAvatar(user.avatar || null);
    setApproved(isApprovedUser(user));
    setIsAuthenticated(true);
    if (user.role === "patient") {
      setPatientProfile({
        age: user.age,
        dob: user.dob,
        phone: user.phone,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
        condition: user.condition,
        healthStatus: user.healthStatus,
        hasLocation: user.hasLocation,
        latitude: user.latitude,
        longitude: user.longitude,
      });
    } else {
      setPatientProfile(null);
    }
  }, []);

  /** @deprecated Demo-only fallback — prefer loginWithToken */
  const login = useCallback((r: UserRole, name: string) => {
    setRole(r);
    setUserName(name);
    setApproved(true);
    setIsAuthenticated(true);
  }, []);

  const refreshSession = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    const { user } = await authMe();
    setRole(user.role as UserRole);
    setUserName(user.name);
    setUserId(user.id);
    setEmail(user.email);
    setAvatar(user.avatar || null);
    setApproved(isApprovedUser(user));
    setIsAuthenticated(true);
    if (user.role === "patient") {
      setPatientProfile({
        age: user.age,
        dob: user.dob,
        phone: user.phone,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
        condition: user.condition,
        healthStatus: user.healthStatus,
        hasLocation: user.hasLocation,
        latitude: user.latitude,
        longitude: user.longitude,
      });
    } else {
      setPatientProfile(null);
    }
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setReady(true);
      return;
    }
    authMe()
      .then(({ user }) => {
        loginWithToken(token, user as AuthUser);
      })
      .catch(() => {
        setStoredToken(null);
      })
      .finally(() => setReady(true));
  }, [loginWithToken]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        role,
        userName,
        userId,
        email,
        approved,
        isFaceVerified,
        setFaceVerified,
        patientProfile,
        avatar,
        ready,
        loginWithToken,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
