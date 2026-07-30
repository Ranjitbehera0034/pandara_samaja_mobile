// src/types/index.ts

export interface Member {
  membership_no: string;       // e.g. "MEM1234567"
  name: string;
  head_gender: 'male' | 'female' | null;
  mobile: string;
  male: number | null;         // count of male family members
  female: number | null;       // count of female family members
  district: string | null;
  taluka: string | null;
  panchayat: string | null;
  village: string | null;
  aadhar_no: string | null;
  family_members: FamilyMember[];
  address: string | null;
}

export interface FamilyMember {
  name: string;
  relation: string;
  age: number | string;
  gender?: string;
  mobile?: string;
  marital_status?: string;
  profile_pic?: string | null;
}

export interface LoggedUser {
  name: string;
  relation: string;           // 'Head', 'Spouse', 'Son', 'Daughter', etc.
  gender?: string;
  profile_photo_url?: string | null;
  mobile?: string;
  dob?: string | null;
}

export interface AuthState {
  member: Member | null;
  user: LoggedUser | null;
  token: string | null;
  isLoading: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  question: string;
  options: PollOption[];
  totalVotes: number;
  myVote?: string;
  endsAt?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  content: string;
  timestamp: string;
  parentId?: string;
  replies: Comment[];
  likes: number;
  isLiked: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  authorVerified?: boolean;
  authorMembershipNo?: string;
  location?: string;
  content: string;
  images?: string[];
  media?: MediaItem[];
  likes: number;
  reactions: Record<ReactionType, number>;
  myReaction?: ReactionType | null;
  comments: Comment[];
  commentsCount?: number;
  timestamp: string;
  isLiked: boolean;
  isBookmarked?: boolean;
  shareCount?: number;
  views_count?: number;
  hashtags?: string[];
  mentions?: string[];
  poll?: Poll;
}

export interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  timestamp: string;
  viewed: boolean;
  textOverlay?: string;
  textPosition?: 'top' | 'center' | 'bottom';
  textColor?: string;
}

