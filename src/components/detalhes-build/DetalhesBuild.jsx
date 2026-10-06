import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { gerarIdUnico } from '../../gerarIdUnico';
import MidiasPublicacao from '../MidiasPublicacao';
import ListaComentarios from '../ListaComentarios';
import { criarNotificacao } from '../../services/notificacoes';
import { useAuth } from '../../contexts/useAuth';
import { inserirComentario } from '../../services/comentarios';
import '../detalhes-post/DetalhesPost.css';
import './DetalhesBuild.css';

function DetalhesBuild({ build, fecharDetalhesBuild }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [visitanteId] = useState(() => {
        if (typeof window === 'undefined') return null;

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
                .from('comentarios_builds')
                .select('*')
                .eq('build_id', build.id)
                .order('criado_em', { ascending: false });

            if (!consultaAtiva) return;

            if (error) {
                console.error('Erro ao carregar comentários da build:', error);
            } else {
                setComentarios(data);
            }

            setCarregandoComentarios(false);
        }

        carregarComentarios();

        return () => {
            consultaAtiva = false;
        };
    }, [build.id]);

    useEffect(() => {
        if (!visitanteId || comentarios.length === 0) return;

        let consultaAtiva = true;

        async function carregarReacoes() {
            const { data, error } = await supabase
                .from('reacoes_comentarios_builds')
                .select('comentario_id, visitante_id, tipo')
                .in('comentario_id', comentarios.map((comentario) => comentario.id));

            if (!consultaAtiva) return;

            if (error) {
                console.error('Erro ao carregar reações dos comentários da build:', error);
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
        if (!visitanteId || comentariosInteragindo[comentarioId]) return;

        const reacaoAtual = reacoesComentarios[comentarioId]?.minhaReacao ?? null;
        const proximaReacao = reacaoAtual === tipo ? null : tipo;
        setComentariosInteragindo((atuais) => ({ ...atuais, [comentarioId]: true }));

        try {
            let resultado;

            if (proximaReacao) {
                resultado = await supabase
                    .from('reacoes_comentarios_builds')
                    .upsert({
                        comentario_id: comentarioId,
                        visitante_id: visitanteId,
                        tipo: proximaReacao,
                    }, { onConflict: 'comentario_id,visitante_id' });
            } else {
                resultado = await supabase
                    .from('reacoes_comentarios_builds')
                    .delete()
                    .eq('comentario_id', comentarioId)
                    .eq('visitante_id', visitanteId);
            }

            if (resultado.error) throw resultado.error;

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
            console.error('Erro ao alterar reação do comentário da build:', error);
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

        if (!texto || enviandoComentario) return;

        setEnviandoComentario(true);

        try {
            const { data, error } = await inserirComentario('comentarios_builds', {
                build_id: build.id,
                comentario_pai_id: comentarioRespondendo?.id ?? null,
                visitante_id: visitanteId,
                autor_id: user?.id ?? null,
                nome_usuario: user?.user_metadata?.display_name || 'Alguém',
                texto,
            }, user);

            if (error) throw error;

            setComentarios((atuais) => [data, ...atuais]);

            if (user?.id && build.autor_id && user.id !== build.autor_id) {
                await criarNotificacao({
                    destinatario_id: build.autor_id,
                    ator_id: user.id,
                    ator_nome: user.user_metadata?.display_name || 'Alguém',
                    tipo: 'comentario_build',
                    build_id: build.id,
                    comentario_id: data.id,
                    titulo_conteudo: build.titulo,
                    texto,
                });
            }

            setTextoComentario('');
            setComentarioRespondendo(null);
        } catch (error) {
            console.error('Erro ao salvar comentário da build:', error);
        } finally {
            setEnviandoComentario(false);
        }
    }

    async function editarComentario(comentarioId, texto) {
        const { data, error } = await supabase
            .from('comentarios_builds')
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
            .from('comentarios_builds')
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

    const nomeAutor = build.autor_nome || 'Viciado em Souls';
    const midias = build.midias?.length ? build.midias : build.midia_url ? [build] : [];
    const visualizacoes = (build.visualizacoes ?? 0).toLocaleString('pt-BR');
    const avatarUsuario = user?.user_metadata?.avatar_url;
    const nomeUsuario = user?.user_metadata?.display_name || user?.email || '';

    function abrirPerfilAutor() {
        if (build.autor_id) navigate(`/perfil/${build.autor_id}`);
    }

    function responderComentario(comentario) {
        setComentarioRespondendo(comentario);
        window.requestAnimationFrame(() => {
            campoComentarioRef.current?.focus();
            campoComentarioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    function avatarAutor() {
        return build.autor_avatar_url ? (
            <img
                className="detalhe-post-avatar-conteudo"
                src={build.autor_avatar_url}
                alt=""
                style={{
                    objectPosition: `${build.autor_avatar_pos_x ?? 50}% ${build.autor_avatar_pos_y ?? 50}%`,
                    transform: `scale(${build.autor_avatar_zoom ?? 1})`,
                }}
            />
        ) : (
            <span className="detalhe-post-avatar-conteudo" aria-hidden="true">{nomeAutor.trim().charAt(0).toUpperCase()}</span>
        );
    }

    return (
        <div className="detalhe-post detalhe-build">
            <div className="detalhe-post-barra">
                <button className="detalhe-post-voltar" type="button" onClick={fecharDetalhesBuild}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
                    Voltar
                </button>
                <nav className="detalhe-post-trilha" aria-label="Você está em">
                    <span>Builds</span>
                    <span aria-hidden="true">/</span>
                    <span>{build.categoria || 'Todas'}</span>
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
                                disabled={!build.autor_id}
                            >
                                {avatarAutor()}
                            </button>
                            <div className="detalhe-post-autor-texto">
                                <button
                                    className="detalhe-post-autor-nome"
                                    type="button"
                                    onClick={abrirPerfilAutor}
                                    disabled={!build.autor_id}
                                >
                                    {nomeAutor}
                                </button>
                                <span>
                                    compartilhou <time dateTime={build.criado_em}>{formatarTempo(build.criado_em)}</time>
                                </span>
                            </div>
                            {build.categoria && <span className="detalhe-post-jogo">{build.categoria}</span>}
                        </header>

                        <h1 className="detalhe-post-titulo">{build.titulo}</h1>

                        {(build.nivel || build.foco || build.dano) && (
                            <dl className="detalhe-build-ficha">
                                {build.nivel && (
                                    <div className="detalhe-build-nivel">
                                        <dt>Nível</dt>
                                        <dd>
                                            <small>LV</small>
                                            {build.nivel}
                                        </dd>
                                    </div>
                                )}
                                {build.foco && (
                                    <div className="detalhe-build-atributo">
                                        <span className="detalhe-build-icone" aria-hidden="true">
                                            <svg viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="8" />
                                                <circle cx="12" cy="12" r="3.5" />
                                                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                                            </svg>
                                        </span>
                                        <dt>Foco</dt>
                                        <dd>{build.foco}</dd>
                                    </div>
                                )}
                                {build.dano && (
                                    <div className="detalhe-build-atributo">
                                        <span className="detalhe-build-icone" aria-hidden="true">
                                            <svg viewBox="0 0 24 24">
                                                <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
                                                <path d="m13 19 6-6M16 16l4 4M19 21l2-2" />
                                            </svg>
                                        </span>
                                        <dt>Dano</dt>
                                        <dd>{build.dano}</dd>
                                    </div>
                                )}
                            </dl>
                        )}

                        <Link className="detalhe-build-arena" to={`/batalhas?build=${build.id}`}>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
                                <path d="m13 19 6-6M16 16l4 4M19 21l2-2" />
                            </svg>
                            Enfrentar um chefe com esta build
                        </Link>

                        {midias.length > 0 && (
                            <div className={`detalhe-post-midia${midias.length > 1 ? ' detalhe-post-midia-varias' : ''}`}>
                                <MidiasPublicacao
                                    publicacao={build}
                                    itemClassName="detalhe-post-midia-item"
                                    mediaClassName="detalhe-post-midia-arquivo"
                                    permitirAmpliar
                                />
                            </div>
                        )}

                        {build.descricao?.trim() && (
                            <section className="detalhe-build-sobre" aria-labelledby="titulo-sobre-build">
                                <h2 id="titulo-sobre-build">Como a build funciona</h2>
                                <p className="detalhe-post-texto">{build.descricao}</p>
                            </section>
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

                    <section className="detalhe-comentarios" id="comentarios" aria-labelledby="titulo-comentarios-build">
                        <header className="detalhe-comentarios-topo">
                            <h2 id="titulo-comentarios-build">Comentários</h2>
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
                                    <label htmlFor="comentario-build" className="sr-only">
                                        {comentarioRespondendo
                                            ? `Responder a ${comentarioRespondendo.nome_usuario}`
                                            : 'Escreva um comentário'}
                                    </label>
                                    <textarea
                                        ref={campoComentarioRef}
                                        id="comentario-build"
                                        name="comentario-build"
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
                                            : 'Testou essa build? Tem alguma dica pra melhorar?'}
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
                                    <span>Entre na sua conta para comentar e trocar ideia sobre a build.</span>
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
                        <span className="detalhe-lateral-avatar">{avatarAutor()}</span>
                        <strong>{nomeAutor}</strong>
                        <span>Autor da build</span>
                        {build.autor_id && (
                            <button className="btn-filtro" type="button" onClick={abrirPerfilAutor}>
                                Ver perfil
                            </button>
                        )}
                    </section>

                    <section className="detalhe-lateral-cartao">
                        <h2>Sobre a build</h2>
                        <dl className="detalhe-lateral-dados">
                            {build.categoria && (
                                <div><dt>Jogo</dt><dd>{build.categoria}</dd></div>
                            )}
                            {build.nivel && (
                                <div><dt>Nível</dt><dd>{build.nivel}</dd></div>
                            )}
                            <div><dt>Publicada</dt><dd>{formatarTempo(build.criado_em)}</dd></div>
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
    );
}

function formatarTempo(dataCriacao) {
    const minutos = Math.floor((Date.now() - new Date(dataCriacao).getTime()) / 60000);
    if (minutos < 1) return 'Agora mesmo';
    if (minutos < 60) return `há ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;

    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;

    const dias = Math.floor(horas / 24);
    return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}

export default DetalhesBuild;