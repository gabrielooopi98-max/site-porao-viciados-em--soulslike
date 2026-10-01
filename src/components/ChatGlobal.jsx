import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/useAuth';
import { gerarIdUnico } from '../gerarIdUnico';
import ImagemDecorativaAdiada from './ImagemDecorativaAdiada';

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

function ChatGlobal() {
    const navigate = useNavigate();
    const { user, carregando: carregandoAuth } = useAuth();
    const [mensagens, setMensagens] = useState([]);
    const [membrosOnline, setMembrosOnline] = useState([]);
    const [texto, setTexto] = useState('');
    const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
    const [arquivoPreviewUrl, setArquivoPreviewUrl] = useState('');
    const [emotesAbertos, setEmotesAbertos] = useState(false);
    const [midiaAmpliadaIndex, setMidiaAmpliadaIndex] = useState(null);
    const [gravandoAudio, setGravandoAudio] = useState(false);
    const [carregando, setCarregando] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState('');
    const [editandoId, setEditandoId] = useState(null);
    const [respondendoA, setRespondendoA] = useState(null);
    const [sidebarAberta, setSidebarAberta] = useState(false);
    const [membrosAbertos, setMembrosAbertos] = useState(false);
    const [novasMensagens, setNovasMensagens] = useState(0);
    const mensagensRef = useRef(null);
    const gravadorAudioRef = useRef(null);
    const partesAudioRef = useRef([]);
    const arquivoPreviewRef = useRef('');
    const canalPresencaRef = useRef(null);
    const statusPresencaRef = useRef({ digitando: false, gravando_audio: false });
    const timerDigitandoRef = useRef(null);

    useEffect(() => () => {
        if (arquivoPreviewRef.current) URL.revokeObjectURL(arquivoPreviewRef.current);
    }, []);

    useEffect(() => {
        if (midiaAmpliadaIndex === null) return undefined;
        const overflowOriginal = document.body.style.overflow;
        const fecharComEscape = (evento) => {
            if (evento.key === 'Escape') setMidiaAmpliadaIndex(null);
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', fecharComEscape);
        return () => {
            document.body.style.overflow = overflowOriginal;
            window.removeEventListener('keydown', fecharComEscape);
        };
    }, [midiaAmpliadaIndex]);
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
        const canal = supabase
            .channel('chat-global-mensagens')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'mensagens_chat',
            }, (payload) => {
                if (!ativo) return;
                setMensagens((atuais) => {
                    if (payload.eventType === 'INSERT') {
                        return atuais.some((mensagem) => mensagem.id === payload.new.id)
                            ? atuais
                            : [...atuais, payload.new];
                    }
                    if (payload.eventType === 'UPDATE') {
                        return atuais.map((mensagem) => mensagem.id === payload.new.id ? payload.new : mensagem);
                    }
                    if (payload.eventType === 'DELETE') {
                        return atuais.filter((mensagem) => mensagem.id !== payload.old.id);
                    }
                    return atuais;
                });
            })
            .subscribe();

        supabase
            .from('mensagens_chat')
            .select('id, autor_id, autor_nome, autor_avatar_url, texto, midia_url, midia_tipo, midia_nome, resposta_mensagem_id, resposta_autor_nome, resposta_texto, resposta_midia_tipo, resposta_midia_nome, criado_em')
            .order('criado_em', { ascending: true })
            .limit(100)
            .then(({ data, error }) => {
                if (!ativo) return;
                if (error) setErro(`Não foi possível carregar as mensagens: ${error.message || 'execute a migration do chat.'}`);
                setMensagens(data ?? []);
                setCarregando(false);
            });

        return () => {
            ativo = false;
            supabase.removeChannel(canal);
        };
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

    function acompanharRolagemMensagens(evento) {
        const container = evento.currentTarget;
        const distanciaAteOFim = container.scrollHeight - container.scrollTop - container.clientHeight;
        const chegouAoFim = distanciaAteOFim <= 36;
        usuarioNoFimRef.current = chegouAoFim;
        if (chegouAoFim) setNovasMensagens(0);
    }

    function irParaNovasMensagens() {
        const container = mensagensRef.current;
        if (!container) return;
        usuarioNoFimRef.current = true;
        setNovasMensagens(0);
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }

    async function enviarMensagem(evento) {
        evento.preventDefault();
        const mensagem = texto.trim();
        if (!user || (!mensagem && !arquivoSelecionado) || enviando) return;

        if (timerDigitandoRef.current) window.clearTimeout(timerDigitandoRef.current);
        timerDigitandoRef.current = null;
        atualizarStatusPresenca({ digitando: false });

        if (envioBloqueadoRef.current) {
            setErro('Aguarde um instante antes de enviar outra mensagem.');
            return;
        }

        setEnviando(true);
        setErro('');
        deveIrParaOFimRef.current = true;
        let caminhoMidia = null;
        try {
            let dadosMidia = {};
            if (!editandoId && arquivoSelecionado) {
                const extensao = arquivoSelecionado.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
                caminhoMidia = `chat/${user.id}/${gerarIdUnico()}.${extensao}`;
                const upload = await supabase.storage.from('midias').upload(caminhoMidia, arquivoSelecionado, {
                    contentType: arquivoSelecionado.type,
                    upsert: false,
                });
                if (upload.error) throw upload.error;
                const { data: urlPublica } = supabase.storage.from('midias').getPublicUrl(caminhoMidia);
                dadosMidia = {
                    midia_url: urlPublica.publicUrl,
                    midia_tipo: arquivoSelecionado.type,
                    midia_nome: arquivoSelecionado.name,
                };
            }

            const resultado = editandoId
                ? await supabase.from('mensagens_chat').update({ texto: mensagem }).eq('id', editandoId).eq('autor_id', user.id).select().single()
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
                }).select('id, autor_id, autor_nome, autor_avatar_url, texto, midia_url, midia_tipo, midia_nome, resposta_mensagem_id, resposta_autor_nome, resposta_texto, resposta_midia_tipo, resposta_midia_nome, criado_em').single();

            if (resultado.error) throw resultado.error;

            envioBloqueadoRef.current = true;
            window.setTimeout(() => { envioBloqueadoRef.current = false; }, 1200);
            setMensagens((atuais) => editandoId
                ? atuais.map((item) => item.id === editandoId ? { ...item, texto: mensagem } : item)
                : atuais.some((item) => item.id === resultado.data.id) ? atuais : [...atuais, resultado.data]);
            setTexto('');
            limparArquivoSelecionado();
            setEditandoId(null);
            setRespondendoA(null);
        } catch (error) {
            deveIrParaOFimRef.current = false;
            if (caminhoMidia) await supabase.storage.from('midias').remove([caminhoMidia]);
            console.error('Erro ao enviar mensagem:', error);
            setErro(`Não foi possível enviar a mensagem: ${error.message || 'execute a migration do chat.'}`);
        }
        setEnviando(false);
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

    function limparArquivoSelecionado() {
        if (arquivoPreviewRef.current) URL.revokeObjectURL(arquivoPreviewRef.current);
        arquivoPreviewRef.current = '';
        setArquivoPreviewUrl('');
        setArquivoSelecionado(null);
    }

    function inserirEmote(emote) {
        setTexto((atual) => `${atual}${emote}`);
        setEmotesAbertos(false);
        requestAnimationFrame(() => document.getElementById('mensagem-chat-global')?.focus());
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
        const { error } = await supabase.from('mensagens_chat').delete().eq('id', mensagem.id).eq('autor_id', user.id);
        if (error) {
            setErro('Não foi possível excluir a mensagem.');
            return;
        }
        setMensagens((atuais) => atuais.filter((item) => item.id !== mensagem.id));
    }

    const midiasGaleria = mensagens
        .filter((mensagem) => mensagem.midia_tipo?.startsWith('image/') && mensagem.midia_url)
        .map((mensagem) => ({
            url: mensagem.midia_url,
            nome: mensagem.midia_nome || 'Imagem enviada no chat',
            id: mensagem.id,
        }));
    const imagemAmpliada = midiaAmpliadaIndex === null ? null : midiasGaleria[midiaAmpliadaIndex];

    function navegarGaleria(direcao) {
        if (!midiasGaleria.length) return;
        setMidiaAmpliadaIndex((indiceAtual) => {
            const indice = indiceAtual ?? 0;
            return (indice + direcao + midiasGaleria.length) % midiasGaleria.length;
        });
    }

    return (
        <>
            <header className="area-header chat-global-header">
                <div className="barra-menu">
                    <div className="lado-esquerdo"><div className="area-logo-site"><p>Viciados Em Souls</p></div></div>
                    <div className="lado-direito">
                        <button className="btn-filtro" type="button" onClick={() => navigate('/')}>Voltar à comunidade</button>
                    </div>
                </div>
            </header>

            <main className="chat-global-page">
                <section className={`chat-global-room ${!carregandoAuth && !user ? 'chat-global-visitante' : ''} ${sidebarAberta ? 'chat-global-sidebar-ativa' : ''} ${membrosAbertos ? 'chat-global-membros-ativos' : ''}`} aria-label="Chat global">
                    {!carregandoAuth && !user ? (
                        <>
                            <div className="area-svg chat-global-visitor-art" aria-hidden="true">
                                <ImagemDecorativaAdiada
                                    src="/svg-animado/lua-bloodborne-banner-1760x575.svg"
                                    alt=""
                                    className="lua-pixel-art-banner"
                                />
                            </div>
                            <div className="chat-global-login">
                                <span className="chat-global-login-icon" aria-hidden="true">
                                    <svg viewBox="0 0 48 48" fill="none">
                                        <path d="M8 10.5h32v22H25l-10 7v-7H8v-22Z" />
                                        <path d="M16 19h16M16 25h11" />
                                    </svg>
                                </span>
                                <span className="chat-global-login-kicker">Chat da comunidade · #geral</span>
                                <h2>A conversa começa aqui</h2>
                                <p>Troque ideias sobre seus jogos, compartilhe suas builds e converse com a comunidade.</p>
                                <button className="chat-global-login-cta" type="button" onClick={() => navigate('/login', { state: { returnTo: '/chat' } })}>
                                    Entrar ou criar conta
                                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12M10 4l6 6-6 6" /></svg>
                                </button>
                                <span className="chat-global-login-note">É preciso ter uma conta para enviar mensagens.</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <aside className="chat-global-sidebar">
                                <div className="chat-global-server">
                                    <span className="chat-global-server-mark">VS</span>
                                    <div><strong>Viciados em Souls</strong><span>Comunidade brasileira</span></div>
                                    <button className="chat-global-panel-close" type="button" onClick={() => setSidebarAberta(false)} aria-label="Fechar canais">×</button>
                                </div>
                                <div className="chat-global-channel-section">
                                    <span className="chat-global-section-label">Canais de texto</span>
                                    <button className="chat-global-channel chat-global-channel-active" type="button"><span>#</span> geral</button>
                                    <button className="chat-global-channel" type="button" disabled><span>#</span> builds <small>em breve</small></button>
                                    <button className="chat-global-channel" type="button" disabled><span>#</span> conquistas <small>em breve</small></button>
                                </div>
                                <div className="chat-global-sidebar-footer">
                                    <span className="chat-global-presence-dot" />
                                    <div><strong>{user.user_metadata?.display_name || 'Viciado em Souls'}</strong><span>online</span></div>
                                </div>
                            </aside>

                            <div className="chat-global-main">
                                <header className="chat-global-channel-heading">
                                    <div className="chat-global-channel-title"><span>#</span><div><h1>geral</h1><p>Conversa da comunidade em um só lugar.</p></div></div>
                                    <div className="chat-global-channel-meta"><button className="chat-global-side-toggle chat-global-side-toggle-canais" type="button" onClick={() => setSidebarAberta((aberta) => !aberta)} aria-label="Abrir canais" aria-expanded={sidebarAberta}>Canais</button><span className="chat-global-online-dot" />{membrosOnline.length} online<button className="chat-global-side-toggle chat-global-side-toggle-membros" type="button" onClick={() => setMembrosAbertos((abertos) => !abertos)} aria-label="Abrir membros" aria-expanded={membrosAbertos}>Membros</button></div>
                                </header>
                                <div className={`chat-global-messages${mensagens.length === 0 && !carregando ? ' chat-global-messages-vazio' : ''}`} ref={mensagensRef} onScroll={acompanharRolagemMensagens} role="log" aria-live="polite">
                                    {carregando ? (
                                        <p className="chat-global-loading">Carregando mensagens...</p>
                                    ) : mensagens.length === 0 ? (
                                        <div className="chat-global-empty">
                                            <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 10.5h32v22H25l-10 7v-7H8v-22Z" /><path d="M16 19h16M16 25h11" /></svg>
                                            <h2>O chat está vazio</h2>
                                            <p>Seja a primeira pessoa a conversar com a comunidade.</p>
                                        </div>
                                    ) : mensagens.map((mensagem) => {
                                        const propria = mensagem.autor_id === user?.id;
                                        return (
                                            <div key={mensagem.id} data-chat-mensagem-id={mensagem.id} className={`chat-mensagem-item ${propria ? 'chat-mensagem-item-propria' : 'chat-mensagem-item-outra'}`}>
                                                <article className={`chat-mensagem ${propria ? 'chat-mensagem-propria' : 'chat-mensagem-outra'}`}>
                                                    <div className="chat-mensagem-cabecalho">
                                                        <button className="chat-global-profile-avatar" type="button" onClick={() => mensagem.autor_id && navigate(`/perfil/${mensagem.autor_id}`)} aria-label={`Abrir perfil de ${mensagem.autor_nome || 'Viciado em Souls'}`}>
                                                            {mensagem.autor_avatar_url ? <img src={mensagem.autor_avatar_url} alt="" /> : <span className="chat-mensagem-avatar-vazio" aria-hidden="true">?</span>}
                                                        </button>
                                                        <button className="chat-global-profile-name" type="button" onClick={() => mensagem.autor_id && navigate(`/perfil/${mensagem.autor_id}`)}>{mensagem.autor_nome || 'Viciado em Souls'}</button>
                                                        <time>{new Date(mensagem.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                                                    </div>
                                                    {(mensagem.resposta_texto || mensagem.resposta_midia_tipo) && <button className={`chat-mensagem-resposta${mensagem.resposta_midia_tipo?.startsWith('audio/') ? ' chat-mensagem-resposta-audio' : ''}`} type="button" onClick={() => irParaMensagemOriginal(mensagem.resposta_mensagem_id)} disabled={!mensagem.resposta_mensagem_id} aria-label="Ir para a mensagem respondida"><strong>{mensagem.resposta_autor_nome || 'Mensagem respondida'}</strong>{mensagem.resposta_midia_tipo?.startsWith('audio/') ? <span className="chat-mensagem-resposta-audio-preview"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" /></svg><span>Áudio</span><span className="chat-mensagem-resposta-onda" aria-hidden="true">{[35, 65, 45, 80, 50, 70, 35, 90, 52, 68, 42, 76].map((altura, indice) => <i key={indice} style={{ height: `${altura}%` }} />)}</span></span> : <span>{mensagem.resposta_texto}</span>}</button>}
                                                    {mensagem.midia_url && (
                                                        <div className="chat-mensagem-midia">
                                                            {mensagem.midia_tipo?.startsWith('image/') && <button className="chat-mensagem-imagem-botao" type="button" onClick={() => setMidiaAmpliadaIndex(midiasGaleria.findIndex((midia) => midia.id === mensagem.id))} aria-label="Ampliar imagem"><img src={mensagem.midia_url} alt={mensagem.midia_nome || 'Imagem enviada no chat'} loading="lazy" /></button>}
                                                            {mensagem.midia_tipo?.startsWith('video/') && <video src={mensagem.midia_url} controls preload="metadata" />}
                                                            {mensagem.midia_tipo?.startsWith('audio/') && <AudioMensagemChat src={mensagem.midia_url} />}
                                                        </div>
                                                    )}
                                                    {mensagem.texto?.trim() && <p>{mensagem.texto}</p>}
                                                </article>
                                                <div className="chat-mensagem-acoes">
                                                    {propria ? <><button type="button" onClick={() => iniciarEdicao(mensagem)}>Editar</button><button type="button" onClick={() => excluirMensagem(mensagem)}>Excluir</button></> : <button type="button" onClick={() => iniciarResposta(mensagem)}>Responder</button>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {novasMensagens > 0 && <button className="chat-global-novas-mensagens" type="button" onClick={irParaNovasMensagens}>{novasMensagens} {novasMensagens === 1 ? 'nova mensagem' : 'novas mensagens'} <span>↓</span></button>}
                                </div>
                                {textoAtividadeChat && <div className="chat-global-typing-status" role="status"><span className={pessoasGravandoAudio.length ? 'gravando' : ''} />{textoAtividadeChat}</div>}
                                {editandoId && <div className="chat-global-editando" role="status"><span>Editando mensagem</span><button type="button" onClick={() => { setEditandoId(null); setTexto(''); }}>Cancelar</button></div>}
                                <form className="chat-global-composer" onSubmit={enviarMensagem}>
                                    <div className="chat-global-input-wrap">{respondendoA && <div className="chat-global-resposta-ativa"><div><strong>Respondendo a {respondendoA.autor_nome || 'Viciado em Souls'}</strong><span>{respondendoA.texto}</span></div><button type="button" onClick={() => setRespondendoA(null)} aria-label="Cancelar resposta">×</button></div>}{arquivoSelecionado && <div className="chat-global-arquivo-ativo">{arquivoPreviewUrl && arquivoSelecionado.type.startsWith('image/') && <img src={arquivoPreviewUrl} alt="Prévia do anexo" />}{arquivoPreviewUrl && arquivoSelecionado.type.startsWith('video/') && <video src={arquivoPreviewUrl} muted />}{!arquivoPreviewUrl && <span className="chat-global-arquivo-icone">♫</span>}<span>{arquivoSelecionado.name}</span><button type="button" onClick={limparArquivoSelecionado} aria-label="Remover arquivo anexado">×</button></div>}<div className="chat-global-textarea-wrap"><textarea id="mensagem-chat-global" rows="1" value={texto} onChange={(evento) => setTexto(evento.target.value)} onKeyDown={(evento) => { if (evento.key === 'Enter' && !evento.shiftKey) enviarMensagem(evento); }} placeholder="Conversar em #geral" maxLength={500} /><input id="arquivo-chat-global" className="chat-global-file-input" type="file" accept="image/*,video/*,audio/*" onChange={selecionarArquivo} disabled={enviando || gravandoAudio} /><button type="button" className="btn-enviar-arquivos-chat-global" aria-label="Anexar imagem, vídeo ou áudio" onClick={() => document.getElementById('arquivo-chat-global')?.click()} disabled={enviando || gravandoAudio}>+</button><button type="button" className={`btn-gravar-audio-chat-global${gravandoAudio ? ' gravando' : ''}`} aria-label={gravandoAudio ? 'Parar gravação de áudio' : 'Gravar áudio'} aria-pressed={gravandoAudio} onClick={alternarGravacaoAudio} disabled={enviando}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" /></svg></button></div></div>
                                    <button type="submit" className="btn-enviar-mensagem-chat-global" disabled={(!texto.trim() && !arquivoSelecionado) || enviando} aria-label={editandoId ? 'Salvar edição' : 'Enviar mensagem'}>{editandoId ? 'Salvar' : 'Enviar'}</button>
                                </form>
                                <div className="chat-global-emotes-area">
                                    {emotesAbertos && <div className="chat-global-emotes-picker" role="dialog" aria-label="Emotes do chat">{emojisChat.map((emote) => <button key={emote} type="button" onClick={() => inserirEmote(emote)}>{emote}</button>)}</div>}
                                    <button className="chat-global-emotes-toggle" type="button" onClick={() => setEmotesAbertos((aberto) => !aberto)} aria-label="Abrir emotes" aria-expanded={emotesAbertos}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.2s1.2 2 3.5 2 3.5-2 3.5-2" /><path d="M9 9.5h.01M15 9.5h.01" /></svg></button>
                                </div>
                                {erro && <p className="chat-global-erro" role="alert">{erro}</p>}
                            </div>

                            <aside className="chat-global-members">
                                <div className="chat-global-members-heading">
                                    <div><span className="chat-global-members-label">Comunidade</span><strong>Membros online · {membrosOnline.length}</strong></div>
                                    <button className="chat-global-panel-close" type="button" onClick={() => setMembrosAbertos(false)} aria-label="Fechar membros">×</button>
                                </div>
                                {membrosOnline.map((membro) => (
                                    <button className="chat-global-member chat-global-member-link" type="button" key={membro.autor_id} onClick={() => navigate(`/perfil/${membro.autor_id}`)}>
                                        {membro.autor_avatar_url ? <img src={membro.autor_avatar_url} alt="" /> : <span className="chat-mensagem-avatar-vazio" aria-hidden="true">?</span>}
                                        <span className="chat-global-member-info"><strong>{membro.autor_nome || 'Viciado em Souls'}</strong><span>{membro.autor_id === user.id ? 'você' : 'online agora'}</span></span>
                                        <i className="chat-global-online-dot" />
                                    </button>
                                ))}
                            </aside>
                        </>
                    )}
                    {imagemAmpliada && <div className="chat-global-image-viewer" role="dialog" aria-modal="true" aria-label="Galeria de imagens do chat" onClick={() => setMidiaAmpliadaIndex(null)}><button type="button" className="chat-global-image-viewer-close" onClick={() => setMidiaAmpliadaIndex(null)} aria-label="Fechar imagem">×</button><button type="button" className="chat-global-image-viewer-prev" onClick={(evento) => { evento.stopPropagation(); navegarGaleria(-1); }} aria-label="Imagem anterior">‹</button><img src={imagemAmpliada.url} alt={imagemAmpliada.nome} onClick={(evento) => evento.stopPropagation()} /><button type="button" className="chat-global-image-viewer-next" onClick={(evento) => { evento.stopPropagation(); navegarGaleria(1); }} aria-label="Próxima imagem">›</button><div className="chat-global-image-thumbnails" onClick={(evento) => evento.stopPropagation()}>{midiasGaleria.map((midia, indice) => <button className={indice === midiaAmpliadaIndex ? 'ativo' : ''} type="button" key={midia.id} onClick={() => setMidiaAmpliadaIndex(indice)} aria-label={`Abrir imagem ${indice + 1}`}><img src={midia.url} alt="" /></button>)}</div></div>}
                </section>
            </main>
        </>
    );
}

function formatarDuracaoAudio(segundos) {
    if (!Number.isFinite(segundos) || segundos <= 0) return '0:00';
    const minutos = Math.floor(segundos / 60);
    const segundosRestantes = Math.floor(segundos % 60).toString().padStart(2, '0');
    return `${minutos}:${segundosRestantes}`;
}

function textoDeResposta(mensagem) {
    if (mensagem.texto?.trim()) return mensagem.texto.trim();
    if (mensagem.midia_tipo?.startsWith('audio/')) return '♫ Áudio enviado';
    if (mensagem.midia_tipo?.startsWith('image/')) return '▧ Foto enviada';
    if (mensagem.midia_tipo?.startsWith('video/')) return '▶ Vídeo enviado';
    return 'Mídia enviada';
}

const emojisChat = ['😀', '😂', '😍', '😎', '🔥', '⚔️', '🛡️', '💀', '🎮', '👏', '❤️', '👍', '👀', '😭', '😡', '🤝', '🙌', '✨', '🏆', '☠️'];

export default ChatGlobal;
