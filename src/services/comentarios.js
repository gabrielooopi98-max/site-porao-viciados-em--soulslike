import { supabase } from './supabase';

function dadosAvatarComentario(user) {
    const metadados = user?.user_metadata ?? {};

    return {
        autor_avatar_url: metadados.avatar_url || null,
        autor_avatar_zoom: metadados.avatar_zoom ?? 1,
        autor_avatar_pos_x: metadados.avatar_pos_x ?? 50,
        autor_avatar_pos_y: metadados.avatar_pos_y ?? 50,
    };
}

export async function inserirComentario(tabela, dados, user) {
    const resultado = await supabase
        .from(tabela)
        .insert({ ...dados, ...dadosAvatarComentario(user) })
        .select()
        .single();

    // Sem a migration comentarios_avatar.sql as colunas de foto não existem; salva o comentário sem elas.
    if (resultado.error?.code === 'PGRST204') {
        return supabase.from(tabela).insert(dados).select().single();
    }

    return resultado;
}
