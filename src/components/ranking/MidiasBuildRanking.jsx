import { useState } from 'react';
import MidiasPublicacao from '../MidiasPublicacao';

// Build: abas Imagem/Video. Prova: faixa deslizante com todos os anexos.
export default function MidiasBuildRanking({ participacao, abas = true, limite }) {
  const [tipo, setTipo] = useState('image/');
  const imagens = participacao.midias.filter((m) => m.tipo_midia.startsWith('image/'));
  const videos = participacao.midias.filter((m) => m.tipo_midia.startsWith('video/'));
  const escolhidas = !abas ? participacao.midias
    : tipo === 'video/' && videos.length ? videos : imagens.length ? imagens : videos;
  const midias = limite ? escolhidas.slice(0, limite) : escolhidas;
  if (!midias.length) return null;
  return (
    <section className="rk-midia" aria-label={`Mídias de ${participacao.autor_nome}`}>
      {abas && <div className="rk-abas" role="group" aria-label="Escolher mídia">
        <button className="rk-aba" type="button" aria-pressed={escolhidas === imagens} disabled={!imagens.length} onClick={() => setTipo('image/')}>Imagem</button>
        <button className="rk-aba" type="button" aria-pressed={escolhidas === videos} disabled={!videos.length} onClick={() => setTipo('video/')}>Vídeo</button>
      </div>}
      <div className="rk-midia-faixa" tabIndex={midias.length > 1 ? 0 : undefined}>
        <MidiasPublicacao key={tipo} publicacao={{ ...participacao, midias }}
          itemClassName="rk-midia-item" mediaClassName="rk-midia-arquivo" permitirAmpliar />
      </div>
      {midias.length > 1 && <small className="rk-midia-dica">{midias.length} arquivos · deslize para ver todos</small>}
      {limite && escolhidas.length > limite && <small className="rk-midia-dica">+{escolhidas.length - limite} na participação completa</small>}
    </section>
  );
}
