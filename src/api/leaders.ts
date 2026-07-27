// src/api/leaders.ts
import client from './client';

export type LeaderLevel = 'State' | 'District' | 'Taluka' | 'Panchayat';

// GET /api/leaders?level=&location=&search=
// `level` is optional — omit it (or pass undefined) to search across every level at once.
export const fetchLeaders = async (level?: LeaderLevel, location?: string, search?: string) => {
  const params: any = {};
  if (level) params.level = level;
  if (location) params.location = location;
  if (search) params.search = search;
  const res = await client.get('/leaders', { params });
  return res.data;
  // Returns: { success, data: Leader[] }
};

// GET /api/leaders/locations?level=
export const fetchLeaderLocations = async (level: LeaderLevel) => {
  const res = await client.get('/leaders/locations', { params: { level } });
  return res.data;
  // Returns: { success, data: string[] }
};
