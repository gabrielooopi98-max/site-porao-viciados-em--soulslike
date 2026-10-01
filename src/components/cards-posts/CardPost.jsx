import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { consultarResumoInteracoesPost } from '../../services/resumoInteracoesCards';
import { gerarIdUnico } from '../../gerarIdUnico';
import { useAuth } from '../../contexts/useAuth';
import { criarNotificacao } from '../../services/notificacoes';
import MidiasPublicacao from '../MidiasPublicacao';
import AcoesPublicacao from '../AcoesPublicacao';

function CardPost({ post, aoAbrirPost, aoAtualizar, aoExcluir }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const cardRef = useRef(null);
    const [cardVisivel, setCardVisivel] = useState(false);
    const [visitanteId] = useState(() => {
        const chaveVisitante = 'viciados-souls-visitante-id';
        let idSalvo = localStorage.getItem(chaveVisitante);

        if (!idSalvo) {
            idSalvo = gerarIdUnico();
            localStorage.setItem(chaveVisitante, idSalvo);
        }

        return idSalvo;
    });
    const [totalComentarios, setTotalComentarios] = useState(0);
    const [totalCurtidas, setTotalCurtidas] = useState(0);
    const [curtido, setCurtido] = useState(false);
    const [carregandoCurtidas, setCarregandoCurtidas] = useState(true);
    const [seguindo, setSeguindo] = useState(false);
    const [carregandoSeguir, setCarregandoSeguir] = useState(false);
    const autorEhUsuario = Boolean(user?.id && post.autor_id && user.id === post.autor_id);

    useEffect(() => {
        const card = cardRef.current;
        if (!card) return undefined;

        if (!('IntersectionObserver' in window)) {
            const frame = window.requestAnimationFrame(() => setCardVisivel(true));
            return () => window.cancelAnimationFrame(frame);
        }

        const observer = new IntersectionObserver(([entrada]) => {
            if (entrada.isIntersecting) {
                setCardVisivel(true);
                observer.disconnect();
            }
        }, { rootMargin: '200px' });

        observer.observe(card);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!cardVisivel || !user?.id || !post.autor_id || autorEhUsuario) return undefined;

        let ativo = true;
        supabase
            .from('seguidores')
            .select('id')
            .eq('seguidor_id', user.id)
            .eq('seguido_id', post.autor_id)
            .maybeSingle()
            .then(({ data, error }) => {
                if (!ativo) return;
                if (error) console.error('Erro ao consultar seguimento do post:', error);
                setSeguindo(Boolean(data));
            });

        return () => { ativo = false; };
    }, [autorEhUsuario, cardVisivel, post.autor_id, user?.id]);

    async function alternarSeguir(evento) {
        evento.stopPropagation();
        if (!user) {
            navigate('/login');
            return;
        }
        if (!post.autor_id || autorEhUsuario || carregandoSeguir) return;

        setCarregandoSeguir(true);
        const resultado = seguindo
            ? await supabase.from('seguidores').delete().eq('seguidor_id', user.id).eq('seguido_id', post.autor_id)
            : await supabase.from('seguidores').insert({ seguidor_id: user.id, seguido_id: post.autor_id });

        if (resultado.error) console.error('Erro ao alterar seguimento:', resultado.error);
        else {
            setSeguindo(!seguindo);
            if (!seguindo && user.id !== post.autor_id) {
                await criarNotificacao({
                    destinatario_id: post.autor_id,
                    ator_id: user.id,
                    ator_nome: user.user_metadata?.display_name || 'Alguém',
                    tipo: 'seguidor',
                });
            }
        }
        setCarregandoSeguir(false);
    }

    useEffect(() => {
        if (!visitanteId || !cardVisivel) {
            return;
        }

        let componenteAtivo = true;

        async function carregarInteracoes() {
            try {
                const { data, error } = await consultarResumoInteracoesPost({
                    p_post_id: post.id,
                    p_visitante_id: visitanteId,
                });

                if (!componenteAtivo) return;

                if (error) {
                    const [resultadoComentarios, resultadoCurtidas, resultadoCurtidaVisitante] = await Promise.all([
                        supabase.from('comentarios').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
                        supabase.from('curtidas').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
                        supabase.from('curtidas').select('id').eq('post_id', post.id).eq('visitante_id', visitanteId).maybeSingle(),
                    ]);

                    if (!componenteAtivo) return;

                    if (resultadoComentarios.error) {
                        console.error('Erro ao carregar total de comentários:', resultadoComentarios.error);
                    } else {
                        setTotalComentarios(resultadoComentarios.count ?? 0);
                    }

                    if (resultadoCurtidas.error) {
                        console.error('Erro ao carregar total de curtidas:', resultadoCurtidas.error);
                    } else {
                        setTotalCurtidas(resultadoCurtidas.count ?? 0);
                    }

                    if (resultadoCurtidaVisitante.error) {
                        console.error('Erro ao verificar curtida:', resultadoCurtidaVisitante.error);
                    } else {
                        setCurtido(Boolean(resultadoCurtidaVisitante.data));
                    }

                    return;
                }

                const resumo = Array.isArray(data) ? data[0] : data;
                setTotalComentarios(resumo?.total_comentarios ?? 0);
                setTotalCurtidas(resumo?.total_curtidas ?? 0);
                setCurtido(Boolean(resumo?.curtido));
            } catch (error) {
                console.error('Erro ao carregar interações do post:', error);
            } finally {
                if (componenteAtivo) setCarregandoCurtidas(false);
            }
        }

        carregarInteracoes();

        return () => {
            componenteAtivo = false;
        };
    }, [cardVisivel, post.id, visitanteId]);

    async function alternarCurtida(evento) {
        evento.stopPropagation();

        if (!user) {
            navigate('/login');
            return;
        }

        if (carregandoCurtidas || !visitanteId) {
            return;
        }

        setCarregandoCurtidas(true);
        try {
            if (curtido) {
                const { error } = await supabase
                    .from('curtidas')
                    .delete()
                    .eq('post_id', post.id)
                    .eq('visitante_id', visitanteId);

                if (error) throw error;
                setCurtido(false);
                setTotalCurtidas((totalAtual) => Math.max(0, totalAtual - 1));
            } else {
                const { error } = await supabase
                    .from('curtidas')
                    .insert({ post_id: post.id, visitante_id: visitanteId });

                if (error) throw error;
                setCurtido(true);
                setTotalCurtidas((totalAtual) => totalAtual + 1);
                if (user?.id && post.autor_id && user.id !== post.autor_id) {
                    criarNotificacao({
                        destinatario_id: post.autor_id,
                        ator_id: user.id,
                        ator_nome: user.user_metadata?.display_name || 'Alguém',
                        tipo: 'curtida_post',
                        post_id: post.id,
                        titulo_conteudo: post.titulo,
                    }).catch((error) => console.error('Erro ao criar notificação da curtida:', error));
                }
            }
        } catch (error) {
            console.error('Erro ao alterar curtida do post:', error);
        } finally {
            setCarregandoCurtidas(false);
        }
    }

    return (
        <article ref={cardRef} className="card-post" onClick={aoAbrirPost}>
            <header className="card-post-header">
                <div className="lado-esquerdo-header-post">
                    <div className="area-foto-usuario-post">
                        <button
                            className="link-avatar-card"
                            type="button"
                            aria-label={`Abrir perfil de ${post.autor_nome || 'Viciado em Souls'}`}
                            onClick={(evento) => { evento.stopPropagation(); if (post.autor_id) navigate(`/perfil/${post.autor_id}`); }}
                        >
                            {post.autor_avatar_url ? (
                                <img
                                    className="perfil-usuario-post perfil-usuario-post-imagem"
                                    src={post.autor_avatar_url}
                                    alt=""
                                    style={{ objectPosition: `${post.autor_avatar_pos_x ?? 50}% ${post.autor_avatar_pos_y ?? 50}%`, transform: `scale(${post.autor_avatar_zoom ?? 1})` }}
                                />
                            ) : (
                                <div className="perfil-usuario-post"></div>
                            )}
                        </button>
                    </div>
                    <div className="info-usuario-post">
                        {post.autor_id ? (
                            <button className="link-usuario-card" type="button" onClick={(evento) => { evento.stopPropagation(); navigate(`/perfil/${post.autor_id}`); }}>
                                {post.autor_nome || 'Viciado em Souls'}
                            </button>
                        ) : (
                            <h3 className="nome-usuario-post">{post.autor_nome || 'Gabriel Moreira'}</h3>
                        )}
                        <p className="tempo-post">{formatarTempo(post.criado_em)}</p>
                    </div>
                </div>
                <div className="lado-direito-header-post">
                    <button
                        className={`btn-seguir-usuario${seguindo ? ' seguindo' : ''}`}
                        type="button"
                        disabled={autorEhUsuario || !post.autor_id || carregandoSeguir}
                        onClick={alternarSeguir}
                    >
                        {autorEhUsuario ? 'Você' : seguindo ? 'Seguindo' : 'Seguir'}
                    </button>
                    <AcoesPublicacao publicacao={post} tipo="post" aoAtualizar={aoAtualizar} aoExcluir={aoExcluir} />
                </div>
            </header>

            <div className="area-conteudo-post">
                {post.categoria && (
                    <span className="categoria-post">
                        {post.categoria}
                    </span>
                )}
                <h3 className="titulo-conteudo-post">{post.titulo}</h3>

                <div className="area-midia-post">
                    <MidiasPublicacao
                        publicacao={post}
                        itemClassName="item-midia-post"
                        mediaClassName="midia-post"
                        modoPreviaVideo
                    />
                </div>

                {post.descricao?.trim() && (
                    <p className="descricao-conteudo-post">{post.descricao}</p>
                )}
            </div>

            <footer className="card-post-footer">
                <div className="lado-esquerdo-footer-post">
                    <span className="numeros-de-comentarios">
                        <svg className="icone-metrica-post" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 2v-4.2A7.5 7.5 0 1 1 20 11.5Z" />
                        </svg>
                        <span>{totalComentarios.toLocaleString('pt-BR')}</span>
                    </span>
                    <span className="numeros-de-curtidas">
                        <svg className="icone-acao-post" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                        </svg>
                        <span>{totalCurtidas.toLocaleString('pt-BR')}</span>
                    </span>
                    <span
                        className="numeros-de-visualizacoes"
                        aria-label={`${(post.visualizacoes ?? 0).toLocaleString('pt-BR')} visualizações`}
                    >
                        <svg className="icone-metrica-post" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>{(post.visualizacoes ?? 0).toLocaleString('pt-BR')}</span>
                    </span>
                </div>

                <div className="lado-direito-footer-post">
                    <button className="btn-responder-post" type="button">
                        <span>Responder</span>
                    </button>
                    <button
                        className="btn-curtir-post"
                        type="button"
                        aria-label={curtido ? 'Descurtir post' : 'Curtir post'}
                        aria-pressed={curtido}
                        disabled={carregandoCurtidas}
                        onClick={alternarCurtida}
                    >
                        <svg className="icone-acao-post" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                        </svg>
                    </button>
                </div>
            </footer>
        </article>
    )
}

export default CardPost;

function formatarTempo(dataCriacao) {
    const diferenca = Date.now() - new Date(dataCriacao).getTime();
    const minutos = Math.floor(diferenca / 60000);

    //MENOS DE 1 MINUTO, MOSTRE: AGORA.

    if(minutos < 1) {
        return "Agora mesmo"
    }

    //MENOS DE 60 MINUTOS, MOSTRE: HÁ X MINUTOS.

    if(minutos < 60) {
        return `há ${minutos} minutos`;
    }

    const horas = Math.floor(minutos / 60);

    //MENOS DE 24 HORAS, MOSTRE: HÁ X HORAS.

    if(horas < 24) {
        return `há ${horas} horas`;
    }

    const dias = Math.floor(horas / 24);

    //MAIS DE 24 HORAS, MOSTRE: HÁ X DIAS.

    return `há ${dias} dias`;
}
