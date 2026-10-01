import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { gerarIdUnico } from '../../gerarIdUnico';
import MidiasPublicacao from '../MidiasPublicacao';
import ListaComentarios from '../ListaComentarios';
import { criarNotificacao } from '../../services/notificacoes';
import { useAuth } from '../../contexts/useAuth';

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
            const { data, error } = await supabase
                .from('comentarios_builds')
                .insert({
                    build_id: build.id,
                    comentario_pai_id: comentarioRespondendo?.id ?? null,
                    visitante_id: visitanteId,
                    autor_id: user?.id ?? null,
                    nome_usuario: user?.user_metadata?.display_name || 'Alguém',
                    texto,
                })
                .select()
                .single();

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

    return (
        <article className="card-detalhes-post card-detalhes-build">
            <header className="card-detalhes-post-header">
                <div className="lado-esquerdo-header-detalhes-post">
                    <div className="area-foto-usuario-post">
                        <button
                            className="link-avatar-card"
                            type="button"
                            aria-label={`Abrir perfil de ${build.autor_nome || 'Viciado em Souls'}`}
                            onClick={() => { if (build.autor_id) navigate(`/perfil/${build.autor_id}`); }}
                        >
                            {build.autor_avatar_url ? (
                                <img
                                    className="perfil-usuario-post perfil-usuario-post-imagem"
                                    src={build.autor_avatar_url}
                                    alt={`Foto de ${build.autor_nome || 'Viciado em Souls'}`}
                                    style={{
                                        objectPosition: `${build.autor_avatar_pos_x ?? 50}% ${build.autor_avatar_pos_y ?? 50}%`,
                                        transform: `scale(${build.autor_avatar_zoom ?? 1})`,
                                    }}
                                />
                            ) : (
                                <div className="perfil-usuario-post"></div>
                            )}
                        </button>
                    </div>
                    <div className="info-usuario-post">
                        <button className="link-usuario-card link-usuario-detalhe" type="button" onClick={() => { if (build.autor_id) navigate(`/perfil/${build.autor_id}`); }}>
                            {build.autor_nome || 'Viciado em Souls'}
                        </button>
                        <p className="tempo-post">{formatarTempo(build.criado_em)}</p>
                    </div>
                </div>
                <button
                    className="btn-fechar-detalhes-post"
                    type="button"
                    onClick={fecharDetalhesBuild}
                    aria-label="Voltar para as builds"
                >
                    X
                </button>
            </header>

            <div className="conteudo-detalhes-post conteudo-detalhes-build">
                <div className="cabecalho-detalhes-build">
                    {build.categoria && <span className="categoria-build">{build.categoria}</span>}
                    <h1 className="titulo-detalhes-post">{build.titulo}</h1>
                </div>

                <div className="area-midia-detalhes-post area-midia-detalhes-build">
                    <MidiasPublicacao
                        publicacao={build}
                        itemClassName="item-midia-detalhes"
                        mediaClassName="midia-detalhes-post"
                        permitirAmpliar
                    />
                </div>

                <aside className="painel-dados-detalhes-build">
                    {(build.nivel || build.foco || build.dano) && (
                        <dl className="dados-build dados-build-detalhes">
                            {build.nivel && <div><dt>Nível</dt><dd>Lv {build.nivel}</dd></div>}
                            {build.foco && <div><dt>Foco</dt><dd>{build.foco}</dd></div>}
                            {build.dano && <div><dt>Dano</dt><dd>{build.dano}</dd></div>}
                        </dl>
                    )}

                    {build.descricao?.trim() && (
                        <section className="descricao-build-detalhes" aria-label="Descrição da build">
                            <h2>Sobre a build</h2>
                            <p>{build.descricao}</p>
                        </section>
                    )}
                </aside>
            </div>

            <section className="area-comentarios-post" aria-labelledby="titulo-comentarios-build">
                <h2 id="titulo-comentarios-build">Comentários ({comentarios.length})</h2>

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
                    <label htmlFor="comentario-build">
                        {comentarioRespondendo
                            ? `Responder a ${comentarioRespondendo.nome_usuario}`
                            : 'Deixe seu comentário'}
                    </label>
                    <div className="campo-comentario-post">
                        <textarea
                            id="comentario-build"
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
                                : 'Comente sobre esta build...'}
                            disabled={!user || enviandoComentario}
                        />
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