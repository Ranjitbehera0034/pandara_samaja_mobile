// src/api/members.ts
import client from './client';
import { FamilyMember } from '../types';

export interface MembersParams {
  page?: number;
  limit?: number;
  search?: string;
  district?: string;
  taluka?: string;
  panchayat?: string;
  village?: string;
  gender?: string;
}

// GET /api/portal/members — paginated list with filters
export const fetchMembers = async (params: MembersParams = {}) => {
  const res = await client.get('/portal/members', { params: { limit: 30, ...params } });
  return res.data;
  // Returns: { success, members, page, total, totalPages }
};

// GET /api/portal/members/filters — district/taluka/panchayat/village options
export const fetchMemberFilters = async () => {
  const res = await client.get('/portal/members/filters');
  return res.data;
  // Returns: { success, filters: { districts, talukas, panchayats, villages } }
};

// GET /api/portal/members/:id — single member
export const fetchMemberById = async (id: string) => {
  const res = await client.get(`/portal/members/${id}`);
  return res.data;
};

// GET /api/portal/members/public/:id — public profile
export const fetchPublicProfile = async (id: string, name?: string) => {
  const params: any = {};
  if (name) params.name = name;
  const res = await client.get(`/portal/members/public/${id}`, { params });
  return res.data;
  // Returns: { success, profile: { id, name, avatar, gender, stats, family, posts, isFollowing, ... } }
};

// POST /api/portal/subscribe/:memberId — toggle follow
export const toggleSubscribe = async (memberId: string) => {
  const res = await client.post(`/portal/subscribe/${memberId}`);
  return res.data;
  // Returns: { success, subscribed: boolean, message }
};

// PUT /api/portal/me/photo — update the logged-in member's own profile photo
export const updateMyProfilePhoto = async (file: { uri: string; name: string; type: string }) => {
  const formData = new FormData();
  // @ts-ignore — React Native FormData file shape
  formData.append('photo', file);
  const res = await client.put('/portal/me/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
  // Returns: { success, profile_photo_url }
};

// ════════════════════════════════════════════════
//  FAMILY MEMBERS — the logged-in member's own household roster
//  (member.family_members). One entry always has relation
//  'Self'/'Self/Head'/'Head' — the household head — which the backend
//  never allows to be deleted or re-related.
// ════════════════════════════════════════════════

export interface FamilyMemberInput {
  name: string;
  relation: string;
  gender?: string;
  age?: number | string;
  marital_status?: string;
  mobile?: string;
}

// GET /api/portal/family-members
export const fetchFamilyMembers = async () => {
  const res = await client.get('/portal/family-members');
  return res.data as { success: boolean; message?: string; familyMembers: FamilyMember[] };
};

// ════════════════════════════════════════════════
//  PUSH NOTIFICATIONS
// ════════════════════════════════════════════════

// PUT /api/portal/push-token — register (or clear, if token is falsy) this
// device's Expo push token against the logged-in member. Failures here are
// expected to be swallowed by the caller (see AuthContext) — a push-token
// registration failure must never surface as a user-facing error.
export const registerPushToken = async (token: string | null) => {
  const res = await client.put('/portal/push-token', { token: token || '' });
  return res.data as { success: boolean };
};

// POST /api/portal/family-members — returns the WHOLE updated array, not just the new entry
export const addFamilyMember = async (data: FamilyMemberInput) => {
  const res = await client.post('/portal/family-members', data);
  return res.data as { success: boolean; message?: string; familyMembers: FamilyMember[] };
};

// PUT /api/portal/family-members/:index — partial update, all fields optional
export const updateFamilyMember = async (index: number, data: Partial<FamilyMemberInput>) => {
  const res = await client.put(`/portal/family-members/${index}`, data);
  return res.data as { success: boolean; message?: string; familyMembers: FamilyMember[] };
};

// DELETE /api/portal/family-members/:index
export const deleteFamilyMember = async (index: number) => {
  const res = await client.delete(`/portal/family-members/${index}`);
  return res.data as { success: boolean; message?: string; familyMembers: FamilyMember[] };
};
