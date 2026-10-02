import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/useAuth';
import { gerarIdUnico } from '../gerarIdUnico';
import ImagemDecorativaAdiada from './ImagemDecorativaAdiada';
import './ChatGlobal.css';

function AudioMensagemChat({ src }) {
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
        const registrarErro = () => {
            setTocando(false);
            setErroAudio('Áudio indisponível ou formato não compatível.');
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
    }, [src]);

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

function PreviewMidiaRespondida({ tipo, url, texto }) {
    if (tipo?.startsWith('audio/')) {
        return (
            <span className="chat-resposta-midia-preview">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" /></svg>
                <span>Áudio</span>
                <span className="chat-resposta-midia-onda" aria-hidden="true">{[35, 65, 45, 80, 50, 70, 35, 90, 52, 68, 42, 76].map((altura, indice) => <i key={indice} style={{ height: `${altura}%` }} />)}</span>
            </span>
        );
    }

    if (tipo?.startsWith('video/')) {
        return (
            <span className="chat-resposta-midia-preview">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3z" /></svg>
                {texto?.trim() && <span className="chat-resposta-midia-comentario">{texto}</span>}
                {url && <video className="chat-resposta-midia-miniatura" src={url} muted playsInline preload="metadata" />}
            </span>
        );
    }

    if (tipo?.startsWith('image/')) {
        return (
            <span className="chat-resposta-midia-preview">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                {texto?.trim() && <span className="chat-resposta-midia-comentario">{texto}</span>}
                {url && <img className="chat-resposta-midia-miniatura" src={url} alt="" loading="lazy" />}
            </span>
        );
    }

    return null;
}

function obterFigurinha(texto) {
    const id = texto?.match(/^sticker:([0-9a-f-]{36})$/i)?.[1];
    if (id) return { id };

    const marcadorAntigo = texto?.match(/^sticker:(fogueira|darksign|caveira|espada|escudo|coroa|lagrimas|aplausos|coracao):[a-f0-9-]+$/i)?.[1]?.toLowerCase();
    const figurinhasAntigas = {
        fogueira: '🔥',
        darksign: '☀️',
        caveira: '💀',
        espada: '⚔️',
        escudo: '🛡️',
        coroa: '👑',
        lagrimas: '😭',
        aplausos: '👏',
        coracao: '❤️',
    };
    return marcadorAntigo ? { emojiAntigo: figurinhasAntigas[marcadorAntigo] } : null;
}

const INTERVALO_AGRUPAMENTO_MS = 5 * 60 * 1000;

function chaveDoDia(data) {
    return new Date(data).toDateString();
}

function rotuloDoDia(data) {
    const dia = new Date(data);
    const hoje = new Date();
    const ontem = new Date();
    ontem.setDate(hoje.getDate() - 1);

    if (dia.toDateString() === hoje.toDateString()) return 'Hoje';
    if (dia.toDateString() === ontem.toDateString()) return 'Ontem';

    return dia.toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        ...(dia.getFullYear() !== hoje.getFullYear() && { year: 'numeric' }),
    });
}

