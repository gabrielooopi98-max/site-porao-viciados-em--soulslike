import { supabase } from './services/supabase';
import { gerarIdUnico } from './gerarIdUnico';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import './App.css';
import { Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import AvisosHeader from './components/AvisosHeader';
import ImagemDecorativaAdiada from './components/ImagemDecorativaAdiada';

const CardPost = lazy(() => import('./components/cards-posts/CardPost'));
const CardBuild = lazy(() => import('./components/cards-builds/CardBuild'));
const ChatGlobal = lazy(() => import('./components/ChatGlobal'));
const PaginaLogin = lazy(() => import('./components/autenticacao/PaginaLogin'));
const PaginaConfigurarPerfil = lazy(() => import('./components/autenticacao/PaginaConfigurarPerfil'));
const PaginaPerfil = lazy(() => import('./components/autenticacao/PaginaPerfil'));
const PaginaPerfilPublico = lazy(() => import('./components/autenticacao/PaginaPerfilPublico'));
const PainelCriarPost = lazy(() => import('./components/painel-criar-post/PainelCriarPost'));
const PainelCriarBuild = lazy(() => import('./components/painel-criar-build/PainelCriarBuild'));
const DetalhesPost = lazy(() => import('./components/detalhes-post/DetalhesPost'));
const DetalhesBuild = lazy(() => import('./components/detalhes-build/DetalhesBuild'));

const PAGE_SIZE = 12;
const HOME_CARD_LIMIT = 8;

async function carregarMidiasRelacionadas(publicacoes, tabela, colunaId) {
  if (!publicacoes.length) {
    return [];
  }

  const ids = publicacoes.map((publicacao) => publicacao.id);
  const { data, error } = await supabase
    .from(tabela)
    .select('*')
    .in(colunaId, ids)
    .order('ordem', { ascending: true });

  if (error) {
    console.error(`Erro ao carregar mídias de ${tabela}:`, error);
    return publicacoes.map((publicacao) => ({ ...publicacao, midias: [] }));
  }

  const midiasPorPublicacao = new Map();
  for (const midia of data) {
    const id = String(midia[colunaId]);
    const midias = midiasPorPublicacao.get(id) ?? [];
    midias.push(midia);
    midiasPorPublicacao.set(id, midias);
  }

  return publicacoes.map((publicacao) => ({
    ...publicacao,
    midias: midiasPorPublicacao.get(String(publicacao.id)) ?? [],
  }));
}

async function removerUploads(midias) {
  const caminhos = midias.map((midia) => midia.caminho).filter(Boolean);

  if (!caminhos.length) {
    return;
  }

  const { error } = await supabase.storage.from('midias').remove(caminhos);
  if (error) {
    console.error('Erro ao remover uploads incompletos:', error);
  }
}

async function verificarTabelaMidias(tabela) {
  const { error } = await supabase.from(tabela).select('id').limit(0);

  if (error) {
    throw new Error(`Tabela ${tabela} indisponível: ${error.message || 'execute a migration SQL correspondente.'}`);
  }

  return true;
}

async function enviarMidias(arquivos, aoAtualizarStatus) {
  const midiasEnviadas = [];

  try {
    for (const [ordem, arquivoOriginal] of arquivos.entries()) {
      let arquivo = arquivoOriginal;

      if (arquivo.type.startsWith('video/')) {
        const { normalizarVideo } = await import('./services/normalizarVideo');

        arquivo = await normalizarVideo(arquivo, ({ etapa, progresso }) => {
          aoAtualizarStatus(etapa === 'carregando'
            ? `Preparando o vídeo ${ordem + 1} de ${arquivos.length}...`
            : `Convertendo vídeo ${ordem + 1} de ${arquivos.length}... ${progresso}%`);
        });
      }

      aoAtualizarStatus(`Enviando mídia ${ordem + 1} de ${arquivos.length}...`);
      const extensao = arquivo.name.split('.').pop()?.toLowerCase() || 'bin';
      const caminho = `${gerarIdUnico()}.${extensao}`;
      const { error } = await supabase.storage.from('midias').upload(caminho, arquivo);

      if (error) {
        throw new Error(`Falha ao enviar ${arquivo.name}: ${error.message || error.name || 'erro desconhecido'}`);
      }

      const { data } = supabase.storage.from('midias').getPublicUrl(caminho);
      midiasEnviadas.push({
        caminho,
        midia_url: data.publicUrl,
        tipo_midia: arquivo.type,
        ordem,
      });
    }

    return midiasEnviadas;
  } catch (error) {
    await removerUploads(midiasEnviadas);
    throw error;
  }
}

function SkeletonCard({ variant }) {
  const isBuild = variant === 'build';

  return (
    <article className={`skeleton-card skeleton-card-${variant}`} aria-hidden="true">
      <div className="skeleton-card-header">
        <span className="skeleton-shape skeleton-avatar" />
        <div className="skeleton-user-lines">
          <span className="skeleton-shape skeleton-user-name" />
          <span className="skeleton-shape skeleton-user-meta" />
        </div>
        <span className="skeleton-shape skeleton-action" />
      </div>
      <div className="skeleton-card-content">
        <span className="skeleton-shape skeleton-category" />
        <span className="skeleton-shape skeleton-title" />
        <span className="skeleton-shape skeleton-title-short" />
        <span className="skeleton-shape skeleton-media" />
        {isBuild ? (
          <div className="skeleton-build-stats">
            <span className="skeleton-shape" />
            <span className="skeleton-shape" />
            <span className="skeleton-shape" />
          </div>
        ) : (
          <>
            <span className="skeleton-shape skeleton-copy" />
            <span className="skeleton-shape skeleton-copy-short" />
          </>
        )}
      </div>
      <div className="skeleton-card-footer">
        <span className="skeleton-shape skeleton-metric" />
        <span className="skeleton-shape skeleton-metric" />
        <span className="skeleton-shape skeleton-metric" />
        <span className="skeleton-shape skeleton-action" />
      </div>
    </article>
  );
}

function Home() {
  const location = useLocation();
  const { user } = useAuth();
  const [mostrarPainel, setMostrarPainel] = useState(false);
  const [mostrarPainelBuild, setMostrarPainelBuild] = useState(false);
  const [posts, setPosts] = useState([]);
  const [builds, setBuilds] = useState([]);
  const [postsCarregados, setPostsCarregados] = useState(false);
  const [buildsCarregados, setBuildsCarregados] = useState(false);
  const [filtroPostsCarregados, setFiltroPostsCarregados] = useState(null);
  const [filtroBuildsCarregadas, setFiltroBuildsCarregadas] = useState(null);
  const [filtro, setFiltro] = useState(location.state?.restaurarHome?.filtro ?? 'todos');
  const [filtroBuild, setFiltroBuild] = useState(location.state?.restaurarHome?.filtroBuild ?? 'todos');
  const cardsPostsRef = useRef(null);
  const postsRequestRef = useRef(0);
  const buildsRequestRef = useRef(0);
  const navigate = useNavigate();
  const postsFiltrados = filtroPostsCarregados === filtro ? posts : [];
  const buildsFiltradas = filtroBuildsCarregadas === filtroBuild ? builds : [];
  const carregandoPosts = filtroPostsCarregados !== filtro;
  const carregandoBuilds = filtroBuildsCarregadas !== filtroBuild;

  useEffect(() => {
    if (cardsPostsRef.current) {
      cardsPostsRef.current.scrollLeft = 0;
    }
  }, [filtro]);

  useEffect(() => {
    const requestId = ++postsRequestRef.current;
    let consultaAtiva = true;

    async function carregarPosts() {
      let consulta = supabase
        .from('posts')
        .select('*')
        .order('criado_em', { ascending: false })
        .order('id', { ascending: true })
        .range(0, HOME_CARD_LIMIT - 1);

      if (filtro !== 'todos') {
        consulta = consulta.eq('categoria', filtro);
      }

      const { data, error } = await consulta;

      if (error) {
        console.error('Erro ao carregar posts:', error);
        if (consultaAtiva && requestId === postsRequestRef.current) {
          setPosts([]);
          setFiltroPostsCarregados(filtro);
          setPostsCarregados(true);
        }
        return;
      }

      const paginaInicial = data ?? [];
      const postsComMidias = await carregarMidiasRelacionadas(paginaInicial, 'midias_posts', 'post_id');
      if (!consultaAtiva || requestId !== postsRequestRef.current) return;

      setPosts(postsComMidias);
      setFiltroPostsCarregados(filtro);
      setPostsCarregados(true);
    }

    carregarPosts();
    return () => {
      consultaAtiva = false;
      postsRequestRef.current += 1;
    };
  }, [filtro]);

  useEffect(() => {
    const requestId = ++buildsRequestRef.current;
    let consultaAtiva = true;

    async function carregarBuilds() {
      let consulta = supabase
        .from('builds')
        .select('*')
        .order('criado_em', { ascending: false })
        .order('id', { ascending: true })
        .range(0, HOME_CARD_LIMIT - 1);

      if (filtroBuild !== 'todos') {
        consulta = consulta.eq('categoria', filtroBuild);
      }

      const { data, error } = await consulta;

      if (error) {
        console.error('Erro ao carregar builds:', error);
        if (consultaAtiva && requestId === buildsRequestRef.current) {
          setBuilds([]);
          setFiltroBuildsCarregadas(filtroBuild);
          setBuildsCarregados(true);
        }
        return;
      }

      const paginaInicial = data ?? [];
      const buildsComMidias = await carregarMidiasRelacionadas(paginaInicial, 'midias_builds', 'build_id');
      if (!consultaAtiva || requestId !== buildsRequestRef.current) return;

      setBuilds(buildsComMidias);
      setFiltroBuildsCarregadas(filtroBuild);
      setBuildsCarregados(true);
    }

    carregarBuilds();
    return () => {
      consultaAtiva = false;
      buildsRequestRef.current += 1;
    };
  }, [filtroBuild]);

  useEffect(() => {
    const contexto = location.state?.restaurarHome;
    if (!contexto || !postsCarregados || !buildsCarregados) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: contexto.scrollY, behavior: 'auto' });
      navigate('/', { replace: true, state: null });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [buildsCarregados, location.state, navigate, postsCarregados]);

  async function adicionarPost(novoPost, aoAtualizarStatus = () => { }) {
    if (!user) {
      navigate('/login');
      return false;
    }

    if (novoPost.midias?.length && !(await verificarTabelaMidias('midias_posts'))) {
      return false;
    }

    const midias = await enviarMidias(novoPost.midias ?? [], aoAtualizarStatus);
    const primeiraMidia = midias[0];
    const dadosPost = {
      autor_id: user?.id ?? null,
      autor_nome: user?.user_metadata?.display_name || user?.email || null,
      autor_avatar_url: user?.user_metadata?.avatar_url || null,
      autor_avatar_zoom: user?.user_metadata?.avatar_zoom ?? 1,
      autor_avatar_pos_x: user?.user_metadata?.avatar_pos_x ?? 50,
      autor_avatar_pos_y: user?.user_metadata?.avatar_pos_y ?? 50,
      categoria: novoPost.categoria,
      titulo: novoPost.titulo,
      descricao: novoPost.descricao,
      ...(primeiraMidia && {
        midia_url: primeiraMidia.midia_url,
        tipo_midia: primeiraMidia.tipo_midia,
      }),
    };

    aoAtualizarStatus('Publicando post...');
    const { data, error } = await supabase
      .from('posts')
      .insert([dadosPost])
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar post:', error);
      await removerUploads(midias);
      throw new Error(`Não foi possível salvar o post: ${error.message || 'erro no banco de dados.'}`);
    }

    if (midias.length) {
      const { error: erroMidias } = await supabase.from('midias_posts').insert(
        midias.map(({ midia_url, tipo_midia, ordem }) => ({
          post_id: data.id,
          midia_url,
          tipo_midia,
          ordem,
        }))
      );

      if (erroMidias) {
        console.error('Erro ao salvar mídias do post:', erroMidias);
        throw new Error(`Não foi possível salvar as mídias do post: ${erroMidias.message || 'erro no banco de dados.'}`);
      }
    }

    if (filtro === 'todos' || data.categoria === filtro) {
      setPosts((postsAtuais) => [{ ...data, midias }, ...postsAtuais].slice(0, HOME_CARD_LIMIT));
    }
    setMostrarPainel(false);
    return true;
  }

  async function adicionarBuild(novaBuild, aoAtualizarStatus = () => { }) {
    if (!user) {
      navigate('/login');
      return false;
    }

    if (novaBuild.midias?.length && !(await verificarTabelaMidias('midias_builds'))) {
      return false;
    }

    const midias = await enviarMidias(novaBuild.midias ?? [], aoAtualizarStatus);
    const primeiraMidia = midias[0];
    const dadosBuild = {
      autor_id: user?.id ?? null,
      autor_nome: user?.user_metadata?.display_name || user?.email || null,
      autor_avatar_url: user?.user_metadata?.avatar_url || null,
      autor_avatar_zoom: user?.user_metadata?.avatar_zoom ?? 1,
      autor_avatar_pos_x: user?.user_metadata?.avatar_pos_x ?? 50,
      autor_avatar_pos_y: user?.user_metadata?.avatar_pos_y ?? 50,
      categoria: novaBuild.categoria,
      titulo: novaBuild.titulo,
      descricao: novaBuild.descricao,
      nivel: novaBuild.nivel,
      foco: novaBuild.foco,
      dano: novaBuild.dano,
      ...(primeiraMidia && {
        midia_url: primeiraMidia.midia_url,
        tipo_midia: primeiraMidia.tipo_midia,
      }),
    };

    aoAtualizarStatus('Publicando build...');
    const { data, error } = await supabase
      .from('builds')
      .insert([dadosBuild])
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar build:', error);
      await removerUploads(midias);
      throw new Error(`Não foi possível salvar a build: ${error.message || 'erro no banco de dados.'}`);
    }

    if (midias.length) {
      const { error: erroMidias } = await supabase.from('midias_builds').insert(
        midias.map(({ midia_url, tipo_midia, ordem }) => ({
          build_id: data.id,
          midia_url,
          tipo_midia,
          ordem,
        }))
      );

      if (erroMidias) {
        console.error('Erro ao salvar mídias da build:', erroMidias);
        throw new Error(`Não foi possível salvar as mídias da build: ${erroMidias.message || 'erro no banco de dados.'}`);
      }
    }

    if (filtroBuild === 'todos' || data.categoria === filtroBuild) {
      setBuilds((buildsAtuais) => [{ ...data, midias }, ...buildsAtuais].slice(0, HOME_CARD_LIMIT));
    }
    setMostrarPainelBuild(false);
    return true;
  }

  return (
    <>
      <header className="area-header">
        <div className="barra-menu">
          <div className="lado-esquerdo">
            <div className="area-logo-site">
              <p>Viciados Em Souls</p>
            </div>
          </div>

          <div className="lado-direito">
            {user ? (
              <>
                <AvisosHeader />
                <button
                  className="botao-avatar-header"
                  type="button"
                  title={user.email}
                  onClick={() => navigate('/perfil')}
                >
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Abrir perfil" />
                  ) : (
                    <span aria-hidden="true">?</span>
                  )}
                </button>
              </>
            ) : (
              <button className="btn-filtro" type="button" onClick={() => navigate('/login')}>
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container-site" id="inicio">
        <section className="area-banner">
          <div className="banner-content">
            <span className="banner-kicker">Comunidade SoulsLike</span>
            <h1>Bem-vindo ao Porão dos Viciados em SoulsLike</h1>
            <p>Compartilhe suas jornadas, descubra novas builds e encontre outros jogadores para atravessar cada boss.</p>

            <div className="area-interativa-banner">
              <button
                className="btn-banner"
                type="button"
                onClick={() => navigate('/chat')}
              >
                Chat Comunidade
              </button>

              <a href="#sobre" className="btn-banner">
                <span>Regras</span>
              </a>
            </div>

            <div className="banner-community-line" aria-label="Conteudos da comunidade">
              <span>Posts</span>
              <span>Builds</span>
              <span>Guias</span>
              <span>Co-op</span>
            </div>
          </div>
        </section>

        <section className="area-posts-comunidade" id="comunidade">
          <div className="header-secao">

            <div className="area-svg area-posts-banner-fundo" aria-hidden="true">
              <ImagemDecorativaAdiada
                src="/svg-animado/dark-souls-banner-1760x575.svg"
                alt=""
                className="dark-souls-banner"
              />
            </div>

            <div className="area-posts-header-conteudo">

              <h2>Posts da comunidade</h2>
              <p className="descricao-secao-post">
                Aqui você encontra dicas, teorias, convites pra jogar junto, clipes, memes e muito mais.
                Troque ideia com a galera e participe de tudo que rola por aqui.
              </p>
            </div>
          </div>

          <div className="area-filtros-posts">
            <div className="buttons-post-comunidade-grid">
              <button
                className="btn-filtro"
                aria-pressed={filtro === 'todos'}
                type="button"
                onClick={() => setFiltro('todos')}
              >
                Todos
              </button>
              <button
                className="btn-filtro"
                aria-pressed={filtro === 'Dark Souls Remastered'}
                type="button"
                onClick={() => setFiltro('Dark Souls Remastered')}
              >
                Dark Souls Remastered
              </button>
              <button
                className="btn-filtro"
                aria-pressed={filtro === 'Dark Souls II'}
                type="button"
                onClick={() => setFiltro('Dark Souls II')}
              >
                Dark Souls II
              </button>
              <button
                className="btn-filtro"
                aria-pressed={filtro === 'Dark Souls III'}
                type="button"
                onClick={() => setFiltro('Dark Souls III')}
              >
                Dark Souls III
              </button>
              <button
                className="btn-filtro"
                aria-pressed={filtro === 'Elden Ring'}
                type="button"
                onClick={() => setFiltro('Elden Ring')}
              >
                Elden Ring
              </button>
              <button
                className="btn-filtro"
                aria-pressed={filtro === 'Elden Ring Nightreign'}
                type="button"
                onClick={() => setFiltro('Elden Ring Nightreign')}
              >
                Elden Ring Nightreign
              </button>
              <button
                className="btn-filtro"
                aria-pressed={filtro === "Demon's Souls"}
                type="button"
                onClick={() => setFiltro("Demon's Souls")}
              >
                Demon's Souls
              </button>
              <button
                className="btn-filtro"
                aria-pressed={filtro === 'Bloodborne'}
                type="button"
                onClick={() => setFiltro('Bloodborne')}
              >
                Bloodborne
              </button>
              <button
                className="btn-filtro"
                aria-pressed={filtro === 'Sekiro'}
                type="button"
                onClick={() => setFiltro('Sekiro')}
              >
                Sekiro
              </button>
              <button
                className="btn-filtro"
                aria-pressed={filtro === 'Lies of P'}
                type="button"
                onClick={() => setFiltro('Lies of P')}
              >
                Lies of P
              </button>
            </div>

            <div className="area-criar-post">
              <button
                type="button"
                className="btn-criar-post"
                onClick={() => user ? setMostrarPainel(true) : navigate('/login')}
              >
                Criar Post
              </button>

              {mostrarPainel && (
                <>
                  <div className="fundo-painel"></div>
                  <Suspense fallback={<div className="componente-carregando" role="status">Preparando formulário...</div>}>
                    <PainelCriarPost
                      aoCriarPost={adicionarPost}
                      fecharPainelCriarPost={() => setMostrarPainel(false)}
                    />
                  </Suspense>
                </>

              )}
            </div>

            {carregandoPosts && (
              <span className="skeleton-status" role="status">Carregando posts</span>
            )}
            <div className="cards-posts-container" ref={cardsPostsRef} aria-busy={carregandoPosts}>
              {carregandoPosts
                ? Array.from({ length: 3 }, (_, indice) => <SkeletonCard key={`post-skeleton-${indice}`} variant="post" />)
                : postsFiltrados.map((post) => (
                  <Suspense key={post.id} fallback={<SkeletonCard variant="post" />}>
                    <CardPost
                      post={post}
                      aoAtualizar={(atualizado) => setPosts((atuais) => atuais.map((item) => item.id === atualizado.id ? { ...item, ...atualizado } : item))}
                      aoExcluir={(id) => setPosts((atuais) => atuais.filter((item) => item.id !== id))}
                      aoAbrirPost={() => navigate(`/post/${post.id}`, {
                        state: {
                          contextoRetorno: {
                            scrollY: window.scrollY,
                            filtro,
                            filtroBuild,
                            quantidadePosts: posts.length,
                            quantidadeBuilds: builds.length,
                          },
                        },
                      })}
                    />
                  </Suspense>
                ))}
            </div>
          </div>

          <button
            type="button"
            className="ver-mais-posts"
            onClick={() => navigate('/posts')}
          >
            Ver mais posts
          </button>
        </section>

        <section className="area-builds-comunidade" id="builds">
          <div className="header-secao-builds">
            <h2>Builds da comunidade</h2>
            <p>
              Crie e compartilhe suas builds insanas dos seus Soulslikes favoritos e compartilhe pra comunidade.
            </p>
          </div>

          <div className="area-filtros-post">
            <div className="buttons-builds-comunidade-grid">
              {[
                'todos',
                'Dark Souls Remastered',
                'Dark Souls II',
                'Dark Souls III',
                'Elden Ring',
                'Elden Ring Nightreign',
                "Demon's Souls",
                'Bloodborne',
                'Sekiro: Shadows Die Twice',
                'Lies of P',
              ].map((categoria) => (
                <button
                  key={categoria}
                  className="btn-filtro"
                  aria-pressed={filtroBuild === categoria}
                  type="button"
                  onClick={() => setFiltroBuild(categoria)}
                >
                  {categoria === 'todos' ? 'Todos' : categoria}
                </button>
              ))}
            </div>

            <div className="area-busca">
              <label htmlFor="busca-build" className="sr-only">Buscar Build:</label>
              <input type="text" className="input-busca" id="busca-build" placeholder="Ex: Sangramento" />
            </div>

            <div className="area-criar-post">
              <button
                type="button"
                className="btn-criar-post"
                onClick={() => user ? setMostrarPainelBuild(true) : navigate('/login')}
              >
                Criar Build
              </button>

              {mostrarPainelBuild && (
                <>
                  <div className="fundo-painel"></div>
                  <Suspense fallback={<div className="componente-carregando" role="status">Preparando formulário...</div>}>
                    <PainelCriarBuild
                      aoCriarBuild={adicionarBuild}
                      fecharPainelCriarBuild={() => setMostrarPainelBuild(false)}
                    />
                  </Suspense>
                </>
              )}
            </div>

            {carregandoBuilds && (
              <span className="skeleton-status" role="status">Carregando builds</span>
            )}
            <div className="cards-builds-container" aria-busy={carregandoBuilds}>
              {carregandoBuilds
                ? Array.from({ length: 3 }, (_, indice) => <SkeletonCard key={`build-skeleton-${indice}`} variant="build" />)
                : buildsFiltradas.map((build) => (
                  <Suspense key={build.id} fallback={<SkeletonCard variant="build" />}>
                    <CardBuild
                      build={build}
                      aoAtualizar={(atualizado) => setBuilds((atuais) => atuais.map((item) => item.id === atualizado.id ? { ...item, ...atualizado } : item))}
                      aoExcluir={(id) => setBuilds((atuais) => atuais.filter((item) => item.id !== id))}
                      aoAbrirBuild={() => navigate(`/build/${build.id}`, {
                        state: {
                          contextoRetorno: {
                            scrollY: window.scrollY,
                            filtro,
                            filtroBuild,
                            quantidadePosts: posts.length,
                            quantidadeBuilds: builds.length,
                          },
                        },
                      })}
                    />
                  </Suspense>
                ))}
            </div>
          </div>
          <button
            type="button"
            className="ver-mais-builds"
            onClick={() => navigate('/builds')}
          >
            Ver mais builds
          </button>
        </section>

        <section className="area-ranking" id="ranking">
          <div className="header-secao">

            <div className="area-svg">
              <ImagemDecorativaAdiada
                src="/svg-animado/lua-bloodborne-banner-1760x575.svg"
                alt="Lua Pixel Art Max"
                className="lua-pixel-art-banner"
              />
            </div>

            <div className="area-ranking-texto">
              <h2>Ranking</h2>
              <p>
                Os jogadores que mais se destacaram na comunidade. Complete desafios, compartilhe builds e
                acumule almas pra subir no topo.
              </p>
            </div>
          </div>

          <div className="abas-categoria-ranking">
            <button className="btn-categoria-ranking" aria-pressed="true" type="button">Desafios</button>
            <button className="btn-categoria-ranking" type="button">Builds</button>
          </div>

          <div className="tabela-ranking">
            <ol className="tabela-ranking-grid">
              <li className="linha-tabela-ranking" data-usuario-id="123" data-pontos="150">
                <span className="posicao-usuario-ranking">1</span>
                <img src="/avatar.png" alt="" className="avatar-usuario-ranking" />
                <span className="nome-usuario-ranking">Gabriel Moreira</span>
                <span className="pontucao">150 pts</span>
              </li>

              <li className="linha-tabela-ranking" data-usuario-id="123" data-pontos="150">
                <span className="posicao-usuario-ranking">2</span>
                <img src="/avatar.png" alt="" className="avatar-usuario-ranking" />
                <span className="nome-usuario-ranking">Gabriel Moreira</span>
                <span className="pontucao">150 pts</span>
              </li>

              <li className="linha-tabela-ranking" data-usuario-id="123" data-pontos="150">
                <span className="posicao-usuario-ranking">3</span>
                <img src="/avatar.png" alt="" className="avatar-usuario-ranking" />
                <span className="nome-usuario-ranking">Gabriel Moreira</span>
                <span className="pontucao">150 pts</span>
              </li>

              <li className="linha-tabela-ranking" data-usuario-id="123" data-pontos="150">
                <span className="posicao-usuario-ranking">4</span>
                <img src="/avatar.png" alt="" className="avatar-usuario-ranking" />
                <span className="nome-usuario-ranking">Gabriel Moreira</span>
                <span className="pontucao">150 pts</span>
              </li>

              <li className="linha-tabela-ranking" data-usuario-id="123" data-pontos="150">
                <span className="posicao-usuario-ranking">5</span>
                <img src="/avatar.png" alt="" className="avatar-usuario-ranking" />
                <span className="nome-usuario-ranking">Gabriel Moreira</span>
                <span className="pontucao">150 pts</span>
              </li>

              <li className="linha-tabela-ranking" data-usuario-id="123" data-pontos="150">
                <span className="posicao-usuario-ranking">6</span>
                <img src="/avatar.png" alt="" className="avatar-usuario-ranking" />
                <span className="nome-usuario-ranking">Gabriel Moreira</span>
                <span className="pontucao">150 pts</span>
              </li>
            </ol>
          </div>
        </section>

        <section className="area-sobre-site" id="sobre">
          <div className="header-secao">
            <h2>Sobre o Site</h2>
          </div>
          <div className="info-do-site-grid">

            <div className="coluna-info">
              <h3>Respeito é Essencial!</h3>
              <p>
                Não será tolerado nenhum tipo de ataque pessoal, preconceituoso, ofensa, provocação da
                administração (ADM).
              </p>
            </div>

            <div className="coluna-info">
              <h3>Sem Spam ou divulgação</h3>
              <p>
                É proibido a divulgação de outros grupos, canais, produtos ou serviços sem autorização da
                administração (ADM).
              </p>
            </div>

            <div className="coluna-info">
              <h3>Links</h3>
              <p>
                É permitido compartilhar vídeos, dicas, builds, estratégias e conteúdos relacionados aos jogos
                Soulslike.
              </p>
            </div>

            <div className="coluna-info">
              <h3>Proibido conteúdo impróprio</h3>
              <p>
                É proibido enviar conteúdo <strong>+18</strong>, <strong>pirataria</strong>,
                <strong>links suspeitos</strong>, <strong>golpes ou imagens ofensivas</strong>.
              </p>
            </div>

            <div className="coluna-info">
              <h3>Cuidado com excessos</h3>
              <p>Evite spam, mensagens repetitivas, correntes e excesso de figurinhas.</p>
              <p>A ideia é manter uma conversa fluida e agradável para todos.</p>
            </div>

            <div className="coluna-info">
              <h3>Sem política ou religião</h3>
              <p>Para manter o ambiente saudável, não são permitidas discussões de cunho político ou religioso.</p>
            </div>

            <div className="coluna-info">
              <h3>Sugestões são bem-vindas</h3>
              <p>Tem alguma dúvida, sugestão ou ideias para melhorar o site?</p>
              <p>Fale com a administração. Toda sugestão será bem-vinda.</p>
            </div>

            <div className="coluna-info">
              <h3>Respeite a administração</h3>
              <p>As decisões dos administradores devem ser respeitadas.</p>
              <p>
                Em caso de problemas, <strong>conflitos</strong> ou <strong>denúncias</strong>, procure um
                administrador no privado.
              </p>
            </div>

            <div className="coluna-info">
              <h3>Façam amizades!</h3>
              <p>Sintam-se à vontade para conversar, conhecer outros membros e combinar partidas.</p>
            </div>

            <div className="coluna-info">
              <h3>Chamem a galera para jogar!</h3>
              <p>
                Seja para <strong>PvP</strong>, <strong>Coop</strong>, <strong>Builds</strong>,
                <strong>Conquistas</strong> ou simplesmente trocar ideias.
              </p>
            </div>

            <div className="coluna-info">
              <h3>Foco no tema</h3>
              <p>
                O site é voltado principalmente para jogos Soulslike, como: <strong>Dark Souls</strong>,
                <strong>Elden Ring</strong>, <strong>Bloodborne</strong>, <strong>Sekiro</strong>,
                <strong>Demon's Souls</strong>, <strong>Elden Ring Nightreign</strong>, e outros.
              </p>

              <p>
                Conversa fora do tema é permitida ocasionalmente, mas evite transformar o site em um assunto
                completamente diferente.
              </p>
            </div>

          </div>
        </section>
      </main>

      <footer className="rodape-site">
        <div className="rodape-conteudo">
          <div className="rodape-marca">
            <div>
              <strong>VICIADOS EM SOULS</strong>
              <span>Um lugar para todos aqueles que amam os jogos Soulslike.</span>
            </div>
          </div>

          <nav className="rodape-links" aria-label="Links do rodapé">
            <a href="#inicio">Início</a>
            <a href="#comunidade">Comunidade</a>
            <a href="#builds">Builds</a>
            <a href="#ranking">Ranking</a>
            <a href="#sobre">Sobre o site</a>
          </nav>

          <p className="rodape-frase">Um lugar como Majula...</p>
        </div>
        <div className="rodape-base">
          <span>© 2026 Viciados em Souls.</span>
          <span>Que a chama te guie.</span>
        </div>
      </footer>

      <div className="particulas-cinza"></div>
    </>
  );
}

