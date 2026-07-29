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
  // Only present once the `users.is_active` migration has run (and only
  // ever returned from the ban/unban response) — treat undefined as active.
  is_active?: boolean;
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

export interface UpdateAdminMemberInput {
  name?: string;
  mobile?: string;
  district?: string;
  taluka?: string;
  panchayat?: string;
  village?: string;
  address?: string;
  head_gender?: string;
}

export const updateAdminMember = async (id: string, data: UpdateAdminMemberInput) => {
  const res = await adminClient.put(`/admin/members/${id}`, data);
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

export const updateAdminAccount = async (
  id: string | number,
  data: { username?: string; role?: 'admin' | 'superadmin'; password?: string }
) => {
  const res = await adminClient.put(`/admin/users/${id}`, data);
  return res.data as { success: boolean; message?: string; user?: AdminAccountRow };
};

export const setAdminAccountActive = async (id: string | number, active: boolean) => {
  const res = await adminClient.put(`/admin/users/${id}/ban`, { active });
  return res.data as { success: boolean; message?: string; user?: AdminAccountRow };
};

// ── Admin settings (any admin/superadmin — own account) ──

export const changeAdminPassword = async (currentPassword: string, newPassword: string) => {
  const res = await adminClient.put('/admin/settings/password', { currentPassword, newPassword });
  return res.data as { success: boolean; message?: string };
};

// ── Activity tracker (admin + superadmin, actorType filtering superadmin-only) ──

export interface ActivityLogEntry {
  id: number | string;
  actor_type: 'member' | 'admin' | 'superadmin';
  actor_id: string;
  actor_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export const fetchAdminActivity = async (params: {
  page?: number; limit?: number; actorType?: 'member' | 'admin' | 'superadmin'; actorId?: string; action?: string;
} = {}) => {
  const res = await adminClient.get('/admin/activity', { params });
  return res.data as {
    success: boolean; message?: string; activities: ActivityLogEntry[];
    page: number; limit: number; total: number | null; totalPages: number | null; migrationPending?: boolean;
  };
};

// ── Matrimony candidate management (admin + superadmin) ──

export interface MatrimonyCandidate {
  id: number | string;
  name: string;
  gender: string;
  dob?: string | null;
  age?: number | null;
  height?: string | null;
  blood_group?: string | null;
  gotra?: string | null;
  bansha?: string | null;
  education?: string | null;
  technical_education?: string | null;
  professional_education?: string | null;
  occupation?: string | null;
  father?: string | null;
  mother?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  photo?: string | null;
  photos?: string[] | null;
  form_url?: string | null;
  submitted_by?: string | null;
  status: string; // 'approved' | 'banned' | other member-facing statuses
  is_matched?: boolean;
  created_at?: string;
  [key: string]: any;
}

// Request-body shape matches candidateModel's camelCase input fields — NOT
// the same casing as the snake_case response row above.
export interface MatrimonyCandidateInput {
  name: string;
  gender: string;
  dob?: string;
  age?: number | string;
  height?: string;
  bloodGroup?: string;
  gotra?: string;
  bansha?: string;
  education?: string;
  technicalEducation?: string;
  professionalEducation?: string;
  occupation?: string;
  father?: string;
  mother?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export const fetchAdminMatrimonyCandidates = async (params: { page?: number; limit?: number; search?: string } = {}) => {
  const res = await adminClient.get('/admin/matrimony', { params });
  return res.data as { success: boolean; message?: string; candidates: MatrimonyCandidate[]; total: number; page: number; totalPages: number };
};

export const fetchAdminMatrimonyCandidate = async (id: string | number) => {
  const res = await adminClient.get(`/admin/matrimony/${id}`);
  return res.data as { success: boolean; message?: string; candidate: MatrimonyCandidate };
};

export const createMatrimonyCandidate = async (data: MatrimonyCandidateInput) => {
  const res = await adminClient.post('/admin/matrimony', data);
  return res.data as { success: boolean; message?: string; candidate: MatrimonyCandidate };
};

export const updateMatrimonyCandidate = async (id: string | number, data: Partial<MatrimonyCandidateInput>) => {
  const res = await adminClient.put(`/admin/matrimony/${id}`, data);
  return res.data as { success: boolean; message?: string; candidate: MatrimonyCandidate };
};

export const deleteMatrimonyCandidate = async (id: string | number) => {
  const res = await adminClient.delete(`/admin/matrimony/${id}`);
  return res.data as { success: boolean; message?: string };
};

export const setMatrimonyCandidateBanned = async (id: string | number, banned: boolean) => {
  const res = await adminClient.put(`/admin/matrimony/${id}/ban`, { banned });
  return res.data as { success: boolean; message?: string; candidate: MatrimonyCandidate };
};

// ── Feed/post moderation — all posts, any status (admin + superadmin) ──

export interface AdminPost {
  id: string;
  author_id: string;
  author_name: string;
  author_photo?: string | null;
  text_content?: string | null;
  images?: string[];
  location?: string | null;
  moderation_status?: string | null;
  created_at: string;
  [key: string]: any;
}

export const fetchAdminPosts = async (params: { page?: number; limit?: number; search?: string } = {}) => {
  const res = await adminClient.get('/admin/posts', { params });
  return res.data as { success: boolean; message?: string; posts: AdminPost[]; total: number; page: number; totalPages: number };
};

export const deleteAdminPost = async (id: string) => {
  const res = await adminClient.delete(`/admin/posts/${id}`);
  return res.data as { success: boolean; message?: string };
};

export const setAdminPostHidden = async (id: string, hidden: boolean) => {
  const res = await adminClient.put(`/admin/posts/${id}/hide`, { hidden });
  return res.data as { success: boolean; message?: string; post?: { id: string; moderation_status: string } };
};

// ── Announcements (admin + superadmin) ──
// NOTE: the shipped backend only exposes POST/PUT/:id/DELETE/:id for
// admin-side announcements — there is no admin-scoped GET list route
// (see /Users/ranjit/Downloads/Pandara_samaja_mobile_backend/src/routes/adminAnnouncements.ts).
// The member-facing GET /api/posts cannot be reused here: it requires a
// `member_portal` JWT (fastify.authenticate), while the admin panel uses a
// wholly separate `admin`-typed JWT that route explicitly rejects with 403.
// fetchAdminAnnouncements below calls GET /admin/announcements, matching
// the same admin-scoped-list convention as every other resource in this
// file (matrimony/posts/expenses) — this route does not exist yet on the
// backend and must be added (trivial: verifyAdmin + blogModel.getAll()).

export interface Announcement {
  id: string | number;
  title: string;
  content?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  created_at: string;
}

export const fetchAdminAnnouncements = async () => {
  const res = await adminClient.get('/admin/announcements');
  return res.data as { success: boolean; message?: string; posts: Announcement[] };
};

export interface AnnouncementInput {
  title: string;
  content?: string;
  image?: { uri: string; name: string; type: string } | null;
  video?: { uri: string; name: string; type: string } | null;
}

const buildAnnouncementFormData = (data: Partial<AnnouncementInput>) => {
  const formData = new FormData();
  if (data.title !== undefined) formData.append('title', data.title);
  if (data.content !== undefined) formData.append('content', data.content);
  // @ts-ignore — React Native FormData file shape
  if (data.image) formData.append('image', data.image);
  // @ts-ignore — React Native FormData file shape
  if (data.video) formData.append('video', data.video);
  return formData;
};

export const createAnnouncement = async (data: AnnouncementInput) => {
  const res = await adminClient.post('/admin/announcements', buildAnnouncementFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { success: boolean; message?: string; post?: Announcement };
};

export const updateAnnouncement = async (id: string | number, data: Partial<AnnouncementInput>) => {
  const res = await adminClient.put(`/admin/announcements/${id}`, buildAnnouncementFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { success: boolean; message?: string; post?: Announcement };
};

export const deleteAnnouncement = async (id: string | number) => {
  const res = await adminClient.delete(`/admin/announcements/${id}`);
  return res.data as { success: boolean; message?: string };
};

// ── Community expenses ledger (admin + superadmin) ──

export interface ExpenseEntry {
  id: number | string;
  title: string;
  type: 'income' | 'expense';
  amount: number | string;
  category?: string | null;
  note?: string | null;
  entry_date: string;
  created_by?: number | string | null;
  created_at: string;
}

export interface ExpenseSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface ExpenseInput {
  title: string;
  type: 'income' | 'expense';
  amount: number | string;
  category?: string;
  note?: string;
  entryDate?: string;
}

export const fetchAdminExpenses = async (params: { type?: 'income' | 'expense'; page?: number; limit?: number } = {}) => {
  const res = await adminClient.get('/admin/expenses', { params });
  return res.data as {
    success: boolean; message?: string; expenses: ExpenseEntry[]; total: number; page: number; totalPages: number;
    summary: ExpenseSummary; migrationPending?: boolean;
  };
};

export const createExpense = async (data: ExpenseInput) => {
  const res = await adminClient.post('/admin/expenses', data);
  return res.data as { success: boolean; message?: string; expense?: ExpenseEntry };
};

export const updateExpense = async (id: string | number, data: Partial<ExpenseInput>) => {
  const res = await adminClient.put(`/admin/expenses/${id}`, data);
  return res.data as { success: boolean; message?: string; expense?: ExpenseEntry };
};

export const deleteExpense = async (id: string | number) => {
  const res = await adminClient.delete(`/admin/expenses/${id}`);
  return res.data as { success: boolean; message?: string };
};

// ── Community leaders management (admin + superadmin) ──
// Mirrors the matrimony admin pattern above — multipart FormData for
// create/update (optional `image` file), plain query params for the list.

export interface Leader {
  id: number | string;
  name: string;
  name_or?: string | null;
  role: string;
  role_or?: string | null;
  level: string; // 'State' | 'District' | 'Taluka' | 'Panchayat'
  location?: string | null;
  image_url?: string | null;
  display_order?: number | null;
  created_at?: string;
}

export interface LeaderInput {
  name: string;
  name_or?: string;
  role: string;
  role_or?: string;
  level: string;
  location?: string;
  display_order?: number | string;
  image?: { uri: string; name: string; type: string } | null;
}

export const fetchAdminLeaders = async (params: { page?: number; limit?: number; level?: string; search?: string } = {}) => {
  const res = await adminClient.get('/admin/leaders', { params });
  return res.data as { success: boolean; message?: string; leaders: Leader[]; total: number; page: number; totalPages: number };
};

const buildLeaderFormData = (data: Partial<LeaderInput>) => {
  const formData = new FormData();
  if (data.name !== undefined) formData.append('name', data.name);
  if (data.name_or !== undefined) formData.append('name_or', data.name_or);
  if (data.role !== undefined) formData.append('role', data.role);
  if (data.role_or !== undefined) formData.append('role_or', data.role_or);
  if (data.level !== undefined) formData.append('level', data.level);
  if (data.location !== undefined) formData.append('location', data.location);
  if (data.display_order !== undefined) formData.append('display_order', String(data.display_order));
  // @ts-ignore — React Native FormData file shape
  if (data.image) formData.append('image', data.image);
  return formData;
};

export const createLeader = async (data: LeaderInput) => {
  const res = await adminClient.post('/admin/leaders', buildLeaderFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { success: boolean; message?: string; leader?: Leader };
};

export const updateLeader = async (id: string | number, data: Partial<LeaderInput>) => {
  const res = await adminClient.put(`/admin/leaders/${id}`, buildLeaderFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { success: boolean; message?: string; leader?: Leader };
};

export const deleteLeader = async (id: string | number) => {
  const res = await adminClient.delete(`/admin/leaders/${id}`);
  return res.data as { success: boolean; message?: string };
};
