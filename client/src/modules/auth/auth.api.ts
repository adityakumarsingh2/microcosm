import { apiRequest } from "../../shared/api/api-client";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
};

type AuthResponse = {
  success: true;
  data: {
    user: AuthUser;
    accessToken: string;
  };
};

export function registerUser(input: { name: string; email: string; password: string }) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function loginUser(input: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
