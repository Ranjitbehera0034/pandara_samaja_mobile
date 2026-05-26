// src/api/leaders.ts
import client from './client';

export type LeaderLevel = 'State' | 'District' | 'Taluka' | 'Panchayat';

// GET /api/leaders?level=&location=
export const fetchLeaders = async (level: LeaderLevel, location?: string) => {
  const params: any = { level };
  if (location) params.location = location;
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
