// src/api/news.ts
// Talks to the separate news backend (own repo/deployment), not the main
// portal API — public/read-only, so no auth headers needed.
import axios from 'axios';
import { NEWS_API_URL } from '../config/constants';

export interface NewsItem {
  id: string;
  sourceId: string;
  sourceName: string;
  language: string;
  title: string;
  snippet: string;
  imageUrl: string | null;
  link: string;
  publishedAt: string | null;
  categories: string[];
}

// Longer than the main API client's timeout — this service is on Render's
// free tier and can take 30-50s to wake from a cold start if the
// keep-alive ping (UptimeRobot hitting /health) has lapsed.
const newsClient = axios.create({ baseURL: NEWS_API_URL, timeout: 45000 });

export const fetchNews = async (): Promise<{ success: boolean; items: NewsItem[] }> => {
  const res = await newsClient.get('/news');
  return res.data;
};
