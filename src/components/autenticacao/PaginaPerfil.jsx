import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/useAuth';
import VisualizadorAvatar from '../VisualizadorAvatar';
import CardPost from '../cards-posts/CardPost';
import CardBuild from '../cards-builds/CardBuild';
import './Perfil.css';
import { useRanking } from '../ranking/useRanking';
import ColecaoFinais from '../ranking/ColecaoFinais';
import CardPerfil from './CardPerfil';
import { BANNERS_FINAIS } from '../../services/bannersFinais';
import useBannerFinalPerfil from './useBannerFinalPerfil';

function PaginaPerfil() {
  const navigate = useNavigate();
  const { user, carregando, signOut } = useAuth();
  const [estatisticas, setEstatisticas] = useState({ posts: 0, builds: 0, seguidores: 0 });
  const [abaConteudo, setAbaConteudo] = useState('posts');
  const [conteudos, setConteudos] = useState([]);
  const [carregandoConteudos, setCarregandoConteudos] = useState(false);
  const [erroConteudos, setErroConteudos] = useState('');
  const [erroConta, setErroConta] = useState('');
  const [saindo, setSaindo] = useState(false);
  const ranking = useRanking();
  const banner = useBannerFinalPerfil(user?.id, ranking.dados?.minhas_vitorias);

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
      setErroConteudos('');

      const { data, error } = await supabase
        .from(abaConteudo)
        .select('*')
        .eq('autor_id', user.id)
        .order('criado_em', { ascending: false })
        .order('id', { ascending: true });

        if (!ativo) return;
        if (error) {
          console.error(`Erro ao carregar ${abaConteudo} do perfil:`, error);
          setErroConteudos('Não foi possível carregar suas publicações. Tente novamente mais tarde.');
          setConteudos([]);
        } else {
          const publicacoes = data ?? [];
          const tabelaMidias = abaConteudo === 'posts' ? 'midias_posts' : 'midias_builds';
          const colunaMidia = abaConteudo === 'posts' ? 'post_id' : 'build_id';
          const ids = publicacoes.map((publicacao) => publicacao.id);
          const resultadoMidias = ids.length
            ? await supabase.from(tabelaMidias).select('*').in(colunaMidia, ids).order('ordem', { ascending: true })
            : { data: [], error: null };
          if (!ativo) return;
          if (resultadoMidias.error) {
            console.error('Erro ao carregar mídias do perfil:', resultadoMidias.error);
            setErroConteudos('Não foi possível carregar as mídias das publicações.');
          }
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
    return <Navigate to="/login" replace />;
  }

  const nome = user.user_metadata?.display_name || 'Viciado em Souls';
  const totalPontos = ranking.dados?.meus_pontos;
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

      <main className="perfil-page perfil-organizado">
        <CardPerfil banner={banner} tituloId="titulo-perfil" cabecalho={
          <div className="perfil-cabecalho">
            {avatar ? (
              <VisualizadorAvatar className="perfil-avatar-grande" src={avatar} alt={`Foto de ${nome}`} style={avatarStyle} />
            ) : (
              <div className="perfil-avatar-grande perfil-avatar-vazio" aria-hidden="true">?</div>
            )}
            <div>
              <span className="perfil-card-etiqueta">Meu perfil</span>
              <h1 id="titulo-perfil">{nome}</h1>
              {!banner.previa && BANNERS_FINAIS[banner.dados?.final_id] && <p className="perfil-card-titulo-final">{BANNERS_FINAIS[banner.dados.final_id].titulo}</p>}
            </div>
          </div>
        }>
          <div className="perfil-estatisticas">
            <div><strong>{estatisticas.posts}</strong><span>Posts</span></div>
            <div><strong>{estatisticas.builds}</strong><span>Builds</span></div>
            <div><strong>{estatisticas.seguidores}</strong><span>Seguidores</span></div>
          </div>

          <div className="perfil-acoes">
            <button className="btn-criar-post perfil-editar" type="button" onClick={() => navigate('/configurar-perfil')}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6ZM14 5l5 5" /></svg>
              Editar perfil
            </button>
          </div>
        </CardPerfil>

        <nav className="perfil-atalhos" aria-label="Atalhos do seu perfil">
          <button className="perfil-atalho-favoritos" type="button" onClick={() => navigate('/favoritos')}>
            <div className="perfil-atalho-icone" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4Z" /></svg>
            </div>
            <strong>Meus favoritos</strong>
          </button>
          <button className="perfil-atalho-privadas" type="button" onClick={() => navigate('/mensagens')}>
            <div className="perfil-atalho-icone" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 4h16v12H9l-5 4Z" /><path d="M8 9h8M8 12h5" /></svg>
            </div>
            <strong>Chat para amigos</strong>
          </button>
          <button className="perfil-atalho-comunidade" type="button" onClick={() => navigate('/chat')}>
            <div className="perfil-atalho-icone" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M3 4h14v10H8l-5 3ZM9 17v3h7l5 2V10h-2" /></svg>
            </div>
            <strong>Chat da comunidade</strong>
          </button>
        </nav>

        <section className="perfil-ranking" aria-labelledby="titulo-ranking-perfil">
          <div>
            <span className="banner-kicker">Ranking da comunidade</span>
            <h2 id="titulo-ranking-perfil">Sua pontuação</h2>
            <p>Acompanhe sua participação na comunidade.</p>
          </div>
          {ranking.erro ? <p className="ranking-erro" role="alert">{ranking.erro}</p> :
            <strong>{totalPontos ?? '…'}<small> pts</small></strong>}
          <button className="btn-filtro" type="button" onClick={() => navigate('/ranking')}>
            Ver ranking
          </button>
        </section>

        {ranking.dados && <ColecaoFinais finais={ranking.dados.finais} vitorias={ranking.dados.minhas_vitorias}
          aoAtualizar={ranking.atualizar} banner={banner} />}

        <section className="perfil-conteudos" aria-labelledby="titulo-conteudos-perfil">
          <div className="perfil-conteudos-cabecalho">
            <div>
              <span className="banner-kicker">O que você compartilhou</span>
              <h2 id="titulo-conteudos-perfil">Minhas publicações</h2>
              <p className="perfil-secao-descricao">Seus posts e builds, do mais recente ao mais antigo.</p>
            </div>

            <div className="perfil-filtros" role="group" aria-label="Filtrar publicações">
              <button
                className={`btn-filtro ${abaConteudo === 'posts' ? 'ativo' : ''}`}
                type="button"
                aria-pressed={abaConteudo === 'posts'}
                onClick={() => setAbaConteudo('posts')}
              >
                Posts
              </button>
              <button
                className={`btn-filtro ${abaConteudo === 'builds' ? 'ativo' : ''}`}
                type="button"
                aria-pressed={abaConteudo === 'builds'}
                onClick={() => setAbaConteudo('builds')}
              >
                Builds
              </button>
            </div>
          </div>

          {erroConteudos && <p className="perfil-conteudos-estado" role="alert">{erroConteudos}</p>}
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
              ) : !erroConteudos && (
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
        <footer className="perfil-conta">
          <div><strong>Sua conta</strong><p>{user.email}</p></div>
          <button className="btn-filtro" type="button" disabled={saindo} onClick={async () => {
            if (saindo) return;
            setSaindo(true);
            setErroConta('');
            try {
              const { error } = await signOut();
              if (error) throw error;
              navigate('/');
            } catch (error) {
              console.error('Erro ao sair da conta:', error);
              setErroConta('Não foi possível sair da conta. Tente novamente.');
            } finally {
              setSaindo(false);
            }
          }}>{saindo ? 'Saindo...' : 'Sair da conta'}</button>
          {erroConta && <p role="alert">{erroConta}</p>}
        </footer>
      </main>
    </>
  );
}

export default PaginaPerfil;