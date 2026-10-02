import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialogoPublicacao } from './useDialogoPublicacao';

export default function GaleriaMidiasPrivadas({ midias, inicialId, aoFechar }) {
  const [idSelecionado, setIdSelecionado] = useState(inicialId);
  const indice = midias.findIndex((midia) => midia.id === idSelecionado);
  const midia = midias[indice];
  const { painelRef, tituloRef } = useDialogoPublicacao(aoFechar, false);

  useEffect(() => {
    if (!midia) aoFechar();
  }, [midia, aoFechar]);

  function navegar(direcao) {
    if (midias.length) setIdSelecionado(midias[(indice + direcao + midias.length) % midias.length].id);
  }

  if (!midia) return null;
  return createPortal(
    <div
      className="chat-global-image-viewer mp-galeria"
      role="dialog"
      aria-modal="true"
      aria-label="Galeria da conversa privada"
      ref={painelRef}
      tabIndex={-1}
      onClick={aoFechar}
      onKeyDown={(evento) => {
        if (evento.target instanceof HTMLInputElement || evento.target instanceof HTMLVideoElement) return;
        if (evento.key === 'ArrowLeft' || evento.key === 'ArrowRight') {
          evento.preventDefault();
          navegar(evento.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
    >
      <button ref={tituloRef} className="chat-global-image-viewer-close" type="button" onClick={aoFechar} aria-label="Fechar galeria">×</button>
      <button className="chat-global-image-viewer-prev" type="button" disabled={midias.length < 2} onClick={(evento) => { evento.stopPropagation(); navegar(-1); }} aria-label="Mídia anterior">‹</button>
      {midia.tipo?.startsWith('video/')
        ? <video key={midia.id} className="chat-global-image-viewer-media" src={midia.url} controls playsInline preload="metadata" onClick={(evento) => evento.stopPropagation()} />
        : <img className="chat-global-image-viewer-media" src={midia.url} alt={midia.nome} onClick={(evento) => evento.stopPropagation()} />}
      <button className="chat-global-image-viewer-next" type="button" disabled={midias.length < 2} onClick={(evento) => { evento.stopPropagation(); navegar(1); }} aria-label="Próxima mídia">›</button>
      <div className="chat-global-image-thumbnails" onClick={(evento) => evento.stopPropagation()}>
        {midias.map((item, i) => (
          <button key={item.id} type="button" className={item.id === midia.id ? 'ativo' : ''} aria-label={`Abrir mídia ${i + 1}`} aria-pressed={item.id === midia.id} onClick={() => setIdSelecionado(item.id)}>
            {item.tipo?.startsWith('video/') ? <video src={item.url} muted playsInline preload="metadata" /> : <img src={item.url} alt="" />}
          </button>
        ))}
      </div>
      <p className="mp-galeria-contador" aria-live="polite">{indice + 1} / {midias.length}</p>
    </div>,
    document.body
  );
}
