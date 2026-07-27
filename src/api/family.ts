// src/api/family.ts
// Thin wrappers around the personal "family" endpoints — scoped to the
// logged-in member's own family (albums/events), not the shared community
// Events/Groups screens.
import client from './client';

// ════════════════════════════════════════════════
//  FAMILY ALBUMS
// ════════════════════════════════════════════════

// GET /api/portal/family/albums
export const fetchAlbums = async () => {
  const res = await client.get('/portal/family/albums');
  return res.data;
  // Returns: { success, albums: Album[] }
};

// POST /api/portal/family/albums — multipart (fields: title, description, file: cover)
export const createAlbum = async (formData: FormData) => {
  const res = await client.post('/portal/family/albums', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
  // Returns: { success, album }
};

// DELETE /api/portal/family/albums/:id
export const deleteAlbum = async (albumId: string | number) => {
  const res = await client.delete(`/portal/family/albums/${albumId}`);
  return res.data;
};

// POST /api/portal/family/albums/:id/photos — multipart (file field: photos, can be multiple)
export const addAlbumPhotos = async (albumId: string | number, formData: FormData) => {
  const res = await client.post(`/portal/family/albums/${albumId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
  // Returns: { success, photos }
};

// ════════════════════════════════════════════════
//  FAMILY EVENTS
// ════════════════════════════════════════════════

// GET /api/portal/family/events
export const fetchFamilyEvents = async () => {
  const res = await client.get('/portal/family/events');
  return res.data;
  // Returns: { success, events: FamilyEvent[] }
};

export interface CreateFamilyEventInput {
  title: string;
  description?: string;
  eventDate: string;
  location?: string;
  type?: string;
}

// POST /api/portal/family/events
export const createFamilyEvent = async (data: CreateFamilyEventInput) => {
  const res = await client.post('/portal/family/events', data);
  return res.data;
  // Returns: { success, event }
};

// DELETE /api/portal/family/events/:id
export const deleteFamilyEvent = async (eventId: string | number) => {
  const res = await client.delete(`/portal/family/events/${eventId}`);
  return res.data;
};

// POST /api/portal/family/events/:id/rsvp
export const rsvpFamilyEvent = async (eventId: string | number, status: 'going' | 'not_going' | 'maybe') => {
  const res = await client.post(`/portal/family/events/${eventId}/rsvp`, { status });
  return res.data;
  // Returns: { success, rsvp }
};