function BibliotecaPosts() {
  const location = useLocation();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [offset, setOffset] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [carregados, setCarregados] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState(false);
  const [quantidadeInicial] = useState(() => Math.max(
    PAGE_SIZE,
    location.state?.restaurarBiblioteca?.quantidade ?? PAGE_SIZE
  ));
  const requestRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestRef.current;
    let consultaAtiva = true;

    async function carregarPosts() {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('criado_em', { ascending: false })
        .order('id', { ascending: true })
        .range(0, quantidadeInicial);

      if (!consultaAtiva || requestId !== requestRef.current) return;

      if (error) {
        console.error('Erro ao carregar biblioteca de posts:', error);
        setErro(true);
        setCarregados(true);
        return;
      }

      const resultados = data ?? [];
      const paginaInicial = resultados.slice(0, quantidadeInicial);
      const postsComMidias = await carregarMidiasRelacionadas(paginaInicial, 'midias_posts', 'post_id');
      if (!consultaAtiva || requestId !== requestRef.current) return;

      setPosts(postsComMidias);
      setOffset(paginaInicial.length);
      setTemMais(resultados.length > quantidadeInicial);
      setCarregados(true);
    }

    carregarPosts();
    return () => {
      consultaAtiva = false;
      requestRef.current += 1;
    };
  }, [quantidadeInicial]);

  useEffect(() => {
    const contexto = location.state?.restaurarBiblioteca;
    if (!contexto || !carregados) return undefined;

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: contexto.scrollY, behavior: 'auto' });
      navigate('/posts', { replace: true, state: null });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [carregados, location.state, navigate]);

  async function carregarMaisPosts() {
    if (!temMais || carregandoMais) return;

    const requestId = requestRef.current;
    const offsetAtual = offset;
    setCarregandoMais(true);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('criado_em', { ascending: false })
        .order('id', { ascending: true })
        .range(offsetAtual, offsetAtual + PAGE_SIZE);

      if (error) {
        console.error('Erro ao carregar mais posts da biblioteca:', error);
        return;
      }

      const resultados = data ?? [];
      const proximaPagina = resultados.slice(0, PAGE_SIZE);
      const postsComMidias = await carregarMidiasRelacionadas(proximaPagina, 'midias_posts', 'post_id');
      if (requestId !== requestRef.current) return;

      setPosts((postsAtuais) => [...postsAtuais, ...postsComMidias]);
      setOffset(offsetAtual + proximaPagina.length);
      setTemMais(resultados.length > PAGE_SIZE);
    } finally {
      if (requestId === requestRef.current) setCarregandoMais(false);
    }
  }

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

      <main className="biblioteca-posts-page">
        <div className="biblioteca-posts-heading">
          <h1>Biblioteca de posts</h1>
        </div>

        {(!carregados || carregandoMais) && (
          <span className="skeleton-status" role="status">Carregando posts</span>
        )}
        <div className="biblioteca-posts-grid" aria-busy={!carregados || carregandoMais}>
          {!carregados
            ? Array.from({ length: 6 }, (_, indice) => (
              <SkeletonCard key={`biblioteca-skeleton-${indice}`} variant="post" />
            ))
            : posts.map((post) => (
              <Suspense key={post.id} fallback={<SkeletonCard variant="post" />}>
                <CardPost
                  post={post}
                  aoAtualizar={(atualizado) => setPosts((atuais) => atuais.map((item) => item.id === atualizado.id ? { ...item, ...atualizado } : item))}
                  aoExcluir={(id) => setPosts((atuais) => atuais.filter((item) => item.id !== id))}
                  aoAbrirPost={() => navigate(`/post/${post.id}`, {
                    state: {
                      retornoBiblioteca: {
                        scrollY: window.scrollY,
                        quantidade: posts.length,
                      },
                    },
                  })}
                />
              </Suspense>
            ))}
          {carregandoMais && Array.from({ length: 3 }, (_, indice) => (
            <SkeletonCard key={`biblioteca-mais-skeleton-${indice}`} variant="post" />
          ))}
          {carregados && !erro && posts.length === 0 && (
            <p className="biblioteca-posts-vazia">Ainda não há posts publicados pela comunidade.</p>
          )}
          {erro && <p className="biblioteca-posts-vazia">Não foi possível carregar os posts no momento.</p>}
        </div>

        {temMais && (
          <button
            className="btn-criar-post biblioteca-carregar-mais"
            type="button"
            disabled={carregandoMais}
            onClick={carregarMaisPosts}
          >
            {carregandoMais ? 'Carregando...' : 'Carregar mais posts'}
          </button>
        )}
      </main>
    </>
  );
}

