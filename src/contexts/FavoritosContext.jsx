import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { FavoritosContext } from './favoritosContextStore';
import { supabase } from '../services/supabase';

function FavoritosConta({ usuarioId, children }) {
    const [favoritos, setFavoritos] = useState([]);
    const [carregando, setCarregando] = useState(Boolean(usuarioId));
    const [erro, setErro] = useState('');
    const [tentativa, setTentativa] = useState(0);
    const operacoes = useRef(new Set());

    useEffect(() => {
        if (!usuarioId) return undefined;
        let ativo = true;
        async function carregar() {
            try {
                const resultados = [];
                for (let inicio = 0; ; inicio += 100) {
                    const { data, error } = await supabase.from('favoritos_publicacoes')
                        .select('*, posts(*, midias_posts(*)), builds(*, midias_builds(*))')
                        .eq('usuario_id', usuarioId)
                        .order('criado_em', { ascending: false })
                        .order('id')
                        .range(inicio, inicio + 99);
                    if (error) throw error;
                    if (!ativo) return;
                    resultados.push(...data.map(favorito => ({
                        ...favorito,
                        posts: favorito.posts ? {
                            ...favorito.posts,
                            midias: [...favorito.posts.midias_posts].sort((a, b) => a.ordem - b.ordem),
                        } : null,
                        builds: favorito.builds ? {
                            ...favorito.builds,
                            midias: [...favorito.builds.midias_builds].sort((a, b) => a.ordem - b.ordem),
                        } : null,
                    })));
                    if (data.length < 100) break;
                }
                setFavoritos(resultados);
            } catch (error) {
                console.error('Erro ao carregar favoritos:', error);
                if (ativo) setErro('Não foi possível carregar os favoritos. Confira a conexão e a migration favoritos_publicacoes no Supabase.');
            } finally {
                if (ativo) setCarregando(false);
            }
        }
        carregar();
        return () => { ativo = false; };
    }, [usuarioId, tentativa]);

    async function alternar(publicacao, tipo) {
        if (!usuarioId) throw new Error('Entre na sua conta para salvar favoritos.');
        if (erro || carregando) throw new Error(erro || 'Aguarde o carregamento dos favoritos.');
        const coluna = tipo === 'build' ? 'build_id' : 'post_id';
        const chave = `${tipo}:${publicacao.id}`;
        if (operacoes.current.has(chave)) throw new Error('Esta publicação já está sendo atualizada.');
        operacoes.current.add(chave);
        try {
            const favorito = favoritos.find(item => String(item[coluna]) === String(publicacao.id));
            if (favorito) {
                const { data, error } = await supabase.from('favoritos_publicacoes')
                    .delete().eq('id', favorito.id).eq('usuario_id', usuarioId).select('id').single();
                if (error) throw error;
                setFavoritos(atuais => atuais.filter(item => item.id !== data.id));
            } else {
                const { data, error } = await supabase.from('favoritos_publicacoes')
                    .insert({ usuario_id: usuarioId, [coluna]: publicacao.id }).select('*').single();
                if (error) throw error;
                setFavoritos(atuais => [{ ...data, [tipo === 'build' ? 'builds' : 'posts']: publicacao }, ...atuais]);
            }
            return !favorito;
        } finally {
            operacoes.current.delete(chave);
        }
    }

    function recarregar() {
        setErro('');
        setCarregando(Boolean(usuarioId));
        setTentativa(atual => atual + 1);
    }

    function atualizarPublicacao(publicacao, tipo) {
        const relacao = tipo === 'build' ? 'builds' : 'posts';
        const coluna = tipo === 'build' ? 'build_id' : 'post_id';
        setFavoritos(atuais => atuais.map(item => String(item[coluna]) === String(publicacao.id)
            ? { ...item, [relacao]: { ...item[relacao], ...publicacao } } : item));
    }

    function excluirPublicacao(id, tipo) {
        const coluna = tipo === 'build' ? 'build_id' : 'post_id';
        setFavoritos(atuais => atuais.filter(item => String(item[coluna]) !== String(id)));
    }

    return (
        <FavoritosContext.Provider value={{ favoritos, carregando, erro, alternar, recarregar, atualizarPublicacao, excluirPublicacao }}>
            {children}
        </FavoritosContext.Provider>
    );
}

export function FavoritosProvider({ children }) {
    const { user } = useAuth();
    return <FavoritosConta key={user?.id || 'visitante'} usuarioId={user?.id}>{children}</FavoritosConta>;
}
