import { useEffect, useRef, useState } from 'react';

export default function AudioMensagemChat({ src, onError }) {
    const audioRef = useRef(null);
    const [tocando, setTocando] = useState(false);
    const [duracao, setDuracao] = useState(0);
    const [tempoAtual, setTempoAtual] = useState(0);
    const [erroAudio, setErroAudio] = useState('');

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return undefined;

        const atualizarDuracao = () => setDuracao(Number.isFinite(audio.duration) ? audio.duration : 0);
        const atualizarTempo = () => setTempoAtual(audio.currentTime);
        const registrarErro = (evento) => {
            setTocando(false);
            setErroAudio('Áudio indisponível ou formato não compatível.');
            if (onError) onError(evento);
            else console.error('Erro ao carregar áudio do chat:', audio.error);
        };
        const finalizar = () => {
            setTocando(false);
            setTempoAtual(0);
        };

        audio.addEventListener('loadedmetadata', atualizarDuracao);
        audio.addEventListener('timeupdate', atualizarTempo);
        audio.addEventListener('ended', finalizar);
        audio.addEventListener('error', registrarErro);
        return () => {
            audio.removeEventListener('loadedmetadata', atualizarDuracao);
            audio.removeEventListener('timeupdate', atualizarTempo);
            audio.removeEventListener('ended', finalizar);
            audio.removeEventListener('error', registrarErro);
        };
    }, [src, onError]);

    async function alternarAudio() {
        const audio = audioRef.current;
        if (!audio) return;

        if (audio.paused) {
            try {
                setErroAudio('');
                await audio.play();
                setTocando(true);
            } catch (error) {
                console.error('Erro ao reproduzir áudio do chat:', error);
                setTocando(false);
                setErroAudio('Não foi possível reproduzir este áudio.');
            }
        } else {
            audio.pause();
            setTocando(false);
        }
    }

    function alterarProgresso(evento) {
        const audio = audioRef.current;
        if (!audio || !duracao) return;
        const proximoTempo = (Number(evento.target.value) / 100) * duracao;
        audio.currentTime = proximoTempo;
        setTempoAtual(proximoTempo);
    }

    return (
        <div className="chat-audio-player">
            <audio ref={audioRef} src={src} preload="metadata" />
            <button className="chat-audio-play" type="button" onClick={alternarAudio} aria-label={tocando ? 'Pausar áudio' : 'Reproduzir áudio'}>
                {tocando ? 'Ⅱ' : '▶'}
            </button>
            <div className="chat-audio-corpo">
                <div className="chat-audio-onda" aria-hidden="true">
                    {[38, 58, 30, 70, 44, 84, 52, 66, 36, 76, 48, 62, 34, 72, 42, 56, 30, 68, 46, 78, 38, 60, 32, 52].map((altura, indice) => <i key={indice} style={{ height: `${altura}%` }} />)}
                </div>
                <input className="chat-audio-progresso" type="range" min="0" max="100" value={duracao ? (tempoAtual / duracao) * 100 : 0} onChange={alterarProgresso} aria-label="Progresso do áudio" />
                <span className="chat-audio-tempo">{erroAudio || formatarDuracaoAudio(tocando || tempoAtual ? tempoAtual : duracao)}</span>
            </div>
        </div>
    );
}

function formatarDuracaoAudio(segundos) {
    if (!Number.isFinite(segundos) || segundos <= 0) return '0:00';
    const minutos = Math.floor(segundos / 60);
    const segundosRestantes = Math.floor(segundos % 60).toString().padStart(2, '0');
    return `${minutos}:${segundosRestantes}`;
}