function BibliotecaBuilds() {
  const location = useLocation();
  const navigate = useNavigate();
  const [builds, setBuilds] = useState([]);
  const [offset, setOffset] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [carregados, setCarregados] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState(false);
  const [quantidadeInicial] = useState(() => Math.max(
    PAGE_SIZE,
    location.state?.restaurarBibliotecaBuilds?.quantidade ?? PAGE_SIZE
  ));
  const requestRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestRef.current;
    let consultaAtiva = true;

    async function carregarBuilds() {
      const { data, error } = await supabase
        .from('builds')
        .select('*')
        .order('criado_em', { ascending: false })
        .order('id', { ascending: true })
        .range(0, quantidadeInicial);

      if (!consultaAtiva || requestId !== requestRef.current) return;

      if (error) {
        console.error('Erro ao carregar biblioteca de builds:', error);
        setErro(true);
        setCarregados(true);
        return;
      }

      const resultados = data ?? [];
      const paginaInicial = resultados.slice(0, quantidadeInicial);
      const buildsComMidias = await carregarMidiasRelacionadas(paginaInicial, 'midias_builds', 'build_id');
      if (!consultaAtiva || requestId !== requestRef.current) return;

      setBuilds(buildsComMidias);
      setOffset(paginaInicial.length);
      setTemMais(resultados.length > quantidadeInicial);
      setCarregados(true);
    }

    carregarBuilds();
    return () => {
      consultaAtiva = false;
      requestRef.current += 1;
    };
  }, [quantidadeInicial]);

  useEffect(() => {
    const contexto = location.state?.restaurarBibliotecaBuilds;
    if (!contexto || !carregados) return undefined;

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: contexto.scrollY, behavior: 'auto' });
      navigate('/builds', { replace: true, state: null });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [carregados, location.state, navigate]);

  async function carregarMaisBuilds() {
    if (!temMais || carregandoMais) return;

    const requestId = requestRef.current;
    const offsetAtual = offset;
    setCarregandoMais(true);

    try {
      const { data, error } = await supabase
        .from('builds')
        .select('*')
        .order('criado_em', { ascending: false })
        .order('id', { ascending: true })
        .range(offsetAtual, offsetAtual + PAGE_SIZE);

      if (error) {
        console.error('Erro ao carregar mais builds da biblioteca:', error);
        return;
      }

      const resultados = data ?? [];
      const proximaPagina = resultados.slice(0, PAGE_SIZE);
      const buildsComMidias = await carregarMidiasRelacionadas(proximaPagina, 'midias_builds', 'build_id');
      if (requestId !== requestRef.current) return;

      setBuilds((buildsAtuais) => [...buildsAtuais, ...buildsComMidias]);
      setOffset(offsetAtual + proximaPagina.length);
      setTemMais(resultados.length > PAGE_SIZE);
    } finally {
      if (requestId === requestRef.current) setCarregandoMais(false);
    }
  }

  return (
    <>
      <header className="area-header">
        <div className="barra-menu">
          <div className="lado-esquerdo">
            <div className="area-logo-site"><p>Viciados Em Souls</p></div>
          </div>
          <div className="lado-direito">
            <button className="btn-filtro" type="button" onClick={() => navigate('/#builds')}>
              Voltar à comunidade
            </button>
          </div>
        </div>
      </header>

      <main className="biblioteca-builds-page">
        <div className="biblioteca-posts-heading">
          <span className="banner-kicker">Porão viciados em Soulslike</span>
          <h1>Biblioteca de builds</h1>
          <p>Builds compartilhadas pela comunidade.</p>
        </div>

        {(!carregados || carregandoMais) && (
          <span className="skeleton-status" role="status">Carregando builds</span>
        )}
        <div className="biblioteca-builds-grid" aria-busy={!carregados || carregandoMais}>
          {!carregados
            ? Array.from({ length: 6 }, (_, indice) => (
              <SkeletonCard key={`biblioteca-build-skeleton-${indice}`} variant="build" />
            ))
            : builds.map((build) => (
              <Suspense key={build.id} fallback={<SkeletonCard variant="build" />}>
                <CardBuild
                  build={build}
                  aoAtualizar={(atualizado) => setBuilds((atuais) => atuais.map((item) => item.id === atualizado.id ? { ...item, ...atualizado } : item))}
                  aoExcluir={(id) => setBuilds((atuais) => atuais.filter((item) => item.id !== id))}
                  aoAbrirBuild={() => navigate(`/build/${build.id}`, {
                    state: {
                      retornoBibliotecaBuilds: {
                        scrollY: window.scrollY,
                        quantidade: builds.length,
                      },
                    },
                  })}
                />
              </Suspense>
            ))}
          {carregandoMais && Array.from({ length: 3 }, (_, indice) => (
            <SkeletonCard key={`biblioteca-mais-build-skeleton-${indice}`} variant="build" />
          ))}
          {carregados && !erro && builds.length === 0 && (
            <p className="biblioteca-posts-vazia">Ainda não há builds publicadas pela comunidade.</p>
          )}
          {erro && <p className="biblioteca-posts-vazia">Não foi possível carregar as builds agora.</p>}
        </div>

        {temMais && (
          <button
            className="btn-criar-post biblioteca-carregar-mais"
            type="button"
            disabled={carregandoMais}
            onClick={carregarMaisBuilds}
          >
            {carregandoMais ? 'Carregando...' : 'Carregar mais builds'}
          </button>
        )}
      </main>
    </>
  );
}

