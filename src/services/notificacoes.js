import { supabase } from './supabase';

export async function buscarNotificacoes(destinatarioId) {
  return supabase
    .from('notificacoes')
    .select('id, ator_id, ator_nome, tipo, post_id, build_id, amizade_id, titulo_conteudo, texto, lida, criado_em')
    .eq('destinatario_id', destinatarioId)
    .order('criado_em', { ascending: false })
    .limit(30);
}

export async function criarNotificacao(notificacao) {
  return supabase
    .from('notificacoes')
    .insert(notificacao);
}

export async function marcarNotificacoesLidas(destinatarioId) {
  return supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('destinatario_id', destinatarioId)
    .eq('lida', false);
}