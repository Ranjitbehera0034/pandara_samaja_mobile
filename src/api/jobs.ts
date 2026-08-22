// src/api/jobs.ts
// Member-facing job board — members browse published postings and submit
// their own for review. "Apply" always means following application_info
// (a link or contact instructions) outside the app; there is no in-app
// application tracking. See src/api/admin.ts for the admin review queue
// and direct-create endpoints.
import client from './client';

export interface JobPosting {
  id: string | number;
  title: string;
  organization: string;
  category: 'govt' | 'private';
  description: string;
  location?: string | null;
  application_info: string;
  // The submitter's own accountability number, carried onto the listing so
  // applicants know who to hold accountable — null for some admin-direct
  // postings where application_info alone covers how to apply.
  contact_phone?: string | null;
  // As-written strings (not parsed dates) — display verbatim, never
  // reformat; source text is OCR'd or hand-typed, not machine-reliable.
  eligibility?: string | null;
  last_date?: string | null;
  registration_start_date?: string | null;
  application_fee?: string | null;
  posted_by_admin: boolean;
  submitted_by?: string | null;
  created_at: string;
  expires_at?: string | null;
  [key: string]: any;
}

export interface JobSubmissionHistoryEntry {
  status: string;
  remark: string;
  changed_at: string;
  changed_by: string;
}

export interface JobSubmission {
  id: string | number;
  membership_no: string;
  submitter_name?: string | null;
  submitter_mobile?: string | null;
  title: string;
  organization: string;
  category: 'govt' | 'private';
  description: string;
  location?: string | null;
  application_info: string;
  eligibility?: string | null;
  last_date?: string | null;
  registration_start_date?: string | null;
  application_fee?: string | null;
  status: 'pending' | 'rejected';
  admin_remarks?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  history: JobSubmissionHistoryEntry[];
  submitted_at: string;
  [key: string]: any;
}

// GET /api/portal/jobs — published postings, newest first, excludes expired.
export const fetchJobs = async (params: { category?: 'govt' | 'private'; page?: number; limit?: number } = {}) => {
  const res = await client.get('/portal/jobs', { params });
  return res.data as { success: boolean; jobs: JobPosting[]; page: number };
};

// GET /api/portal/jobs/:id
export const fetchJobById = async (id: string | number) => {
  const res = await client.get(`/portal/jobs/${id}`);
  return res.data as { success: boolean; job: JobPosting };
};

export interface SubmitJobInput {
  title: string;
  organization: string;
  category: 'govt' | 'private';
  description: string;
  location?: string;
  applicationInfo: string;
  // Required — the submitter's own accountability phone number.
  contactPhone: string;
  eligibility?: string;
  lastDate?: string;
  registrationStartDate?: string;
  applicationFee?: string;
}

// POST /api/portal/jobs/submissions — member submits a posting for review.
export const submitJob = async (data: SubmitJobInput) => {
  const res = await client.post('/portal/jobs/submissions', data);
  return res.data as { success: boolean; submission: JobSubmission };
};

// GET /api/portal/jobs/submissions/mine — the logged-in member's own submissions.
export const fetchMyJobSubmissions = async () => {
  const res = await client.get('/portal/jobs/submissions/mine');
  return res.data as { success: boolean; submissions: JobSubmission[] };
};

// POST /api/portal/jobs/:id/report — flags a live listing, auto-hiding it
// pending admin review. Mirrors the story-report flow.
export const reportJob = async (id: string | number, reason?: string) => {
  const res = await client.post(`/portal/jobs/${id}/report`, { reason });
  return res.data as { success: boolean };
};
