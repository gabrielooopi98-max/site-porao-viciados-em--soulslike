import { useState } from 'react';
import MidiasPublicacao from '../MidiasPublicacao';

export default function MidiasBuildRanking({ participacao }) {
  const [tipo, setTipo] = useState('image/');
  const imagens = participacao.midias.filter((m) => m.tipo_midia.startsWith('image/'));
  const videos = participacao.midias.filter((m) => m.tipo_midia.startsWith('video/'));
  const midias = tipo === 'video/' && videos.length ? videos : imagens.length ? imagens : videos;
  return (
    <section className="ranking-build-midias" aria-label={`Imagem e vídeo de ${participacao.titulo}`}>
      <div className="ranking-build-abas" role="group" aria-label="Escolher mídia">
        <button type="button" aria-pressed={midias === imagens} disabled={!imagens.length} onClick={() => setTipo('image/')}>Imagem</button>
        <button type="button" aria-pressed={midias === videos} disabled={!videos.length} onClick={() => setTipo('video/')}>Vídeo</button>
      </div>
      <MidiasPublicacao key={tipo} publicacao={{ ...participacao, midias }}
        itemClassName="ranking-build-midia-item" mediaClassName="ranking-build-midia" permitirAmpliar />
    </section>
  );
}
