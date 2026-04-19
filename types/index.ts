export type Gender = 'male' | 'female' | 'other'

export type Purpose =
  | 'Friend'
  | 'Chat'
  | 'Language Exchange'
  | 'Local Help'
  | 'Dating'

export interface Profile {
  id: string
  display_name: string
  age: number
  gender: Gender
  nationality: string
  area: string
  spoken_languages: string[]
  learning_languages: string[]
  purposes: Purpose[]
  bio: string | null
  avatar_url: string | null
  is_online: boolean
  is_active: boolean
  updated_at: string
}

export interface Like {
  id: string
  from_user_id: string
  to_user_id: string
  created_at: string
}

export interface Match {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  other_profile?: Profile
  last_message?: Message
}

export interface Message {
  id: string
  match_id: string
  sender_id: string
  content: string
  created_at: string
  is_deleted: boolean
}

export interface Report {
  id: string
  reporter_id: string
  reported_id: string
  reason: string
  description: string | null
  created_at: string
}

export interface Block {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string
}
