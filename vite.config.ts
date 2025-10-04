import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://rsagursnppdyiwpivqwy.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYWd1cnNucHBkeWl3cGl2cXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NTcxNTMsImV4cCI6MjA3NTEzMzE1M30.SU5zxvBUimaaeLxPpjOeqXEFCz1SHDXhI9Y9OCFUFvE"

export const supabase = createClient(supabaseUrl, supabaseKey)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
