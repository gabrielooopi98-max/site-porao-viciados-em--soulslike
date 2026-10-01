import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/useAuth';
import VisualizadorAvatar from '../VisualizadorAvatar';
import CardPost from '../cards-posts/CardPost';
import CardBuild from '../cards-builds/CardBuild';

function PaginaPerfil() {
  const navigate = useNavigate();
  const { user, carregando, signOut } = useAuth();
  const [estatisticas, setEstatisticas] = useState({ posts: 0, builds: 0, seguidores: 0 });
  const [abaConteudo, setAbaConteudo] = useState('posts');
  const [conteudos, setConteudos] = useState([]);
  const [carregandoConteudos, setCarregandoConteudos] = useState(false);

  useEffect(() => {
    if (!user) return undefined;

    let ativo = true;
    Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('autor_id', user.id),
      supabase.from('builds').select('id', { count: 'exact', head: true }).eq('autor_id', user.id),
      supabase.from('seguidores').select('id', { count: 'exact', head: true }).eq('seguido_id', user.id),
    ]).then(([resultadoPosts, resultadoBuilds, resultadoSeguidores]) => {
      if (!ativo) return;
      setEstatisticas({
        posts: resultadoPosts.count ?? 0,
        builds: resultadoBuilds.count ?? 0,
        seguidores: resultadoSeguidores.count ?? 0,
      });
    });

    return () => {
      ativo = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    let ativo = true;

    async function carregarConteudos() {
      setCarregandoConteudos(true);

      const { data, error } = await supabase
        .from(abaConteudo)
        .select('*')
        .eq('autor_id', user.id)
        .order('criado_em', { ascending: false })
        .order('id', { ascending: true });

        if (!ativo) return;
        if (error) {
          console.error(`Erro ao carregar ${abaConteudo} do perfil:`, error);
          setConteudos([]);
        } else {
          const publicacoes = data ?? [];
          const tabelaMidias = abaConteudo === 'posts' ? 'midias_posts' : 'midias_builds';
          const colunaMidia = abaConteudo === 'posts' ? 'post_id' : 'build_id';
          const ids = publicacoes.map((publicacao) => publicacao.id);
          const resultadoMidias = ids.length
            ? await supabase.from(tabelaMidias).select('*').in(colunaMidia, ids).order('ordem', { ascending: true })
            : { data: [], error: null };
          const midiasPorPublicacao = new Map();
          (resultadoMidias.data ?? []).forEach((midia) => {
            const idPublicacao = midia[colunaMidia];
            const midias = midiasPorPublicacao.get(idPublicacao) ?? [];
            midias.push(midia);
            midiasPorPublicacao.set(idPublicacao, midias);
          });
          setConteudos(publicacoes.map((publicacao) => ({
            ...publicacao,
            midias: midiasPorPublicacao.get(publicacao.id) ?? [],
          })));
        }
        setCarregandoConteudos(false);
    }

    carregarConteudos();

    return () => {
      ativo = false;
    };
  }, [abaConteudo, user]);

  if (carregando) {
    return <main className="componente-carregando" role="status">Preparando perfil...</main>;
  }

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const nome = user.user_metadata?.display_name || 'Viciado em Souls';
  const totalPontos = Number(user.user_metadata?.pontos ?? 0);
  const avatar = user.user_metadata?.avatar_url;
  const avatarStyle = avatar ? {
    objectPosition: `${user.user_metadata?.avatar_pos_x ?? 50}% ${user.user_metadata?.avatar_pos_y ?? 50}%`,
    transform: `scale(${user.user_metadata?.avatar_zoom ?? 1})`,
  } : undefined;

  return (
    <>
      <header className="area-header">
        <div className="barra-menu">
          <div className="lado-esquerdo">
            <div className="area-logo-site"><p>Viciados Em Souls</p></div>
          </div>
          <div className="lado-direito">
            <button className="btn-filtro" type="button" onClick={() => navigate('/')}>
              Voltar à comunidade
            </button>
          </div>
        </div>
      </header>

      <main className="perfil-page">
        <section className="perfil-painel" aria-labelledby="titulo-perfil">
          <div className="perfil-cabecalho">
            {avatar ? (
              <VisualizadorAvatar className="perfil-avatar-grande" src={avatar} alt={`Foto de ${nome}`} style={avatarStyle} />
            ) : (
              <div className="perfil-avatar-grande perfil-avatar-vazio" aria-hidden="true">?</div>
            )}
            <div>
              <span className="banner-kicker">Perfil da comunidade</span>
              <h1 id="titulo-perfil">{nome}</h1>
              <p>{user.email}</p>
            </div>
          </div>

          <div className="perfil-estatisticas">
            <div><strong>{estatisticas.posts}</strong><span>Posts</span></div>
            <div><strong>{estatisticas.builds}</strong><span>Builds</span></div>
            <div><strong>{estatisticas.seguidores}</strong><span>Seguidores</span></div>
          </div>

          <div className="perfil-acoes">
            <button className="btn-criar-post" type="button" onClick={() => navigate('/configurar-perfil')}>
              Editar foto
            </button>
            <button className="btn-filtro" type="button" onClick={async () => { await signOut(); navigate('/'); }}>
              Sair da conta
            </button>
          </div>
        </section>

        <section className="perfil-ranking" aria-labelledby="titulo-ranking-perfil">
          <div>
            <span className="banner-kicker">Ranking da comunidade</span>
            <h2 id="titulo-ranking-perfil">Sua pontuação</h2>
            <p>Seus pontos ficam separados das publicações do perfil.</p>
          </div>
          <strong>{totalPontos}<small> pts</small></strong>
          <button className="btn-filtro" type="button" onClick={() => navigate('/#ranking')}>
            Ver ranking
          </button>
        </section>

        <section className="perfil-conteudos" aria-labelledby="titulo-conteudos-perfil">
          <div className="perfil-conteudos-cabecalho">
            <div>
              <span className="banner-kicker">Histórico da comunidade</span>
              <h2 id="titulo-conteudos-perfil">Minhas publicações</h2>
            </div>

            <div className="perfil-filtros" role="tablist" aria-label="Filtrar publicações">
              <button
                className={`btn-filtro ${abaConteudo === 'posts' ? 'ativo' : ''}`}
                type="button"
                role="tab"
                aria-selected={abaConteudo === 'posts'}
                onClick={() => setAbaConteudo('posts')}
              >
                Posts
              </button>
              <button
                className={`btn-filtro ${abaConteudo === 'builds' ? 'ativo' : ''}`}
                type="button"
                role="tab"
                aria-selected={abaConteudo === 'builds'}
                onClick={() => setAbaConteudo('builds')}
              >
                Builds
              </button>
            </div>
          </div>

          {carregandoConteudos ? (
            <p className="perfil-conteudos-estado">Carregando publicações...</p>
          ) : conteudos.length ? (
            <div className={`perfil-lista-cards perfil-lista-cards-${abaConteudo}`}>
              {conteudos.map((conteudo) => abaConteudo === 'posts' ? (
                <CardPost
                  key={conteudo.id}
                  post={conteudo}
                  aoAtualizar={(atualizado) => setConteudos((atuais) => atuais.map((item) => item.id === atualizado.id ? { ...item, ...atualizado } : item))}
                  aoExcluir={(id) => setConteudos((atuais) => atuais.filter((item) => item.id !== id))}
                  aoAbrirPost={() => navigate(`/post/${conteudo.id}`)}
                />
              ) : (
                <CardBuild
                  key={conteudo.id}
                  build={conteudo}
                  aoAtualizar={(atualizado) => setConteudos((atuais) => atuais.map((item) => item.id === atualizado.id ? { ...item, ...atualizado } : item))}
                  aoExcluir={(id) => setConteudos((atuais) => atuais.filter((item) => item.id !== id))}
                  aoAbrirBuild={() => navigate(`/build/${conteudo.id}`)}
                />
              ))}
            </div>
          ) : (
            <p className="perfil-conteudos-estado">
              Você ainda não publicou {abaConteudo === 'posts' ? 'nenhum post' : 'nenhuma build'}.
            </p>
          )}
        </section>
      </main>
    </>
  );
}

export default PaginaPerfil;