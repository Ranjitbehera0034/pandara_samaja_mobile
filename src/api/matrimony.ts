// src/api/matrimony.ts
// Thin wrappers around the community "matrimony" endpoints. The backend
// feature was redesigned from a swipe/Tinder-style matcher into a
// document-upload-and-review directory: members download a blank paper
// registration form, fill/sign/photograph it, and submit that single file
// as an "application"; admin reviews and approves it into the browsable
// candidates directory. There is no more profile/swipe/matches surface on
// the member side — see src/api/admin.ts for the admin-side review queue,
// match confirmation, and history endpoints.
import client from './client';

export interface CandidateSearchParams {
  search?: string;
  minAge?: number | string;
  maxAge?: number | string;
  education?: string;
  gotra?: string;
  sort?: 'newest' | 'age_asc' | 'age_desc' | 'name';
  // Plain optional display filter now — NOT a forced opposite-gender
  // default like the old swipe feature. Omit to see every approved
  // candidate regardless of gender.
  gender?: 'male' | 'female' | '';
  page?: number;
  limit?: number;
}

export interface Candidate {
  id: string | number;
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
  status?: string;
  is_matched?: boolean;
  matched_partner_name?: string | null;
  matched_partner_gender?: string | null;
  matched_status?: string | null;
  author_id?: string | number | null;
  created_at?: string;
  [key: string]: any;
}

// GET /api/portal/matrimony/candidates — browse/search/sort/filter the
// directory of all approved candidates.
export const fetchCandidates = async (params: CandidateSearchParams = {}) => {
  const res = await client.get('/portal/matrimony/candidates', { params });
  return res.data as { success: boolean; candidates: Candidate[]; page: number };
};

// GET /api/portal/matrimony/candidates/:id
export const fetchCandidateById = async (id: string | number) => {
  const res = await client.get(`/portal/matrimony/candidates/${id}`);
  return res.data as { success: boolean; candidate: Candidate };
};

// GET /api/portal/matrimony/form-template — the static blank-PDF download
// link. Fetch this at submit time and Linking.openURL() it rather than
// hardcoding the URL on-device, so the server can update it later.
export const fetchFormTemplateUrl = async () => {
  const res = await client.get('/portal/matrimony/form-template');
  return res.data as { success: boolean; url: string };
};

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
  photos?: string[] | null;
  status: 'pending' | 'correction_needed' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  admin_remarks?: string | null;
  version: number;
  history: MatrimonyApplicationHistoryEntry[];
  [key: string]: any;
}

// POST /api/portal/matrimony/applications — multipart: text fields
// candidateName (required), relationToHof (required), gender (required,
// 'Male'|'Female'), uploadedByMobile (optional) + file field `form`
// (required — photographed/scanned filled form, image or PDF) + optional
// repeated file field `photos` (personal photos of the candidate).
export const submitMatrimonyApplication = async (formData: FormData) => {
  const res = await client.post('/portal/matrimony/applications', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { success: boolean; application: MatrimonyApplication };
};

// GET /api/portal/matrimony/applications/mine — the logged-in member's own
// submitted applications with status.
export const fetchMyApplications = async () => {
  const res = await client.get('/portal/matrimony/applications/mine');
  return res.data as { success: boolean; applications: MatrimonyApplication[] };
};

// POST /api/portal/matrimony/applications/:id/resubmit — multipart, file
// field `form` only. Only valid when the application's status is
// 'correction_needed' (backend returns 400 otherwise).
export const resubmitApplication = async (id: string | number, formData: FormData) => {
  const res = await client.post(`/portal/matrimony/applications/${id}/resubmit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data as { success: boolean; application: MatrimonyApplication };
};

// REMOVED — no longer exist on the backend: fetchMyProfile, saveProfile,
// swipeCandidate, fetchMatches (GET/POST /matrimony/profile, POST
// /matrimony/candidates/:id/swipe, GET /matrimony/matches).
