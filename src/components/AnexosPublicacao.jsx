import { useEffect, useRef } from 'react';

function PreviaAnexo({ arquivo, aoRemover, publicando }) {
    const midiaRef = useRef(null);

    useEffect(() => {
        if (!midiaRef.current) return undefined;
        const urlArquivo = URL.createObjectURL(arquivo);
        midiaRef.current.src = urlArquivo;
        return () => URL.revokeObjectURL(urlArquivo);
    }, [arquivo]);

    return (
        <div className="criar-post-anexo">
            {arquivo.type.startsWith('image/')
                ? <img ref={midiaRef} alt={arquivo.name} />
                : arquivo.type.startsWith('video/')
                    ? <video ref={midiaRef} controls preload="metadata" playsInline aria-label={arquivo.name} />
                    : null}
            <div className="criar-post-anexo-info">
                <span title={arquivo.name}>{arquivo.name}</span>
                <button type="button" onClick={aoRemover} disabled={publicando} aria-label={`Remover ${arquivo.name}`}>
                    ×
                </button>
            </div>
        </div>
    );
}

function AnexosPublicacao({ id, midias, setMidias, publicando, titulo, descricao, obrigatorio = false }) {
    return (
        <div className="criar-post-campo">
            <div className="criar-post-label">Imagens e vídeos <span>{midias.length ? `${midias.length} ${midias.length === 1 ? 'anexo' : 'anexos'}` : obrigatorio ? 'Obrigatório' : 'Opcional'}</span></div>
            <label className="criar-post-upload" htmlFor={id}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8" cy="8" r="1.5" />
                    <path d="m3 17 5-5 4 4 4-6 5 7" />
                </svg>
                <span>
                    <strong>{titulo}</strong>
                    <small>{descricao}</small>
                </span>
                <span className="criar-post-upload-botao">Escolher arquivos</span>
                <input
                    className="criar-post-sr-only"
                    type="file"
                    id={id}
                    name={id}
                    accept="image/*,video/*"
                    disabled={publicando}
                    multiple
                    onChange={(evento) => {
                        const arquivosNovos = Array.from(evento.target.files ?? []);
                        setMidias((selecionadas) => [...selecionadas, ...arquivosNovos]);
                        evento.target.value = '';
                    }}
                />
            </label>
            {midias.length > 0 && (
                <div className="criar-post-anexos" aria-label="Anexos selecionados">
                    {midias.map((arquivo, indice) => (
                        <PreviaAnexo
                            key={`${arquivo.name}-${arquivo.lastModified}-${indice}`}
                            arquivo={arquivo}
                            aoRemover={() => setMidias((selecionadas) => selecionadas.filter((_, itemIndice) => itemIndice !== indice))}
                            publicando={publicando}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default AnexosPublicacao;
