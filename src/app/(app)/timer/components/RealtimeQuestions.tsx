'use client'

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function RealtimeQuestions({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

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
        // startTransitionで包むことで、このページ(/timer)にソフトナビゲーションで来た場合に
        // router.refresh()が無関係な他のクライアントコンポーネント(ポモドーロタイマー等)の
        // state(useState)を巻き込んでリセットしてしまう既知のNext.jsの不具合パターンを避ける
        // (2026-10-11、タイマーが不可解なタイミングでリセットされる報告の調査時に対応。
        // vercel/next.js#43650等で「startTransitionで包むと発生しない」と報告されている)。
        startTransition(() => {
          router.refresh(); // Tells Next.js to re-fetch Server Components (including questions)
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, router]);

  return null;
}
