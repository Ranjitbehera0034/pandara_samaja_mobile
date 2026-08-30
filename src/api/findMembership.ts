// src/api/findMembership.ts
// Pre-login "find my membership" lookup — public endpoints, no auth token
// needed (the member hasn't logged in yet, that's the whole point).
import client from './client';

export interface LocationOptions {
  districts: string[];
  talukas: Record<string, string[]>;
  panchayats: Record<string, string[]>;
  villages: Record<string, string[]>;
}

export const fetchFindMembershipLocationOptions = async () => {
  const res = await client.get('/portal/find-membership/location-options');
  return res.data as { success: boolean; message?: string; filters: LocationOptions };
};

export interface FindMembershipMatch {
  membershipNo: string;
  name: string;
  maskedMobile: string;
}

export const searchMembership = async (params: {
  name: string;
  district: string;
  taluka: string;
  panchayat: string;
  village: string;
}) => {
  const res = await client.post('/portal/find-membership/search', params);
  return res.data as { success: boolean; message?: string; matches: FindMembershipMatch[] };
};
