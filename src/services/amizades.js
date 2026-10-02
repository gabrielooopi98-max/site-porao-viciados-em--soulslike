import { supabase } from './supabase';

export function consultarAmizadesAceitas(usuarioId) {
    return supabase.from('amizades')
        .select('id, solicitante_id, destinatario_id, solicitante_nome, solicitante_avatar_url, destinatario_nome, destinatario_avatar_url')
        .eq('status', 'aceita')
        .or(`solicitante_id.eq.${usuarioId},destinatario_id.eq.${usuarioId}`)
        .order('criado_em', { ascending: false });
}

export function obterAmigos(amizades, usuarioId) {
    return !usuarioId ? [] : amizades.map(amizade => amizade.solicitante_id === usuarioId
        ? { id: amizade.destinatario_id, nome: amizade.destinatario_nome, avatar: amizade.destinatario_avatar_url }
        : { id: amizade.solicitante_id, nome: amizade.solicitante_nome, avatar: amizade.solicitante_avatar_url });
}
