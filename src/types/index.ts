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
