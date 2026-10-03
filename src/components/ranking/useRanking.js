import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import { assinarAtualizacoesRanking, executarRanking, limparMidiasRemovidas, proximoPrazoRanking } from '../../services/ranking';

// Reserva caso o Realtime caia; as mudancas normais chegam pelo canal.
const INTERVALO_RESERVA = 60000;
// Agrupa rajadas de votos em uma unica consulta.
const ESPERA_REALTIME = 400;
// setTimeout nao aceita atrasos acima de ~24 dias.
const MAIOR_ESPERA = 2 ** 31 - 1;

export function useRanking(desafioId = null) {
  const { user } = useAuth();
  const consulta = `${user?.id || 'visitante'}:${desafioId || 'geral'}`;
  const [resultado, setResultado] = useState(null);
  const requisicao = useRef({ id: 0 });
  const limpando = useRef(false);
  const atualizar = useCallback(() => {
    const controle = requisicao.current;
    const id = ++controle.id;
    return executarRanking('ranking_painel', { p_desafio: desafioId }).then((dados) => {
      if (id === controle.id) setResultado({ consulta, dados, erro: '' });
      // Com o ADM conectado, apaga do Storage as provas de desafios ja removidos.
      if (dados?.midias_para_remover?.length && !limpando.current) {
        limpando.current = true;
        limparMidiasRemovidas(dados.midias_para_remover)
          .catch((error) => console.error('Erro ao limpar mídias do ranking:', error))
          .finally(() => { limpando.current = false; });
      }
    }).catch((error) => {
      if (id === controle.id) setResultado({ consulta, dados: null, erro: error.message });
    });
  }, [consulta, desafioId]);
  useEffect(() => {
    const controle = requisicao.current;
    let espera = null;
    atualizar();
    const cancelarAssinatura = assinarAtualizacoesRanking(() => {
      clearTimeout(espera);
      espera = setTimeout(atualizar, ESPERA_REALTIME);
    });
    const timer = setInterval(() => { if (!document.hidden) atualizar(); }, INTERVALO_RESERVA);
    window.addEventListener('focus', atualizar);
    return () => {
      ++controle.id;
      clearTimeout(espera);
      cancelarAssinatura();
      clearInterval(timer);
      window.removeEventListener('focus', atualizar);
    };
  }, [atualizar]);
  const atual = resultado?.consulta === consulta ? resultado : null;
  const dados = atual?.dados || null;
  // Na virada de um prazo (inicio, fim de etapa), consulta de novo para o banco avancar a etapa.
  const proximoPrazo = dados ? proximoPrazoRanking(dados.desafios, Date.parse(dados.agora)) : null;
  const agoraServidor = dados ? Date.parse(dados.agora) : 0;
  useEffect(() => {
    if (!proximoPrazo) return undefined;
    const timer = setTimeout(atualizar, Math.min(proximoPrazo - agoraServidor + 1000, MAIOR_ESPERA));
    return () => clearTimeout(timer);
  }, [proximoPrazo, agoraServidor, atualizar]);
  return { dados, erro: atual?.erro || '', carregando: !atual, atualizar };
}
