'use client'

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function RealtimeAdminQuestions() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createBrowserClient(supabaseUrl, supabaseKey);

    const channel = supabase.channel('realtime_admin_questions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'questions'
      }, (payload) => {
        console.log('Realtime admin update received:', payload);
        // RealtimeQuestions.tsxと同じ理由でstartTransitionで包む(2026-10-11)
        startTransition(() => {
          router.refresh();
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
