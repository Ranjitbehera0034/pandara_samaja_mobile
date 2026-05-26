// src/api/events.ts
import client from './client';

// GET /api/portal/events
export const fetchEvents = async () => {
  const res = await client.get('/portal/events');
  return res.data;
  // Returns: { success, events: Event[] }
};

// POST /api/portal/events/:id/register — RSVP
export const rsvpEvent = async (eventId: number) => {
  const res = await client.post(`/portal/events/${eventId}/register`);
  return res.data;
};
