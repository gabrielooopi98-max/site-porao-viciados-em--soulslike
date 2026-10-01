import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { buscarNotificacoes, marcarNotificacoesLidas } from '../services/notificacoes';

function formatarData(data) {
  if (!data) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(data));
}

function obterMensagem(notificacao) {
  const ator = notificacao.ator_nome || 'Alguém';
  const titulo = notificacao.titulo_conteudo ? ` "${notificacao.titulo_conteudo}"` : '';

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

  useEffect(() => {
    if (!user) return undefined;

    let ativo = true;
    buscarNotificacoes(user.id).then(({ data, error }) => {
      if (!ativo) return;
      if (error) {
        console.error('Erro ao carregar avisos:', error);
        setNotificacoes([]);
        return;
      }
      setNotificacoes(data ?? []);
    });

    return () => { ativo = false; };
  }, [user]);

  if (!user) return null;

  const naoLidas = notificacoes.filter((notificacao) => !notificacao.lida).length;

  async function alternarAvisos() {
    const novoEstado = !aberto;
    setAberto(novoEstado);
    if (novoEstado) setSecaoSelecionada('avisos');

    if (novoEstado && naoLidas) {
      await marcarNotificacoesLidas(user.id);
      setNotificacoes((atuais) => atuais.map((notificacao) => ({ ...notificacao, lida: true })));
    }
  }

  function abrirNotificacao(notificacao) {
    setAberto(false);
    if (notificacao.post_id) navigate(`/post/${notificacao.post_id}`);
    if (notificacao.build_id) navigate(`/build/${notificacao.build_id}`);
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
        <span>Avisos</span>
        {naoLidas > 0 && <strong>{naoLidas > 9 ? '9+' : naoLidas}</strong>}
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
            </button>
          </div>

          {secaoSelecionada === 'avisos' ? (
            <section id="conteudo-avisos" className="avisos-menu-conteudo" role="tabpanel" aria-labelledby="aba-avisos">
              <div className="avisos-menu-cabecalho">
                <strong>Avisos</strong>
                <span>{notificacoes.length ? `${notificacoes.length} recentes` : 'Nenhum aviso'}</span>
              </div>

              {notificacoes.length ? (
                <div className="avisos-lista">
                  {notificacoes.map((notificacao) => (
                    <button
                      className={`aviso-item ${notificacao.lida ? '' : 'nao-lido'}`}
                      key={notificacao.id}
                      type="button"
                      onClick={() => abrirNotificacao(notificacao)}
                    >
                      <span>{obterMensagem(notificacao)}</span>
                      {notificacao.texto && <small>{notificacao.texto}</small>}
                      <time>{formatarData(notificacao.criado_em)}</time>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="avisos-vazio">Você ainda não recebeu avisos.</p>
              )}
            </section>
          ) : (
            <section id="conteudo-desafios" className="avisos-menu-conteudo" role="tabpanel" aria-labelledby="aba-desafios">
              <div className="avisos-menu-cabecalho">
                <strong>Desafios</strong>
                <span>Em breve</span>
              </div>
              <p className="avisos-vazio">Os desafios da comunidade estarão disponíveis em breve.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default AvisosHeader;