function formatarHora(data) {
    return new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function inicialDoNome(nome) {
    return (nome || 'V').trim().charAt(0).toUpperCase();
}

// Marca separadores de dia e agrupa mensagens seguidas do mesmo autor, como no Discord.
function organizarMensagens(mensagens) {
    return mensagens.map((mensagem, indice) => {
        const anterior = mensagens[indice - 1];
        const novoDia = !anterior || chaveDoDia(anterior.criado_em) !== chaveDoDia(mensagem.criado_em);
        const agrupada = !novoDia
            && anterior.autor_id === mensagem.autor_id
            && new Date(mensagem.criado_em) - new Date(anterior.criado_em) < INTERVALO_AGRUPAMENTO_MS;

        return { mensagem, novoDia, agrupada };
    });
}

function aplicarEventoMensagem(mensagensAtuais, payload) {
    if (payload.eventType === 'INSERT') {
        if (mensagensAtuais.some((mensagem) => mensagem.id === payload.new.id)) return mensagensAtuais;
        return [...mensagensAtuais, payload.new]
            .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
    }

    if (payload.eventType === 'UPDATE') {
        return mensagensAtuais
            .map((mensagem) => mensagem.id === payload.new.id ? payload.new : mensagem)
            .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
    }

    if (payload.eventType === 'DELETE') {
        return mensagensAtuais.filter((mensagem) => mensagem.id !== payload.old.id);
    }

    return mensagensAtuais;
}

function ChatGlobal() {
    const navigate = useNavigate();
    const { user, carregando: carregandoAuth } = useAuth();
    const [mensagens, setMensagens] = useState([]);
    const [membrosOnline, setMembrosOnline] = useState([]);
    const [texto, setTexto] = useState('');
    const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
    const [arquivoPreviewUrl, setArquivoPreviewUrl] = useState('');
    const [figurinhasAbertas, setFigurinhasAbertas] = useState(false);
    const [figurinhasSalvas, setFigurinhasSalvas] = useState([]);
    const [figurinhasCarregadasPara, setFigurinhasCarregadasPara] = useState(null);
    const [buscaFigurinha, setBuscaFigurinha] = useState('');
    const [adicionandoFigurinha, setAdicionandoFigurinha] = useState(false);
    const [midiaAmpliadaIndex, setMidiaAmpliadaIndex] = useState(null);
    const [gravandoAudio, setGravandoAudio] = useState(false);
    const [carregando, setCarregando] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [statusEnvio, setStatusEnvio] = useState('');
    const [erro, setErro] = useState('');
    const [editandoId, setEditandoId] = useState(null);
    const [respondendoA, setRespondendoA] = useState(null);
    const [membrosAbertos, setMembrosAbertos] = useState(false);
    const [novasMensagens, setNovasMensagens] = useState(0);
    const mensagensRef = useRef(null);
    const campoMensagemRef = useRef(null);
    const gravadorAudioRef = useRef(null);
    const partesAudioRef = useRef([]);
    const arquivoPreviewRef = useRef('');
    const canalPresencaRef = useRef(null);
    const statusPresencaRef = useRef({ digitando: false, gravando_audio: false });
    const timerDigitandoRef = useRef(null);

    useEffect(() => () => {
        if (arquivoPreviewRef.current) URL.revokeObjectURL(arquivoPreviewRef.current);
    }, []);

    // O campo de mensagem cresce com o texto até um limite, como nos apps de mensagem.
    useEffect(() => {
        const campo = campoMensagemRef.current;
        if (!campo) return;
        campo.style.height = 'auto';
        campo.style.height = `${Math.min(campo.scrollHeight, 160)}px`;
    }, [texto]);

    useEffect(() => {
        if (midiaAmpliadaIndex === null) return undefined;
        const overflowOriginal = document.body.style.overflow;
        const controlarGaleria = (evento) => {
            if (evento.key === 'Escape') setMidiaAmpliadaIndex(null);
            if (evento.key === 'ArrowLeft' || evento.key === 'ArrowRight') {
                const totalMidias = mensagens.filter((mensagem) => (
                    (mensagem.midia_tipo?.startsWith('image/') || mensagem.midia_tipo?.startsWith('video/'))
                    && mensagem.midia_url
                )).length;
                if (!totalMidias) return;
                const direcao = evento.key === 'ArrowLeft' ? -1 : 1;
                setMidiaAmpliadaIndex((indiceAtual) => ((indiceAtual ?? 0) + direcao + totalMidias) % totalMidias);
            }
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', controlarGaleria);
        return () => {
            document.body.style.overflow = overflowOriginal;
            window.removeEventListener('keydown', controlarGaleria);
        };
    }, [mensagens, midiaAmpliadaIndex]);
    const envioBloqueadoRef = useRef(false);
    const mensagensAnterioresRef = useRef(0);
    const historicoCarregadoRef = useRef(false);
    const usuarioNoFimRef = useRef(true);
    const deveIrParaOFimRef = useRef(false);

    useEffect(() => {
        if (!user) {
            return undefined;
        }

        let ativo = true;
        const eventosDuranteCarregamento = [];
        let historicoSincronizado = false;
        const canal = supabase
            .channel('chat-global-mensagens')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'mensagens_chat',
            }, (payload) => {
                if (!ativo) return;
                if (!historicoSincronizado) eventosDuranteCarregamento.push(payload);
                setMensagens((atuais) => aplicarEventoMensagem(atuais, payload));
            })
            .subscribe();

        supabase
            .from('mensagens_chat')
            .select('id, autor_id, autor_nome, autor_avatar_url, texto, midia_url, midia_tipo, midia_nome, resposta_mensagem_id, resposta_autor_nome, resposta_texto, resposta_midia_tipo, resposta_midia_nome, resposta_midia_url, editada, criado_em')
            .order('criado_em', { ascending: true })
            .limit(100)
            .then(({ data, error }) => {
                if (!ativo) return;
                if (error) setErro(`Não foi possível carregar as mensagens: ${error.message || 'execute a migration do chat.'}`);
                const historicoInicial = data ?? [];
                const mensagensSincronizadas = eventosDuranteCarregamento.reduce(
                    aplicarEventoMensagem,
                    historicoInicial
                );
                historicoSincronizado = true;
                setMensagens(mensagensSincronizadas);
                setCarregando(false);
            })
            .catch((error) => {
                if (!ativo) return;
                console.error('Erro ao carregar mensagens do chat:', error);
                setErro('Não foi possível carregar as mensagens. Confira sua conexão e tente novamente.');
                setMensagens(eventosDuranteCarregamento.reduce(aplicarEventoMensagem, []));
                historicoSincronizado = true;
                setCarregando(false);
            });

        return () => {
            ativo = false;
            supabase.removeChannel(canal);
        };
    }, [user]);

    useEffect(() => {
        if (!user) return undefined;

        let ativo = true;
        supabase
            .from('figurinhas_chat')
            .select('id, midia_url, midia_path, midia_tipo, midia_nome, criado_em')
            .eq('autor_id', user.id)
            .order('criado_em', { ascending: false })
            .limit(100)
            .then(({ data, error }) => {
                if (!ativo) return;
                if (error) {
                    console.error('Erro ao carregar figurinhas do chat:', error);
                    setFigurinhasSalvas([]);
                    setErro(`Não foi possível carregar suas figurinhas: ${error.message}`);
                } else {
                    setFigurinhasSalvas(data ?? []);
                }
                setFigurinhasCarregadasPara(user.id);
            })
            .catch((error) => {
                if (!ativo) return;
                console.error('Erro ao carregar figurinhas do chat:', error);
                setFigurinhasSalvas([]);
                setErro('Não foi possível carregar suas figurinhas. Confira sua conexão e tente novamente.');
                setFigurinhasCarregadasPara(user.id);
            });

        return () => { ativo = false; };
    }, [user]);

    useEffect(() => {
        if (!user) {
            return undefined;
        }

        let ativo = true;
        const canalPresenca = supabase.channel('chat-global-presenca', {
            config: { presence: { key: user.id } },
        });
        canalPresencaRef.current = canalPresenca;

        function sincronizarMembrosOnline() {
            if (!ativo) return;

            const registros = Object.values(canalPresenca.presenceState()).flat();
            const porAutor = registros.reduce((mapa, registro) => {
                const autorId = registro.user_id;
                if (!autorId) return mapa;
                const membro = mapa.get(autorId) ?? {
                    autor_id: autorId,
                    autor_nome: registro.autor_nome || 'Viciado em Souls',
                    autor_avatar_url: registro.autor_avatar_url || null,
                    digitando: false,
                    gravando_audio: false,
                };
                membro.digitando ||= Boolean(registro.digitando);
                membro.gravando_audio ||= Boolean(registro.gravando_audio);
                mapa.set(autorId, membro);
                return mapa;
            }, new Map());
            setMembrosOnline(Array.from(porAutor.values()));
        }

        canalPresenca
            .on('presence', { event: 'sync' }, sincronizarMembrosOnline)
            .on('presence', { event: 'join' }, sincronizarMembrosOnline)
            .on('presence', { event: 'leave' }, sincronizarMembrosOnline)
            .subscribe(async (status) => {
                if (status !== 'SUBSCRIBED') return;

                const { error } = await canalPresenca.track({
                    user_id: user.id,
                    autor_nome: user.user_metadata?.display_name || 'Viciado em Souls',
                    autor_avatar_url: user.user_metadata?.avatar_url || null,
                    ...statusPresencaRef.current,
                });
                if (error) console.error('Erro ao registrar presença no chat:', error);
            });

        return () => {
            ativo = false;
            canalPresencaRef.current = null;
            statusPresencaRef.current = { digitando: false, gravando_audio: false };
            if (timerDigitandoRef.current) window.clearTimeout(timerDigitandoRef.current);
            supabase.removeChannel(canalPresenca);
        };
    }, [user]);

    function atualizarStatusPresenca(alteracoes) {
        statusPresencaRef.current = { ...statusPresencaRef.current, ...alteracoes };
        const canal = canalPresencaRef.current;
        if (!canal || !user) return;

        canal.track({
            user_id: user.id,
            autor_nome: user.user_metadata?.display_name || 'Viciado em Souls',
            autor_avatar_url: user.user_metadata?.avatar_url || null,
            ...statusPresencaRef.current,
        }).then(({ error }) => {
            if (error) console.error('Erro ao atualizar atividade no chat:', error);
        }).catch((error) => console.error('Erro ao atualizar atividade no chat:', error));
    }

    function resumirNomes(nomes) {
        if (nomes.length === 1) return nomes[0];
        if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`;
        return `${nomes.slice(0, 2).join(', ')} e mais ${nomes.length - 2}`;
    }

    useEffect(() => {
        if (!user) return undefined;

        function publicarDigitacao(digitando) {
            statusPresencaRef.current = { ...statusPresencaRef.current, digitando };
            const canal = canalPresencaRef.current;
            if (!canal) return;
            canal.track({
                user_id: user.id,
                autor_nome: user.user_metadata?.display_name || 'Viciado em Souls',
                autor_avatar_url: user.user_metadata?.avatar_url || null,
                ...statusPresencaRef.current,
            }).then(({ error }) => {
                if (error) console.error('Erro ao publicar digitação no chat:', error);
            }).catch((error) => console.error('Erro ao publicar digitação no chat:', error));
        }

        function aoDigitar(evento) {
            if (evento.target?.id !== 'mensagem-chat-global') return;
            const digitando = Boolean(evento.target.value.trim());
            if (!digitando || !statusPresencaRef.current.digitando) {
                publicarDigitacao(digitando);
            }
            if (timerDigitandoRef.current) window.clearTimeout(timerDigitandoRef.current);
            timerDigitandoRef.current = digitando
                ? window.setTimeout(() => {
                    publicarDigitacao(false);
                    timerDigitandoRef.current = null;
                }, 1800)
                : null;
        }

        document.addEventListener('input', aoDigitar);
        return () => {
            document.removeEventListener('input', aoDigitar);
            if (timerDigitandoRef.current) window.clearTimeout(timerDigitandoRef.current);
        };
    }, [user]);

    const pessoasGravandoAudio = membrosOnline
        .filter((membro) => membro.autor_id !== user?.id && membro.gravando_audio)
        .map((membro) => membro.autor_nome);
    const pessoasDigitando = membrosOnline
        .filter((membro) => membro.autor_id !== user?.id && membro.digitando && !membro.gravando_audio)
        .map((membro) => membro.autor_nome);
    const textoAtividadeChat = pessoasGravandoAudio.length
        ? `${resumirNomes(pessoasGravandoAudio)} ${pessoasGravandoAudio.length === 1 ? 'está gravando áudio' : 'estão gravando áudio'}...`
        : pessoasDigitando.length
            ? `${resumirNomes(pessoasDigitando)} ${pessoasDigitando.length === 1 ? 'está digitando' : 'estão digitando'}...`
            : '';
    const carregandoFigurinhas = Boolean(user && figurinhasCarregadasPara !== user.id);
    const figurinhasDoUsuario = figurinhasCarregadasPara === user?.id ? figurinhasSalvas : [];
    const figurinhasFiltradas = figurinhasDoUsuario.filter((figurinha) => (
        figurinha.midia_nome.toLocaleLowerCase('pt-BR').includes(buscaFigurinha.trim().toLocaleLowerCase('pt-BR'))
    ));

    useEffect(() => {
        const container = mensagensRef.current;
        if (!container || carregando) return;

        const quantidadeAnterior = mensagensAnterioresRef.current;
        const carregamentoInicial = !historicoCarregadoRef.current;
        const recebeuMensagens = mensagens.length > quantidadeAnterior;

        if (carregamentoInicial || deveIrParaOFimRef.current || usuarioNoFimRef.current) {
            container.scrollTop = container.scrollHeight;
            setNovasMensagens(0);
            deveIrParaOFimRef.current = false;
        } else if (recebeuMensagens) {
            setNovasMensagens((quantidade) => quantidade + (mensagens.length - quantidadeAnterior));
        }

        mensagensAnterioresRef.current = mensagens.length;
        historicoCarregadoRef.current = true;
    }, [carregando, mensagens]);

    // A área de mensagens encolhe quando a barra de digitação cresce (resposta, anexo, texto longo).
    useEffect(() => {
        const container = mensagensRef.current;
        if (!container || typeof ResizeObserver === 'undefined') return undefined;

        const observador = new ResizeObserver(() => {
            if (usuarioNoFimRef.current) container.scrollTop = container.scrollHeight;
        });
        observador.observe(container);
        return () => observador.disconnect();
    }, [user, carregando]);

    function acompanharRolagemMensagens(evento) {
        const container = evento.currentTarget;
        const distanciaAteOFim = container.scrollHeight - container.scrollTop - container.clientHeight;
        const chegouAoFim = distanciaAteOFim <= 36;
        usuarioNoFimRef.current = chegouAoFim;
        if (chegouAoFim) setNovasMensagens(0);
    }

    // Imagens e vídeos mudam a altura da conversa ao carregar; se a pessoa está no fim, continua no fim.
    function manterNoFim() {
        const container = mensagensRef.current;
        if (container && usuarioNoFimRef.current) container.scrollTop = container.scrollHeight;
    }

    function irParaNovasMensagens() {
        const container = mensagensRef.current;
        if (!container) return;
        usuarioNoFimRef.current = true;
        setNovasMensagens(0);
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }

    async function enviarMensagem(evento, figurinha = null) {
        evento?.preventDefault();
        const mensagem = figurinha
            ? `sticker:${figurinha.id}`
            : texto.trim();
        if (!user || (!figurinha && !mensagem && !arquivoSelecionado) || enviando) return;
        const salvandoEdicao = Boolean(editandoId && !figurinha);

        if (timerDigitandoRef.current) window.clearTimeout(timerDigitandoRef.current);
        timerDigitandoRef.current = null;
        atualizarStatusPresenca({ digitando: false });

        if (envioBloqueadoRef.current) {
            setErro('Aguarde um instante antes de enviar outra mensagem.');
            return;
        }

        setEnviando(true);
        setErro('');
        setStatusEnvio(figurinha ? 'Enviando figurinha...' : salvandoEdicao ? 'Salvando edição...' : arquivoSelecionado?.type.startsWith('video/') ? 'Preparando vídeo...' : arquivoSelecionado ? 'Enviando mídia...' : 'Enviando mensagem...');
        deveIrParaOFimRef.current = true;
        let caminhoMidia = null;
        try {
            let dadosMidia = figurinha ? {
                midia_url: figurinha.midia_url,
                midia_tipo: figurinha.midia_tipo,
                midia_nome: figurinha.midia_nome,
            } : {};
            if (!figurinha && !salvandoEdicao && arquivoSelecionado) {
                let arquivoParaEnviar = arquivoSelecionado;
                if (arquivoSelecionado.type.startsWith('video/')) {
                    const { normalizarVideo } = await import('../services/normalizarVideo');
                    arquivoParaEnviar = await normalizarVideo(arquivoSelecionado, ({ etapa, progresso }) => {
                        setStatusEnvio(etapa === 'carregando'
                            ? 'Carregando conversor de vídeo...'
                            : `Convertendo vídeo... ${progresso}%`);
                    });
                }

                setStatusEnvio('Enviando mídia...');
                const extensao = arquivoParaEnviar.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
                caminhoMidia = `chat/${user.id}/${gerarIdUnico()}.${extensao}`;
                const upload = await supabase.storage.from('midias').upload(caminhoMidia, arquivoParaEnviar, {
                    contentType: arquivoParaEnviar.type,
                    upsert: false,
                });
                if (upload.error) throw upload.error;
                const { data: urlPublica } = supabase.storage.from('midias').getPublicUrl(caminhoMidia);
                dadosMidia = {
                    midia_url: urlPublica.publicUrl,
                    midia_tipo: arquivoParaEnviar.type,
                    midia_nome: arquivoParaEnviar.name,
                };
            }

            setStatusEnvio(figurinha ? 'Enviando figurinha...' : salvandoEdicao ? 'Salvando edição...' : 'Enviando mensagem...');
            const resultado = salvandoEdicao
                ? await supabase.from('mensagens_chat').update({ texto: mensagem, editada: true }).eq('id', editandoId).eq('autor_id', user.id).select().single()
                : await supabase.from('mensagens_chat').insert({
                    autor_id: user.id,
                    autor_nome: user.user_metadata?.display_name || 'Viciado em Souls',
                    autor_avatar_url: user.user_metadata?.avatar_url || null,
                    texto: mensagem,
                    ...dadosMidia,
                    resposta_mensagem_id: respondendoA?.id || null,
                    resposta_autor_nome: respondendoA?.autor_nome || null,
                    resposta_texto: respondendoA ? textoDeResposta(respondendoA) : null,
                    resposta_midia_tipo: respondendoA?.midia_tipo || null,
                    resposta_midia_nome: respondendoA?.midia_nome || null,
                    resposta_midia_url: respondendoA?.midia_url || null,
                }).select('id, autor_id, autor_nome, autor_avatar_url, texto, midia_url, midia_tipo, midia_nome, resposta_mensagem_id, resposta_autor_nome, resposta_texto, resposta_midia_tipo, resposta_midia_nome, resposta_midia_url, editada, criado_em').single();

            if (resultado.error) throw resultado.error;

            envioBloqueadoRef.current = true;
            window.setTimeout(() => { envioBloqueadoRef.current = false; }, 1200);
            setMensagens((atuais) => salvandoEdicao
                ? atuais.map((item) => item.id === editandoId ? resultado.data : item)
                : atuais.some((item) => item.id === resultado.data.id) ? atuais : [...atuais, resultado.data]);
            if (!figurinha) {
                setTexto('');
                limparArquivoSelecionado();
            }
            if (!figurinha) setEditandoId(null);
            setRespondendoA(null);
        } catch (error) {
            deveIrParaOFimRef.current = false;
            if (caminhoMidia) await supabase.storage.from('midias').remove([caminhoMidia]).catch(() => {});
            console.error('Erro ao enviar mensagem:', error);
            setErro(`Não foi possível enviar a mensagem: ${error.message || 'execute a migration do chat.'}`);
        }
        setEnviando(false);
        setStatusEnvio('');
    }

    function iniciarEdicao(mensagem) {
        setEditandoId(mensagem.id);
        setTexto(mensagem.texto);
        limparArquivoSelecionado();
        setRespondendoA(null);
    }

    function iniciarResposta(mensagem) {
        setEditandoId(null);
        setRespondendoA({ ...mensagem, texto: textoDeResposta(mensagem) });
        requestAnimationFrame(() => document.getElementById('mensagem-chat-global')?.focus());
    }

    function irParaMensagemOriginal(mensagemId) {
        if (!mensagemId) return;
        const mensagemOriginal = Array.from(document.querySelectorAll('[data-chat-mensagem-id]'))
            .find((elemento) => elemento.dataset.chatMensagemId === mensagemId);
        if (!mensagemOriginal) {
            setErro('A mensagem original não está no histórico carregado.');
            return;
        }

        usuarioNoFimRef.current = false;
        mensagemOriginal.scrollIntoView({ behavior: 'smooth', block: 'center' });
        mensagemOriginal.classList.remove('chat-mensagem-destacada');
        requestAnimationFrame(() => {
            mensagemOriginal.classList.add('chat-mensagem-destacada');
            window.setTimeout(() => mensagemOriginal.classList.remove('chat-mensagem-destacada'), 1800);
        });
    }

    function selecionarArquivo(evento) {
        const arquivo = evento.target.files?.[0] ?? null;
        evento.target.value = '';
        if (!arquivo) return;

        const limite = arquivo.type.startsWith('audio/') ? 15 : 50;
        if (!['image/', 'video/', 'audio/'].some((tipo) => arquivo.type.startsWith(tipo))) {
            setErro('Escolha uma imagem, vídeo ou áudio válido.');
            return;
        }
        if (arquivo.size > limite * 1024 * 1024) {
            setErro(`Esse arquivo precisa ter no máximo ${limite} MB.`);
            return;
        }

        limparArquivoSelecionado();
        const preview = arquivo.type.startsWith('image/') || arquivo.type.startsWith('video/')
            ? URL.createObjectURL(arquivo)
            : '';
        arquivoPreviewRef.current = preview;
        setArquivoPreviewUrl(preview);
        setErro('');
        setArquivoSelecionado(arquivo);
        requestAnimationFrame(() => document.getElementById('mensagem-chat-global')?.focus());
    }

    async function adicionarFigurinha(evento) {
        const arquivo = evento.target.files?.[0] ?? null;
        evento.target.value = '';
        if (!arquivo) return;

        const tiposPermitidos = new Map([
            ['image/gif', 'gif'],
            ['image/jpeg', 'jpg'],
            ['image/png', 'png'],
            ['image/webp', 'webp'],
        ]);
        const extensao = tiposPermitidos.get(arquivo.type);
        if (!extensao) {
            setErro('Escolha uma figurinha em GIF, PNG, JPG ou WebP.');
            return;
        }
        if (arquivo.size > 5 * 1024 * 1024) {
            setErro('A figurinha precisa ter no máximo 5 MB.');
            return;
        }
        if (figurinhasDoUsuario.length >= 100) {
            setErro('Sua coleção chegou ao limite de 100 figurinhas.');
            return;
        }

        setAdicionandoFigurinha(true);
        setErro('');
        const caminho = `${user.id}/${gerarIdUnico()}.${extensao}`;
        let arquivoEnviado = false;
        try {
            const upload = await supabase.storage.from('figurinhas-chat').upload(caminho, arquivo, {
                contentType: arquivo.type,
                cacheControl: '31536000',
                upsert: false,
            });
            if (upload.error) throw upload.error;
            arquivoEnviado = true;

            const { data: urlPublica } = supabase.storage.from('figurinhas-chat').getPublicUrl(caminho);
            const resultado = await supabase.from('figurinhas_chat').insert({
                autor_id: user.id,
                midia_url: urlPublica.publicUrl,
                midia_path: caminho,
                midia_tipo: arquivo.type,
                midia_nome: arquivo.name.slice(0, 120) || 'figurinha',
            }).select('id, midia_url, midia_path, midia_tipo, midia_nome, criado_em').single();
            if (resultado.error) throw resultado.error;

            setFigurinhasSalvas((atuais) => [resultado.data, ...atuais]);
        } catch (error) {
            if (arquivoEnviado) {
                try {
                    const { error: erroRemocao } = await supabase.storage.from('figurinhas-chat').remove([caminho]);
                    if (erroRemocao) console.error('Não foi possível limpar o arquivo da figurinha após falha:', erroRemocao);
                } catch (erroLimpeza) {
                    console.error('Não foi possível limpar o arquivo da figurinha após falha:', erroLimpeza);
                }
            }
            console.error('Erro ao adicionar figurinha ao chat:', error);
            setErro(`Não foi possível adicionar a figurinha: ${error.message || 'confira a configuração do Supabase.'}`);
        } finally {
            setAdicionandoFigurinha(false);
        }
    }

    function limparArquivoSelecionado() {
        if (arquivoPreviewRef.current) URL.revokeObjectURL(arquivoPreviewRef.current);
        arquivoPreviewRef.current = '';
        setArquivoPreviewUrl('');
        setArquivoSelecionado(null);
    }

    async function alternarGravacaoAudio() {
        if (gravandoAudio) {
            gravadorAudioRef.current?.stop();
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            setErro('Seu navegador não permite gravação de áudio.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const formatosAudio = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
            const formatoAudio = typeof MediaRecorder.isTypeSupported === 'function'
                ? formatosAudio.find((formato) => MediaRecorder.isTypeSupported(formato))
                : '';
            const gravador = formatoAudio
                ? new MediaRecorder(stream, { mimeType: formatoAudio })
                : new MediaRecorder(stream);
            partesAudioRef.current = [];
            gravadorAudioRef.current = gravador;

            gravador.ondataavailable = (evento) => {
                if (evento.data.size > 0) partesAudioRef.current.push(evento.data);
            };
            gravador.onstop = () => {
                const tipoAudio = gravador.mimeType || formatoAudio || 'audio/webm';
                const extensaoAudio = tipoAudio.includes('mp4') ? 'm4a' : 'webm';
                const audio = new Blob(partesAudioRef.current, { type: tipoAudio });
                limparArquivoSelecionado();
                setArquivoSelecionado(new File([audio], `audio-chat-${gerarIdUnico()}.${extensaoAudio}`, { type: audio.type }));
                requestAnimationFrame(() => document.getElementById('mensagem-chat-global')?.focus());
                stream.getTracks().forEach((track) => track.stop());
                gravadorAudioRef.current = null;
                setGravandoAudio(false);
                atualizarStatusPresenca({ gravando_audio: false });
            };
            gravador.onerror = () => {
                stream.getTracks().forEach((track) => track.stop());
                gravadorAudioRef.current = null;
                setGravandoAudio(false);
                atualizarStatusPresenca({ gravando_audio: false });
                setErro('Não foi possível gravar o áudio.');
            };

            gravador.start();
            setErro('');
            setGravandoAudio(true);
            atualizarStatusPresenca({ digitando: false, gravando_audio: true });
        } catch (error) {
            console.error('Erro ao iniciar gravação de áudio:', error);
            setErro('Autorize o microfone para gravar um áudio.');
        }
    }

    async function excluirMensagem(mensagem) {
        if (!window.confirm('Excluir esta mensagem para todos?')) return;
        const { error } = await supabase.from('mensagens_chat').delete().eq('id', mensagem.id).eq('autor_id', user.id);
        if (error) {
            setErro('Não foi possível excluir a mensagem.');
            return;
        }
        setMensagens((atuais) => atuais.filter((item) => item.id !== mensagem.id));
    }

    const midiasGaleria = mensagens
        .filter((mensagem) => (mensagem.midia_tipo?.startsWith('image/') || mensagem.midia_tipo?.startsWith('video/')) && mensagem.midia_url)
        .map((mensagem) => ({
            url: mensagem.midia_url,
            nome: mensagem.midia_nome || 'Imagem enviada no chat',
            id: mensagem.id,
            tipo: mensagem.midia_tipo,
        }));
    const midiaAmpliada = midiaAmpliadaIndex === null ? null : midiasGaleria[midiaAmpliadaIndex];

    function navegarGaleria(direcao) {
        if (!midiasGaleria.length) return;
        setMidiaAmpliadaIndex((indiceAtual) => {
            const indice = indiceAtual ?? 0;
            return (indice + direcao + midiasGaleria.length) % midiasGaleria.length;
        });
    }

    const nomeUsuario = user?.user_metadata?.display_name || 'Viciado em Souls';
    const avatarUsuario = user?.user_metadata?.avatar_url || null;

    // Você sempre aparece na lista, mesmo antes da presença sincronizar.
    const membrosVisiveis = user && !membrosOnline.some((membro) => membro.autor_id === user.id)
        ? [{ autor_id: user.id, autor_nome: nomeUsuario, autor_avatar_url: avatarUsuario }, ...membrosOnline]
        : membrosOnline;
    const itensMensagens = organizarMensagens(mensagens);

    function abrirPerfil(autorId) {
        if (autorId) navigate(`/perfil/${autorId}`);
    }

    function cancelarComposicao() {
        setRespondendoA(null);
        if (editandoId) {
            setEditandoId(null);
            setTexto('');
        }
    }

    function renderAvatar(url, nome, classe) {
        return url
            ? <img className={classe} src={url} alt="" />
            : <span className={`${classe} cg-avatar-inicial`} aria-hidden="true">{inicialDoNome(nome)}</span>;
    }

    if (!carregandoAuth && !user) {
        return (
            <div className="cg-app cg-app-visitante">
                <div className="cg-visitante-arte" aria-hidden="true">
                    <ImagemDecorativaAdiada
                        src="/svg-animado/lua-bloodborne-banner-1760x575.svg"
                        alt=""
                        className="cg-visitante-arte-imagem"
                    />
                </div>
                <button className="cg-voltar cg-visitante-voltar" type="button" onClick={() => navigate('/')}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
                    Comunidade
                </button>
                <section className="cg-visitante-cartao" aria-labelledby="cg-visitante-titulo">
                    <span className="cg-visitante-icone" aria-hidden="true">#</span>
                    <span className="cg-visitante-canal">Chat da comunidade · #geral</span>
                    <h1 id="cg-visitante-titulo">A conversa começa aqui</h1>
                    <p>Troque ideias sobre seus jogos, compartilhe suas builds e converse com a comunidade em tempo real.</p>
                    <button className="cg-botao-primario" type="button" onClick={() => navigate('/login', { state: { returnTo: '/chat' } })}>
                        Entrar ou criar conta
                    </button>
                    <span className="cg-visitante-nota">É preciso ter uma conta para enviar mensagens.</span>
                </section>
            </div>
        );
    }

    return (
        <div className={`cg-app${membrosAbertos ? ' cg-membros-abertos' : ''}`}>
            <nav className="cg-lateral" aria-label="Navegação do chat">
                <div className="cg-lateral-marca">Viciados em Souls</div>

                <div className="cg-lateral-secao">
                    <span className="cg-lateral-titulo">Canais</span>
                    <button className="cg-canal ativo" type="button" aria-current="page">
                        <span aria-hidden="true">#</span>geral
                    </button>
                </div>

                <div className="cg-lateral-secao">
                    <span className="cg-lateral-titulo">Atalhos</span>
                    <button className="cg-canal" type="button" onClick={() => navigate('/mensagens')}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 3.5V5Z" /></svg>
                        Mensagens privadas
                    </button>
                    <button className="cg-canal" type="button" onClick={() => navigate('/')}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5" /></svg>
                        Voltar à comunidade
                    </button>
                </div>

                {user && (
                    <button className="cg-eu" type="button" onClick={() => navigate('/perfil')}>
                        <span className="cg-avatar-com-status">
                            {renderAvatar(avatarUsuario, nomeUsuario, 'cg-avatar cg-avatar-p')}
                            <i className="cg-status-online" aria-hidden="true" />
                        </span>
                        <span className="cg-eu-texto">
                            <strong>{nomeUsuario}</strong>
                            <span>Online</span>
                        </span>
                    </button>
                )}
            </nav>

            <main className="cg-conversa" aria-label="Chat global">
                <header className="cg-conversa-topo">
                    <button className="cg-voltar cg-voltar-compacto" type="button" onClick={() => navigate('/')} aria-label="Voltar à comunidade">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
                    </button>
                    <span className="cg-hash" aria-hidden="true">#</span>
                    <div className="cg-conversa-titulo">
                        <h1>geral</h1>
                        <p>Conversa da comunidade em um só lugar</p>
                    </div>
                    <button
                        className="cg-online"
                        type="button"
                        onClick={() => setMembrosAbertos((abertos) => !abertos)}
                        aria-label="Mostrar membros"
                        aria-expanded={membrosAbertos}
                    >
                        <i className="cg-status-online" aria-hidden="true" />
                        {membrosVisiveis.length} online
                    </button>
                </header>

                <div
                    className="cg-mensagens"
                    ref={mensagensRef}
                    onScroll={acompanharRolagemMensagens}
                    role="log"
                    aria-live="polite"
                >
                    {carregando ? (
                        <div className="cg-carregando" role="status" aria-label="Carregando mensagens">
                            {Array.from({ length: 5 }, (_, indice) => (
                                <div key={indice} className={`cg-carregando-linha${indice % 2 ? ' cg-carregando-propria' : ''}`}>
                                    <span className="cg-carregando-avatar" />
                                    <span className="cg-carregando-bolha" style={{ width: `${40 + ((indice * 17) % 35)}%` }} />
                                </div>
                            ))}
                        </div>
                    ) : mensagens.length === 0 ? (
                        <div className="cg-vazio">
                            <span className="cg-vazio-icone" aria-hidden="true">#</span>
                            <h2>Bem-vindo ao #geral</h2>
                            <p>Ninguém falou nada ainda. Mande a primeira mensagem e puxe assunto com a comunidade.</p>
                        </div>
                    ) : (
                        <>
                            <div className="cg-inicio-canal">
                                <span className="cg-vazio-icone" aria-hidden="true">#</span>
                                <h2>Bem-vindo ao #geral</h2>
                                <p>Este é o começo das últimas mensagens do canal. Respeito em primeiro lugar.</p>
                            </div>
                            {itensMensagens.map(({ mensagem, novoDia, agrupada }) => {
                                const propria = mensagem.autor_id === user?.id;
                                const figurinha = obterFigurinha(mensagem.texto);
                                const nomeAutor = mensagem.autor_nome || 'Viciado em Souls';
                                const temTexto = !figurinha && mensagem.texto?.trim();
                                const soMidia = Boolean(mensagem.midia_url && !figurinha && !temTexto && !mensagem.midia_tipo?.startsWith('audio/'));
                                const temResposta = Boolean(mensagem.resposta_texto || mensagem.resposta_midia_tipo);

                                return (
                                    <div key={mensagem.id} className="cg-mensagem-bloco">
                                        {novoDia && (
                                            <div className="cg-dia" role="separator">
                                                <span>{rotuloDoDia(mensagem.criado_em)}</span>
                                            </div>
                                        )}
                                        <div
                                            data-chat-mensagem-id={mensagem.id}
                                            className={`cg-msg${propria ? ' cg-msg-propria' : ''}${agrupada ? ' cg-msg-agrupada' : ''}${respondendoA?.id === mensagem.id ? ' cg-msg-sendo-respondida' : ''}`}
                                            tabIndex={0}
                                        >
                                            {!propria && (
                                                agrupada ? (
                                                    <span className="cg-msg-avatar-espaco" aria-hidden="true" />
                                                ) : (
                                                    <button
                                                        className="cg-msg-avatar"
                                                        type="button"
                                                        onClick={() => abrirPerfil(mensagem.autor_id)}
                                                        aria-label={`Abrir perfil de ${nomeAutor}`}
                                                    >
                                                        {renderAvatar(mensagem.autor_avatar_url, nomeAutor, 'cg-avatar')}
                                                    </button>
                                                )
                                            )}

                                            <div className="cg-msg-corpo">
                                                {!propria && !agrupada && (
                                                    <button className="cg-msg-autor" type="button" onClick={() => abrirPerfil(mensagem.autor_id)}>
                                                        {nomeAutor}
                                                    </button>
                                                )}

                                                <div className={`cg-bolha${figurinha ? ' cg-bolha-figurinha' : ''}${soMidia ? ' cg-bolha-midia' : ''}`}>
                                                    {temResposta && (
                                                        <button
                                                            className="cg-citacao"
                                                            type="button"
                                                            onClick={() => irParaMensagemOriginal(mensagem.resposta_mensagem_id)}
                                                            disabled={!mensagem.resposta_mensagem_id}
                                                            aria-label="Ir para a mensagem respondida"
                                                        >
                                                            <strong>{mensagem.resposta_autor_nome || 'Mensagem respondida'}</strong>
                                                            {mensagem.resposta_midia_tipo
                                                                ? <PreviewMidiaRespondida tipo={mensagem.resposta_midia_tipo} url={mensagem.resposta_midia_url} texto={mensagem.resposta_texto} />
                                                                : <span>{mensagem.resposta_texto}</span>}
                                                        </button>
                                                    )}

                                                    {figurinha && mensagem.midia_url && (
                                                        <button
                                                            className="cg-figurinha"
                                                            type="button"
                                                            onClick={() => setMidiaAmpliadaIndex(midiasGaleria.findIndex((midia) => midia.id === mensagem.id))}
                                                            aria-label="Ampliar figurinha"
                                                        >
                                                            <img src={mensagem.midia_url} alt={mensagem.midia_nome || 'Figurinha enviada no chat'} loading="lazy" onLoad={manterNoFim} />
                                                        </button>
                                                    )}

                                                    {mensagem.midia_url && !figurinha && (
                                                        <div className="cg-midia">
                                                            {mensagem.midia_tipo?.startsWith('image/') && (
                                                                <button
                                                                    className="cg-midia-botao"
                                                                    type="button"
                                                                    onClick={() => setMidiaAmpliadaIndex(midiasGaleria.findIndex((midia) => midia.id === mensagem.id))}
                                                                    aria-label="Ampliar imagem"
                                                                >
                                                                    <img src={mensagem.midia_url} alt={mensagem.midia_nome || 'Imagem enviada no chat'} loading="lazy" onLoad={manterNoFim} />
                                                                </button>
                                                            )}
                                                            {mensagem.midia_tipo?.startsWith('video/') && (
                                                                <button
                                                                    className="cg-midia-botao cg-midia-video"
                                                                    type="button"
                                                                    onClick={() => setMidiaAmpliadaIndex(midiasGaleria.findIndex((midia) => midia.id === mensagem.id))}
                                                                    aria-label="Abrir vídeo em tela cheia"
                                                                >
                                                                    <video src={`${mensagem.midia_url}#t=0.1`} muted playsInline preload="metadata" onLoadedMetadata={manterNoFim} />
                                                                    <span aria-hidden="true">
                                                                        <svg viewBox="0 0 16 16"><path d="M5 3.5v9l7-4.5-7-4.5Z" fill="currentColor" /></svg>
                                                                    </span>
                                                                </button>
                                                            )}
                                                            {mensagem.midia_tipo?.startsWith('audio/') && <AudioMensagemChat src={mensagem.midia_url} />}
                                                        </div>
                                                    )}

                                                    {figurinha?.emojiAntigo && (
                                                        <span className="cg-figurinha-antiga" role="img" aria-label="Figurinha antiga">{figurinha.emojiAntigo}</span>
                                                    )}

                                                    {temTexto && <p className="cg-texto">{mensagem.texto}</p>}

                                                    <span className="cg-bolha-meta">
                                                        {mensagem.editada && <span>editada</span>}
                                                        <time dateTime={mensagem.criado_em}>{formatarHora(mensagem.criado_em)}</time>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="cg-msg-acoes" role="toolbar" aria-label="Ações da mensagem">
                                                <button type="button" onClick={() => iniciarResposta(mensagem)} aria-label="Responder" title="Responder">
                                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
                                                </button>
                                                {propria && !figurinha && (
                                                    <button type="button" onClick={() => iniciarEdicao(mensagem)} aria-label="Editar" title="Editar">
                                                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>
                                                    </button>
                                                )}
                                                {propria && (
                                                    <button className="cg-acao-perigo" type="button" onClick={() => excluirMensagem(mensagem)} aria-label="Excluir" title="Excluir">
                                                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>

                {novasMensagens > 0 && (
                    <button className="cg-novas" type="button" onClick={irParaNovasMensagens}>
                        {novasMensagens} {novasMensagens === 1 ? 'nova mensagem' : 'novas mensagens'}
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
                    </button>
                )}

                <div className="cg-rodape">
                    <div className="cg-atividade" role="status">
                        {enviando ? (
                            <><span className="cg-girando" aria-hidden="true" />{statusEnvio || 'Enviando mensagem...'}</>
                        ) : textoAtividadeChat ? (
                            <><span className={`cg-pontinhos${pessoasGravandoAudio.length ? ' gravando' : ''}`} aria-hidden="true"><i /><i /><i /></span>{textoAtividadeChat}</>
                        ) : null}
                    </div>

                    <form className="cg-composer" onSubmit={enviarMensagem}>
                        {editandoId && (
                            <div className="cg-faixa">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z" /></svg>
                                <div><strong>Editando mensagem</strong><span>Esc para cancelar</span></div>
                                <button type="button" onClick={cancelarComposicao} aria-label="Cancelar edição">×</button>
                            </div>
                        )}
                        {respondendoA && (
                            <div className="cg-respondendo">
                                <div className="cg-respondendo-conteudo">
                                    <span className="cg-respondendo-rotulo">
                                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
                                        Respondendo a <strong>{respondendoA.autor_id === user?.id ? 'você mesmo' : respondendoA.autor_nome || 'Viciado em Souls'}</strong>
                                    </span>
                                    <span className="cg-respondendo-trecho">{resumoDaResposta(respondendoA)}</span>
                                </div>
                                {respondendoA.midia_url && (respondendoA.midia_tipo?.startsWith('image/') || respondendoA.midia_tipo?.startsWith('video/')) && (
                                    respondendoA.midia_tipo.startsWith('video/')
                                        ? <video className="cg-respondendo-miniatura" src={`${respondendoA.midia_url}#t=0.1`} muted playsInline preload="metadata" aria-hidden="true" />
                                        : <img className="cg-respondendo-miniatura" src={respondendoA.midia_url} alt="" />
                                )}
                                <button className="cg-respondendo-fechar" type="button" onClick={() => setRespondendoA(null)} aria-label="Cancelar resposta" title="Cancelar (Esc)">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                                </button>
                            </div>
                        )}
                        {arquivoSelecionado && (
                            <div className="cg-faixa cg-faixa-anexo">
                                {arquivoPreviewUrl && arquivoSelecionado.type.startsWith('image/') && <img src={arquivoPreviewUrl} alt="Prévia do anexo" />}
                                {arquivoPreviewUrl && arquivoSelecionado.type.startsWith('video/') && <video src={arquivoPreviewUrl} muted />}
                                {!arquivoPreviewUrl && (
                                    <span className="cg-faixa-anexo-icone" aria-hidden="true">
                                        <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
                                    </span>
                                )}
                                <div>
                                    <strong>{arquivoSelecionado.type.startsWith('audio/') ? 'Áudio pronto para enviar' : 'Anexo'}</strong>
                                    <span>{arquivoSelecionado.name}</span>
                                </div>
                                <button type="button" onClick={limparArquivoSelecionado} aria-label="Remover arquivo anexado">×</button>
                            </div>
                        )}

                        <div className="cg-composer-linha">
                            <input
                                id="arquivo-chat-global"
                                className="cg-arquivo-oculto"
                                type="file"
                                accept="image/*,video/*,audio/*"
                                onChange={selecionarArquivo}
                                disabled={enviando || gravandoAudio}
                            />
                            <button
                                type="button"
                                className="cg-icone-botao"
                                aria-label="Anexar imagem, vídeo ou áudio"
                                title="Anexar"
                                onClick={() => document.getElementById('arquivo-chat-global')?.click()}
                                disabled={enviando || gravandoAudio}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                            </button>

                            <label htmlFor="mensagem-chat-global" className="cg-sr">Mensagem para #geral</label>
                            <textarea
                                ref={campoMensagemRef}
                                id="mensagem-chat-global"
                                rows="1"
                                value={texto}
                                onChange={(evento) => setTexto(evento.target.value)}
                                onKeyDown={(evento) => {
                                    if (evento.key === 'Enter' && !evento.shiftKey) enviarMensagem(evento);
                                    if (evento.key === 'Escape') cancelarComposicao();
                                }}
                                placeholder={gravandoAudio ? 'Gravando áudio... toque no microfone para parar' : 'Conversar em #geral'}
                                maxLength={500}
                                disabled={gravandoAudio}
                            />

                            <div className="cg-figurinhas">
                                {figurinhasAbertas && (
                                    <div className="cg-figurinhas-painel" role="dialog" aria-label="Minhas figurinhas">
                                        <div className="cg-figurinhas-topo">
                                            <strong>Figurinhas</strong>
                                            <label className="cg-figurinhas-adicionar">
                                                <input type="file" accept="image/gif,image/jpeg,image/png,image/webp" onChange={adicionarFigurinha} disabled={adicionandoFigurinha || figurinhasDoUsuario.length >= 100} />
                                                {adicionandoFigurinha ? 'Adicionando...' : '+ Adicionar'}
                                            </label>
                                        </div>
                                        <label className="cg-figurinhas-busca">
                                            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
                                            <input type="search" value={buscaFigurinha} onChange={(evento) => setBuscaFigurinha(evento.target.value)} placeholder="Pesquisar figurinhas" aria-label="Pesquisar nas minhas figurinhas" />
                                        </label>
                                        {carregandoFigurinhas ? (
                                            <p className="cg-figurinhas-vazio">Carregando sua coleção...</p>
                                        ) : figurinhasFiltradas.length ? (
                                            <div className="cg-figurinhas-grade">
                                                {figurinhasFiltradas.map((figurinha) => (
                                                    <button key={figurinha.id} type="button" title={figurinha.midia_nome} aria-label={`Enviar figurinha: ${figurinha.midia_nome}`} disabled={enviando} onClick={() => { setFigurinhasAbertas(false); enviarMensagem(null, figurinha); }}>
                                                        <img src={figurinha.midia_url} alt="" loading="lazy" />
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="cg-figurinhas-vazio">{buscaFigurinha ? 'Nenhuma figurinha encontrada.' : 'Sua coleção está vazia. Adicione uma imagem ou GIF para começar.'}</p>
                                        )}
                                    </div>
                                )}
                                <button
                                    className="cg-icone-botao"
                                    type="button"
                                    onClick={() => setFigurinhasAbertas((aberto) => !aberto)}
                                    aria-label="Abrir figurinhas"
                                    title="Figurinhas"
                                    aria-expanded={figurinhasAbertas}
                                >
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01" /></svg>
                                </button>
                            </div>

                            <button
                                type="button"
                                className={`cg-icone-botao${gravandoAudio ? ' cg-gravando' : ''}`}
                                aria-label={gravandoAudio ? 'Parar gravação de áudio' : 'Gravar áudio'}
                                title={gravandoAudio ? 'Parar gravação' : 'Gravar áudio'}
                                aria-pressed={gravandoAudio}
                                onClick={alternarGravacaoAudio}
                                disabled={enviando}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" /></svg>
                            </button>

                            <button
                                type="submit"
                                className="cg-enviar"
                                disabled={(!texto.trim() && !arquivoSelecionado) || enviando}
                                aria-label={editandoId ? 'Salvar edição' : 'Enviar mensagem'}
                                title={editandoId ? 'Salvar' : 'Enviar'}
                            >
                                {editandoId ? (
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5L20 7" /></svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 20 4l-6 16-3-7-7-1Z" /></svg>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="cg-composer-dicas">
                        {erro ? (
                            <p className="cg-erro" role="alert">{erro}</p>
                        ) : (
                            <span>Enter envia · Shift + Enter quebra a linha</span>
                        )}
                        {texto.length > 400 && <span className="cg-contador">{texto.length}/500</span>}
                    </div>
                </div>
            </main>

            <button className="cg-membros-fundo" type="button" aria-label="Fechar membros" onClick={() => setMembrosAbertos(false)} tabIndex={-1} />
            <aside className="cg-membros" aria-label="Membros online">
                <div className="cg-membros-topo">
                    <span>Online — {membrosVisiveis.length}</span>
                    <button className="cg-membros-fechar" type="button" onClick={() => setMembrosAbertos(false)} aria-label="Fechar membros">×</button>
                </div>
                <div className="cg-membros-lista">
                    {membrosVisiveis.map((membro) => {
                        const status = membro.autor_id === user?.id
                            ? 'você'
                            : membro.gravando_audio
                                ? 'gravando áudio...'
                                : membro.digitando
                                    ? 'digitando...'
                                    : 'online';

                        return (
                            <button className="cg-membro" type="button" key={membro.autor_id} onClick={() => abrirPerfil(membro.autor_id)}>
                                <span className="cg-avatar-com-status">
                                    {renderAvatar(membro.autor_avatar_url, membro.autor_nome, 'cg-avatar cg-avatar-p')}
                                    <i className="cg-status-online" aria-hidden="true" />
                                </span>
                                <span className="cg-membro-texto">
                                    <strong>{membro.autor_nome || 'Viciado em Souls'}</strong>
                                    <span className={membro.digitando || membro.gravando_audio ? 'cg-membro-ativo' : ''}>{status}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </aside>

            {midiaAmpliada && (
                <div className="chat-global-image-viewer" role="dialog" aria-modal="true" aria-label="Galeria de mídias do chat" onClick={() => setMidiaAmpliadaIndex(null)}>
                    <button type="button" className="chat-global-image-viewer-close" onClick={() => setMidiaAmpliadaIndex(null)} aria-label="Fechar visualizador">×</button>
                    <button type="button" className="chat-global-image-viewer-prev" onClick={(evento) => { evento.stopPropagation(); navegarGaleria(-1); }} aria-label="Mídia anterior">‹</button>
                    {midiaAmpliada.tipo?.startsWith('video/')
                        ? <video className="chat-global-image-viewer-media chat-global-image-viewer-video" src={midiaAmpliada.url} controls playsInline muted={false} preload="auto" onClick={(evento) => evento.stopPropagation()} />
                        : <img className="chat-global-image-viewer-media" src={midiaAmpliada.url} alt={midiaAmpliada.nome} onClick={(evento) => evento.stopPropagation()} />}
                    <button type="button" className="chat-global-image-viewer-next" onClick={(evento) => { evento.stopPropagation(); navegarGaleria(1); }} aria-label="Próxima mídia">›</button>
                    <div className="chat-global-image-thumbnails" onClick={(evento) => evento.stopPropagation()}>
                        {midiasGaleria.map((midia, indice) => (
                            <button className={indice === midiaAmpliadaIndex ? 'ativo' : ''} type="button" key={midia.id} onClick={() => setMidiaAmpliadaIndex(indice)} aria-label={`Abrir ${midia.tipo?.startsWith('video/') ? 'vídeo' : 'imagem'} ${indice + 1}`}>
                                {midia.tipo?.startsWith('video/') ? <video src={midia.url} muted playsInline preload="metadata" /> : <img src={midia.url} alt="" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function formatarDuracaoAudio(segundos) {
    if (!Number.isFinite(segundos) || segundos <= 0) return '0:00';
    const minutos = Math.floor(segundos / 60);
    const segundosRestantes = Math.floor(segundos % 60).toString().padStart(2, '0');
    return `${minutos}:${segundosRestantes}`;
}

// Texto curto para a faixa "Respondendo a": mídias ganham um nome em vez de ficarem em branco.
function resumoDaResposta(mensagem) {
    if (mensagem.texto?.trim()) return mensagem.texto.trim();
    if (mensagem.midia_tipo?.startsWith('image/')) return 'Foto';
    if (mensagem.midia_tipo?.startsWith('video/')) return 'Vídeo';
    if (mensagem.midia_tipo?.startsWith('audio/')) return 'Áudio';
    return 'Mensagem';
}

function textoDeResposta(mensagem) {
    const figurinha = obterFigurinha(mensagem.texto);
    if (figurinha) return 'Figurinha enviada';
    if (mensagem.texto?.trim()) return mensagem.texto.trim();
    if (mensagem.midia_tipo?.startsWith('audio/')) return '♫ Áudio enviado';
    if (mensagem.midia_tipo?.startsWith('image/') || mensagem.midia_tipo?.startsWith('video/')) return '';
    return 'Mídia enviada';
}

export default ChatGlobal;
