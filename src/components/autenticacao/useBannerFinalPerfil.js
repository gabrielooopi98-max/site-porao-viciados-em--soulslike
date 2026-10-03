import { useEffect, useState } from 'react';
import { executarRanking } from '../../services/ranking';

export default function useBannerFinalPerfil(usuarioId, vitorias) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [selecaoPrevia, setSelecaoPrevia] = useState(null);

  useEffect(() => {
    if (!usuarioId) return undefined;
    let ativo = true;
    executarRanking('ranking_banner_perfil', { p_usuario: usuarioId })
      .then((resultado) => {
        if (!ativo) return;
        setDados(resultado);
        setErro('');
      })
      .catch((error) => {
        if (ativo) setErro(error.message);
      });
    return () => { ativo = false; };
  }, [usuarioId, tentativa, vitorias]);

  async function aplicar(finalId) {
    if (salvando) return;
    setSalvando(true);
    setErro('');
    try {
      await executarRanking('ranking_aplicar_banner_perfil', { p_final: finalId });
      setDados((atual) => ({ ...atual, final_id: finalId }));
      setSelecaoPrevia(null);
    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvando(false);
    }
  }

  const previa = usuarioId && selecaoPrevia?.usuarioId === usuarioId ? selecaoPrevia.finalId : null;
  return {
    dados, erro, salvando, aplicar, previa,
    alternarPrevia: (finalId) => setSelecaoPrevia((atual) =>
      atual?.usuarioId === usuarioId && atual.finalId === finalId ? null : { usuarioId, finalId }),
    tentarNovamente: () => setTentativa((atual) => atual + 1),
  };
}
