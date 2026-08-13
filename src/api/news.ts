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
  link: string;
  publishedAt: string | null;
}

const newsClient = axios.create({ baseURL: NEWS_API_URL, timeout: 15000 });

export const fetchNews = async (): Promise<{ success: boolean; items: NewsItem[] }> => {
  const res = await newsClient.get('/news');
  return res.data;
};
