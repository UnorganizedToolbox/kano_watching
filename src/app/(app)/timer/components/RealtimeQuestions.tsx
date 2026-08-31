'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function RealtimeQuestions({ studentId }: { studentId: string }) {
  const router = useRouter();

  useEffect(() => {
    // Supabase URL and Key fallback to prevent crashes if one is named differently
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing in browser client');
      return;
    }

    const supabase = createBrowserClient(supabaseUrl, supabaseKey);

    const channel = supabase.channel('realtime_questions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'questions',
        filter: `student_uuid=eq.${studentId}`
      }, (payload) => {
        console.log('Realtime update received:', payload);
        router.refresh(); // Tells Next.js to re-fetch Server Components (including questions)
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, router]);

  return null;
}
