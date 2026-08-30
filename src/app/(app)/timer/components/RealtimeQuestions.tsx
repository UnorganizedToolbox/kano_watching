'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function RealtimeQuestions({ studentId }: { studentId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

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