function PaginaDetalhesPost() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const postContado = useRef(null);

  useEffect(() => {
    if (postContado.current === id) {
      return;
    }

    postContado.current = id;

    async function carregarPost() {
      const { error: erroContagem } = await supabase.rpc('incrementar_visualizacoes_post', {
        p_post_id: id,
      });

      if (erroContagem) {
        console.error('Erro ao contar visualização:', erroContagem);
      }

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao carregar detalhes do post:', error);
        return;
      }

      const [postComMidias] = await carregarMidiasRelacionadas(
        [data],
        'midias_posts',
        'post_id'
      );
      setPost(postComMidias);
    }

    carregarPost();
  }, [id]);

  if (!post) {
    return <p>Carregando post...</p>;
  }

  return (
    <Suspense fallback={<main className="componente-carregando" role="status">Preparando post...</main>}>
      <DetalhesPost
        post={post}
        fecharDetalhesPost={() => {
          if (location.state?.retornoBiblioteca) {
            navigate('/posts', { state: { restaurarBiblioteca: location.state.retornoBiblioteca } });
            return;
          }

          if (location.state?.contextoRetorno) {
            navigate('/', { state: { restaurarHome: location.state.contextoRetorno } });
            return;
          }

          navigate('/');
        }}
      />
    </Suspense>
  );
}

