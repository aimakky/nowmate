export interface ProfileRow {
  id:           string
  display_name: string
  VILLIA_id:    string | null
  avatar_url:   string | null
  created_at:   string | null
  updated_at:   string
}

export interface FetchProfilesResult {
  rows:    ProfileRow[]
  hasMore: boolean
  error:   string | null
}

export const PAGE_SIZE = 50
