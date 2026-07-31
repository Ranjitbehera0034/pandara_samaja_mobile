// src/api/admin.ts
// Thin wrapper functions for every /api/admin/* endpoint, using the
// separate adminClient (admin/staff auth — not the member portal client).
import adminClient from './adminClient';
import { API_URL } from '../config/constants';
import { FamilyMember } from '../types';
import { FamilyMemberInput } from './members';

// Some URL-shaped fields (namely `match_evidence_url` from confirm-match /
// history) come back from the admin matrimony routes as a host-relative
// Firebase Storage proxy path (`/api/v1/portal/media?path=...`) rather than
// a fully resolved HTTPS URL — those routes don't run the field through
// getSignedMediaUrl before responding, unlike photo/photos/form_url
// elsewhere. Defensively resolve it against the API host root here so
// Linking.openURL still works, without needing a backend change.
export const resolveMediaUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const root = API_URL.replace(/\/api\/?$/, '');
  return `${root}${url.startsWith('/') ? '' : '/'}${url}`;
};

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

export const fetchAdminMembers = async (params: {
  page?: number; limit?: number; search?: string;
  district?: string; taluka?: string; panchayat?: string; village?: string; gender?: string;
} = {}) => {
  const res = await adminClient.get('/admin/members', { params });
  return res.data as { success: boolean; members: AdminMember[]; total: number; page: number; totalPages: number };
};

export interface AdminMemberFilterOptions {
  districts: string[];
  talukas: Record<string, string[]>;
  panchayats: Record<string, string[]>;
  villages: Record<string, string[]>;
}

