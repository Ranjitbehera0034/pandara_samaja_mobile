// src/api/explore.ts
import client from './client';

// GET /api/portal/explore/stats
export const fetchExploreStats = async () => {
  const res = await client.get('/portal/explore/stats');
  return res.data;
  // Returns: { success, stats: { active_members, trending_tags: [{name, count}] } }
};