function PaginaDetalhesBuild() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [build, setBuild] = useState(null);
  const buildContada = useRef(null);

  useEffect(() => {
    if (buildContada.current === id) return;
    buildContada.current = id;

    async function carregarBuild() {
      const { error: erroContagem } = await supabase.rpc('incrementar_visualizacoes_build', {
        p_build_id: id,
      });

      if (erroContagem) {
        console.error('Erro ao contar visualização da build:', erroContagem);
      }

      const { data, error } = await supabase
        .from('builds')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao carregar detalhes da build:', error);
        return;
      }

      const [buildComMidias] = await carregarMidiasRelacionadas(
        [data],
        'midias_builds',
        'build_id'
      );
      setBuild(buildComMidias);
    }

    carregarBuild();
  }, [id]);

  if (!build) {
    return <p>Carregando build...</p>;
  }

  return (
    <Suspense fallback={<main className="componente-carregando" role="status">Preparando build...</main>}>
      <DetalhesBuild
        build={build}
        fecharDetalhesBuild={() => {
          if (location.state?.retornoBibliotecaBuilds) {
            navigate('/builds', { state: { restaurarBibliotecaBuilds: location.state.retornoBibliotecaBuilds } });
            return;
          }

          if (location.state?.contextoRetorno) {
            navigate('/', { state: { restaurarHome: location.state.contextoRetorno } });
            return;
          }

          navigate('/#builds');
        }}
      />
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={(
          <Suspense fallback={<main className="componente-carregando" role="status">Preparando acesso...</main>}>
            <PaginaLogin />
          </Suspense>
        )} />
        <Route path="/configurar-perfil" element={(
          <Suspense fallback={<main className="componente-carregando" role="status">Preparando perfil...</main>}>
            <PaginaConfigurarPerfil />
          </Suspense>
        )} />
        <Route path="/perfil" element={(
          <Suspense fallback={<main className="componente-carregando" role="status">Preparando perfil...</main>}>
            <PaginaPerfil />
          </Suspense>
        )} />
        <Route path="/perfil/:id" element={(
          <Suspense fallback={<main className="componente-carregando" role="status">Preparando perfil...</main>}>
            <PaginaPerfilPublico />
          </Suspense>
        )} />
        <Route path="/chat" element={(
          <Suspense fallback={<main className="componente-carregando" role="status">Preparando chat...</main>}>
            <ChatGlobal />
          </Suspense>
        )} />
        <Route path="/posts" element={<BibliotecaPosts />} />
        <Route path="/builds" element={<BibliotecaBuilds />} />
        <Route path="/post/:id" element={<PaginaDetalhesPost />} />
        <Route path="/build/:id" element={<PaginaDetalhesBuild />} />
      </Routes>
    </AuthProvider>
  );
}


export default App;