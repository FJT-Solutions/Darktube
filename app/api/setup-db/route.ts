import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { error } = await supabase.rpc('admin_run_sql', {
    sql: `
      -- Fix remodeling_templates
      ALTER TABLE public.remodeling_templates 
      ADD COLUMN IF NOT EXISTS music_model text,
      ADD COLUMN IF NOT EXISTS voice_model text,
      ADD COLUMN IF NOT EXISTS voice_language text;

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

      -- Check if policy exists before creating
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE tablename = 'remodeling_history' 
          AND policyname = 'Allow all for service role'
        ) THEN
          CREATE POLICY "Allow all for service role" ON public.remodeling_history
            USING (true)
            WITH CHECK (true);
        END IF;
      END
      $$;
    `
  })

  if (error) {
    return NextResponse.json({ success: false, error }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Table created or already exists' })
}