export const fetchAdminMemberFilters = async () => {
  const res = await adminClient.get('/admin/members/filters');
  return res.data as { success: boolean; filters: AdminMemberFilterOptions };
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
  matched_partner_name?: string | null;
  matched_partner_gender?: string | null;
  matched_partner_member_id?: string | null;
  matched_status?: string | null;
  match_date?: string | null;
  match_evidence_url?: string | null;
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

// ── Matrimony application review queue (admin + superadmin) — the
// document-upload-and-review side of the redesigned matrimony feature.
// A member submits a photographed/scanned filled paper registration form;
// admin approves it (publishing a MatrimonyCandidate), asks for a
// correction, or rejects it. ──

export interface MatrimonyApplicationHistoryEntry {
  status: string;
  remark: string;
  changed_at: string;
  changed_by: string;
}

export interface MatrimonyApplication {
  id: string | number;
  member_id: string;
  membership_no: string;
  member_name: string;
  relation_to_hof: string;
  uploaded_by_name?: string | null;
  uploaded_by_mobile?: string | null;
  member_mobile?: string | null;
  uploaded_file_url: string;
  file_type?: string | null;
  status: 'pending' | 'correction_needed' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  admin_remarks?: string | null;
  version: number;
  history: MatrimonyApplicationHistoryEntry[];
  [key: string]: any;
}

export const fetchAdminMatrimonyApplications = async (
  params: { status?: 'pending' | 'correction_needed' | 'approved' | 'rejected'; page?: number; limit?: number } = {}
) => {
  const res = await adminClient.get('/admin/matrimony/applications', { params });
  return res.data as {
    success: boolean; message?: string; applications: MatrimonyApplication[];
    total: number; page: number; totalPages: number;
  };
};

export const fetchAdminMatrimonyApplication = async (id: string | number) => {
  const res = await adminClient.get(`/admin/matrimony/applications/${id}`);
  return res.data as { success: boolean; message?: string; application: MatrimonyApplication };
};

// body.gender is only ever needed as a fallback if the application's
// stashed gender is somehow missing — normally omit it and let the backend
// use the gender captured at submission time.
export const approveMatrimonyApplication = async (id: string | number, gender?: string) => {
  const res = await adminClient.post(`/admin/matrimony/applications/${id}/approve`, gender ? { gender } : {});
  return res.data as { success: boolean; message?: string; application: MatrimonyApplication; candidate?: MatrimonyCandidate };
};

export const requestMatrimonyCorrection = async (id: string | number, remark: string) => {
  const res = await adminClient.post(`/admin/matrimony/applications/${id}/request-correction`, { remark });
  return res.data as { success: boolean; message?: string; application: MatrimonyApplication };
};

export const rejectMatrimonyApplication = async (id: string | number, remark: string) => {
  const res = await adminClient.post(`/admin/matrimony/applications/${id}/reject`, { remark });
  return res.data as { success: boolean; message?: string; application: MatrimonyApplication };
};

// ── Match confirmation & history (admin + superadmin) — marks a candidate
// matched/married with evidence, removing it from the active directory
// but preserving it in an archive. ──

// Multipart: text fields matchedPartnerMemberId (optional), matchedPartnerName
// (required), matchedPartnerGender (required), matchDate (optional,
// YYYY-MM-DD) + file field `evidence` (required) — built by the caller
// (mirrors submitMatrimonyApplication in src/api/matrimony.ts) since the
// screen already assembles the FormData alongside the evidence file picker.
export const confirmMatrimonyMatch = async (id: string | number, formData: FormData) => {
  const res = await adminClient.post(`/admin/matrimony/${id}/confirm-match`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { success: boolean; message?: string; candidate: MatrimonyCandidate };
};

export const fetchMatrimonyHistory = async (params: { page?: number; limit?: number } = {}) => {
  const res = await adminClient.get('/admin/matrimony/history', { params });
  return res.data as {
    success: boolean; message?: string; candidates: MatrimonyCandidate[];
    total: number; page: number; totalPages: number;
  };
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

// ── Expense ledger (admin + superadmin) — the real, pre-existing `expenses`
// table already used by the web app (receipts, no income/type split — this
// only tracks money spent, not money received). ──

export interface ExpenseEntry {
  id: number | string;
  title: string;
  category: string;
  amount: number | string;
  description?: string | null;
  payee?: string | null;
  expense_date: string;
  attachment_url?: string | null;
  recorded_by?: string | null;
  created_at: string;
}

export interface ExpenseInput {
  title: string;
  category: string;
  amount: number | string;
  description?: string;
  payee?: string;
  expenseDate?: string;
  attachment?: { uri: string; name: string; type: string };
}

const buildExpenseFormData = (data: Partial<ExpenseInput>) => {
  const formData = new FormData();
  if (data.title !== undefined) formData.append('title', data.title);
  if (data.category !== undefined) formData.append('category', data.category);
  if (data.amount !== undefined) formData.append('amount', String(data.amount));
  if (data.description !== undefined) formData.append('description', data.description);
  if (data.payee !== undefined) formData.append('payee', data.payee);
  if (data.expenseDate !== undefined) formData.append('expenseDate', data.expenseDate);
  // @ts-ignore — React Native FormData file shape
  if (data.attachment) formData.append('attachment', data.attachment);
  return formData;
};

export const fetchAdminExpenses = async (params: { category?: string; page?: number; limit?: number } = {}) => {
  const res = await adminClient.get('/admin/expenses', { params });
  return res.data as {
    success: boolean; message?: string; expenses: ExpenseEntry[]; total: number; page: number; totalPages: number;
    totalSpent: number; categories: string[];
  };
};

export const createExpense = async (data: ExpenseInput) => {
  const res = await adminClient.post('/admin/expenses', buildExpenseFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { success: boolean; message?: string; expense?: ExpenseEntry };
};

export const updateExpense = async (id: string | number, data: Partial<ExpenseInput>) => {
  const res = await adminClient.put(`/admin/expenses/${id}`, buildExpenseFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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

export const fetchAdminLeaders = async (params: { page?: number; limit?: number; level?: string; location?: string; search?: string } = {}) => {
  const res = await adminClient.get('/admin/leaders', { params });
  return res.data as { success: boolean; message?: string; leaders: Leader[]; total: number; page: number; totalPages: number };
};

export const fetchAdminLeaderLocations = async (level?: string) => {
  const res = await adminClient.get('/admin/leaders/locations', { params: { level } });
  return res.data as { success: boolean; message?: string; data: string[] };
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

// ── Member household roster (admin + superadmin) — mirrors the
// member-facing wrappers in src/api/members.ts, scoped by memberId
// (membership_no) instead of the caller's own token. ──

// GET /api/admin/members/:id/family
export const fetchAdminMemberFamily = async (memberId: string) => {
  const res = await adminClient.get(`/admin/members/${memberId}/family`);
  return res.data as { success: boolean; message?: string; familyMembers: FamilyMember[] };
};

// POST /api/admin/members/:id/family — returns the WHOLE updated array
export const addAdminFamilyMember = async (memberId: string, data: FamilyMemberInput) => {
  const res = await adminClient.post(`/admin/members/${memberId}/family`, data);
  return res.data as { success: boolean; message?: string; familyMembers: FamilyMember[] };
};

// PUT /api/admin/members/:id/family/:index — partial update, all fields optional
export const updateAdminFamilyMember = async (memberId: string, index: number, data: Partial<FamilyMemberInput>) => {
  const res = await adminClient.put(`/admin/members/${memberId}/family/${index}`, data);
  return res.data as { success: boolean; message?: string; familyMembers: FamilyMember[] };
};

// DELETE /api/admin/members/:id/family/:index
export const deleteAdminFamilyMember = async (memberId: string, index: number) => {
  const res = await adminClient.delete(`/admin/members/${memberId}/family/${index}`);
  return res.data as { success: boolean; message?: string; familyMembers: FamilyMember[] };
};

// ── Community demographics (admin + superadmin) — computed community-wide
// across every household's family_members roster. ──

export interface Demographics {
  totalFamilyMembers: number;
  male: number;
  female: number;
  adults: number;
  children: number;
  infants: number;
  married: number;
  unmarried: number;
}

// GET /api/admin/members/demographics
export const fetchDemographics = async () => {
  const res = await adminClient.get('/admin/members/demographics');
  return res.data as { success: boolean; message?: string; demographics: Demographics };
};

// ── Member activity analytics (admin + superadmin) — aggregated stats and
// trends derived entirely from the existing `activity_log` + `members`
// tables (see GET /admin/activity for the separate raw-log viewer this
// screen sits alongside, not replaces). ──

export interface DailyTrendPoint {
  date: string;
  count: number;
}

export interface MostActiveMember {
  membership_no: string;
  activity_count: number;
  name: string | null;
  village: string | null;
  district: string | null;
}

export interface ActionBreakdownEntry {
  action: string;
  count: number;
}

export interface AnalyticsData {
  activeMembers: { today: number; last7Days: number; last30Days: number };
  dailyActiveTrend: DailyTrendPoint[];
  mostActiveMembers: MostActiveMember[];
  actionBreakdown: ActionBreakdownEntry[];
  inactiveMembers: number;
  newSignupsTrend: DailyTrendPoint[];
}

// GET /api/admin/analytics
export const fetchAdminAnalytics = async () => {
  const res = await adminClient.get('/admin/analytics');
  return res.data as { success: boolean; message?: string; analytics: AnalyticsData; migrationPending?: boolean };
};
