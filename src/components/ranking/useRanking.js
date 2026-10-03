import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import { executarRanking, limparMidiasRemovidas } from '../../services/ranking';

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
    atualizar();
    const timer = setInterval(() => { if (!document.hidden) atualizar(); }, 30000);
    window.addEventListener('focus', atualizar);
    return () => {
      ++controle.id;
      clearInterval(timer);
      window.removeEventListener('focus', atualizar);
    };
  }, [atualizar]);
  const atual = resultado?.consulta === consulta ? resultado : null;
  return { dados: atual?.dados || null, erro: atual?.erro || '', carregando: !atual, atualizar };
}
