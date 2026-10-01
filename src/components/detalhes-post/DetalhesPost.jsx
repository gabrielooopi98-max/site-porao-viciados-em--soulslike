import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { gerarIdUnico } from '../../gerarIdUnico';
import MidiasPublicacao from '../MidiasPublicacao';
import ListaComentarios from '../ListaComentarios';
import { criarNotificacao } from '../../services/notificacoes';
import { useAuth } from '../../contexts/useAuth';

function DetalhesPost({ post, fecharDetalhesPost }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [visitanteId] = useState(() => {
        if (typeof window === 'undefined') {
            return null;
        }

        const chaveVisitante = 'viciados-souls-visitante-id';
        let idSalvo = window.localStorage.getItem(chaveVisitante);

        if (!idSalvo) {
            idSalvo = gerarIdUnico();
            window.localStorage.setItem(chaveVisitante, idSalvo);
        }

        return idSalvo;
    });
    const [textoComentario, setTextoComentario] = useState('');
    const [comentarioRespondendo, setComentarioRespondendo] = useState(null);
    const [comentarios, setComentarios] = useState([]);
    const [reacoesComentarios, setReacoesComentarios] = useState({});
    const [comentariosInteragindo, setComentariosInteragindo] = useState({});
    const [carregandoComentarios, setCarregandoComentarios] = useState(true);
    const [enviandoComentario, setEnviandoComentario] = useState(false);

    useEffect(() => {
        let consultaAtiva = true;

        async function carregarComentarios() {
            const { data, error } = await supabase
                .from('comentarios')
                .select('*')
                .eq('post_id', post.id)
                .order('criado_em', { ascending: false });

            if (!consultaAtiva) {
                return;
            }

            if (error) {
                console.error('Erro ao carregar comentários:', error);
            } else {
                setComentarios(data);
            }

            setCarregandoComentarios(false);
        }

        carregarComentarios();

        return () => {
            consultaAtiva = false;
        };
    }, [post.id]);

    useEffect(() => {
        if (!visitanteId || comentarios.length === 0) {
            return;
        }

        let consultaAtiva = true;

        async function carregarReacoes() {
            const { data, error } = await supabase
                .from('reacoes_comentarios')
                .select('comentario_id, visitante_id, tipo')
                .in('comentario_id', comentarios.map((comentario) => comentario.id));

            if (!consultaAtiva) {
                return;
            }

            if (error) {
                console.error('Erro ao carregar reações dos comentários:', error);
                return;
            }

            const resumo = {};
            data.forEach((reacao) => {
                const comentarioId = reacao.comentario_id;
                resumo[comentarioId] ??= { like: 0, dislike: 0, minhaReacao: null };
                resumo[comentarioId][reacao.tipo] += 1;

                if (reacao.visitante_id === visitanteId) {
                    resumo[comentarioId].minhaReacao = reacao.tipo;
                }
            });

            setReacoesComentarios(resumo);
        }

        carregarReacoes();

        return () => {
            consultaAtiva = false;
        };
    }, [comentarios, visitanteId]);

    async function alternarReacaoComentario(comentarioId, tipo) {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!visitanteId || comentariosInteragindo[comentarioId]) {
            return;
        }

        const reacaoAtual = reacoesComentarios[comentarioId]?.minhaReacao ?? null;
        const proximaReacao = reacaoAtual === tipo ? null : tipo;
        setComentariosInteragindo((atuais) => ({ ...atuais, [comentarioId]: true }));

        try {
            let resultado;

            if (proximaReacao) {
                resultado = await supabase
                    .from('reacoes_comentarios')
                    .upsert({
                        comentario_id: comentarioId,
                        visitante_id: visitanteId,
                        tipo: proximaReacao,
                    }, { onConflict: 'comentario_id,visitante_id' });
            } else {
                resultado = await supabase
                    .from('reacoes_comentarios')
                    .delete()
                    .eq('comentario_id', comentarioId)
                    .eq('visitante_id', visitanteId);
            }

            if (resultado.error) {
                throw resultado.error;
            }

            setReacoesComentarios((atuais) => {
                const resumo = { like: 0, dislike: 0, minhaReacao: null, ...atuais[comentarioId] };

                if (reacaoAtual) {
                    resumo[reacaoAtual] = Math.max(0, resumo[reacaoAtual] - 1);
                }

                if (proximaReacao) {
                    resumo[proximaReacao] += 1;
                }

                resumo.minhaReacao = proximaReacao;
                return { ...atuais, [comentarioId]: resumo };
            });
        } catch (error) {
            console.error('Erro ao alterar reação do comentário:', error);
        } finally {
            setComentariosInteragindo((atuais) => ({ ...atuais, [comentarioId]: false }));
        }
    }

    async function enviarComentario(evento) {
        evento.preventDefault();

        if (!user) {
            navigate('/login');
            return;
        }

        const texto = textoComentario.trim();
        if (!texto || enviandoComentario) {
            return;
        }

        setEnviandoComentario(true);

        try {
            const { data, error } = await supabase
                .from('comentarios')
                .insert({
                    post_id: post.id,
                    comentario_pai_id: comentarioRespondendo?.id ?? null,
                    visitante_id: visitanteId,
                    autor_id: user?.id ?? null,
                    nome_usuario: user?.user_metadata?.display_name || 'Alguém',
                    texto,
                })
                .select()
                .single();

            if (error) {
                console.error('Erro ao salvar comentário:', error);
                return;
            }

            setComentarios((comentariosAtuais) => [data, ...comentariosAtuais]);

            if (user?.id && post.autor_id && user.id !== post.autor_id) {
                await criarNotificacao({
                    destinatario_id: post.autor_id,
                    ator_id: user.id,
                    ator_nome: user.user_metadata?.display_name || 'Alguém',
                    tipo: 'comentario_post',
                    post_id: post.id,
                    comentario_id: data.id,
                    titulo_conteudo: post.titulo,
                    texto,
                });
            }

            setTextoComentario('');
            setComentarioRespondendo(null);
        } catch (error) {
            console.error('Erro ao salvar comentário:', error);
        } finally {
            setEnviandoComentario(false);
        }
    }

    async function editarComentario(comentarioId, texto) {
        const { data, error } = await supabase
            .from('comentarios')
            .update({ texto })
            .eq('id', comentarioId)
            .eq('visitante_id', visitanteId)
            .select()
            .single();

        if (error) throw error;

        setComentarios((atuais) => atuais.map((comentario) => (
            comentario.id === comentarioId ? data : comentario
        )));
    }

    async function apagarComentario(comentarioId) {
        const { data, error } = await supabase
            .from('comentarios')
            .delete()
            .eq('id', comentarioId)
            .eq('visitante_id', visitanteId)
            .select('id');

        if (error) throw error;
        if (!data?.length) throw new Error('O comentário não foi apagado.');

        setComentarios((atuais) => {
            const idsRemovidos = new Set([String(comentarioId)]);
            let encontrouResposta = true;

            while (encontrouResposta) {
                encontrouResposta = false;
                atuais.forEach((comentario) => {
                    if (
                        comentario.comentario_pai_id != null
                        && idsRemovidos.has(String(comentario.comentario_pai_id))
                        && !idsRemovidos.has(String(comentario.id))
                    ) {
                        idsRemovidos.add(String(comentario.id));
                        encontrouResposta = true;
                    }
                });
            }

            return atuais.filter((comentario) => !idsRemovidos.has(String(comentario.id)));
        });
    }

    return (
        <article className="card-detalhes-post card-detalhes-post-layout">
            <header className="card-detalhes-post-header">
                <div className="lado-esquerdo-header-detalhes-post">
                    <div className="area-foto-usuario-post">
                        <button
                            className="link-avatar-card"
                            type="button"
                            aria-label={`Abrir perfil de ${post.autor_nome || 'Viciado em Souls'}`}
                            onClick={() => { if (post.autor_id) navigate(`/perfil/${post.autor_id}`); }}
                        >
                            {post.autor_avatar_url ? (
                                <img
                                    className="perfil-usuario-post perfil-usuario-post-imagem"
                                    src={post.autor_avatar_url}
                                    alt={`Foto de ${post.autor_nome || 'Viciado em Souls'}`}
                                    style={{
                                        objectPosition: `${post.autor_avatar_pos_x ?? 50}% ${post.autor_avatar_pos_y ?? 50}%`,
                                        transform: `scale(${post.autor_avatar_zoom ?? 1})`,
                                    }}
                                />
                            ) : (
                                <div className="perfil-usuario-post"></div>
                            )}
                        </button>
                    </div>

                    <div className="info-usuario-post">
                        <button className="link-usuario-card link-usuario-detalhe" type="button" onClick={() => { if (post.autor_id) navigate(`/perfil/${post.autor_id}`); }}>
                            {post.autor_nome || 'Viciado em Souls'}
                        </button>
                        <p className="tempo-post">{formatarTempo(post.criado_em)}</p>
                    </div>
                </div>

                <div className="lado-direito-header-detalhes-post">
                    <button
                        className="btn-fechar-detalhes-post"
                        type="button"
                        onClick={fecharDetalhesPost}>
                        Sair
                    </button>
                </div>
            </header>

            <div className="conteudo-detalhes-post conteudo-detalhes-post-layout">
                <div className="cabecalho-conteudo-detalhes-post cabecalho-detalhes-post-layout">
                    {post.categoria && (
                        <span className="categoria-post">{post.categoria}</span>
                    )}
                    <h1 className="titulo-detalhes-post">{post.titulo}</h1>
                </div>

                <div className="area-midia-detalhes-post area-midia-detalhes-layout">
                    <MidiasPublicacao
                        publicacao={post}
                        itemClassName="item-midia-detalhes"
                        mediaClassName="midia-detalhes-post"
                        permitirAmpliar
                    />
                </div>

                {post.descricao?.trim() && (
                    <section className="descricao-detalhes-post descricao-detalhes-post-layout" aria-label="Descrição do autor">
                        <div className="cabecalho-descricao-detalhes-post">
                            <div className="avatar-descricao-detalhes-post" aria-hidden="true">
                                <img src="/svg-animado/icone-usuario.svg" alt="" />
                            </div>
                            <div className="identidade-descricao-detalhes-post">
                                <strong>{post.autor_nome || 'Viciado em Souls'}</strong>
                                <span>Autor do post</span>
                            </div>
                        </div>
                        <p className="texto-descricao-detalhes-post">{post.descricao}</p>
                    </section>
                )}
            </div>

            <section className="area-comentarios-post" aria-labelledby="titulo-comentarios-post">
                <h2 id="titulo-comentarios-post">Comentários ({comentarios.length})</h2>

                <div className="lista-comentarios-post">
                    <ListaComentarios
                        comentarios={comentarios}
                        carregandoComentarios={carregandoComentarios}
                        reacoesComentarios={reacoesComentarios}
                        comentariosInteragindo={comentariosInteragindo}
                        visitanteId={visitanteId}
                        alternarReacaoComentario={alternarReacaoComentario}
                        aoResponder={setComentarioRespondendo}
                        aoEditar={editarComentario}
                        aoApagar={apagarComentario}
                    />
                </div>

                <form className="formulario-comentario-post" onSubmit={enviarComentario}>
                    {comentarioRespondendo && (
                        <div className="destino-resposta-comentario">
                            <span>Respondendo a <strong>{comentarioRespondendo.nome_usuario}</strong></span>
                            <button
                                type="button"
                                onClick={() => setComentarioRespondendo(null)}
                                disabled={enviandoComentario}
                            >
                                Cancelar
                            </button>
                        </div>
                    )}
                    <label htmlFor="comentario-post">
                        {comentarioRespondendo
                            ? `Responder a ${comentarioRespondendo.nome_usuario}`
                            : 'Deixe seu comentário'}
                    </label>
                    <div className="campo-comentario-post">
                        <textarea
                            id="comentario-post"
                            name="comentario-post"
                            value={textoComentario}
                            onChange={(evento) => setTextoComentario(evento.target.value)}
                            onKeyDown={(evento) => {
                                if (evento.key === 'Enter' && !evento.shiftKey) {
                                    evento.preventDefault();
                                    enviarComentario(evento);
                                }
                            }}
                            placeholder={comentarioRespondendo
                                ? `Responder a ${comentarioRespondendo.nome_usuario}...`
                                : 'comente o que você achou...'}
                            disabled={!user || enviandoComentario}
                        ></textarea>
                        <button
                            className="btn-enviar-comentario-post"
                            type="submit"
                            aria-label="Enviar comentário"
                            disabled={!user || enviandoComentario || !textoComentario.trim()}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M21 3 10 14" />
                                <path d="m21 3-7 18-4-7-7-4 18-7Z" />
                            </svg>
                        </button>
                    </div>
                </form>
            </section>
        </article>
    )
}

export default DetalhesPost;

function formatarTempo(dataCriacao) {
    const diferenca = Date.now() - new Date(dataCriacao).getTime();
    const minutos = Math.floor(diferenca / 60000);

    //MENOS DE 1 MINUTO, MOSTRE: AGORA.

    if (minutos < 1) {
        return "Agora mesmo"
    }

    //MENOS DE 60 MINUTOS, MOSTRE: HÁ X MINUTOS.

    if (minutos < 60) {
        return `há ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
    }

    const horas = Math.floor(minutos / 60);

    //MENOS DE 24 HORAS, MOSTRE: HÁ X HORAS.

    if (horas < 24) {
        return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    }

    const dias = Math.floor(horas / 24);

    //MAIS DE 24 HORAS, MOSTRE: HÁ X DIAS.

    return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}