// src/api/admin.ts
// Thin wrapper functions for every /api/admin/* endpoint, using the
// separate adminClient (admin/staff auth — not the member portal client).
import adminClient from './adminClient';

export interface AdminUser {
  id: number | string;
  username: string;
  role: 'admin' | 'superadmin';
}

export interface AdminAccountRow {
  id: number | string;
  username: string;
  role: 'admin' | 'superadmin';
  created_at: string;
  last_login: string | null;
}

export interface AdminMember {
  membership_no: string;
  name: string;
  mobile: string;
  village: string | null;
  district: string | null;
  taluka: string | null;
  panchayat: string | null;
  head_gender: string | null;
  profile_photo_url?: string | null;
  is_banned?: boolean | null;
  [key: string]: any;
}

export interface MemberActivity {
  postsCount: number;
  reportsAgainstCount: number;
  reportsFiledCount: number;
}

export interface ReportedPostReport {
  reporter_id: string;
  reason: string;
  created_at: string;
}

export interface ReportedPost {
  id: string;
  author_id: string;
  author_name: string;
  author_photo?: string | null;
  text_content?: string;
  images?: string[];
  location?: string;
  created_at: string;
  reports: ReportedPostReport[];
  [key: string]: any;
}

// ── Auth ──

export const adminLoginRequest = async (username: string, password: string) => {
  const res = await adminClient.post('/admin/login', { username, password });
  return res.data as { success: boolean; message?: string; token?: string; user?: AdminUser };
};

export const fetchAdminMe = async () => {
  const res = await adminClient.get('/admin/me');
  return res.data as { success: boolean; message?: string; user?: AdminUser };
};

// ── Member management (admin + superadmin) ──

export const fetchAdminMembers = async (params: { page?: number; limit?: number; search?: string } = {}) => {
  const res = await adminClient.get('/admin/members', { params });
  return res.data as { success: boolean; members: AdminMember[]; total: number; page: number; totalPages: number };
};

export const fetchAdminMember = async (id: string) => {
  const res = await adminClient.get(`/admin/members/${id}`);
  return res.data as { success: boolean; message?: string; member: AdminMember; activity: MemberActivity };
};

export const setMemberBanned = async (id: string, banned: boolean) => {
  const res = await adminClient.put(`/admin/members/${id}/ban`, { banned });
  return res.data as { success: boolean; message?: string; member: AdminMember };
};

// ── Content moderation (admin + superadmin) ──

export const fetchReportedPosts = async () => {
  const res = await adminClient.get('/admin/reports');
  return res.data as { success: boolean; posts: ReportedPost[] };
};

export const approveReportedPost = async (postId: string) => {
  const res = await adminClient.post(`/admin/reports/${postId}/approve`);
  return res.data as { success: boolean; message?: string };
};

export const rejectReportedPost = async (postId: string) => {
  const res = await adminClient.post(`/admin/reports/${postId}/reject`);
  return res.data as { success: boolean; message?: string };
};

// ── Admin account management (superadmin only) ──

export const fetchAdminAccounts = async () => {
  const res = await adminClient.get('/admin/users');
  return res.data as { success: boolean; users: AdminAccountRow[] };
};

export const createAdminAccount = async (username: string, password: string, role: 'admin' | 'superadmin') => {
  const res = await adminClient.post('/admin/users', { username, password, role });
  return res.data as { success: boolean; message?: string; user?: AdminAccountRow };
};

export const deleteAdminAccount = async (id: string | number) => {
  const res = await adminClient.delete(`/admin/users/${id}`);
  return res.data as { success: boolean; message?: string };
};
