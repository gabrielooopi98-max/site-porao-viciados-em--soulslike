import { useEffect, useState } from 'react';

function VisualizadorAvatar({ src, alt, style, className = '' }) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return undefined;

    function fecharComEsc(evento) {
      if (evento.key === 'Escape') setAberto(false);
    }

    document.addEventListener('keydown', fecharComEsc);
    return () => document.removeEventListener('keydown', fecharComEsc);
  }, [aberto]);

  return (
    <>
      <button
        className={`avatar-preview-trigger ${className}`}
        type="button"
        aria-label={`Ampliar ${alt.toLowerCase()}`}
        onClick={() => setAberto(true)}
      >
        <img src={src} alt={alt} style={style} />
      </button>

      {aberto && (
        <div
          className="avatar-preview-modal"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setAberto(false)}
        >
          <div className="avatar-preview-content" onClick={(evento) => evento.stopPropagation()}>
            <button
              className="avatar-preview-close"
              type="button"
              aria-label="Fechar foto de perfil"
              onClick={() => setAberto(false)}
            >
              &times;
            </button>
            <img src={src} alt={alt} style={style} />
          </div>
        </div>
      )}
    </>
  );
}

export default VisualizadorAvatar;