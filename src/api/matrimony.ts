// src/api/matrimony.ts
// Thin wrappers around the community "matrimony" endpoints — browse/search
// candidates, manage your own submitted profile, swipe like/pass, and view
// mutual matches.
import client from './client';

export interface CandidateSearchParams {
  search?: string;
  minAge?: number | string;
  maxAge?: number | string;
  education?: string;
  gotra?: string;
  sort?: 'newest' | 'age_asc' | 'age_desc' | 'name';
  gender?: 'male' | 'female' | '';
  page?: number;
  limit?: number;
}

// GET /api/portal/matrimony/candidates — browse/search/sort/filter feed
export const fetchCandidates = async (params: CandidateSearchParams = {}) => {
  const res = await client.get('/portal/matrimony/candidates', { params });
  return res.data;
  // Returns: { success, candidates: Candidate[], page }
};

// GET /api/portal/matrimony/candidates/:id
export const fetchCandidateById = async (id: string | number) => {
  const res = await client.get(`/portal/matrimony/candidates/${id}`);
  return res.data;
  // Returns: { success, candidate }
};

// GET /api/portal/matrimony/profile — the member's own submitted candidate profile(s)
export const fetchMyProfile = async () => {
  const res = await client.get('/portal/matrimony/profile');
  return res.data;
  // Returns: { success, candidates }
};

// POST /api/portal/matrimony/profile — multipart (text fields + optional
// 'form' file + optional 'photos' files, can append multiple). Include
// an 'id' field to update an existing profile, omit it to create one.
export const saveProfile = async (formData: FormData) => {
  const res = await client.post('/portal/matrimony/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
  // Returns: { success, candidate }
};

// POST /api/portal/matrimony/candidates/:id/swipe — { direction: 'like' | 'pass' }
export const swipeCandidate = async (id: string | number, direction: 'like' | 'pass') => {
  const res = await client.post(`/portal/matrimony/candidates/${id}/swipe`, { direction });
  return res.data;
  // Returns: { success, matched }
};

// GET /api/portal/matrimony/matches
export const fetchMatches = async () => {
  const res = await client.get('/portal/matrimony/matches');
  return res.data;
  // Returns: { success, matches }
};
