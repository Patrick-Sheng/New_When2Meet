/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rsagursnppdyiwpivqwy.supabase.co"
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYWd1cnNucHBkeWl3cGl2cXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NTcxNTMsImV4cCI6MjA3NTEzMzE1M30.SU5zxvBUimaaeLxPpjOeqXEFCz1SHDXhI9Y9OCFUFvE"

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types for TypeScript
export type Event = {
  id: string
  title: string
  description?: string
  created_at: string
  time_slots: TimeSlot[]
}

export type TimeSlot = {
  id: string
  event_id: string
  start_time: string
  end_time: string
}

export type Availability = {
  id: string
  event_id: string
  user_name: string
  time_slot_id: string
  created_at: string
}