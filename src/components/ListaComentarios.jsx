import { useState } from 'react';
import { useAuth } from '../contexts/useAuth';

function ListaComentarios({
    comentarios,
    carregandoComentarios,
    reacoesComentarios,
    comentariosInteragindo,
    visitanteId,
    alternarReacaoComentario,
    aoResponder,
    aoEditar,
    aoApagar,
    respondendoId = null,
}) {
    const { user } = useAuth();
    const [respostasOcultas, setRespostasOcultas] = useState({});
    const [comentarioEditandoId, setComentarioEditandoId] = useState(null);
    const [textoEditado, setTextoEditado] = useState('');
    const [comentarioEmAcaoId, setComentarioEmAcaoId] = useState(null);
    const respostasPorPai = new Map();

    comentarios.forEach((comentario) => {
        if (comentario.comentario_pai_id == null) {
            return;
        }

        const idPai = String(comentario.comentario_pai_id);
        const respostas = respostasPorPai.get(idPai) ?? [];
        respostas.push(comentario);
        respostasPorPai.set(idPai, respostas);
    });

    const idsComentarios = new Set(comentarios.map((comentario) => String(comentario.id)));
    const comentariosPrincipais = comentarios.filter((comentario) => (
        comentario.comentario_pai_id == null
        || !idsComentarios.has(String(comentario.comentario_pai_id))
    ));

    async function salvarEdicao() {
        const texto = textoEditado.trim();
        if (!texto || comentarioEmAcaoId != null) {
            return;
        }

        setComentarioEmAcaoId(comentarioEditandoId);
        try {
            await aoEditar(comentarioEditandoId, texto);
            setComentarioEditandoId(null);
            setTextoEditado('');
        } catch (error) {
            console.error('Erro ao editar comentário:', error);
        } finally {
            setComentarioEmAcaoId(null);
        }
    }

    async function confirmarExclusao(comentario) {
        const confirmado = window.confirm(
            'Apagar este comentário? As respostas deste fio também serão apagadas.'
        );
        if (!confirmado || comentarioEmAcaoId != null) {
            return;
        }

        setComentarioEmAcaoId(comentario.id);
        try {
            await aoApagar(comentario.id);
        } catch (error) {
            console.error('Erro ao apagar comentário:', error);
        } finally {
            setComentarioEmAcaoId(null);
        }
    }

    function fotoDoComentario(comentario) {
        if (comentario.autor_avatar_url) {
            return {
                url: comentario.autor_avatar_url,
                zoom: comentario.autor_avatar_zoom,
                x: comentario.autor_avatar_pos_x,
                y: comentario.autor_avatar_pos_y,
            };
        }

        // Comentários salvos antes da foto existir: nos do próprio usuário, usa a foto atual da conta.
        const metadados = user?.user_metadata;
        if (user?.id && comentario.autor_id === user.id && metadados?.avatar_url) {
            return {
                url: metadados.avatar_url,
                zoom: metadados.avatar_zoom,
                x: metadados.avatar_pos_x,
                y: metadados.avatar_pos_y,
            };
        }

        return null;
    }

    function renderAvatar(comentario) {
        const foto = fotoDoComentario(comentario);

        if (!foto) {
            return (
                <img
                    className="avatar-comentario-post"
                    src="/svg-animado/icone-usuario.svg"
                    alt=""
                    aria-hidden="true"
                />
            );
        }

        return (
            <span className="avatar-comentario-post avatar-comentario-foto" aria-hidden="true">
                <img
                    src={foto.url}
                    alt=""
                    style={{
                        objectPosition: `${foto.x ?? 50}% ${foto.y ?? 50}%`,
                        transform: `scale(${foto.zoom ?? 1})`,
                    }}
                />
            </span>
        );
    }

    function renderComentario(comentario) {
        const respostas = respostasPorPai.get(String(comentario.id)) ?? [];
        const reacoes = reacoesComentarios[comentario.id] ?? {};

        return (
            <article
                className={`comentario-post${respondendoId != null && String(respondendoId) === String(comentario.id) ? ' comentario-sendo-respondido' : ''}`}
                key={comentario.id}
            >
                {renderAvatar(comentario)}
                <div className="conteudo-comentario-post">
                    <div className="cabecalho-comentario-post">
                        <strong className="nome-comentario-post">{comentario.nome_usuario}</strong>
                        {comentario.criado_em && (
                            <time className="tempo-comentario-post" dateTime={comentario.criado_em}>
                                {formatarTempo(comentario.criado_em)}
                            </time>
                        )}
                    </div>
                    {comentarioEditandoId === comentario.id ? (
                        <div className="editor-comentario-post">
                            <textarea
                                value={textoEditado}
                                onChange={(evento) => setTextoEditado(evento.target.value)}
                                onKeyDown={(evento) => {
                                    if (evento.key === 'Enter' && !evento.shiftKey) {
                                        evento.preventDefault();
                                        salvarEdicao();
                                    }
                                }}
                                aria-label="Editar comentário"
                                disabled={comentarioEmAcaoId === comentario.id}
                            />
                            <button
                                type="button"
                                onClick={salvarEdicao}
                                disabled={!textoEditado.trim() || comentarioEmAcaoId === comentario.id}
                            >
                                Salvar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setComentarioEditandoId(null);
                                    setTextoEditado('');
                                }}
                                disabled={comentarioEmAcaoId === comentario.id}
                            >
                                Cancelar
                            </button>
                        </div>
                    ) : (
                        <p className="texto-comentario-post">{comentario.texto}</p>
                    )}
                    <div className="acoes-comentario-post" aria-label="Ações do comentário">
                        <button
                            className="btn-reacao-comentario"
                            type="button"
                            aria-label={`Curtir comentário (${reacoes.like ?? 0})`}
                            aria-pressed={reacoes.minhaReacao === 'like'}
                            disabled={comentariosInteragindo[comentario.id]}
                            onClick={() => alternarReacaoComentario(comentario.id, 'like')}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                            </svg>
                            <span>{reacoes.like ?? 0}</span>
                        </button>
                        <button
                            className="btn-reacao-comentario"
                            type="button"
                            aria-label={`Não curtir comentário (${reacoes.dislike ?? 0})`}
                            aria-pressed={reacoes.minhaReacao === 'dislike'}
                            disabled={comentariosInteragindo[comentario.id]}
                            onClick={() => alternarReacaoComentario(comentario.id, 'dislike')}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
                            </svg>
                            <span>{reacoes.dislike ?? 0}</span>
                        </button>
                        <button
                            className="btn-responder-comentario"
                            type="button"
                            disabled={comentarioEmAcaoId === comentario.id}
                            onClick={() => aoResponder(comentario)}
                        >
                            Responder
                        </button>
                        {comentario.visitante_id === visitanteId && comentarioEditandoId !== comentario.id && (
                            <>
                                <button
                                    className="btn-editar-comentario"
                                    type="button"
                                    disabled={comentarioEmAcaoId === comentario.id}
                                    onClick={() => {
                                        setComentarioEditandoId(comentario.id);
                                        setTextoEditado(comentario.texto);
                                    }}
                                >
                                    Editar
                                </button>
                                <button
                                    className="btn-apagar-comentario"
                                    type="button"
                                    disabled={comentarioEmAcaoId === comentario.id}
                                    onClick={() => confirmarExclusao(comentario)}
                                >
                                    Apagar
                                </button>
                            </>
                        )}
                    </div>
                    {respostas.length > 0 && (
                        <div className="controle-respostas-comentario">
                            <button
                                className="btn-toggle-respostas-comentario"
                                type="button"
                                aria-expanded={!respostasOcultas[comentario.id]}
                                aria-controls={`respostas-comentario-${comentario.id}`}
                                onClick={() => setRespostasOcultas((atuais) => ({
                                    ...atuais,
                                    [comentario.id]: !atuais[comentario.id],
                                }))}
                            >
                                {respostasOcultas[comentario.id]
                                    ? `Mostrar respostas (${respostas.length})`
                                    : `Ocultar respostas (${respostas.length})`}
                            </button>
                        </div>
                    )}
                    {respostas.length > 0 && !respostasOcultas[comentario.id] && (
                        <div
                            className="respostas-comentario-post"
                            id={`respostas-comentario-${comentario.id}`}
                        >
                            {respostas.map(renderComentario)}
                        </div>
                    )}
                </div>
            </article>
        );
    }

    if (carregandoComentarios) {
        return <p className="texto-comentario-post">Carregando comentários...</p>;
    }

    if (!comentarios.length) {
        return <p className="texto-comentario-post">Nenhum comentário ainda. Seja o primeiro.</p>;
    }

    return comentariosPrincipais.map(renderComentario);
}

export default ListaComentarios;

function formatarTempo(dataCriacao) {
    const minutos = Math.floor((Date.now() - new Date(dataCriacao).getTime()) / 60000);
    if (minutos < 1) return 'Agora mesmo';
    if (minutos < 60) return `há ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;

    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;

    const dias = Math.floor(horas / 24);
    return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
}