import { useState } from 'react';
import AnexosPublicacao from '../AnexosPublicacao';
import { useDialogoPublicacao } from '../useDialogoPublicacao';
import './PainelCriarPost.css';

function PainelCriarPost({ aoCriarPost, fecharPainelCriarPost }) {
    const [midias, setMidias] = useState([]);
    const [titulo, setTitulo] = useState('');
    const [categoria, setCategoria] = useState('');
    const [descricao, setDescricao] = useState('');
    const [publicando, setPublicando] = useState(false);
    const [statusPublicacao, setStatusPublicacao] = useState('');
    const [erroPublicacao, setErroPublicacao] = useState('');
    const { painelRef, tituloRef } = useDialogoPublicacao(fecharPainelCriarPost, publicando);

    async function enviarFormulario(evento) {
        evento.preventDefault();
        if (publicando) return;

        const novoPost = {
            categoria,
            titulo,
            descricao,
            midias,
        }

        setPublicando(true);
        setErroPublicacao('');

        try {
            const publicado = await aoCriarPost(novoPost, setStatusPublicacao);
            if (publicado === false) {
                setErroPublicacao('Não foi possível publicar o post. Tente novamente.');
            }
        } catch (erro) {
            console.error('Erro ao preparar o post:', erro);
            setErroPublicacao(`Não foi possível publicar: ${erro.message || 'erro desconhecido'}`);
        } finally {
            setPublicando(false);
            setStatusPublicacao('');
        }
    }

    return (
        <article
            className="painel-criar-post criar-post-comunidade"
            ref={painelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="criar-post-titulo"
            aria-describedby="criar-post-convite"
            tabIndex={-1}
        >
            <header className="criar-post-header">
                <div className="criar-post-boas-vindas">
                    <span className="criar-post-kicker">Porão da comunidade</span>
                    <h2 id="criar-post-titulo">Criar post</h2>
                    <p id="criar-post-convite">Uma conquista, uma dúvida ou aquele momento inesperado. Tem espaço para tudo isso aqui.</p>
                </div>
                <button
                    type="button"
                    className="criar-post-fechar"
                    onClick={fecharPainelCriarPost}
                    disabled={publicando}
                    aria-label="Fechar formulário de post"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d="m6 6 12 12M18 6 6 18" />
                    </svg>
                </button>
            </header>
            <form onSubmit={enviarFormulario} aria-busy={publicando}>
                <fieldset className="criar-post-campos" disabled={publicando}>
                    <legend className="criar-post-sr-only">Conteúdo do post</legend>
                    <div className="criar-post-identificacao">
                        <div className="criar-post-campo">
                            <label htmlFor="titulo-post">Título do post</label>
                            <input
                                ref={tituloRef}
                                type="text"
                                id="titulo-post"
                                name="titulo-post"
                                placeholder="Dê um título ao seu post"
                                value={titulo}
                                onChange={(evento) => setTitulo(evento.target.value)}
                            />
                        </div>
                        <div className="criar-post-campo">
                            <label htmlFor="categoria-post">Sobre qual jogo? <span>Opcional</span></label>
                            <select
                                id="categoria-post"
                                name="categoria-post"
                                value={categoria}
                                onChange={(evento) => setCategoria(evento.target.value)}
                            >
                                <option value="">Conversa geral</option>
                                <option value="Dark Souls Remastered">Dark Souls Remastered</option>
                                <option value="Dark Souls II">Dark Souls II</option>
                                <option value="Dark Souls III">Dark Souls III</option>
                                <option value="Elden Ring">Elden Ring</option>
                                <option value="Elden Ring Nightreign">Elden Ring Nightreign</option>
                                <option value="Bloodborne">Bloodborne</option>
                                <option value="Demon's Souls">Demon's Souls</option>
                                <option value="Sekiro: Shadows Die Twice">Sekiro: Shadows Die Twice</option>
                                <option value="Lies of P">Lies of P</option>
                            </select>
                        </div>
                    </div>
                    <div className="criar-post-campo">
                        <label htmlFor="descricao-post">Conte para a comunidade <span>Opcional</span></label>
                        <textarea
                            id="descricao-post"
                            name="descricao-post"
                            placeholder="Compartilhe o que aconteceu, peça uma dica ou puxe uma conversa..."
                            value={descricao}
                            onChange={(evento) => setDescricao(evento.target.value)}
                        />
                    </div>
                    <AnexosPublicacao
                        id="midia-post"
                        midias={midias}
                        setMidias={setMidias}
                        publicando={publicando}
                        titulo="Mostre seu momento"
                        descricao="Imagens e vídeos para acompanhar a história."
                    />
                </fieldset>

                {statusPublicacao && (
                    <p className="status-publicacao-post" role="status">{statusPublicacao}</p>
                )}
                {erroPublicacao && (
                    <p className="erro-publicacao-post" role="alert">{erroPublicacao}</p>
                )}

                <footer className="criar-post-footer">
                    <button className="criar-post-publicar" type="submit" disabled={publicando}>
                        {publicando ? 'Publicando...' : 'Publicar post'}
                    </button>
                </footer>
            </form>
        </article>
    )
}

export default PainelCriarPost;