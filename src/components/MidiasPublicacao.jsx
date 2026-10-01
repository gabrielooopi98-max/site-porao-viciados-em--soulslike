import { useEffect, useRef, useState } from 'react';

function VideoPublicacao({ src, type, className, label, modoPreviaVideo }) {
    const videoRef = useRef(null);
    const [pertoDaTela, setPertoDaTela] = useState(false);

    useEffect(() => {
        if (!modoPreviaVideo || !videoRef.current) return undefined;

        if (!('IntersectionObserver' in window)) {
            const frame = window.requestAnimationFrame(() => setPertoDaTela(true));
            return () => window.cancelAnimationFrame(frame);
        }

        const observer = new IntersectionObserver(([entrada]) => {
            if (entrada.isIntersecting) {
                setPertoDaTela(true);
                observer.disconnect();
            }
        }, { rootMargin: '120px' });

        observer.observe(videoRef.current);
        return () => observer.disconnect();
    }, [modoPreviaVideo]);

    return (
        <video
            ref={videoRef}
            controls={!modoPreviaVideo}
            playsInline
            preload={modoPreviaVideo && pertoDaTela ? 'metadata' : 'none'}
            className={className}
            aria-hidden={modoPreviaVideo}
            aria-label={label}
            tabIndex={modoPreviaVideo ? -1 : undefined}
            disablePictureInPicture={modoPreviaVideo}
        >
            <source src={src} type={type} />
        </video>
    );
}

function MidiasPublicacao({ publicacao, itemClassName, mediaClassName, permitirAmpliar = false, modoPreviaVideo = false }) {
    const [midiaAmpliada, setMidiaAmpliada] = useState(null);
    const midiasOriginais = publicacao.midias?.length
        ? publicacao.midias
        : publicacao.midia_url
            ? [publicacao]
            : [{ midia_url: '/banners/img-banner.png', tipo_midia: 'image/png' }];
    const indiceVideo = modoPreviaVideo
        ? midiasOriginais.findIndex((midia) => midia.tipo_midia?.startsWith('video/'))
        : -1;
    const midias = indiceVideo > 0
        ? [midiasOriginais[indiceVideo], ...midiasOriginais.slice(0, indiceVideo), ...midiasOriginais.slice(indiceVideo + 1)]
        : midiasOriginais;

    useEffect(() => {
        if (!midiaAmpliada) {
            return undefined;
        }

        const overflowOriginal = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        function fecharComEscape(evento) {
            if (evento.key === 'Escape') {
                setMidiaAmpliada(null);
            }
        }

        window.addEventListener('keydown', fecharComEscape);
        return () => {
            document.body.style.overflow = overflowOriginal;
            window.removeEventListener('keydown', fecharComEscape);
        };
    }, [midiaAmpliada]);

    return (
        <>
            {midias.map((midia, indice) => (
                <div
                    className={itemClassName}
                    key={midia.id ?? `${midia.midia_url}-${midia.ordem ?? indice}`}
                >
                    {midia.tipo_midia?.startsWith('video/') ? (
                        <>
                            <VideoPublicacao
                                src={midia.midia_url}
                                type={midia.tipo_midia}
                                className={mediaClassName}
                                label={`Vídeo ${indice + 1} de ${publicacao.titulo}`}
                                modoPreviaVideo={modoPreviaVideo}
                            />
                            {modoPreviaVideo && (
                                <span className="icone-play-video-post" aria-hidden="true">
                                    <svg viewBox="0 0 16 16" aria-hidden="true">
                                        <path d="M5 3.5v9l7-4.5-7-4.5Z" fill="currentColor" />
                                    </svg>
                                </span>
                            )}
                            {modoPreviaVideo && (
                                <span className="selo-tipo-midia-post">
                                    Vídeo · abrir post
                                </span>
                            )}
                        </>
                    ) : permitirAmpliar ? (
                        <button
                            type="button"
                            className="botao-imagem-ampliavel"
                            aria-label={`Ampliar imagem ${indice + 1} de ${publicacao.titulo}`}
                            onClick={() => setMidiaAmpliada(midia)}
                        >
                            <img
                                src={midia.midia_url}
                                alt={`Mídia ${indice + 1} de ${publicacao.titulo}`}
                                className={mediaClassName}
                                loading="lazy"
                                decoding="async"
                            />
                        </button>
                    ) : (
                        <img
                            src={midia.midia_url}
                            alt={`Mídia ${indice + 1} de ${publicacao.titulo}`}
                            className={mediaClassName}
                            loading="lazy"
                            decoding="async"
                        />
                    )}
                </div>
            ))}

            {midiaAmpliada && (
                <div
                    className="visualizador-imagem"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Imagem ampliada de ${publicacao.titulo}`}
                    onClick={() => setMidiaAmpliada(null)}
                >
                    <button
                        type="button"
                        className="botao-fechar-visualizador"
                        aria-label="Fechar imagem ampliada"
                        onClick={() => setMidiaAmpliada(null)}
                    >
                        Fechar
                    </button>
                    <img
                        src={midiaAmpliada.midia_url}
                        alt={`Imagem ampliada de ${publicacao.titulo}`}
                        className="imagem-ampliada"
                        decoding="async"
                        onClick={(evento) => evento.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}

export default MidiasPublicacao;