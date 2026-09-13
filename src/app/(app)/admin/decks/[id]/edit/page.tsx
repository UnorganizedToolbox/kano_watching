export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DeckForm from "../../DeckForm";
import type { DeckItemForm } from "../../actions";
import type { DeckChildKind } from "@/lib/cbt/deck";

export default async function EditDeckPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') redirect('/');

  const isAdmin = profile.role === 'admin';

  const { data: deck, error } = await supabase
    .from('problem_decks')
    .select('id, title, organization_id')
    .eq('id', id)
    .single();

  if (error || !deck) {
    return (
      <div className="p-8 text-center text-slate-500">
        デッキが見つかりませんでした。<br />
        <Link href="/admin/decks" className="text-brand-600 hover:underline mt-4 inline-block">戻る</Link>
      </div>
    );
  }

  const { data: itemRows } = await supabase
    .from('deck_items')
    .select('child_kind, child_deck_id, child_template_id, weight')
    .eq('parent_deck_id', id)
    .order('position');

  const items: DeckItemForm[] = (itemRows ?? []).map(row => ({
    childKind: row.child_kind as DeckChildKind,
    childId: row.child_kind === 'deck' ? row.child_deck_id : row.child_template_id,
    weight: row.weight,
  }));

  const { data: organizations } = isAdmin
    ? await supabase.from('organizations').select('id, name').order('name')
    : { data: [] };

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[900px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/decks" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">デッキ編集</h2>
        </div>
      </div>

      <DeckForm
        deckId={deck.id}
        initialTitle={deck.title}
        initialItems={items}
        initialOrganizationId={deck.organization_id}
        organizations={organizations || []}
        isAdmin={isAdmin}
      />
    </section>
  );
}
