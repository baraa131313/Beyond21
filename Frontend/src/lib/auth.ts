import { createContext, useContext } from "react";

const PRODUCTION_BACKEND = "https://interactive-learning-platform-production-3b22.up.railway.app";

const API = () => {
  if (typeof window === "undefined") return PRODUCTION_BACKEND;
  const stored = localStorage.getItem("beyond21_backend_url");
  if (stored) return stored;
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://localhost:8000";
  }
  return PRODUCTION_BACKEND;
};

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "parent" | "specialist";
  specialty?: string;
  institution?: string;
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

export async function apiRegister(
  email: string,
  password: string,
  full_name: string,
  role: "parent" | "specialist" = "parent",
  specialty?: string,
  institution?: string,
) {
  const res = await fetch(`${API()}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name, role, specialty, institution }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Registration failed");
  }
  const data = await res.json();
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
  return data as { token: string; user: User };
}

export function persistLogin(data: { token: string; user: User }) {
  localStorage.setItem("beyond21_token", data.token);
  localStorage.setItem("beyond21_user", JSON.stringify(data.user));
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

export async function recordPronunciation(data: {
  child_id: number;
  word_id: string;
  word_ar: string;
  emoji: string;
  passed: boolean;
  overall_score: number;
  phoneme_scores: Array<{ arabic: string; stars: number }>;
}) {
  const res = await fetch(`${API()}/api/activity/pronunciation`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to record pronunciation");
  return res.json();
}

export async function recordQuizSession(data: {
  child_id: number;
  total_questions: number;
  correct: number;
  avg_t: number;
  avg_i: number;
  avg_f: number;
  dominant_action?: string;
}) {
  const res = await fetch(`${API()}/api/activity/quiz`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to record quiz");
  return res.json();
}

export async function fetchActivity(childId: number) {
  const res = await fetch(`${API()}/api/activity/${childId}`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch activity");
  return res.json();
}

export interface SpecialistChild {
  id: number;
  name: string;
  age: number | null;
  avatar: string;
  parent_name: string;
  parent_email: string;
  pronunciation_attempts: number;
  quiz_sessions: number;
  total_stars: number;
  created_at: string;
}

export interface PlatformStats {
  total_children: number;
  total_parents: number;
  total_pronunciations: number;
  total_quizzes: number;
  total_stars: number;
}

export async function fetchSpecialistChildren(): Promise<SpecialistChild[]> {
  const res = await fetch(`${API()}/api/specialist/children`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch children");
  return res.json();
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const res = await fetch(`${API()}/api/specialist/stats`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export interface CustomWordData {
  id: string;
  ar: string;
  translit: string;
  en: string;
  emoji: string;
  category: string;
}

export interface CustomQuizData {
  id: number;
  question_text: string;
  question_type: string;
  options: Array<{ label: string; value: string; correct: boolean; color?: string }>;
}

export async function fetchCustomWords(): Promise<CustomWordData[]> {
  const res = await fetch(`${API()}/api/content/words`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch words");
  return res.json();
}

export async function createCustomWord(data: Omit<CustomWordData, "id">): Promise<CustomWordData> {
  const res = await fetch(`${API()}/api/content/words`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create word");
  return res.json();
}

export async function deleteCustomWord(id: number): Promise<void> {
  const res = await fetch(`${API()}/api/content/words/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Failed to delete word");
}

export async function fetchCustomQuizzes(): Promise<CustomQuizData[]> {
  const res = await fetch(`${API()}/api/content/quizzes`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch quizzes");
  return res.json();
}

export async function createCustomQuiz(data: {
  question_text: string;
  question_type: string;
  options: Array<{ label: string; value: string; correct: boolean; color?: string }>;
}): Promise<CustomQuizData> {
  const res = await fetch(`${API()}/api/content/quizzes`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create quiz");
  return res.json();
}

export async function deleteCustomQuiz(id: number): Promise<void> {
  const res = await fetch(`${API()}/api/content/quizzes/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Failed to delete quiz");
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
