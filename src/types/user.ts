export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeenAt?: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  userName: string;
  fullName?: string;
  city?: string;
  country?: string;
  gender?: string;
  dateOfBirth?: string;
}
