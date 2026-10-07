import type { LoginResponse, Me } from "@/types/api";

import { api } from "./client";

export const signUp = (data: {
  email: string;
  password: string;
  fullName?: string;
  phoneNumber?: string;
}) => api.post<{ user: Me }>("/auth/register", data, { anonymous: true });

export const signIn = (data: { email: string; password: string }) =>
  api.post<LoginResponse>("/auth/login", data, { anonymous: true });

export const signOut = () => api.post<{ ok: true }>("/auth/logout");

export const getMe = () => api.get<Me>("/auth/me");
