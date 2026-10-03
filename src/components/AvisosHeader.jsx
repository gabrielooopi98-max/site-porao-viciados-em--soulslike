import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { buscarNotificacoes, marcarNotificacoesLidas } from '../services/notificacoes';
import { supabase } from '../services/supabase';
import AvisosDesafios from './ranking/AvisosDesafios';
import { useAvisosRanking } from './ranking/useAvisosRanking';

function formatarData(data) {
  if (!data) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(data));
}

function obterMensagem(notificacao) {
  const ator = notificacao.ator_nome || 'Alguém';
  const titulo = notificacao.titulo_conteudo ? ` "${notificacao.titulo_conteudo}"` : '';

  if (notificacao.tipo === 'pedido_amizade') return `${ator} quer adicionar você como amigo.`;
  if (notificacao.tipo === 'seguidor') return `${ator} começou a seguir você.`;
  if (notificacao.tipo === 'curtida_post') return `${ator} curtiu seu post${titulo}.`;
  if (notificacao.tipo === 'curtida_build') return `${ator} curtiu sua build${titulo}.`;
  if (notificacao.tipo === 'comentario_build') return `${ator} comentou na sua build${titulo}.`;
  return `${ator} comentou no seu post${titulo}.`;
}

function AvisosHeader() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [secaoSelecionada, setSecaoSelecionada] = useState('avisos');
  const [notificacoes, setNotificacoes] = useState([]);
  const [amizadesRespondidas, setAmizadesRespondidas] = useState({});
  const [processandoAmizade, setProcessandoAmizade] = useState(null);
  const [avisoExcluindo, setAvisoExcluindo] = useState(null);
  const [limpandoAvisos, setLimpandoAvisos] = useState(false);
  const [erroAmizade, setErroAmizade] = useState('');
  const desafiosRanking = useAvisosRanking(user?.id);

  useEffect(() => {
    if (!user) return undefined;

    let ativo = true;
    const carregarAvisos = async () => {
      const { data, error } = await buscarNotificacoes(user.id);
      if (!ativo) return;
      if (error) {
        console.error('Erro ao carregar avisos:', error);
        return;
      }
      const avisos = data ?? [];
      const pedidos = avisos.filter((notificacao) => notificacao.tipo === 'pedido_amizade' && notificacao.amizade_id);
      let statusPorPedido = {};
      let carregouStatusPedidos = true;
      if (pedidos.length) {
        const { data: amizades, error: erroAmizades } = await supabase
          .from('amizades')
          .select('id, status')
          .in('id', pedidos.map((pedido) => pedido.amizade_id));
        if (erroAmizades) {
          carregouStatusPedidos = false;
          console.error('Erro ao carregar status dos pedidos de amizade:', erroAmizades);
        } else {
          statusPorPedido = Object.fromEntries((amizades ?? []).map((amizade) => [amizade.id, amizade.status]));
        }
      }
      if (!ativo) return;
      setNotificacoes(avisos.map((notificacao) => (
        notificacao.tipo === 'pedido_amizade'
          ? { ...notificacao, amizade_status: notificacao.amizade_id ? statusPorPedido[notificacao.amizade_id] || (carregouStatusPedidos ? 'encerrada' : 'carregando') : 'encerrada' }
          : notificacao
      )));
    };
    carregarAvisos().catch((error) => console.error('Erro ao carregar avisos:', error));
    const canal = supabase
      .channel(`avisos-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificacoes',
        filter: `destinatario_id=eq.${user.id}`,
      }, () => carregarAvisos().catch((error) => console.error('Erro ao atualizar avisos:', error)))
      .subscribe();

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, [user]);

  if (!user) return null;

  const naoLidas = notificacoes.filter((notificacao) => !notificacao.lida).length;
  const desafiosNaoLidos = Number(desafiosRanking.dados?.nao_lidos || 0);
  const totalNaoLidas = naoLidas + desafiosNaoLidos;

  async function alternarAvisos() {
    const novoEstado = !aberto;
    setAberto(novoEstado);
    if (novoEstado) setSecaoSelecionada('avisos');
    if (novoEstado) await desafiosRanking.atualizar();

    if (novoEstado && naoLidas) {
      const { error } = await marcarNotificacoesLidas(user.id);
      if (error) {
        console.error('Erro ao marcar avisos como lidos:', error);
        setErroAmizade('Não foi possível atualizar o estado dos avisos.');
      } else {
        setNotificacoes((atuais) => atuais.map((notificacao) => ({ ...notificacao, lida: true })));
      }
    }
  }

  function abrirNotificacao(notificacao) {
    setAberto(false);
    if (notificacao.post_id) navigate(`/post/${notificacao.post_id}`);
    if (notificacao.build_id) navigate(`/build/${notificacao.build_id}`);
    if (notificacao.tipo === 'pedido_amizade' && notificacao.ator_id) navigate(`/perfil/${notificacao.ator_id}`);
  }

  async function responderPedido(notificacao, aceitar) {
    if (!notificacao.amizade_id || processandoAmizade) return;
    setProcessandoAmizade(notificacao.amizade_id);
    setErroAmizade('');
    try {
      const resultado = aceitar
        ? await supabase.from('amizades')
          .update({ status: 'aceita' })
          .eq('id', notificacao.amizade_id)
          .eq('destinatario_id', user.id)
          .eq('status', 'pendente')
          .select('id')
          .maybeSingle()
        : await supabase.from('amizades')
          .delete()
          .eq('id', notificacao.amizade_id)
          .eq('destinatario_id', user.id)
          .eq('status', 'pendente')
          .select('id')
          .maybeSingle();

      if (resultado.error || !resultado.data) {
        console.error('Erro ao responder pedido de amizade:', resultado.error);
        setErroAmizade('Não foi possível responder ao pedido. Atualize os avisos e tente novamente.');
      } else {
        setAmizadesRespondidas((atuais) => ({ ...atuais, [notificacao.amizade_id]: aceitar ? 'aceito' : 'recusado' }));
        if (aceitar) navigate(`/mensagens/${notificacao.ator_id}`);
      }
    } catch (error) {
      console.error('Erro ao responder pedido de amizade:', error);
      setErroAmizade('Não foi possível responder ao pedido. Confira sua conexão e tente novamente.');
    } finally {
      setProcessandoAmizade(null);
    }
  }

  async function excluirAviso(notificacao) {
    if (avisoExcluindo || limpandoAvisos) return;
    setAvisoExcluindo(notificacao.id);
    setErroAmizade('');
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('id', notificacao.id)
        .eq('destinatario_id', user.id)
        .select('id')
        .maybeSingle();

      if (error || !data) {
        if (error) console.error('Erro ao excluir aviso:', error);
        setErroAmizade('Não foi possível excluir este aviso. Tente novamente.');
        return;
      }
      setNotificacoes((atuais) => atuais.filter((item) => item.id !== notificacao.id));
    } catch (error) {
      console.error('Erro ao excluir aviso:', error);
      setErroAmizade('Não foi possível excluir este aviso. Confira sua conexão e tente novamente.');
    } finally {
      setAvisoExcluindo(null);
    }
  }

  async function limparAvisos() {
    if (!notificacoes.length || avisoExcluindo || limpandoAvisos) return;
    if (!window.confirm('Tem certeza que deseja apagar todos os avisos?')) return;

    setLimpandoAvisos(true);
    setErroAmizade('');
    try {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('destinatario_id', user.id);

      if (error) {
        console.error('Erro ao limpar avisos:', error);
        setErroAmizade('Não foi possível limpar os avisos. Tente novamente.');
        return;
      }
      setNotificacoes([]);
      setAmizadesRespondidas({});
    } catch (error) {
      console.error('Erro ao limpar avisos:', error);
      setErroAmizade('Não foi possível limpar os avisos. Confira sua conexão e tente novamente.');
    } finally {
      setLimpandoAvisos(false);
    }
  }

  return (
    <div className="avisos-header">
      <button
        className="btn-filtro btn-avisos-header"
        type="button"
        aria-label="Abrir avisos"
        aria-expanded={aberto}
        title="Avisos"
        onClick={alternarAvisos}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
        </svg>
        {totalNaoLidas > 0 && <strong>{totalNaoLidas > 9 ? '9+' : totalNaoLidas}</strong>}
      </button>

      {aberto && (
        <div className="avisos-menu" role="dialog" aria-label="Avisos da comunidade">
          <div className="avisos-menu-abas" role="tablist" aria-label="Painel da comunidade">
            <button
              id="aba-avisos"
              className={`avisos-menu-aba ${secaoSelecionada === 'avisos' ? 'ativa' : ''}`}
              type="button"
              role="tab"
              aria-selected={secaoSelecionada === 'avisos'}
              aria-controls="conteudo-avisos"
              onClick={() => setSecaoSelecionada('avisos')}
            >
              Avisos
              {naoLidas > 0 && <span>{naoLidas > 9 ? '9+' : naoLidas}</span>}
            </button>
            <button
              id="aba-desafios"
              className={`avisos-menu-aba ${secaoSelecionada === 'desafios' ? 'ativa' : ''}`}
              type="button"
              role="tab"
              aria-selected={secaoSelecionada === 'desafios'}
              aria-controls="conteudo-desafios"
              onClick={() => setSecaoSelecionada('desafios')}
            >
              Desafios
              {desafiosNaoLidos > 0 && <span>{desafiosNaoLidos > 9 ? '9+' : desafiosNaoLidos}</span>}
            </button>
          </div>

          {secaoSelecionada === 'avisos' ? (
            <section id="conteudo-avisos" className="avisos-menu-conteudo" role="tabpanel" aria-labelledby="aba-avisos">
              <div className="avisos-menu-cabecalho">
                <strong>Avisos</strong>
                {notificacoes.length ? (
                  <div className="avisos-menu-acoes">
                    <span>{`${notificacoes.length} recentes`}</span>
                    <button type="button" disabled={limpandoAvisos || Boolean(avisoExcluindo)} onClick={limparAvisos}>
                      {limpandoAvisos ? 'Limpando...' : 'Limpar avisos'}
                    </button>
                  </div>
                ) : <span>Nenhuma interação</span>}
              </div>

              {notificacoes.length ? (
                <div className="avisos-lista">
                  {notificacoes.map((notificacao) => (
                    <div className={`aviso-item ${notificacao.lida ? '' : 'nao-lido'}`} key={notificacao.id}>
                      <button className="aviso-item-abrir" type="button" onClick={() => abrirNotificacao(notificacao)}>
                        <span>{obterMensagem(notificacao)}</span>
                        {notificacao.texto && <small>{notificacao.texto}</small>}
                        <time>{formatarData(notificacao.criado_em)}</time>
                      </button>
                      {notificacao.tipo === 'pedido_amizade' && (
                        amizadesRespondidas[notificacao.amizade_id] || notificacao.amizade_status !== 'pendente' ? (
                          <small className="aviso-amizade-resultado">{amizadesRespondidas[notificacao.amizade_id] === 'aceito' || notificacao.amizade_status === 'aceita' ? 'Pedido aceito' : amizadesRespondidas[notificacao.amizade_id] === 'recusado' || notificacao.amizade_status === 'encerrada' ? 'Pedido encerrado' : notificacao.amizade_status === 'carregando' ? 'Carregando pedido...' : 'Pedido respondido'}</small>
                        ) : (
                          <div className="aviso-amizade-acoes">
                            <button type="button" disabled={processandoAmizade === notificacao.amizade_id} onClick={() => responderPedido(notificacao, true)}>Aceitar</button>
                            <button type="button" disabled={processandoAmizade === notificacao.amizade_id} onClick={() => responderPedido(notificacao, false)}>Recusar</button>
                          </div>
                        )
                      )}
                      <button className="aviso-item-excluir" type="button" aria-label={`Excluir aviso de ${notificacao.ator_nome || 'Alguém'}`} title="Excluir aviso" disabled={limpandoAvisos || avisoExcluindo === notificacao.id} onClick={() => excluirAviso(notificacao)}>
                        {avisoExcluindo === notificacao.id ? (
                          <span className="aviso-excluir-carregando" role="status">...</span>
                        ) : (
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="avisos-vazio">Você ainda não recebeu avisos de interações.</p>
              )}
              {erroAmizade && <p className="avisos-erro" role="alert">{erroAmizade}</p>}
            </section>
          ) : (
            <section id="conteudo-desafios" className="avisos-menu-conteudo" role="tabpanel" aria-labelledby="aba-desafios">
              <div className="avisos-menu-cabecalho">
                <strong>Desafios</strong>
                <span>Comunidade</span>
              </div>
              <AvisosDesafios dados={desafiosRanking.dados} erro={desafiosRanking.erro}
                marcarLido={desafiosRanking.marcarLido} aoAbrir={(id) => { setAberto(false); navigate(`/ranking?desafio=${id}`); }} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default AvisosHeader;