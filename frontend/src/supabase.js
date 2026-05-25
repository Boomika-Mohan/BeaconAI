import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ypvcgwlfwjjzilmbepai.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwdmNnd2xmd2pqemlsbWJlcGFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNjIxMjcsImV4cCI6MjA5NDgzODEyN30.ZqoqIGBhlW2vedxfrRwshH-Jw8CHUJFe6u6pNEJwR9M'

export const supabase = createClient(supabaseUrl, supabaseKey)