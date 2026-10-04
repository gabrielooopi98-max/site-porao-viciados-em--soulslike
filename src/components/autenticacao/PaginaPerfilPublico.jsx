import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/useAuth';
import { criarNotificacao } from '../../services/notificacoes';
import VisualizadorAvatar from '../VisualizadorAvatar';
import CardPerfil from './CardPerfil';
import { BANNERS_FINAIS } from '../../services/bannersFinais';
import useBannerFinalPerfil from './useBannerFinalPerfil';
import usePresencaPerfil from './usePresencaPerfil';
import PainelRelacoesPerfil from './PainelRelacoesPerfil';
import './Perfil.css';

function PaginaPerfilPublico() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const banner = useBannerFinalPerfil(id);
  const online = usePresencaPerfil(id);
  const [perfil, setPerfil] = useState(null);
  const [seguindo, setSeguindo] = useState(false);
  const [amizade, setAmizade] = useState(null);
  const [amizadeCarregadaPara, setAmizadeCarregadaPara] = useState('');
  const [erroAmizade, setErroAmizade] = useState('');
  const [salvandoAmizade, setSalvandoAmizade] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [painelRelacoes, setPainelRelacoes] = useState(null);
  const fecharPainelRelacoes = useCallback(() => setPainelRelacoes(null), []);
  const alterarContagemRelacao = useCallback((relacao, delta) => {
    const chave = relacao === 'amigos' ? 'amigos' : relacao;
    setPerfil((atual) => atual
      ? { ...atual, [chave]: Math.max(0, atual[chave] + delta) }
      : atual);
  }, []);

  useEffect(() => {
    let ativo = true;

    Promise.all([
      supabase.from('posts')
        .select('autor_nome, autor_avatar_url, autor_avatar_zoom, autor_avatar_pos_x, autor_avatar_pos_y, criado_em')
        .eq('autor_id', id)
        .not('autor_avatar_url', 'is', null)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('builds')
        .select('autor_nome, autor_avatar_url, autor_avatar_zoom, autor_avatar_pos_x, autor_avatar_pos_y, criado_em')
        .eq('autor_id', id)
        .not('autor_avatar_url', 'is', null)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle(),
      user
        ? supabase.from('mensagens_chat')
          .select('autor_nome, autor_avatar_url, criado_em')
          .eq('autor_id', id)
          .not('autor_avatar_url', 'is', null)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('autor_id', id),
      supabase.from('builds').select('id', { count: 'exact', head: true }).eq('autor_id', id),
      supabase.from('seguidores').select('id', { count: 'exact', head: true }).eq('seguido_id', id),
      supabase.from('seguidores').select('id', { count: 'exact', head: true }).eq('seguidor_id', id),
      supabase.rpc('perfil_contar_amigos', { p_usuario: id }),
      user && user.id !== id
        ? supabase.from('seguidores').select('id').eq('seguidor_id', user.id).eq('seguido_id', id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]).then(([perfilPost, perfilBuild, perfilChat, resultadoPosts, resultadoBuilds, resultadoSeguidores, resultadoSeguindoTotal, resultadoAmigos, resultadoSeguindo]) => {
      if (!ativo) return;

      const perfilAtual = user?.id === id ? {
        autor_nome: user.user_metadata?.display_name,
        autor_avatar_url: user.user_metadata?.avatar_url,
        autor_avatar_zoom: user.user_metadata?.avatar_zoom,
        autor_avatar_pos_x: user.user_metadata?.avatar_pos_x,
        autor_avatar_pos_y: user.user_metadata?.avatar_pos_y,
        criado_em: new Date().toISOString(),
      } : null;
      const fontes = [perfilAtual, perfilPost.data, perfilBuild.data, perfilChat.data]
        .filter((fonte) => fonte?.autor_avatar_url)
        .sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0));
      const fonte = fontes[0] || perfilAtual || perfilPost.data || perfilBuild.data || perfilChat.data;

      [perfilPost, perfilBuild, perfilChat, resultadoPosts, resultadoBuilds, resultadoSeguidores, resultadoSeguindoTotal, resultadoAmigos, resultadoSeguindo]
        .forEach((resultado) => {
          if (resultado?.error) console.error('Erro ao carregar informações do perfil público:', resultado.error);
        });

      setPerfil({
        nome: fonte?.autor_nome || user?.id === id && user.user_metadata?.display_name || 'Viciado em Souls',
        avatar: fonte?.autor_avatar_url || '',
        avatarZoom: fonte?.autor_avatar_zoom ?? 1,
        avatarPosX: fonte?.autor_avatar_pos_x ?? 50,
        avatarPosY: fonte?.autor_avatar_pos_y ?? 50,
        posts: resultadoPosts.count ?? 0,
        builds: resultadoBuilds.count ?? 0,
        seguidores: resultadoSeguidores.count ?? 0,
        seguindo: resultadoSeguindoTotal.count ?? 0,
        amigos: resultadoAmigos.data,
      });
      setSeguindo(Boolean(resultadoSeguindo.data));
      setCarregando(false);
    });

    return () => { ativo = false; };
  }, [id, user]);

  useEffect(() => {
    if (!user || user.id === id) return undefined;
    let ativo = true;
    supabase
      .from('amizades')
      .select('id, solicitante_id, destinatario_id, solicitante_nome, solicitante_avatar_url, destinatario_nome, destinatario_avatar_url, status')
      .or(`and(solicitante_id.eq.${user.id},destinatario_id.eq.${id}),and(solicitante_id.eq.${id},destinatario_id.eq.${user.id})`)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) {
          console.error('Erro ao verificar amizade:', error);
          setAmizade(null);
          setErroAmizade('Não foi possível verificar o status de amizade.');
        } else {
          setAmizade(data);
        }
        setAmizadeCarregadaPara(`${user.id}:${id}`);
      })
      .catch((error) => {
        if (!ativo) return;
        console.error('Erro ao verificar amizade:', error);
        setErroAmizade('Não foi possível verificar o status de amizade.');
        setAmizadeCarregadaPara(`${user.id}:${id}`);
      });

    return () => { ativo = false; };
  }, [id, user]);

  const amizadeCarregada = Boolean(user && user.id !== id && amizadeCarregadaPara === `${user.id}:${id}`);

  async function atualizarAmizade(acao) {
    if (!user) {
      navigate('/login');
      return;
    }
    if (salvandoAmizade || !amizadeCarregada) return;

    setSalvandoAmizade(true);
    setErroAmizade('');
    try {
      if (acao === 'solicitar') {
        const solicitacao = await supabase.from('amizades').insert({
          solicitante_id: user.id,
          destinatario_id: id,
          solicitante_nome: user.user_metadata?.display_name || 'Viciado em Souls',
          solicitante_avatar_url: user.user_metadata?.avatar_url || null,
          destinatario_nome: perfil.nome,
          destinatario_avatar_url: perfil.avatar || null,
        }).select('id, solicitante_id, destinatario_id, solicitante_nome, solicitante_avatar_url, destinatario_nome, destinatario_avatar_url, status').single();
        if (solicitacao.error) throw solicitacao.error;

        const aviso = await criarNotificacao({
          destinatario_id: id,
          ator_id: user.id,
          ator_nome: user.user_metadata?.display_name || 'Viciado em Souls',
          tipo: 'pedido_amizade',
          amizade_id: solicitacao.data.id,
        });
        if (aviso.error) {
          const { error: erroReversao } = await supabase.from('amizades').delete().eq('id', solicitacao.data.id).eq('solicitante_id', user.id);
          if (erroReversao) console.error('Não foi possível desfazer o pedido sem notificação:', erroReversao);
          throw aviso.error;
        }
        setAmizade(solicitacao.data);
      } else if (acao === 'aceitar') {
        const resultado = await supabase.from('amizades').update({ status: 'aceita' }).eq('id', amizade.id).eq('destinatario_id', user.id).eq('status', 'pendente').select().single();
        if (resultado.error) throw resultado.error;
        setAmizade(resultado.data);
      } else {
        const resultado = await supabase.from('amizades').delete().eq('id', amizade.id).eq('status', amizade.status);
        if (resultado.error) throw resultado.error;
        setAmizade(null);
      }
    } catch (error) {
      console.error('Erro ao atualizar amizade:', error);
      setErroAmizade(`Não foi possível atualizar a amizade: ${error.message || 'tente novamente.'}`);
    } finally {
      setSalvandoAmizade(false);
    }
  }

  async function alternarSeguir() {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.id === id) {
      navigate('/configurar-perfil');
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
      <main className="perfil-page perfil-organizado">
        <CardPerfil banner={banner} tituloId="titulo-perfil-publico" cabecalho={
          <div className="perfil-banner-cabecalho">
            <div className="perfil-cabecalho">
              {perfil.avatar ? <VisualizadorAvatar className="perfil-avatar-grande" src={perfil.avatar} alt={`Foto de ${perfil.nome}`} style={{ objectPosition: `${perfil.avatarPosX}% ${perfil.avatarPosY}%`, transform: `scale(${perfil.avatarZoom})` }} /> : <div className="perfil-avatar-grande perfil-avatar-vazio" aria-hidden="true">?</div>}
              <div className="perfil-identidade-info">
                <span className="perfil-card-etiqueta">{user?.id === id ? 'Meu perfil' : 'Perfil da comunidade'}</span>
                <h1 id="titulo-perfil-publico">{perfil.nome}</h1>
                {BANNERS_FINAIS[banner.dados?.final_id] && <p className="perfil-card-titulo-final">{BANNERS_FINAIS[banner.dados.final_id].titulo}</p>}
                <span className={`perfil-status${online ? ' online' : online === false ? ' offline' : ''}`} role="status">
                  <i aria-hidden="true" />{online === null ? 'Verificando status' : online ? 'Online' : 'Offline'}
                </span>
                <div className="perfil-relacoes" aria-label="Estatísticas sociais">
                  {perfil.amigos !== null && <button type="button" onClick={() => setPainelRelacoes('amigos')}><strong>{perfil.amigos}</strong><span>Amigos</span></button>}
                  <button type="button" onClick={() => setPainelRelacoes('seguindo')}><strong>{perfil.seguindo}</strong><span>Seguindo</span></button>
                  <button type="button" onClick={() => setPainelRelacoes('seguidores')}><strong>{perfil.seguidores}</strong><span>Seguidores</span></button>
                </div>
              </div>
            </div>
            <div className="perfil-acoes perfil-acoes-banner">
              <button className={`btn-criar-post${user?.id === id ? ' perfil-editar' : ''}`} type="button" onClick={alternarSeguir}>
                {user?.id === id && <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6ZM14 5l5 5" /></svg>}
                {user?.id === id ? 'Personalizar perfil' : seguindo ? 'Seguindo' : 'Seguir'}
              </button>
              {user?.id !== id && (
                !user ? (
                  <button className="btn-filtro" type="button" onClick={() => navigate('/login')}>Adicionar amigo</button>
                ) : !amizadeCarregada ? (
                  <button className="btn-filtro" type="button" disabled>Verificando amizade...</button>
                ) : amizade?.status === 'aceita' ? (
                  <button className="btn-criar-post" type="button" onClick={() => navigate(`/mensagens/${id}`)}>Conversar</button>
                ) : amizade?.solicitante_id === user.id ? (
                  <button className="btn-filtro" type="button" disabled={salvandoAmizade} onClick={() => atualizarAmizade('remover')}>Pedido enviado · Cancelar</button>
                ) : amizade ? (
                  <button className="btn-criar-post" type="button" disabled={salvandoAmizade} onClick={() => atualizarAmizade('aceitar')}>Aceitar amizade</button>
                ) : (
                  <button className="btn-filtro" type="button" disabled={salvandoAmizade} onClick={() => atualizarAmizade('solicitar')}>Adicionar amigo</button>
                )
              )}
            </div>
          </div>
        }>
          <div className="perfil-estatisticas">
            <div>
              <span className="perfil-estatistica-icone" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M6 3.75h8l4 4V20.25H6z" /><path d="M14 3.75v4h4M9 12h6M9 15.5h6" /></svg>
              </span>
              <span className="perfil-estatistica-dados"><strong>{perfil.posts}</strong><span>Posts</span></span>
            </div>
            <div>
              <span className="perfil-estatistica-icone" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="m12 3 8.25 4.5v9L12 21l-8.25-4.5v-9z" /><path d="m3.75 7.5 8.25 4.5 8.25-4.5M12 12v9" /></svg>
              </span>
              <span className="perfil-estatistica-dados"><strong>{perfil.builds}</strong><span>Builds</span></span>
            </div>
          </div>
          {erroAmizade && <p className="perfil-erro-amizade" role="alert">{erroAmizade}</p>}
        </CardPerfil>
        {painelRelacoes && <PainelRelacoesPerfil
          usuarioId={id}
          usuarioNome={perfil.nome}
          visualizadorId={user?.id}
          abaInicial={painelRelacoes}
          contagens={perfil}
          aoFechar={fecharPainelRelacoes}
          aoAlterarContagem={alterarContagemRelacao}
        />}
      </main>
    </>
  );
}

export default PaginaPerfilPublico;