// src/api/courses.ts
// Member-facing courses — admin-curated links to free external learning
// platforms (YouTube, Udemy, Coursera, etc.). Read-only for members, no
// submission path — see the backend's ARCHITECTURE.md "Courses" section.
import client from './client';

export interface CourseLesson {
  id: string | number;
  course_id: string | number;
  title: string;
  platform: string;
  external_url: string;
  order_index: number;
  created_at: string;
}

export interface Course {
  id: string | number;
  title: string;
  description?: string | null;
  category?: string | null;
  thumbnail_url?: string | null;
  is_published: boolean;
  created_at: string;
  lessons?: CourseLesson[];
  [key: string]: any;
}

// GET /api/portal/courses — published courses, newest first.
export const fetchCourses = async (params: { category?: string; page?: number; limit?: number } = {}) => {
  const res = await client.get('/portal/courses', { params });
  return res.data as { success: boolean; courses: Course[]; page: number };
};

// GET /api/portal/courses/:id — published course + its lessons.
export const fetchCourseById = async (id: string | number) => {
  const res = await client.get(`/portal/courses/${id}`);
  return res.data as { success: boolean; course: Course };
};
