import { resolvePlayer } from './player-session';
export type AgendaItem = {
    id: string;
    event_id: string;
    day: string;
    title: string;
    timing: string;
    supplies_owner: string | null;
    note: string;
    tournament_id: string | null;
    position: number;
    revision: number;
    updated_at: string;
};
export async function loadAgenda(eventId: string) { const { supabase } = await resolvePlayer(); const { data, error } = await supabase.from('event_agenda_items').select('*').eq('event_id', eventId).order('day').order('position').order('id'); return { items: (data || []) as AgendaItem[], error: error ? 'Agenda could not be loaded. Try again.' : null }; }
