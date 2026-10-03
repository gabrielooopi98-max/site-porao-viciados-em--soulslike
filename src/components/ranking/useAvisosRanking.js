import { useCallback, useEffect, useRef, useState } from 'react';
import { assinarAtualizacoesRanking, executarRanking } from '../../services/ranking';

export function useAvisosRanking(usuarioId) {
  const [resultado, setResultado] = useState(null);
  const requisicao = useRef({ id: 0 });
  const atualizar = useCallback((marcar = false) => {
    if (!usuarioId) return Promise.resolve();
    const controle = requisicao.current;
    const id = ++controle.id;
    return executarRanking('ranking_avisos', { p_marcar: marcar }).then((dados) => {
      if (id === controle.id) setResultado({ usuarioId, dados, erro: '' });
    }).catch((error) => {
      if (id === controle.id) setResultado({ usuarioId, dados: null, erro: error.message });
    });
  }, [usuarioId]);
  useEffect(() => {
    if (!usuarioId) return undefined;
    const controle = requisicao.current;
    let espera = null;
    atualizar();
    // Novos desafios aparecem nos avisos assim que o ADM publica.
    const cancelarAssinatura = assinarAtualizacoesRanking(() => {
      clearTimeout(espera);
      espera = setTimeout(() => atualizar(), 400);
    });
    const timer = setInterval(() => { if (!document.hidden) atualizar(); }, 60000);
    return () => { ++controle.id; clearTimeout(espera); cancelarAssinatura(); clearInterval(timer); };
  }, [usuarioId, atualizar]);
  const atual = resultado?.usuarioId === usuarioId ? resultado : null;
  async function marcarLido(desafioId) {
    await executarRanking('ranking_ler_desafio', { p_desafio: desafioId });
    await atualizar();
  }
  return { dados: atual?.dados || null, erro: atual?.erro || '', atualizar, marcarLido };
}
