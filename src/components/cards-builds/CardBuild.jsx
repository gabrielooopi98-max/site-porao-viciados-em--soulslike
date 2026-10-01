import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { consultarResumoInteracoesBuild } from '../../services/resumoInteracoesCards';
import { gerarIdUnico } from '../../gerarIdUnico';
import { useAuth } from '../../contexts/useAuth';
import { criarNotificacao } from '../../services/notificacoes';
import MidiasPublicacao from '../MidiasPublicacao';
import AcoesPublicacao from '../AcoesPublicacao';

function CardBuild({ build, aoAbrirBuild, aoAtualizar, aoExcluir }) {
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
    const [totalCurtidas, setTotalCurtidas] = useState(0);
    const [totalComentarios, setTotalComentarios] = useState(0);
    const [curtido, setCurtido] = useState(false);
    const [carregandoInteracoes, setCarregandoInteracoes] = useState(true);
    const [seguindo, setSeguindo] = useState(false);
    const [carregandoSeguir, setCarregandoSeguir] = useState(false);
    const autorEhUsuario = Boolean(user?.id && build.autor_id && user.id === build.autor_id);

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
        if (!cardVisivel || !user?.id || !build.autor_id || autorEhUsuario) return undefined;

        let ativo = true;
        supabase
            .from('seguidores')
            .select('id')
            .eq('seguidor_id', user.id)
            .eq('seguido_id', build.autor_id)
            .maybeSingle()
            .then(({ data, error }) => {
                if (!ativo) return;
                if (error) console.error('Erro ao consultar seguimento da build:', error);
                setSeguindo(Boolean(data));
            });

        return () => { ativo = false; };
    }, [autorEhUsuario, build.autor_id, cardVisivel, user?.id]);

    async function alternarSeguir(evento) {
        evento.stopPropagation();
        if (!user) {
            navigate('/login');
            return;
        }
        if (!build.autor_id || autorEhUsuario || carregandoSeguir) return;

        setCarregandoSeguir(true);
        const resultado = seguindo
            ? await supabase.from('seguidores').delete().eq('seguidor_id', user.id).eq('seguido_id', build.autor_id)
            : await supabase.from('seguidores').insert({ seguidor_id: user.id, seguido_id: build.autor_id });

        if (resultado.error) console.error('Erro ao alterar seguimento:', resultado.error);
        else {
            setSeguindo(!seguindo);
            if (!seguindo && user.id !== build.autor_id) {
                await criarNotificacao({
                    destinatario_id: build.autor_id,
                    ator_id: user.id,
                    ator_nome: user.user_metadata?.display_name || 'Alguém',
                    tipo: 'seguidor',
                });
            }
        }
        setCarregandoSeguir(false);
    }

    useEffect(() => {
        if (!visitanteId || !cardVisivel) return;

        let consultaAtiva = true;

        async function carregarInteracoes() {
            try {
                const { data, error } = await consultarResumoInteracoesBuild({
                    p_build_id: build.id,
                    p_visitante_id: visitanteId,
                });

                if (!consultaAtiva) return;

                if (error) {
                    const [resultadoCurtidas, resultadoMinhaCurtida, resultadoComentarios] = await Promise.all([
                        supabase.from('curtidas_builds').select('*', { count: 'exact', head: true }).eq('build_id', build.id),
                        supabase.from('curtidas_builds').select('id').eq('build_id', build.id).eq('visitante_id', visitanteId).maybeSingle(),
                        supabase.from('comentarios_builds').select('*', { count: 'exact', head: true }).eq('build_id', build.id),
                    ]);

                    if (!consultaAtiva) return;

                    if (resultadoCurtidas.error) {
                        console.error('Erro ao carregar curtidas da build:', resultadoCurtidas.error);
                    } else {
                        setTotalCurtidas(resultadoCurtidas.count ?? 0);
                    }

                    if (resultadoMinhaCurtida.error) {
                        console.error('Erro ao verificar curtida da build:', resultadoMinhaCurtida.error);
                    } else {
                        setCurtido(Boolean(resultadoMinhaCurtida.data));
                    }

                    if (resultadoComentarios.error) {
                        console.error('Erro ao contar comentários da build:', resultadoComentarios.error);
                    } else {
                        setTotalComentarios(resultadoComentarios.count ?? 0);
                    }

                    return;
                }

                const resumo = Array.isArray(data) ? data[0] : data;
                setTotalCurtidas(resumo?.total_curtidas ?? 0);
                setTotalComentarios(resumo?.total_comentarios ?? 0);
                setCurtido(Boolean(resumo?.curtido));
            } catch (error) {
                console.error('Erro ao carregar interações da build:', error);
            } finally {
                if (consultaAtiva) setCarregandoInteracoes(false);
            }
        }

        carregarInteracoes();

        return () => {
            consultaAtiva = false;
        };
    }, [build.id, cardVisivel, visitanteId]);

    async function alternarCurtida(evento) {
        evento.stopPropagation();
        if (!user) {
            navigate('/login');
            return;
        }
        if (carregandoInteracoes || !visitanteId) return;

        setCarregandoInteracoes(true);

        try {
            if (curtido) {
                const { error } = await supabase
                    .from('curtidas_builds')
                    .delete()
                    .eq('build_id', build.id)
                    .eq('visitante_id', visitanteId);

                if (error) throw error;
                setCurtido(false);
                setTotalCurtidas((total) => Math.max(0, total - 1));
            } else {
                const { error } = await supabase
                    .from('curtidas_builds')
                        .insert({ build_id: build.id, visitante_id: visitanteId });

                if (error) throw error;
                setCurtido(true);
                setTotalCurtidas((total) => total + 1);
                if (user?.id && build.autor_id && user.id !== build.autor_id) {
                    await criarNotificacao({
                        destinatario_id: build.autor_id,
                        ator_id: user.id,
                        ator_nome: user.user_metadata?.display_name || 'Alguém',
                        tipo: 'curtida_build',
                        build_id: build.id,
                        titulo_conteudo: build.titulo,
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao alterar curtida da build:', error);
        } finally {
            setCarregandoInteracoes(false);
        }
    }

    return (
        <article ref={cardRef} className="card-build" onClick={aoAbrirBuild}>

            <header className="card-build-header">
                <div className="lado-esquerdo-header-build">
                    <div className="area-foto-usuario-post">
                        <button
                            className="link-avatar-card"
                            type="button"
                            aria-label={`Abrir perfil de ${build.autor_nome || 'Viciado em Souls'}`}
                            onClick={(evento) => { evento.stopPropagation(); if (build.autor_id) navigate(`/perfil/${build.autor_id}`); }}
                        >
                            {build.autor_avatar_url ? (
                                <img
                                    className="perfil-usuario-post perfil-usuario-post-imagem"
                                    src={build.autor_avatar_url}
                                    alt=""
                                    style={{ objectPosition: `${build.autor_avatar_pos_x ?? 50}% ${build.autor_avatar_pos_y ?? 50}%`, transform: `scale(${build.autor_avatar_zoom ?? 1})` }}
                                />
                            ) : (
                                <div className="perfil-usuario-post"></div>
                            )}
                        </button>
                    </div>

                    <div className="info-usuario-build">
                        {build.autor_id ? (
                            <button className="link-usuario-card" type="button" onClick={(evento) => { evento.stopPropagation(); navigate(`/perfil/${build.autor_id}`); }}>
                                {build.autor_nome || 'Viciado em Souls'}
                            </button>
                        ) : (
                            <h3 className="nome-usuario-info-build">{build.autor_nome || 'Gabriel Moreira'}</h3>
                        )}
                        <p className="tempo-build">{formatarTempo(build.criado_em)}</p>
                    </div>
                </div>

                <div className="lado-direito-header-build">
                    <button
                        className={`btn-seguir-usuario${seguindo ? ' seguindo' : ''}`}
                        type="button"
                        disabled={autorEhUsuario || !build.autor_id || carregandoSeguir}
                        onClick={alternarSeguir}
                    >
                        {autorEhUsuario ? 'Você' : seguindo ? 'Seguindo' : 'Seguir'}
                    </button>
                    <AcoesPublicacao publicacao={build} tipo="build" aoAtualizar={aoAtualizar} aoExcluir={aoExcluir} />
                </div>
            </header>

            <div className="area-midia-build">
                <MidiasPublicacao
                    publicacao={build}
                    itemClassName="item-midia-build"
                    mediaClassName=""
                />
            </div>

            <div className="area-conteudo-build">
                <span className="categoria-build">{build.categoria}</span>
                <h3 className="titulo-build">{build.titulo}</h3>
                {build.descricao?.trim() && (
                    <p className="descricao-build">{build.descricao}</p>
                )}

                <dl className="dados-build">
                    {build.nivel && <div><dt>Nível</dt><dd>Lv {build.nivel}</dd></div>}
                    {build.foco && <div><dt>Foco</dt><dd>{build.foco}</dd></div>}
                    {build.dano && <div><dt>Dano</dt><dd>{build.dano}</dd></div>}
                </dl>
            </div>

            <footer className="area-footer-build">
                <div className="lado-esquerdo-footer-build">
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
                        <span className="numeros-de-visualizacoes">
                            <svg className="icone-metrica-post" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span>{(build.visualizacoes ?? 0).toLocaleString('pt-BR')}</span>
                        </span>
                </div>

                <div className="lado-direito-footer-post">
                    <button
                        className="btn-responder-post"
                        type="button"
                        onClick={(evento) => {
                            evento.stopPropagation();
                            aoAbrirBuild?.();
                        }}
                    >
                        <span>Responder</span>
                    </button>
                    <button
                        className="btn-curtir-post"
                        type="button"
                        aria-label={curtido ? 'Descurtir build' : 'Curtir build'}
                        aria-pressed={curtido}
                        disabled={carregandoInteracoes}
                        onClick={alternarCurtida}
                    >
                        <svg className="icone-acao-post" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                        </svg>
                    </button>
                </div>
            </footer>
        </article >
    )
}

export default CardBuild;

function formatarTempo(dataCriacao) {
    const diferencaEmMinutos = Math.floor((Date.now() - new Date(dataCriacao).getTime()) / 60000);

    if (diferencaEmMinutos < 1) return 'Agora mesmo';
    if (diferencaEmMinutos < 60) return `há ${diferencaEmMinutos} min`;

    const diferencaEmHoras = Math.floor(diferencaEmMinutos / 60);
    if (diferencaEmHoras < 24) return `há ${diferencaEmHoras} h`;

    return `há ${Math.floor(diferencaEmHoras / 24)} d`;
}