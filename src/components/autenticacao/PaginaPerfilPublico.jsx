import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/useAuth';
import VisualizadorAvatar from '../VisualizadorAvatar';

function PaginaPerfilPublico() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [seguindo, setSeguindo] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    Promise.all([
      supabase.from('posts').select('autor_nome, autor_avatar_url, autor_avatar_zoom, autor_avatar_pos_x, autor_avatar_pos_y', { head: false }).eq('autor_id', id).limit(1).maybeSingle(),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('autor_id', id),
      supabase.from('builds').select('id', { count: 'exact', head: true }).eq('autor_id', id),
      supabase.from('seguidores').select('id', { count: 'exact', head: true }).eq('seguido_id', id),
      user && user.id !== id
        ? supabase.from('seguidores').select('id').eq('seguidor_id', user.id).eq('seguido_id', id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]).then(([perfilPost, resultadoPosts, resultadoBuilds, resultadoSeguidores, resultadoSeguindo]) => {
      if (!ativo) return;

      const fonte = perfilPost.data;
      setPerfil({
        nome: fonte?.autor_nome || 'Viciado em Souls',
        avatar: fonte?.autor_avatar_url || '',
        avatarZoom: fonte?.autor_avatar_zoom ?? 1,
        avatarPosX: fonte?.autor_avatar_pos_x ?? 50,
        avatarPosY: fonte?.autor_avatar_pos_y ?? 50,
        posts: resultadoPosts.count ?? 0,
        builds: resultadoBuilds.count ?? 0,
        seguidores: resultadoSeguidores.count ?? 0,
      });
      setSeguindo(Boolean(resultadoSeguindo.data));
      setCarregando(false);
    });

    return () => { ativo = false; };
  }, [id, user]);

  async function alternarSeguir() {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.id === id) {
      navigate('/perfil');
      return;
    }

    const resultado = seguindo
      ? await supabase.from('seguidores').delete().eq('seguidor_id', user.id).eq('seguido_id', id)
      : await supabase.from('seguidores').insert({ seguidor_id: user.id, seguido_id: id });

    if (!resultado.error) {
      setSeguindo(!seguindo);
      setPerfil((atual) => ({ ...atual, seguidores: Math.max(0, atual.seguidores + (seguindo ? -1 : 1)) }));
    }
  }

  if (carregando) return <main className="componente-carregando" role="status">Preparando perfil do usuário...</main>;
  if (!perfil) return <main className="componente-carregando" role="status">Perfil do usuário não encontrado.</main>;

  return (
    <>
      <header className="area-header">
        <div className="barra-menu">
          <div className="lado-esquerdo"><div className="area-logo-site"><p>Viciados Em Souls</p></div></div>
          <div className="lado-direito">
            <button className="btn-filtro" type="button" onClick={() => navigate('/')}>Voltar à comunidade</button>
          </div>
        </div>
      </header>
      <main className="perfil-page">
        <section className="perfil-painel" aria-labelledby="titulo-perfil-publico">
          <div className="perfil-cabecalho">
            {perfil.avatar ? <VisualizadorAvatar className="perfil-avatar-grande" src={perfil.avatar} alt={`Foto de ${perfil.nome}`} style={{ objectPosition: `${perfil.avatarPosX}% ${perfil.avatarPosY}%`, transform: `scale(${perfil.avatarZoom})` }} /> : <div className="perfil-avatar-grande perfil-avatar-vazio" aria-hidden="true">?</div>}
            <div>
              <span className="banner-kicker">Perfil da comunidade</span>
              <h1 id="titulo-perfil-publico">{perfil.nome}</h1>
              <p>Perfil público</p>
            </div>
          </div>
          <div className="perfil-estatisticas">
            <div><strong>{perfil.posts}</strong><span>Posts</span></div>
            <div><strong>{perfil.builds}</strong><span>Builds</span></div>
            <div><strong>{perfil.seguidores}</strong><span>Seguidores</span></div>
          </div>
          <div className="perfil-acoes">
            <button className="btn-criar-post" type="button" onClick={alternarSeguir}>
              {user?.id === id ? 'Editar perfil' : seguindo ? 'Seguindo' : 'Seguir'}
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

export default PaginaPerfilPublico;