import { useState } from 'react';
import AnexosPublicacao from '../AnexosPublicacao';
import { useDialogoPublicacao } from '../useDialogoPublicacao';
import '../painel-criar-post/PainelCriarPost.css';

function PainelCriarBuild({ aoCriarBuild, fecharPainelCriarBuild }) {
    const [categoria, setCategoria] = useState('');
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [nivel, setNivel] = useState('');
    const [foco, setFoco] = useState('');
    const [dano, setDano] = useState('');
    const [midias, setMidias] = useState([]);
    const [publicando, setPublicando] = useState(false);
    const [statusPublicacao, setStatusPublicacao] = useState('');
    const [erroPublicacao, setErroPublicacao] = useState('');
    const { painelRef, tituloRef } = useDialogoPublicacao(fecharPainelCriarBuild, publicando);

    async function enviarFormulario(evento) {
        evento.preventDefault();
        if (publicando) return;
        setPublicando(true);
        setErroPublicacao('');

        try {
            const publicado = await aoCriarBuild(
                { categoria, titulo, descricao, nivel, foco, dano, midias },
                setStatusPublicacao
            );
            if (publicado === false) {
                setErroPublicacao('Não foi possível publicar a build. Tente novamente.');
            }
        } catch (erro) {
            console.error('Erro ao preparar a build:', erro);
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
            aria-labelledby="criar-build-titulo"
            aria-describedby="criar-build-convite"
            tabIndex={-1}
        >
            <header className="criar-post-header">
                <div className="criar-post-boas-vindas">
                    <span className="criar-post-kicker">Porão da comunidade</span>
                    <h2 id="criar-build-titulo">Criar build</h2>
                    <p id="criar-build-convite">Compartilhe sua combinação de atributos, armas e estratégias com a comunidade.</p>
                </div>
                <button
                    className="criar-post-fechar"
                    type="button"
                    onClick={fecharPainelCriarBuild}
                    disabled={publicando}
                    aria-label="Fechar formulário de build"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d="m6 6 12 12M18 6 6 18" />
                    </svg>
                </button>
            </header>

            <form onSubmit={enviarFormulario} aria-busy={publicando}>
                <fieldset className="criar-post-campos" disabled={publicando}>
                    <legend className="criar-post-sr-only">Conteúdo da build</legend>
                    <div className="criar-post-identificacao">
                        <div className="criar-post-campo">
                            <label htmlFor="titulo-build">Nome da build</label>
                            <input
                                ref={tituloRef}
                                id="titulo-build"
                                type="text"
                                placeholder="Dê um nome à sua build"
                                value={titulo}
                                onChange={(evento) => setTitulo(evento.target.value)}
                                required
                            />
                        </div>
                        <div className="criar-post-campo">
                            <label htmlFor="categoria-build">Para qual jogo?</label>
                            <select
                                id="categoria-build"
                                value={categoria}
                                onChange={(evento) => setCategoria(evento.target.value)}
                                required
                            >
                                <option value="">Selecione o jogo</option>
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

                    <fieldset className="criar-build-atributos">
                        <legend>Perfil da build <span>Opcional</span></legend>
                        <div className="criar-build-atributos-grid">
                            <div className="criar-post-campo">
                                <label htmlFor="nivel-build">Nível</label>
                                <input
                                    id="nivel-build"
                                    type="number"
                                    min="1"
                                    placeholder="Ex.: 125"
                                    value={nivel}
                                    onChange={(evento) => setNivel(evento.target.value)}
                                />
                            </div>
                            <div className="criar-post-campo">
                                <label htmlFor="foco-build">Foco</label>
                                <input
                                    id="foco-build"
                                    type="text"
                                    placeholder="Ex.: Força / Fé"
                                    value={foco}
                                    onChange={(evento) => setFoco(evento.target.value)}
                                />
                            </div>
                            <div className="criar-post-campo">
                                <label htmlFor="dano-build">Tipo de dano</label>
                                <input
                                    id="dano-build"
                                    type="text"
                                    placeholder="Ex.: Físico"
                                    value={dano}
                                    onChange={(evento) => setDano(evento.target.value)}
                                />
                            </div>
                        </div>
                    </fieldset>

                    <div className="criar-post-campo">
                        <label htmlFor="descricao-build">Como a build funciona? <span>Opcional</span></label>
                        <textarea
                            id="descricao-build"
                            placeholder="Conte quais armas, equipamentos e atributos usa e como jogar com essa build..."
                            value={descricao}
                            onChange={(evento) => setDescricao(evento.target.value)}
                        />
                    </div>

                    <AnexosPublicacao
                        id="midia-build"
                        midias={midias}
                        setMidias={setMidias}
                        publicando={publicando}
                        titulo="Mostre sua build"
                        descricao="Adicione imagens dos atributos, equipamentos ou vídeos em ação."
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
                        {publicando ? 'Publicando...' : 'Salvar build'}
                    </button>
                </footer>
            </form>
        </article>
    );
}

export default PainelCriarBuild;
