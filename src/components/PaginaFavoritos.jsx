import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { useFavoritos } from '../contexts/favoritosContextStore';
import CardPost from './cards-posts/CardPost';
import CardBuild from './cards-builds/CardBuild';
import './CompartilharPublicacao.css';
import './PaginaFavoritos.css';

export default function PaginaFavoritos() {
    const { user, carregando: autenticando } = useAuth();
    const { favoritos, carregando, erro, alternar, recarregar, atualizarPublicacao, excluirPublicacao } = useFavoritos();
    const navigate = useNavigate();
    const location = useLocation();
    const [erroRemover, setErroRemover] = useState('');
    const [removendo, setRemovendo] = useState(null);
    const [filtro, setFiltro] = useState(() => ['posts', 'builds'].includes(location.state?.filtroFavoritos) ? location.state.filtroFavoritos : 'todos');

    async function remover(favorito) {
        if (removendo) return;
        setRemovendo(favorito.id);
        setErroRemover('');
        try {
            await alternar({ id: favorito.post_id ?? favorito.build_id }, favorito.post_id ? 'post' : 'build');
        } catch (error) {
            console.error('Erro ao remover favorito:', error);
            setErroRemover('Não foi possível remover o favorito. Tente novamente.');
        } finally {
            setRemovendo(null);
        }
    }

    const visiveis = favoritos.filter(item => filtro === 'todos' || (filtro === 'posts' ? item.post_id : item.build_id));
    const contagens = {
        todos: favoritos.length,
        posts: favoritos.filter(item => item.post_id).length,
        builds: favoritos.filter(item => item.build_id).length,
    };
    return (
        <main className="biblioteca-posts-page favoritos-page">
            <button type="button" className="favoritos-voltar" onClick={() => navigate('/')}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
                Voltar à comunidade
            </button>
            <header className="favoritos-heading">
                <div>
                    <span className="favoritos-sobretitulo">Sua coleção</span>
                    <h1>Meus favoritos</h1>
                    <p>Um lugar para guardar as conversas e builds que você quer revisitar.</p>
                </div>
                <div className="favoritos-dica">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4Z" /></svg>
                    <p>Use o marcador nos cards para guardar ou remover uma publicação.</p>
                </div>
            </header>
            {autenticando ? <p role="status">Carregando conta...</p> : !user ? (
                <button type="button" className="btn-filtro" onClick={() => navigate('/login')}>Entre para acessar seus favoritos</button>
            ) : <>
                <div className="favoritos-toolbar">
                    <div className="favoritos-filtros" role="group" aria-label="Filtrar favoritos">
                        {['todos', 'posts', 'builds'].map(tipo => <button className="btn-filtro" type="button" key={tipo} aria-pressed={filtro === tipo} onClick={() => setFiltro(tipo)}>
                            {tipo === 'todos' ? 'Todos' : tipo === 'posts' ? 'Posts' : 'Builds'}
                            {!carregando && !erro && <span>{contagens[tipo]}</span>}
                        </button>)}
                    </div>
                    <span className="favoritos-ordem">Salvos mais recentemente primeiro</span>
                </div>
                {carregando && <p role="status">Carregando favoritos...</p>}
                {erro && <div role="alert"><p>{erro}</p><button type="button" className="btn-filtro" onClick={recarregar}>Tentar novamente</button></div>}
                {erroRemover && <p role="alert">{erroRemover}</p>}
                {!carregando && !erro && !visiveis.length && <div className="favoritos-vazio">
                    <h2>{favoritos.length ? 'Sua coleção nesta categoria começa aqui' : 'Guarde o que vale a pena revisitar'}</h2>
                    <p>Encontrou uma dica útil ou uma build para testar? Salve pelo marcador do card e ela aparece aqui.</p>
                    <button type="button" className="btn-filtro" onClick={() => navigate(filtro === 'builds' ? '/builds' : '/posts')}>{filtro === 'builds' ? 'Explorar builds' : 'Explorar posts'}</button>
                </div>}
                {!carregando && !erro && ['posts', 'builds'].map(grupo => {
                    const itens = visiveis.filter(item => grupo === 'posts' ? item.post_id : item.build_id);
                    if (!itens.length) return null;
                    return <section className="favoritos-grupo" key={grupo} aria-labelledby={`favoritos-${grupo}-titulo`}>
                        <header className="favoritos-grupo-heading">
                            <div>
                                <h2 id={`favoritos-${grupo}-titulo`}>{grupo === 'posts' ? 'Posts salvos' : 'Builds salvas'}</h2>
                                <p>{grupo === 'posts' ? 'Dicas, clipes e conversas para voltar depois.' : 'Ideias e estratégias para sua próxima jornada.'}</p>
                            </div>
                            <span>{itens.length} {itens.length === 1 ? 'salvo' : 'salvos'}</span>
                        </header>
                        <div className={`favoritos-lista favoritos-lista-${grupo}`}>
                    {itens.map(favorito => {
                        const tipo = favorito.post_id ? 'post' : 'build';
                        const publicacao = favorito.posts || favorito.builds;
                        const abrir = () => navigate(`/${tipo}/${publicacao.id}`, { state: { retornoFavoritos: { filtro } } });
                        const atualizar = atualizado => atualizarPublicacao(atualizado, tipo);
                        const excluir = id => excluirPublicacao(id, tipo);
                        if (!publicacao) return <div className="favorito-indisponivel" key={favorito.id}>
                            <p>Publicação indisponível.</p>
                            <button type="button" className="btn-filtro" disabled={Boolean(removendo)} onClick={() => remover(favorito)}>{removendo === favorito.id ? 'Removendo...' : 'Remover favorito'}</button>
                        </div>;
                        return tipo === 'build'
                            ? <CardBuild key={favorito.id} build={publicacao} aoAbrirBuild={abrir} aoAtualizar={atualizar} aoExcluir={excluir} />
                            : <CardPost key={favorito.id} post={publicacao} aoAbrirPost={abrir} aoAtualizar={atualizar} aoExcluir={excluir} />;
                    })}
                        </div>
                    </section>;
                })}
            </>}
        </main>
    );
}
