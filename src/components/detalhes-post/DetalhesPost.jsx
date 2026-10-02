import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { gerarIdUnico } from '../../gerarIdUnico';
import MidiasPublicacao from '../MidiasPublicacao';
import ListaComentarios from '../ListaComentarios';
import { criarNotificacao } from '../../services/notificacoes';
import { useAuth } from '../../contexts/useAuth';
import { inserirComentario } from '../../services/comentarios';
import './DetalhesPost.css';

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
    const campoComentarioRef = useRef(null);

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
            const { data, error } = await inserirComentario('comentarios', {
                post_id: post.id,
                comentario_pai_id: comentarioRespondendo?.id ?? null,
                visitante_id: visitanteId,
                autor_id: user?.id ?? null,
                nome_usuario: user?.user_metadata?.display_name || 'Alguém',
                texto,
            }, user);

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

    const nomeAutor = post.autor_nome || 'Viciado em Souls';
    const midias = post.midias?.length ? post.midias : post.midia_url ? [post] : [];
    const visualizacoes = (post.visualizacoes ?? 0).toLocaleString('pt-BR');
    const avatarUsuario = user?.user_metadata?.avatar_url;
    const nomeUsuario = user?.user_metadata?.display_name || user?.email || '';

    function abrirPerfilAutor() {
        if (post.autor_id) navigate(`/perfil/${post.autor_id}`);
    }

    function responderComentario(comentario) {
        setComentarioRespondendo(comentario);
        window.requestAnimationFrame(() => {
            campoComentarioRef.current?.focus();
            campoComentarioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    function avatarAutor(tamanhoClasse) {
        return post.autor_avatar_url ? (
            <img
                className={tamanhoClasse}
                src={post.autor_avatar_url}
                alt=""
                style={{
                    objectPosition: `${post.autor_avatar_pos_x ?? 50}% ${post.autor_avatar_pos_y ?? 50}%`,
                    transform: `scale(${post.autor_avatar_zoom ?? 1})`,
                }}
            />
        ) : (
            <span className={tamanhoClasse} aria-hidden="true">{nomeAutor.trim().charAt(0).toUpperCase()}</span>
        );
    }

    return (
        <div className="detalhe-post">
            <div className="detalhe-post-barra">
                <button className="detalhe-post-voltar" type="button" onClick={fecharDetalhesPost}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
                    Voltar
                </button>
                <nav className="detalhe-post-trilha" aria-label="Você está em">
                    <span>Comunidade</span>
                    <span aria-hidden="true">/</span>
                    <span>{post.categoria || 'Posts'}</span>
                </nav>
            </div>

            <div className="detalhe-post-grade">
                <div className="detalhe-post-principal">
                    <article className="detalhe-post-artigo">
                        <header className="detalhe-post-autor">
                            <button
                                className="detalhe-post-avatar"
                                type="button"
                                aria-label={`Abrir perfil de ${nomeAutor}`}
                                onClick={abrirPerfilAutor}
                                disabled={!post.autor_id}
                            >
                                {avatarAutor('detalhe-post-avatar-conteudo')}
                            </button>
                            <div className="detalhe-post-autor-texto">
                                <button
                                    className="detalhe-post-autor-nome"
                                    type="button"
                                    onClick={abrirPerfilAutor}
                                    disabled={!post.autor_id}
                                >
                                    {nomeAutor}
                                </button>
                                <span>
                                    publicou <time dateTime={post.criado_em}>{formatarTempo(post.criado_em)}</time>
                                </span>
                            </div>
                            {post.categoria && <span className="detalhe-post-jogo">{post.categoria}</span>}
                        </header>

                        <h1 className="detalhe-post-titulo">{post.titulo}</h1>

                        {post.descricao?.trim() && (
                            <p className="detalhe-post-texto">{post.descricao}</p>
                        )}

                        {midias.length > 0 && (
                            <div className={`detalhe-post-midia${midias.length > 1 ? ' detalhe-post-midia-varias' : ''}`}>
                                <MidiasPublicacao
                                    publicacao={post}
                                    itemClassName="detalhe-post-midia-item"
                                    mediaClassName="detalhe-post-midia-arquivo"
                                    permitirAmpliar
                                />
                            </div>
                        )}

                        <footer className="detalhe-post-numeros">
                            <a href="#comentarios">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 2v-4.2A7.5 7.5 0 1 1 20 11.5Z" />
                                </svg>
                                {comentarios.length} {comentarios.length === 1 ? 'comentário' : 'comentários'}
                            </a>
                            <span>
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                                {visualizacoes} visualizações
                            </span>
                        </footer>
                    </article>

                    <section className="detalhe-comentarios" id="comentarios" aria-labelledby="titulo-comentarios-post">
                        <header className="detalhe-comentarios-topo">
                            <h2 id="titulo-comentarios-post">Comentários</h2>
                            <span className="detalhe-comentarios-contador">{comentarios.length}</span>
                        </header>

                        {user ? (
                            <form className="detalhe-comentar" onSubmit={enviarComentario}>
                                <span className="detalhe-comentar-avatar" aria-hidden="true">
                                    {avatarUsuario ? <img src={avatarUsuario} alt="" /> : nomeUsuario.trim().charAt(0).toUpperCase() || '?'}
                                </span>
                                <div className="detalhe-comentar-caixa">
                                    {comentarioRespondendo && (
                                        <div className="detalhe-respondendo">
                                            <div className="detalhe-respondendo-conteudo">
                                                <span className="detalhe-respondendo-rotulo">
                                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
                                                    Respondendo a <strong>{comentarioRespondendo.nome_usuario}</strong>
                                                </span>
                                                <span className="detalhe-respondendo-trecho">{comentarioRespondendo.texto}</span>
                                            </div>
                                            <button
                                                className="detalhe-respondendo-fechar"
                                                type="button"
                                                onClick={() => setComentarioRespondendo(null)}
                                                disabled={enviandoComentario}
                                                aria-label="Cancelar resposta"
                                                title="Cancelar (Esc)"
                                            >
                                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                                            </button>
                                        </div>
                                    )}
                                    <label htmlFor="comentario-post" className="sr-only">
                                        {comentarioRespondendo
                                            ? `Responder a ${comentarioRespondendo.nome_usuario}`
                                            : 'Escreva um comentário'}
                                    </label>
                                    <textarea
                                        ref={campoComentarioRef}
                                        id="comentario-post"
                                        name="comentario-post"
                                        rows={3}
                                        value={textoComentario}
                                        onChange={(evento) => setTextoComentario(evento.target.value)}
                                        onKeyDown={(evento) => {
                                            if (evento.key === 'Enter' && !evento.shiftKey) {
                                                evento.preventDefault();
                                                enviarComentario(evento);
                                            }
                                            if (evento.key === 'Escape') setComentarioRespondendo(null);
                                        }}
                                        placeholder={comentarioRespondendo
                                            ? `Escreva sua resposta para ${comentarioRespondendo.nome_usuario}...`
                                            : 'O que você achou? Conta pra galera...'}
                                        disabled={enviandoComentario}
                                        maxLength={2000}
                                    ></textarea>
                                    <div className="detalhe-comentar-rodape">
                                        <span>Enter envia · Shift + Enter quebra a linha</span>
                                        <button
                                            type="submit"
                                            className="btn-criar-post"
                                            disabled={!textoComentario.trim() || enviandoComentario}
                                        >
                                            {enviandoComentario ? 'Enviando...' : comentarioRespondendo ? 'Responder' : 'Comentar'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div className="detalhe-comentar-convite">
                                <div>
                                    <strong>Participe da conversa</strong>
                                    <span>Entre na sua conta para comentar e responder a galera.</span>
                                </div>
                                <button type="button" className="btn-criar-post" onClick={() => navigate('/login')}>
                                    Entrar
                                </button>
                            </div>
                        )}

                        <div className="detalhe-comentarios-lista">
                            <ListaComentarios
                                comentarios={comentarios}
                                carregandoComentarios={carregandoComentarios}
                                reacoesComentarios={reacoesComentarios}
                                comentariosInteragindo={comentariosInteragindo}
                                visitanteId={visitanteId}
                                alternarReacaoComentario={alternarReacaoComentario}
                                aoResponder={responderComentario}
                                respondendoId={comentarioRespondendo?.id}
                                aoEditar={editarComentario}
                                aoApagar={apagarComentario}
                            />
                        </div>
                    </section>
                </div>

                <aside className="detalhe-post-lateral">
                    <section className="detalhe-lateral-cartao detalhe-lateral-autor">
                        <span className="detalhe-lateral-avatar">{avatarAutor('detalhe-post-avatar-conteudo')}</span>
                        <strong>{nomeAutor}</strong>
                        <span>Autor do post</span>
                        {post.autor_id && (
                            <button className="btn-filtro" type="button" onClick={abrirPerfilAutor}>
                                Ver perfil
                            </button>
                        )}
                    </section>

                    <section className="detalhe-lateral-cartao">
                        <h2>Sobre o post</h2>
                        <dl className="detalhe-lateral-dados">
                            {post.categoria && (
                                <div><dt>Jogo</dt><dd>{post.categoria}</dd></div>
                            )}
                            <div><dt>Publicado</dt><dd>{formatarTempo(post.criado_em)}</dd></div>
                            <div><dt>Comentários</dt><dd>{comentarios.length}</dd></div>
                            <div><dt>Visualizações</dt><dd>{visualizacoes}</dd></div>
                        </dl>
                    </section>

                    <section className="detalhe-lateral-cartao detalhe-lateral-regras">
                        <h2>Antes de comentar</h2>
                        <ul>
                            <li>Respeito é essencial: nada de ataques ou ofensas.</li>
                            <li>Sem spam, correntes ou divulgação.</li>
                            <li>Nada de conteúdo +18, pirataria ou links suspeitos.</li>
                        </ul>
                    </section>
                </aside>
            </div>
        </div>
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