export type Gender = 'male' | 'female' | 'other'
export type ArrivalStage = 'new' | 'settling' | 'local'

export type Purpose =
  | 'Friend'
  | 'Chat'
  | 'Language Exchange'
  | 'Local Help'
  | 'Dating'
  | 'Drinks'
  | 'Sightseeing'
  | 'Culture'

export type HelperCategory = 'Banking' | 'Housing' | 'Medical' | 'Visa' | 'Japanese' | 'Tax' | 'Transport' | 'Jobs'

export type PostTag = 'Drinks' | 'Food' | 'Coffee' | 'Sightseeing' | 'Culture' | 'Talk' | 'Help' | 'Other'

export interface Post {
  id: string
  user_id: string
  content: string
  tag: PostTag
  area: string
  status: 'active' | 'closed'
  expires_at: string
  created_at: string
  profiles?: {
    display_name: string
    nationality: string
    avatar_url: string | null
    arrival_stage: string | null
  }
  post_joins?: { user_id: string }[]
  post_messages?: { id: string }[]
}

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
  arrival_stage: ArrivalStage | null
  updated_at: string
  is_mentor: boolean
  helper_categories: HelperCategory[]
  nowjp_id: string | null
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

export interface NowSession {
  id: string
  user_id: string
  activity: string
  area: string
  message: string | null
  expires_at: string
  created_at: string
  profiles: Profile
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

export interface HelpRequest {
  id: string
  user_id: string
  category: string
  message: string
  area: string
  status: 'open' | 'resolved'
  is_urgent: boolean
  created_at: string
  profiles?: Pick<Profile, 'display_name' | 'nationality' | 'avatar_url' | 'arrival_stage' | 'is_mentor'>
}
