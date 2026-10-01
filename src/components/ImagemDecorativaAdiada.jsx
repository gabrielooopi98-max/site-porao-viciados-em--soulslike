import { useEffect, useRef, useState } from 'react';

function ImagemDecorativaAdiada({ src, alt, className, formato = 'banner' }) {
  const imagemRef = useRef(null);
  const [carregada, setCarregada] = useState(false);

  useEffect(() => {
    const imagem = imagemRef.current;
    if (!imagem) return undefined;

    if (!('IntersectionObserver' in window)) {
      const frame = window.requestAnimationFrame(() => setCarregada(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) {
        setCarregada(true);
        observer.disconnect();
      }
    }, { rootMargin: '100px' });

    observer.observe(imagem);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={imagemRef}
      className={`imagem-decorativa-adiada ${formato === 'quadrado' ? 'imagem-decorativa-adiada-quadrada' : ''}`}
    >
      {carregada && (
        <img src={src} alt={alt} className={className} decoding="async" />
      )}
    </span>
  );
}

export default ImagemDecorativaAdiada;
