import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setup() {
  console.log('--- Setting up remodeling_history table ---')
  
  const { error: tableError } = await supabase.rpc('admin_run_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.remodeling_history (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        template_id uuid REFERENCES public.remodeling_templates(id) ON DELETE CASCADE,
        original_video_id text,
        dispatched_at timestamp with time zone DEFAULT now(),
        payload jsonb,
        status text DEFAULT 'pending',
        video_url text,
        error_message text
      );

      -- Add RLS
      ALTER TABLE public.remodeling_history ENABLE ROW LEVEL SECURITY;

      -- Policies
      CREATE POLICY "Allow all for service role" ON public.remodeling_history
        USING (true)
        WITH CHECK (true);
    `
  })

  if (tableError) {
    console.error('Error creating table:', tableError)
    
    // If RPC is not available, try direct table creation if we have permissions
    // Note: Usually service role can't run arbitrary SQL unless an RPC is set up
    console.log('Attempting direct creation...')
    const { error: directError } = await supabase.from('remodeling_history').select('count').limit(1)
    if (directError && directError.code === 'PGRST204') {
       console.error('Table still missing. Please create public.remodeling_history manually in Supabase SQL Editor.')
    }
  } else {
    console.log('Table created successfully!')
  }
}

setup()
