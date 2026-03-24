import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars:", { url: !!supabaseUrl, key: !!supabaseKey })
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const email = 'nathanjordan05052000@gmail.com'

async function check() {
  console.log(`Checking email: ${email}`)
  
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*').eq('email', email)
  console.log("Profiles:", profiles || pError)
  
  const { data: invites, error: iError } = await supabase.from('invites').select('*').eq('email', email)
  console.log("Invites:", invites || iError)
  
  const { data: authUsers, error: aError } = await supabase.auth.admin.listUsers()
  if (aError) {
      console.log("Auth Error:", aError)
  } else {
      const authUser = authUsers.users.find(u => u.email === email)
      console.log("Auth User:", authUser ? "Exists (ID: " + authUser.id + ")" : "Not found")
  }
}

check()
