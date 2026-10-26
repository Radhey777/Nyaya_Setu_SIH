import { apiClient } from './client'
import type { User } from '../types'

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface SignupPayload {
  email: string
  full_name: string
  password: string
  designation?: string
}

export interface UpdateProfilePayload {
  full_name?: string
  designation?: string
}

/** POST /auth/login — OAuth2 password flow (form data) */
export async function login(email: string, password: string): Promise<TokenResponse> {
  const formData = new FormData()
  formData.append('username', email)
  formData.append('password', password)
  const res = await apiClient.post<TokenResponse>('/auth/login', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

/** GET /auth/me — fetch current authenticated user */
export async function getMe(): Promise<User> {
  const res = await apiClient.get<User>('/auth/me')
  return res.data
}

/** POST /auth/logout */
export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout')
}

/** POST /auth/signup */
export async function signup(data: SignupPayload): Promise<User> {
  const res = await apiClient.post<User>('/auth/signup', data)
  return res.data
}

/** PUT /auth/me */
export async function updateProfile(data: UpdateProfilePayload): Promise<User> {
  const res = await apiClient.put<User>('/auth/me', data)
  return res.data
}
