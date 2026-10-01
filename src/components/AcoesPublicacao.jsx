import { useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/useAuth';

const categorias = [
    'Dark Souls Remastered',
    'Dark Souls II',
    'Dark Souls III',
    'Elden Ring',
    'Elden Ring Nightreign',
    'Bloodborne',
    "Demon's Souls",
    'Sekiro: Shadows Die Twice',
    'Lies of P',
];

function AcoesPublicacao({ publicacao, tipo, aoAtualizar, aoExcluir }) {
    const { user } = useAuth();
    const [menuAberto, setMenuAberto] = useState(false);
    const [editando, setEditando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState('');
    const [midiasRemovidas, setMidiasRemovidas] = useState([]);
    const [formulario, setFormulario] = useState(() => criarFormulario(publicacao, tipo));
    const tabela = tipo === 'build' ? 'builds' : 'posts';
    const tabelaMidias = tipo === 'build' ? 'midias_builds' : 'midias_posts';
    const colunaMidia = tipo === 'build' ? 'build_id' : 'post_id';
    const midiasDisponiveis = publicacao.midias?.length
        ? publicacao.midias
        : publicacao.midia_url
            ? [{ ...publicacao, id: null }]
            : [];

    if (!user?.id || user.id !== publicacao.autor_id) {
        return null;
    }

    function atualizarCampo(campo, valor) {
        setFormulario((atual) => ({ ...atual, [campo]: valor }));
    }

    function abrirEdicao(evento) {
        evento.stopPropagation();
        setMenuAberto(false);
        setErro('');
        setMidiasRemovidas([]);
        setFormulario(criarFormulario(publicacao, tipo));
        setEditando(true);
    }

    function alternarRemocaoMidia(evento, midia) {
        evento.stopPropagation();
        const idMidia = midia.id ?? midia.midia_url;
        setMidiasRemovidas((atuais) => atuais.includes(idMidia)
            ? atuais.filter((id) => id !== idMidia)
            : [...atuais, idMidia]);
    }

    async function salvarEdicao(evento) {
        evento.preventDefault();
        evento.stopPropagation();
        setSalvando(true);
        setErro('');

        const midiasQueFicam = midiasDisponiveis.filter((midia) => !midiasRemovidas.includes(midia.id ?? midia.midia_url));
        const campos = tipo === 'build'
            ? {
                categoria: formulario.categoria,
                titulo: formulario.titulo.trim(),
                descricao: formulario.descricao.trim(),
                nivel: formulario.nivel,
                foco: formulario.foco.trim(),
                dano: formulario.dano.trim(),
            }
            : {
                categoria: formulario.categoria,
                titulo: formulario.titulo.trim(),
                descricao: formulario.descricao.trim(),
            };

        if (midiasRemovidas.length) {
            const idsRelacionados = midiasRemovidas.filter((id) => id);
            if (idsRelacionados.length) {
                const { error: erroMidias } = await supabase
                    .from(tabelaMidias)
                    .delete()
                    .in('id', idsRelacionados)
                    .eq(colunaMidia, publicacao.id);
                if (erroMidias) {
                    setErro(`Não foi possível remover a mídia: ${erroMidias.message || 'tente novamente.'}`);
                    setSalvando(false);
                    return;
                }
            }

            const caminhos = midiasDisponiveis
                .filter((midia) => midiasRemovidas.includes(midia.id ?? midia.midia_url))
                .map((midia) => extrairCaminhoMidia(midia.midia_url))
                .filter(Boolean);
            if (caminhos.length) {
                const { error: erroStorage } = await supabase.storage.from('midias').remove(caminhos);
                if (erroStorage) console.warn('Mídia removida do post, mas não do Storage:', erroStorage);
            }

            const primeiraMidia = midiasQueFicam[0];
            campos.midia_url = primeiraMidia?.midia_url || null;
            campos.tipo_midia = primeiraMidia?.tipo_midia || null;
        }

        const { data, error } = await supabase
            .from(tabela)
            .update(campos)
            .eq('id', publicacao.id)
            .eq('autor_id', user.id)
            .select()
            .single();

        if (error) {
            setErro(`Não foi possível salvar: ${error.message || 'tente novamente.'}`);
        } else {
            aoAtualizar?.({ ...data, midias: midiasQueFicam });
            setEditando(false);
        }
        setSalvando(false);
    }

    async function excluirPublicacao(evento) {
        evento.stopPropagation();
        setMenuAberto(false);
        if (!window.confirm(`Excluir este ${tipo === 'build' ? 'build' : 'post'}? Essa ação não pode ser desfeita.`)) return;

        setSalvando(true);
        setErro('');
        const { data, error } = await supabase
            .from(tabela)
            .delete()
            .eq('id', publicacao.id)
            .eq('autor_id', user.id)
            .select('id');

        if (error || !data?.length) {
            setErro(`Não foi possível excluir: ${error?.message || 'publicação não encontrada.'}`);
            setSalvando(false);
            return;
        }

        aoExcluir?.(publicacao.id);
        setSalvando(false);
    }

    return (
        <>
            <div className="acoes-publicacao" onClick={(evento) => evento.stopPropagation()}>
                <button
                    className="btn-acoes-publicacao"
                    type="button"
                    aria-label="Mais opções da publicação"
                    aria-expanded={menuAberto}
                    onClick={() => setMenuAberto((aberto) => !aberto)}
                    disabled={salvando}
                >
                    ⋯
                </button>
                {menuAberto && (
                    <div className="menu-acoes-publicacao">
                        <button type="button" onClick={abrirEdicao}>Editar</button>
                        <button type="button" className="acao-excluir-publicacao" onClick={excluirPublicacao}>Excluir</button>
                    </div>
                )}
            </div>

            {editando && (
                <div className="overlay-editar-publicacao" onClick={(evento) => evento.stopPropagation()}>
                    <form className="painel-criar-post painel-editar-publicacao" onSubmit={salvarEdicao}>
                        <header className="header-painel-criar-post cabecalho-editar-publicacao">
                            <div>
                                <span>Suas publicações</span>
                                <h2>Editar {tipo === 'build' ? 'build' : 'post'}</h2>
                            </div>
                            <button type="button" className="btn-fechar-painel-criar-post btn-fechar-editar-publicacao" onClick={() => setEditando(false)} aria-label="Fechar edição">×</button>
                        </header>

                        <label htmlFor={`editar-categoria-${publicacao.id}`}>Categoria</label>
                        <select id={`editar-categoria-${publicacao.id}`} value={formulario.categoria} onChange={(evento) => atualizarCampo('categoria', evento.target.value)}>
                            <option value="">Nenhuma</option>
                            {categorias.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
                        </select>

                        <label htmlFor={`editar-titulo-${publicacao.id}`}>{tipo === 'build' ? 'Nome da build' : 'Título'}</label>
                        <input id={`editar-titulo-${publicacao.id}`} value={formulario.titulo} onChange={(evento) => atualizarCampo('titulo', evento.target.value)} maxLength={160} required />

                        {tipo === 'build' && (
                            <div className="campos-editar-build">
                                <label htmlFor={`editar-nivel-${publicacao.id}`}>Nível</label>
                                <input id={`editar-nivel-${publicacao.id}`} type="number" min="1" value={formulario.nivel} onChange={(evento) => atualizarCampo('nivel', evento.target.value)} />
                                <label htmlFor={`editar-foco-${publicacao.id}`}>Foco</label>
                                <input id={`editar-foco-${publicacao.id}`} value={formulario.foco} onChange={(evento) => atualizarCampo('foco', evento.target.value)} />
                                <label htmlFor={`editar-dano-${publicacao.id}`}>Tipo de dano</label>
                                <input id={`editar-dano-${publicacao.id}`} value={formulario.dano} onChange={(evento) => atualizarCampo('dano', evento.target.value)} />
                            </div>
                        )}

                        {midiasDisponiveis.length > 0 && (
                            <div className="area-colocar-midia-post midias-editar-publicacao">
                                <div className="midias-editar-cabecalho">
                                    <label>Mídias publicadas</label>
                                    <span>{midiasRemovidas.length ? `${midiasRemovidas.length} marcada(s) para remover` : 'Toque no × para remover'}</span>
                                </div>
                                <div className="midias-editar-grade">
                                    {midiasDisponiveis.map((midia, indice) => {
                                        const idMidia = midia.id ?? midia.midia_url;
                                        const removida = midiasRemovidas.includes(idMidia);
                                        return (
                                            <div className={`midia-editar-item${removida ? ' midia-editar-item-removida' : ''}`} key={idMidia}>
                                                {midia.tipo_midia?.startsWith('video/') ? <video src={midia.midia_url} muted /> : <img src={midia.midia_url} alt={`Mídia ${indice + 1}`} />}
                                                <button type="button" onClick={(evento) => alternarRemocaoMidia(evento, midia)} aria-label={removida ? 'Manter mídia' : 'Remover mídia'}>{removida ? '+' : '×'}</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <label htmlFor={`editar-descricao-${publicacao.id}`}>Descrição</label>
                        <textarea id={`editar-descricao-${publicacao.id}`} value={formulario.descricao} onChange={(evento) => atualizarCampo('descricao', evento.target.value)} maxLength={2000} />
                        {erro && <p className="erro-editar-publicacao" role="alert">{erro}</p>}
                        <footer className="acoes-editar-publicacao">
                            <button type="button" className="btn-cancelar-edicao" onClick={() => setEditando(false)}>Cancelar</button>
                            <button type="submit" className="btn-salvar-edicao" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar alterações'}</button>
                        </footer>
                    </form>
                </div>
            )}
        </>
    );
}

function criarFormulario(publicacao, tipo) {
    return {
        categoria: publicacao.categoria || '',
        titulo: publicacao.titulo || '',
        descricao: publicacao.descricao || '',
        nivel: tipo === 'build' ? publicacao.nivel || '' : '',
        foco: tipo === 'build' ? publicacao.foco || '' : '',
        dano: tipo === 'build' ? publicacao.dano || '' : '',
    };
}

function extrairCaminhoMidia(url) {
    if (!url) return null;
    const marcador = '/storage/v1/object/public/midias/';
    const indice = url.indexOf(marcador);
    return indice === -1 ? null : decodeURIComponent(url.slice(indice + marcador.length));
}

export default AcoesPublicacao;
