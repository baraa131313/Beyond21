import { createContext, useContext } from "react";

const API = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("beyond21_backend_url") || "";
};

export interface User {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
}

export interface Child {
  id: number;
  name: string;
  age: number | null;
  avatar: string;
  parent_id: number;
  created_at: string;
}

function headers() {
  const token = typeof window !== "undefined" ? localStorage.getItem("beyond21_token") : null;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export async function apiRegister(email: string, password: string, full_name: string) {
  const res = await fetch(`${API()}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Registration failed");
  }
  const data = await res.json();
  localStorage.setItem("beyond21_token", data.token);
  localStorage.setItem("beyond21_user", JSON.stringify(data.user));
  return data as { token: string; user: User };
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Login failed");
  }
  const data = await res.json();
  localStorage.setItem("beyond21_token", data.token);
  localStorage.setItem("beyond21_user", JSON.stringify(data.user));
  return data as { token: string; user: User };
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const s = localStorage.getItem("beyond21_user");
  return s ? JSON.parse(s) : null;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("beyond21_token");
}

export function logout() {
  localStorage.removeItem("beyond21_token");
  localStorage.removeItem("beyond21_user");
  localStorage.removeItem("beyond21_active_child");
}

export function getActiveChild(): Child | null {
  if (typeof window === "undefined") return null;
  const s = localStorage.getItem("beyond21_active_child");
  return s ? JSON.parse(s) : null;
}

export function setActiveChild(child: Child) {
  localStorage.setItem("beyond21_active_child", JSON.stringify(child));
}

export async function fetchChildren(): Promise<Child[]> {
  const res = await fetch(`${API()}/api/children`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch children");
  return res.json();
}

export async function createChild(data: { name: string; age?: number; avatar?: string; pin?: string }): Promise<Child> {
  const res = await fetch(`${API()}/api/children`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create child");
  return res.json();
}

export async function deleteChild(id: number): Promise<void> {
  const res = await fetch(`${API()}/api/children/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Failed to delete child");
}

export async function fetchProgress(childId: number) {
  const res = await fetch(`${API()}/api/progress/${childId}`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch progress");
  return res.json();
}

export async function recordProgress(data: {
  child_id: number;
  module: string;
  word?: string;
  score?: number;
  correct?: number;
  wrong?: number;
  stars?: number;
}) {
  const res = await fetch(`${API()}/api/progress`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to record progress");
  return res.json();
}

export interface AuthContextType {
  user: User | null;
  child: Child | null;
  setUser: (u: User | null) => void;
  setChild: (c: Child | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  child: null,
  setUser: () => {},
  setChild: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
