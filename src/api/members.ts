// src/api/members.ts
import client from './client';

export interface MembersParams {
  page?: number;
  limit?: number;
  search?: string;
  district?: string;
  taluka?: string;
  panchayat?: string;
  gender?: string;
}

// GET /api/portal/members — paginated list with filters
export const fetchMembers = async (params: MembersParams = {}) => {
  const res = await client.get('/portal/members', { params: { limit: 30, ...params } });
  return res.data;
  // Returns: { success, members, page, total, totalPages }
};

// GET /api/portal/members/filters — district/taluka/panchayat options
export const fetchMemberFilters = async () => {
  const res = await client.get('/portal/members/filters');
  return res.data;
  // Returns: { success, filters: { districts, talukas, panchayats } }
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
