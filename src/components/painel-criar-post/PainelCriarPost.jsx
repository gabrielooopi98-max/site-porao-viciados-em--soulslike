import { useState } from 'react';

function PainelCriarPost({ aoCriarPost, fecharPainelCriarPost }) {
    const [midias, setMidias] = useState([]);
    const [titulo, setTitulo] = useState('');
    const [categoria, setCategoria] = useState('');
    const [descricao, setDescricao] = useState('');
    const [publicando, setPublicando] = useState(false);
    const [statusPublicacao, setStatusPublicacao] = useState('');
    const [erroPublicacao, setErroPublicacao] = useState('');

    async function enviarFormulario(evento) {
        evento.preventDefault();

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
            setErroPublicacao(`Não foi possível preparar os anexos: ${erro.message || 'erro desconhecido'}`);
        } finally {
            setPublicando(false);
            setStatusPublicacao('');
        }
    }

    return (
        <article className="painel-criar-post">
            <header className="header-painel-criar-post">
                <div className="header-lado-esquerdo-painel-criar-post">
                    <h2>Criar Post</h2>
                </div>

                <div className="header-lado-direito-painel-criar-post">
                    <button
                        type="button"
                        className="btn-fechar-painel-criar-post"
                        onClick={fecharPainelCriarPost}
                        disabled={publicando}
                    >
                        Sair
                    </button>
                </div>
            </header>
            <form onSubmit={enviarFormulario}>
                <div className="area-escolher-categoria">
                    <label htmlFor="categoria-post">Categoria:</label>
                    <select
                        id="categoria-post"
                        name="categoria-post"
                        value={categoria}
                        onChange={(evento) => setCategoria(evento.target.value)}
                    >
                        <option value="">Nenhuma</option>
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

                <div className="area-titulo-post">
                    <label htmlFor="titulo-post">Título:</label>
                    <input
                        type="text"
                        id="titulo-post"
                        name="titulo-post"
                        value={titulo}
                        onChange={(evento) => setTitulo(evento.target.value)}
                    />
                </div>

                <div className="area-colocar-midia-post">
                    <label htmlFor="midia-post">Anexar Arquivo:</label>
                    <div className="area-midia-preview-post">
                        {midias.map((arquivo, indice) => (
                            <div key={`${arquivo.name}-${arquivo.lastModified}-${indice}`}>
                                {arquivo.type.startsWith('image/') && (
                                    <img src={URL.createObjectURL(arquivo)} alt={arquivo.name} />
                                )}
                                {arquivo.type.startsWith('video/') && (
                                    <video src={URL.createObjectURL(arquivo)} controls />
                                )}
                                <p>{arquivo.name}</p>
                                <button
                                    type="button"
                                    className="btn-remover-midia-painel"
                                    onClick={() => setMidias((selecionadas) => selecionadas.filter((_, itemIndice) => itemIndice !== indice))}
                                    disabled={publicando}
                                    aria-label={`Remover ${arquivo.name}`}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                    <input
                        type="file"
                        id="midia-post"
                        name="midia-post"
                        accept="image/*,video/*"
                        disabled={publicando}
                        multiple
                        onChange={(evento) => {
                            const arquivosNovos = Array.from(evento.target.files ?? []);
                            setMidias((selecionadas) => [...selecionadas, ...arquivosNovos]);
                            evento.target.value = '';
                        }}
                    />

                </div>

                <div className="area-descricao-post">
                    <label htmlFor="descricao-post">Descrição:</label>
                    <textarea
                        id="descricao-post"
                        name="descricao-post"
                        value={descricao}
                        onChange={(evento) => setDescricao(evento.target.value)}
                    />
                </div>

                {statusPublicacao && (
                    <p className="status-publicacao-post" role="status">{statusPublicacao}</p>
                )}
                {erroPublicacao && (
                    <p className="erro-publicacao-post" role="alert">{erroPublicacao}</p>
                )}

                <div className="area-enviar-post">
                    <button type="submit" disabled={publicando}>
                        {publicando ? 'Processando...' : 'Publicar Post'}
                    </button>
                </div>
            </form>
        </article>
    )
}

export default PainelCriarPost;