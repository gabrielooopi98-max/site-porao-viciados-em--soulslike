import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../services/supabase';
import { gerarIdUnico } from '../gerarIdUnico';
import TextoMensagemPrivada from './TextoMensagemPrivada';
import { consultarAmizadesAceitas, obterAmigos } from '../services/amizades';
import AudioMensagemChat from './AudioMensagemChat';
import GaleriaMidiasPrivadas from './GaleriaMidiasPrivadas';
import { organizarMensagens, rotuloDoDia } from './organizarMensagensChat';
import './MensagensPrivadas.css';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatarHora(data) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(data));
}

function formatarDuracao(segundos) {
  const minutos = Math.floor(segundos / 60).toString().padStart(2, '0');
  const resto = (segundos % 60).toString().padStart(2, '0');
  return `${minutos}:${resto}`;
}

function AudioPrivado({ src }) {
  const [codigoErro, setCodigoErro] = useState(null);
  const [audioConvertido, setAudioConvertido] = useState('');
  const [convertendo, setConvertendo] = useState(false);
  const [erroConversao, setErroConversao] = useState('');
  const urlConvertidaRef = useRef('');
  const tentativaConversaoRef = useRef(false);
  const ativoRef = useRef(true);

  useEffect(() => {
    ativoRef.current = true;
    return () => {
      ativoRef.current = false;
      if (urlConvertidaRef.current) URL.revokeObjectURL(urlConvertidaRef.current);
    };
  }, []);

  async function tratarErroAudio(evento) {
    const codigo = evento.currentTarget.error?.code ?? 0;
    console.error('Erro ao reproduzir áudio privado:', { codigo });
    if (codigo === 4 && !tentativaConversaoRef.current) {
      tentativaConversaoRef.current = true;
      setConvertendo(true);
      try {
        const resposta = await fetch(src);
        if (!resposta.ok) throw new Error(`O áudio não pôde ser baixado (${resposta.status}).`);
        const arquivo = await resposta.blob();
        const { normalizarAudio } = await import('../services/normalizarVideo');
        const convertido = await normalizarAudio(arquivo);
        if (!ativoRef.current) return;
        const url = URL.createObjectURL(convertido);
        urlConvertidaRef.current = url;
        setAudioConvertido(url);
        setCodigoErro(null);
      } catch (erroConversao) {
        console.error('Não foi possível converter o áudio para reprodução:', erroConversao);
        if (!ativoRef.current) return;
        setErroConversao(erroConversao.message || 'Não foi possível converter o arquivo.');
        setCodigoErro(codigo);
      } finally {
        if (ativoRef.current) setConvertendo(false);
      }
      return;
    }
    setCodigoErro(codigo);
  }

  if (convertendo) {
    return <p className="mensagem-privada-audio-erro" role="status">Preparando áudio para reprodução...</p>;
  }

  if (codigoErro !== null) {
    const detalhes = {
      2: 'falha ao baixar o arquivo; confira a política de leitura do bucket privado',
      3: 'o arquivo foi carregado, mas o navegador não conseguiu decodificá-lo',
      4: 'formato ou codec não compatível com este navegador',
    };
    return <p className="mensagem-privada-audio-erro" role="alert">Não foi possível reproduzir este áudio ({codigoErro}): {erroConversao || detalhes[codigoErro] || 'o navegador interrompeu a reprodução'}.</p>;
  }

  return (
    <AudioMensagemChat
      key={audioConvertido || src}
      src={audioConvertido || src}
      onError={tratarErroAudio}
    />
  );
}

function testarAudioReproduzivel(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const elemento = document.createElement('audio');
    let resolvido = false;
    const concluir = (resultado) => {
      if (resolvido) return;
      resolvido = true;
      elemento.removeEventListener('loadedmetadata', aoCarregar);
      elemento.removeEventListener('error', aoFalhar);
      URL.revokeObjectURL(url);
      resolve(resultado);
    };
    const aoCarregar = () => concluir(true);
    const aoFalhar = () => concluir(false);
    elemento.addEventListener('loadedmetadata', aoCarregar);
    elemento.addEventListener('error', aoFalhar);
    elemento.preload = 'metadata';
    elemento.src = url;
    window.setTimeout(() => concluir(false), 4000);
  });
}

function obterParOrdenado(primeiroId, segundoId) {
  return [primeiroId, segundoId].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

async function assinarAudios(mensagensParaAssinar) {
  const caminhosAudio = [...new Set(mensagensParaAssinar.map((mensagem) => mensagem.audio_path).filter(Boolean))];
  const caminhosMidia = [...new Set(mensagensParaAssinar.map((mensagem) => mensagem.midia_path).filter(Boolean))];
  const idsFigurinhas = [...new Set(mensagensParaAssinar.map((mensagem) => mensagem.figurinha_id).filter(Boolean))];

  const [resultadoAudios, resultadoMidias, resultadoFigurinhas] = await Promise.all([
    Promise.all(caminhosAudio.map(async (caminho) => {
      const { data, error } = await supabase.storage.from('mensagens-privadas-audio').createSignedUrl(caminho, 86400);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error(`Não foi possível gerar URL para o áudio: ${caminho}`);
      return [caminho, data.signedUrl];
    })),
    Promise.all(caminhosMidia.map(async (caminho) => {
      const { data, error } = await supabase.storage.from('mensagens-privadas-midia').createSignedUrl(caminho, 86400);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error(`Não foi possível gerar URL para a mídia: ${caminho}`);
      return [caminho, data.signedUrl];
    })),
    idsFigurinhas.length
      ? supabase.from('figurinhas_chat').select('id, midia_url, midia_tipo, midia_nome').in('id', idsFigurinhas)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (resultadoFigurinhas.error) throw resultadoFigurinhas.error;

  const urlsAudio = new Map(resultadoAudios);
  const urlsMidia = new Map(resultadoMidias);
  const figurinhas = new Map((resultadoFigurinhas.data ?? []).map((item) => [item.id, item]));

  return mensagensParaAssinar.map((mensagem) => ({
    ...mensagem,
    audio_url: mensagem.audio_path ? urlsAudio.get(mensagem.audio_path) ?? null : null,
    midia_url: mensagem.midia_path ? urlsMidia.get(mensagem.midia_path) ?? null : null,
    figurinha: mensagem.figurinha_id ? figurinhas.get(mensagem.figurinha_id) ?? null : null,
  }));
}

function MensagensPrivadas() {
  const { user } = useAuth();
  const usuarioId = user?.id;
  const navigate = useNavigate();
  const { pessoaId } = useParams();
  const [amizades, setAmizades] = useState([]);
  const [buscaAmigo, setBuscaAmigo] = useState('');
  const [mensagens, setMensagens] = useState([]);
  const [mensagensCarregadasPara, setMensagensCarregadasPara] = useState(null);
  const [texto, setTexto] = useState('');
  const [respondendoA, setRespondendoA] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [arquivoPreviewUrl, setArquivoPreviewUrl] = useState('');
  const [figurinhas, setFigurinhas] = useState([]);
  const [buscaFigurinha, setBuscaFigurinha] = useState('');
  const [figurinhasAbertas, setFigurinhasAbertas] = useState(false);
  const [carregandoFigurinhas, setCarregandoFigurinhas] = useState(false);
  const [adicionandoFigurinha, setAdicionandoFigurinha] = useState(false);
  const [carregandoAmizades, setCarregandoAmizades] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [gravandoAudio, setGravandoAudio] = useState(false);
  const [segundosGravacao, setSegundosGravacao] = useState(0);
  const [atividadeAmigo, setAtividadeAmigo] = useState('');
  const [amigosOnline, setAmigosOnline] = useState({});
  const [erro, setErro] = useState('');
  const [novasMensagens, setNovasMensagens] = useState(0);
  const [midiaAberta, setMidiaAberta] = useState(null);
  const [menuMensagem, setMenuMensagem] = useState(null);
  const menuMensagemRef = useRef(null);
  const origemMenuRef = useRef(null);
  const rolagemRef = useRef({ conversa: null, ids: new Set(), noFim: true, forcarFim: false });
  const textoRef = useRef(null);
  const listaRef = useRef(null);
  const arquivoInputRef = useRef(null);
  const figurinhaInputRef = useRef(null);
  const previewRef = useRef('');
  const canalAtividadeRef = useRef(null);
  const estadoAtividadeRef = useRef('');
  const timerAtividadeRef = useRef(null);
  const recorderRef = useRef(null);
  const streamAudioRef = useRef(null);
  const partesAudioRef = useRef([]);
  const cancelarGravacaoRef = useRef(false);
  const tamanhoAudioRef = useRef(0);
  const inicioGravacaoRef = useRef(0);
  const timerGravacaoRef = useRef(null);

  const marcarComoLidas = useCallback(async (mensagensParaMarcar) => {
    const ids = mensagensParaMarcar.filter((mensagem) => mensagem.destinatario_id === usuarioId && !mensagem.lida_em).map((mensagem) => mensagem.id);
    if (!ids.length) return;

    const { data, error: erroLeitura } = await supabase
      .from('mensagens_privadas')
      .update({ lida_em: new Date().toISOString() })
      .in('id', ids)
      .eq('destinatario_id', usuarioId)
      .is('lida_em', null)
      .select('id, lida_em');

    if (erroLeitura) {
      console.error('Não foi possível atualizar confirmação de leitura:', erroLeitura);
      setErro('Não foi possível confirmar a leitura. Verifique a migration de mensagens privadas.');
      return;
    }
    const leituras = new Map((data ?? []).map((mensagem) => [mensagem.id, mensagem.lida_em]));
    if (leituras.size) window.dispatchEvent(new Event('mensagens-privadas-lidas'));
    setMensagens((atuais) => atuais.map((mensagem) => (
      leituras.has(mensagem.id) ? { ...mensagem, lida_em: leituras.get(mensagem.id) } : mensagem
    )));
  }, [usuarioId]);

  useEffect(() => {
    if (!usuarioId) return undefined;
    let ativo = true;
    consultarAmizadesAceitas(usuarioId)
      .then(({ data, error: erroConsulta }) => {
        if (!ativo) return;
        if (erroConsulta) {
          console.error('Erro ao carregar amigos:', erroConsulta);
          setErro(`Não foi possível carregar seus amigos: ${erroConsulta.message}`);
        } else {
          setAmizades(data ?? []);
        }
        setCarregandoAmizades(false);
      })
      .catch((erroConsulta) => {
        if (!ativo) return;
        console.error('Erro ao carregar amigos:', erroConsulta);
        setErro('Não foi possível carregar seus amigos. Confira sua conexão e tente novamente.');
        setCarregandoAmizades(false);
      });

    return () => { ativo = false; };
  }, [usuarioId]);

  const amigos = useMemo(() => obterAmigos(amizades, usuarioId), [amizades, usuarioId]);
  const amigosFiltrados = useMemo(() => {
    const busca = buscaAmigo.trim().toLocaleLowerCase('pt-BR');
    return amigos.filter((amigo) => (amigo.nome || 'Viciado em Souls').toLocaleLowerCase('pt-BR').includes(busca));
  }, [amigos, buscaAmigo]);
  const amigoSelecionado = amigos.find((amigo) => amigo.id === pessoaId) ?? null;
  const mensagemDoMenu = menuMensagem?.conversa === pessoaId
    ? mensagens.find((mensagem) => mensagem.id === menuMensagem.id)
    : null;

  function fecharMenuMensagem(devolverFoco = false) {
    setMenuMensagem(null);
    if (devolverFoco) origemMenuRef.current?.focus();
  }

  function abrirMenuMensagem(evento, mensagem) {
    if (evento.target.closest('button, a, input, video, audio')) return;
    if (window.getSelection()?.toString()) return;
    const origem = evento.currentTarget;
    const caixa = origem.getBoundingClientRect();
    origemMenuRef.current = origem;
    setMenuMensagem({
      id: mensagem.id,
      conversa: pessoaId,
      x: Math.max(8, Math.min(caixa.right - 184, window.innerWidth - 192)),
      y: Math.max(8, Math.min(caixa.bottom, window.innerHeight - 160)),
    });
  }

  useEffect(() => {
    if (!menuMensagem) return undefined;
    menuMensagemRef.current?.querySelector('button')?.focus();
    function fecharFora(evento) {
      if (!menuMensagemRef.current?.contains(evento.target)) setMenuMensagem(null);
    }
    function fecharEscape(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        setMenuMensagem(null);
        origemMenuRef.current?.focus();
      }
    }
    function fecharAoMover(evento) {
      if (menuMensagemRef.current?.contains(evento.target)) return;
      setMenuMensagem(null);
    }
    document.addEventListener('pointerdown', fecharFora);
    document.addEventListener('keydown', fecharEscape);
    window.addEventListener('resize', fecharAoMover);
    document.addEventListener('scroll', fecharAoMover, true);
    return () => {
      document.removeEventListener('pointerdown', fecharFora);
      document.removeEventListener('keydown', fecharEscape);
      window.removeEventListener('resize', fecharAoMover);
      document.removeEventListener('scroll', fecharAoMover, true);
    };
  }, [menuMensagem]);
  const figurinhasFiltradas = useMemo(() => {
    const busca = buscaFigurinha.trim().toLocaleLowerCase('pt-BR');
    return figurinhas.filter((figurinha) => !busca || figurinha.midia_nome.toLocaleLowerCase('pt-BR').includes(busca));
  }, [buscaFigurinha, figurinhas]);

  useEffect(() => {
    if (!usuarioId) return undefined;
    let ativo = true;
    supabase
      .from('figurinhas_chat')
      .select('id, midia_url, midia_path, midia_tipo, midia_nome, criado_em')
      .eq('autor_id', usuarioId)
      .order('criado_em', { ascending: false })
      .limit(100)
      .then(({ data, error: erroConsulta }) => {
        if (!ativo) return;
        if (erroConsulta) {
          console.error('Erro ao carregar figurinhas privadas:', erroConsulta);
          setErro(`Não foi possível carregar suas figurinhas: ${erroConsulta.message}`);
        } else {
          setFigurinhas(data ?? []);
        }
        setCarregandoFigurinhas(false);
      })
      .catch((erroConsulta) => {
        if (!ativo) return;
        console.error('Erro ao carregar figurinhas privadas:', erroConsulta);
        setErro('Não foi possível carregar suas figurinhas. Confira sua conexão e tente novamente.');
        setCarregandoFigurinhas(false);
      });
    return () => { ativo = false; };
  }, [usuarioId]);

  useEffect(() => {
    if (!usuarioId || carregandoAmizades) return undefined;
    let ativo = true;
    const canais = [];

    function atualizarPresenca(canal, amigoId) {
      const estaOnline = Object.values(canal.presenceState()).flat().some((registro) => registro.user_id === amigoId);
      if (ativo) setAmigosOnline((atuais) => ({ ...atuais, [amigoId]: estaOnline }));
    }

    amigos.forEach((amigo) => {
      const canalAmigo = supabase.channel(`private-friend-presence:${amigo.id}`, {
        config: { private: true, presence: { key: amigo.id } },
      });
      canalAmigo
        .on('presence', { event: 'sync' }, () => atualizarPresenca(canalAmigo, amigo.id))
        .on('presence', { event: 'join' }, () => atualizarPresenca(canalAmigo, amigo.id))
        .on('presence', { event: 'leave' }, () => atualizarPresenca(canalAmigo, amigo.id))
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') atualizarPresenca(canalAmigo, amigo.id);
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`Falha ao sincronizar presença de ${amigo.id}:`, status);
          }
        });
      canais.push(canalAmigo);
    });

    return () => {
      ativo = false;
      canais.forEach((canal) => supabase.removeChannel(canal));
    };
  }, [amigos, carregandoAmizades, usuarioId]);

  useEffect(() => {
    if (!usuarioId || !pessoaId || !amigoSelecionado) {
      canalAtividadeRef.current = null;
      return undefined;
    }

    const [primeiroId, segundoId] = obterParOrdenado(usuarioId, pessoaId);
    const canal = supabase.channel(`private-message-activity:${primeiroId}:${segundoId}`, {
      config: { private: true },
    });
    let timerExpiracao;

    canal
      .on('broadcast', { event: 'activity' }, ({ payload }) => {
        if (payload?.user_id !== pessoaId) return;
        setAtividadeAmigo(payload.status === 'typing' || payload.status === 'recording' ? payload.status : '');
        window.clearTimeout(timerExpiracao);
        if (payload.status === 'typing' || payload.status === 'recording') {
          timerExpiracao = window.setTimeout(() => setAtividadeAmigo(''), 5000);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          canalAtividadeRef.current = canal;
          setAtividadeAmigo('');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Falha ao conectar indicadores de atividade da conversa:', status);
        }
      });

    return () => {
      window.clearTimeout(timerExpiracao);
      window.clearTimeout(timerAtividadeRef.current);
      canalAtividadeRef.current = null;
      estadoAtividadeRef.current = '';
      supabase.removeChannel(canal);
    };
  }, [amigoSelecionado, pessoaId, usuarioId]);

  function anunciarAtividade(status) {
    const canal = canalAtividadeRef.current;
    if (!canal || estadoAtividadeRef.current === status) return;
    estadoAtividadeRef.current = status;
    canal.send({
      type: 'broadcast',
      event: 'activity',
      payload: { user_id: usuarioId, status },
    }).then(({ error: erroEnvio }) => {
      if (erroEnvio) console.error('Não foi possível atualizar atividade da conversa:', erroEnvio);
    });
  }

  useEffect(() => {
    if (!usuarioId || !pessoaId || !UUID_RE.test(pessoaId) || !amigoSelecionado) {
      return undefined;
    }

    let ativo = true;
    let historicoCarregado = false;
    const eventosDuranteCarregamento = [];
    const canal = supabase
      .channel(`mensagens-privadas-${usuarioId}-${pessoaId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens_privadas',
      }, async (payload) => {
        if (!ativo) return;
        const mensagem = payload.new;
        if (![usuarioId, pessoaId].includes(mensagem.remetente_id) || ![usuarioId, pessoaId].includes(mensagem.destinatario_id)) return;
        if (!historicoCarregado) {
          eventosDuranteCarregamento.push(mensagem);
          return;
        }
        let mensagemAssinada;
        try {
          [mensagemAssinada] = await assinarAudios([mensagem]);
        } catch (erroMidia) {
          console.error('Não foi possível abrir a mídia da mensagem:', erroMidia);
          if (ativo) setErro('Não foi possível carregar a mídia desta conversa.');
          return;
        }
        if (!ativo) return;
        setMensagens((atuais) => (
          atuais.some((item) => item.id === mensagemAssinada.id)
            ? atuais
            : [...atuais, mensagemAssinada].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
        ));

        if (mensagemAssinada.destinatario_id === usuarioId && !mensagemAssinada.lida_em) {
          marcarComoLidas([mensagemAssinada]);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'mensagens_privadas',
      }, (payload) => {
        if (!ativo) return;
        setMensagens((atuais) => atuais.map((item) => (
          item.id === payload.new.id ? { ...item, ...payload.new } : item
        )));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'mensagens_privadas',
      }, (payload) => {
        if (!ativo) return;
        setMensagens((atuais) => atuais.filter((item) => item.id !== payload.old.id));
      })
      .subscribe();

    supabase
      .from('mensagens_privadas')
      .select('id, remetente_id, destinatario_id, texto, audio_path, midia_path, midia_tipo, midia_nome, figurinha_id, resposta_mensagem_id, resposta_remetente_id, resposta_texto, resposta_tipo, resposta_nome, editada, lida_em, criado_em')
      .or(`and(remetente_id.eq.${usuarioId},destinatario_id.eq.${pessoaId}),and(remetente_id.eq.${pessoaId},destinatario_id.eq.${usuarioId})`)
      .order('criado_em', { ascending: false })
      .limit(100)
      .then(async ({ data, error: erroConsulta }) => {
        if (!ativo) return;
        if (erroConsulta) {
          console.error('Erro ao carregar conversa privada:', erroConsulta);
          setErro(`Não foi possível carregar a conversa: ${erroConsulta.message}`);
          setMensagens([]);
        } else {
          const historico = await assinarAudios([...(data ?? [])].reverse());
          const eventosAssinados = await Promise.all(eventosDuranteCarregamento.map(async (mensagem) => {
            const [mensagemAssinada] = await assinarAudios([mensagem]);
            return mensagemAssinada;
          }));
          const combinado = [...historico];
          eventosAssinados.forEach((mensagem) => {
            if (!combinado.some((item) => item.id === mensagem.id)) combinado.push(mensagem);
          });
          combinado.sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
          if (!ativo) return;
          setMensagens(combinado);
          marcarComoLidas(combinado.filter((mensagem) => mensagem.destinatario_id === usuarioId && !mensagem.lida_em));
        }
        historicoCarregado = true;
        setMensagensCarregadasPara(pessoaId);
      })
      .catch((erroConsulta) => {
        if (!ativo) return;
        console.error('Erro ao carregar conversa privada:', erroConsulta);
        setErro('Não foi possível carregar a conversa. Confira sua conexão e tente novamente.');
        setMensagens([]);
        setMensagensCarregadasPara(pessoaId);
      });

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, [amigoSelecionado, marcarComoLidas, pessoaId, usuarioId]);

  const carregandoMensagens = Boolean(amigoSelecionado && mensagensCarregadasPara !== pessoaId);
  const mensagensVisiveis = useMemo(
    () => mensagensCarregadasPara === pessoaId ? mensagens : [],
    [mensagens, mensagensCarregadasPara, pessoaId]
  );
  const itensMensagens = organizarMensagens(mensagensVisiveis, 'remetente_id');
  const mensagemMidiaAberta = midiaAberta?.conversa === pessoaId
    ? mensagensVisiveis.find((mensagem) => mensagem.id === midiaAberta.id)
    : null;
  const midiasGaleria = mensagensVisiveis.flatMap((mensagem) => {
    if (mensagem.remetente_id !== mensagemMidiaAberta?.remetente_id) return [];
    if (mensagemMidiaAberta.figurinha_id ? !mensagem.figurinha_id : !mensagem.midia_path || mensagem.audio_path) return [];
    const url = mensagem.midia_url || mensagem.figurinha?.midia_url;
    return url ? [{
      id: mensagem.id, url,
      tipo: mensagem.midia_tipo || mensagem.figurinha?.midia_tipo,
      nome: mensagem.midia_nome || mensagem.figurinha?.midia_nome || 'Mídia da conversa',
    }] : [];
  });
  const fecharGaleria = useCallback(() => setMidiaAberta(null), []);

  function navegarConversa(destino) {
    setRespondendoA(null);
    setEditandoId(null);
    setTexto('');
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = '';
    setArquivoPreviewUrl('');
    setArquivoSelecionado(null);
    if (arquivoInputRef.current) arquivoInputRef.current.value = '';
    setFigurinhasAbertas(false);
    setMidiaAberta(null);
    setErro('');
    navigate(destino);
  }

  useEffect(() => {
    const lista = listaRef.current;
    if (!lista || carregandoMensagens) return;
    const estado = rolagemRef.current;
    const inicial = estado.conversa !== pessoaId;
    const recebidas = inicial ? 0 : mensagensVisiveis.filter((mensagem) => !estado.ids.has(mensagem.id) && mensagem.destinatario_id === usuarioId).length;
    if (inicial || estado.noFim || estado.forcarFim) {
      lista.scrollTop = lista.scrollHeight;
      estado.noFim = true;
      estado.forcarFim = false;
      setNovasMensagens(0);
    } else if (recebidas) setNovasMensagens((valor) => valor + recebidas);
    estado.conversa = pessoaId;
    estado.ids = new Set(mensagensVisiveis.map((mensagem) => mensagem.id));
  }, [mensagensVisiveis, carregandoMensagens, pessoaId, usuarioId]);

  function manterNoFim() {
    if (listaRef.current && rolagemRef.current.noFim) listaRef.current.scrollTop = listaRef.current.scrollHeight;
  }

  useEffect(() => {
    const lista = listaRef.current;
    if (!lista || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      if (rolagemRef.current.noFim) lista.scrollTop = lista.scrollHeight;
    });
    observer.observe(lista);
    return () => observer.disconnect();
  }, [pessoaId, carregandoMensagens]);

  useEffect(() => {
    const campo = textoRef.current;
    if (!campo) return;
    campo.style.height = 'auto';
    campo.style.height = `${Math.min(campo.scrollHeight, 140)}px`;
  }, [texto, pessoaId, gravandoAudio]);

  function limparArquivoSelecionado() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = '';
    setArquivoPreviewUrl('');
    setArquivoSelecionado(null);
    if (arquivoInputRef.current) arquivoInputRef.current.value = '';
  }

  function cancelarRespostaEdicao() {
    setRespondendoA(null);
    setEditandoId(null);
    setTexto('');
  }

  function responderMensagem(mensagem) {
    setEditandoId(null);
    setRespondendoA(mensagem);
    setTexto('');
    requestAnimationFrame(() => document.getElementById('mensagem-privada-texto')?.focus());
  }

  function editarMensagem(mensagem) {
    setRespondendoA(null);
    setEditandoId(mensagem.id);
    setTexto(mensagem.texto || '');
    limparArquivoSelecionado();
    requestAnimationFrame(() => document.getElementById('mensagem-privada-texto')?.focus());
  }

  async function excluirMensagem(mensagem) {
    if (!window.confirm('Excluir esta mensagem?')) return;
    setErro('');
    const { data, error: erroExclusao } = await supabase
      .from('mensagens_privadas')
      .delete()
      .eq('id', mensagem.id)
      .eq('remetente_id', usuarioId)
      .select('id')
      .maybeSingle();

    if (erroExclusao) {
      console.error('Não foi possível excluir a mensagem privada:', erroExclusao);
      setErro(`Não foi possível excluir a mensagem: ${erroExclusao.message}`);
      return;
    }
    if (!data) {
      setErro('A mensagem não foi excluída. Verifique se a migration de edição e exclusão foi aplicada.');
      return;
    }
    setMensagens((atuais) => atuais.filter((item) => item.id !== mensagem.id));
  }

  function irParaMensagemOriginal(mensagemId) {
    if (!mensagemId) return;
    const elemento = Array.from(document.querySelectorAll('[data-mensagem-privada-id]'))
      .find((item) => item.dataset.mensagemPrivadaId === mensagemId);
    if (!elemento) {
      setErro('A mensagem original não está no histórico carregado.');
      return;
    }
    elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
    elemento.classList.remove('destacada');
    requestAnimationFrame(() => {
      elemento.classList.add('destacada');
      window.setTimeout(() => elemento.classList.remove('destacada'), 1600);
    });
  }

  function selecionarArquivo(evento) {
    const arquivo = evento.target.files?.[0] ?? null;
    evento.target.value = '';
    if (!arquivo) return;

    const tiposImagemPermitidos = new Set(['image/gif', 'image/jpeg', 'image/png', 'image/webp']);
    const limiteMb = arquivo.type.startsWith('video/') ? 50 : tiposImagemPermitidos.has(arquivo.type) ? 15 : 0;
    if (!limiteMb) {
      setErro('Escolha uma imagem ou vídeo válido.');
      return;
    }
    if (arquivo.size > limiteMb * 1024 * 1024) {
      setErro(`Esse arquivo precisa ter no máximo ${limiteMb} MB.`);
      return;
    }

    limparArquivoSelecionado();
    const preview = URL.createObjectURL(arquivo);
    previewRef.current = preview;
    setArquivoPreviewUrl(preview);
    setArquivoSelecionado(arquivo);
    setErro('');
  }

  async function adicionarFigurinha(evento) {
    const arquivo = evento.target.files?.[0] ?? null;
    evento.target.value = '';
    if (!arquivo) return;
    const extensoes = new Map([
      ['image/gif', 'gif'],
      ['image/jpeg', 'jpg'],
      ['image/png', 'png'],
      ['image/webp', 'webp'],
    ]);
    const extensao = extensoes.get(arquivo.type);
    if (!extensao) {
      setErro('Escolha uma figurinha em GIF, PNG, JPG ou WebP.');
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      setErro('A figurinha precisa ter no máximo 5 MB.');
      return;
    }
    if (figurinhas.length >= 100) {
      setErro('Sua coleção chegou ao limite de 100 figurinhas.');
      return;
    }

    setAdicionandoFigurinha(true);
    setErro('');
    const caminho = `${usuarioId}/${gerarIdUnico()}.${extensao}`;
    let arquivoEnviado = false;
    try {
      const { error: erroUpload } = await supabase.storage.from('figurinhas-chat').upload(caminho, arquivo, {
        contentType: arquivo.type,
        cacheControl: '31536000',
        upsert: false,
      });
      if (erroUpload) throw erroUpload;
      arquivoEnviado = true;
      const { data: urlPublica } = supabase.storage.from('figurinhas-chat').getPublicUrl(caminho);
      const { data, error: erroRegistro } = await supabase.from('figurinhas_chat').insert({
        autor_id: usuarioId,
        midia_url: urlPublica.publicUrl,
        midia_path: caminho,
        midia_tipo: arquivo.type,
        midia_nome: arquivo.name.slice(0, 120) || 'figurinha',
      }).select('id, midia_url, midia_path, midia_tipo, midia_nome, criado_em').single();
      if (erroRegistro) throw erroRegistro;
      setFigurinhas((atuais) => [data, ...atuais]);
    } catch (erroFigurinha) {
      if (arquivoEnviado) {
        const { error: erroRemocao } = await supabase.storage.from('figurinhas-chat').remove([caminho]);
        if (erroRemocao) console.error('Não foi possível remover a figurinha após falha:', erroRemocao);
      }
      console.error('Erro ao adicionar figurinha privada:', erroFigurinha);
      setErro(`Não foi possível adicionar a figurinha: ${erroFigurinha.message || 'confira a configuração do Supabase.'}`);
    } finally {
      setAdicionandoFigurinha(false);
    }
  }

  async function enviarMensagem(evento, figurinha = null) {
    evento?.preventDefault();
    const conteudo = texto.trim();
    const salvandoEdicao = Boolean(editandoId && !figurinha);
    if ((!conteudo && !arquivoSelecionado && !figurinha) || !amigoSelecionado || enviando || (salvandoEdicao && (!conteudo || arquivoSelecionado))) return;

    window.clearTimeout(timerAtividadeRef.current);
    setEnviando(true);
    setErro('');
    let caminhoMidia = null;
    let mensagemSalva = false;
    let arquivoEnviado = false;
    let mensagemCriada = null;
    let midiaTipo = null;
    let midiaNome = null;
    try {
      if (arquivoSelecionado) {
        let arquivoParaEnviar = arquivoSelecionado;
        if (arquivoSelecionado.type.startsWith('video/')) {
          const { normalizarVideo } = await import('../services/normalizarVideo');
          arquivoParaEnviar = await normalizarVideo(arquivoSelecionado);
        }
        const tiposPermitidos = new Set(['image/gif', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']);
        if (!tiposPermitidos.has(arquivoParaEnviar.type)) {
          throw new Error('Formato de imagem ou vídeo não compatível.');
        }
        if (arquivoParaEnviar.size > 50 * 1024 * 1024) {
          throw new Error('O vídeo convertido excedeu o limite de 50 MB.');
        }
        midiaTipo = arquivoParaEnviar.type;
        midiaNome = arquivoParaEnviar.name;
        const [primeiroId, segundoId] = obterParOrdenado(usuarioId, amigoSelecionado.id);
        const extensao = arquivoParaEnviar.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
        caminhoMidia = `${primeiroId}_${segundoId}/${usuarioId}/${gerarIdUnico()}.${extensao}`;
        const { error: erroUpload } = await supabase.storage
          .from('mensagens-privadas-midia')
          .upload(caminhoMidia, arquivoParaEnviar, { contentType: arquivoParaEnviar.type, upsert: false });
        if (erroUpload) throw erroUpload;
        arquivoEnviado = true;
      }

      const camposSelect = 'id, remetente_id, destinatario_id, texto, audio_path, midia_path, midia_tipo, midia_nome, figurinha_id, resposta_mensagem_id, resposta_remetente_id, resposta_texto, resposta_tipo, resposta_nome, editada, lida_em, criado_em';
      const resultadoEnvio = salvandoEdicao
        ? await supabase
          .from('mensagens_privadas')
          .update({ texto: conteudo, editada: true })
          .eq('id', editandoId)
          .eq('remetente_id', usuarioId)
          .select(camposSelect)
          .single()
        : await supabase
          .from('mensagens_privadas')
          .insert({
            remetente_id: usuarioId,
            destinatario_id: amigoSelecionado.id,
            texto: figurinha ? null : conteudo || null,
            audio_path: null,
            midia_path: caminhoMidia,
            midia_tipo: midiaTipo,
            midia_nome: midiaNome,
            figurinha_id: figurinha?.id || null,
            resposta_mensagem_id: respondendoA?.id || null,
            resposta_remetente_id: respondendoA?.remetente_id || null,
            resposta_texto: respondendoA
              ? respondendoA.texto || respondendoA.midia_nome || (respondendoA.audio_path ? 'Áudio' : respondendoA.figurinha_id ? 'Figurinha' : '')
              : null,
            resposta_tipo: respondendoA
              ? respondendoA.audio_path ? 'audio' : respondendoA.midia_path ? 'midia' : respondendoA.figurinha_id ? 'figurinha' : 'texto'
              : null,
            resposta_nome: respondendoA?.midia_nome || null,
          })
          .select(camposSelect)
          .single();

      if (resultadoEnvio.error) {
        console.error('Erro ao enviar mensagem privada:', resultadoEnvio.error);
        throw resultadoEnvio.error;
      } else {
        const data = resultadoEnvio.data;
        mensagemCriada = data;
        mensagemSalva = true;
        const [mensagemAssinada] = await assinarAudios([data]);
        if (!salvandoEdicao) rolagemRef.current.forcarFim = true;
        setMensagens((atuais) => (
          atuais.some((item) => item.id === data.id)
            ? atuais.map((item) => item.id === data.id ? mensagemAssinada : item)
            : [...atuais, mensagemAssinada].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
        ));
        if (!figurinha) {
          setTexto('');
          limparArquivoSelecionado();
        }
        setRespondendoA(null);
        setEditandoId(null);
        anunciarAtividade('idle');
      }
    } catch (erroEnvio) {
      if (caminhoMidia && arquivoEnviado && !mensagemSalva) {
        const { error: erroRemocao } = await supabase.storage.from('mensagens-privadas-midia').remove([caminhoMidia]);
        if (erroRemocao) console.error('Não foi possível limpar o upload após falha:', erroRemocao);
      }
      if (mensagemCriada) {
        setMensagens((atuais) => (
          atuais.some((item) => item.id === mensagemCriada.id)
            ? atuais
            : [...atuais, mensagemCriada].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
        ));
      }
      console.error('Erro ao enviar mensagem privada:', erroEnvio);
      setErro(`Não foi possível enviar a mensagem: ${erroEnvio.message || 'Confira sua conexão e a migration do chat privado.'}`);
    } finally {
      setEnviando(false);
    }
  }

  async function enviarAudio(blob) {
    if (!amigoSelecionado || !usuarioId) return;
    const [primeiroId, segundoId] = obterParOrdenado(usuarioId, amigoSelecionado.id);
    const parId = `${primeiroId}_${segundoId}`;
    const mime = blob.type.split(';')[0].toLowerCase();
    const extensoesAudio = new Map([
      ['audio/webm', 'webm'],
      ['audio/ogg', 'ogg'],
      ['audio/mp4', 'm4a'],
      ['audio/mpeg', 'mp3'],
      ['audio/wav', 'wav'],
    ]);
    const extensao = extensoesAudio.get(mime);
    if (!extensao) {
      setErro(`O navegador gravou um formato de áudio não aceito (${mime || 'desconhecido'}).`);
      return;
    }
    if (blob.size > 10 * 1024 * 1024) {
      setErro('O áudio excedeu o limite de 10 MB. Grave uma mensagem mais curta.');
      return;
    }
    setEnviando(true);
    setErro('');

    try {
      const caminhoAudio = `${parId}/${usuarioId}/${crypto.randomUUID()}.${extensao}`;
      const { error: erroUpload } = await supabase.storage
        .from('mensagens-privadas-audio')
        .upload(caminhoAudio, blob, { contentType: mime, upsert: false });
      if (erroUpload) throw erroUpload;

      const { data, error: erroRegistro } = await supabase
        .from('mensagens_privadas')
        .insert({
          remetente_id: usuarioId,
          destinatario_id: amigoSelecionado.id,
          texto: null,
          audio_path: caminhoAudio,
        })
        .select('id, remetente_id, destinatario_id, texto, audio_path, lida_em, criado_em')
        .single();

      if (erroRegistro) {
        const { error: erroRemocao } = await supabase.storage.from('mensagens-privadas-audio').remove([caminhoAudio]);
        if (erroRemocao) console.error('Não foi possível remover áudio órfão:', erroRemocao);
        throw erroRegistro;
      }

      const [mensagemComAudio] = await assinarAudios([data]);
      rolagemRef.current.forcarFim = true;
      setMensagens((atuais) => (
        atuais.some((item) => item.id === data.id)
          ? atuais
          : [...atuais, mensagemComAudio].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
      ));
      anunciarAtividade('idle');
    } catch (erroEnvio) {
      console.error('Erro ao enviar áudio privado:', erroEnvio);
      setErro(`Não foi possível enviar o áudio: ${erroEnvio.message || 'verifique a migration e o bucket de áudio privado.'}`);
    } finally {
      setEnviando(false);
    }
  }

  async function iniciarGravacao() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setErro('Seu navegador não permite gravar áudio. Tente usar outro navegador atualizado.');
      return;
    }

    let stream;
    try {
      window.clearTimeout(timerAtividadeRef.current);
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tiposSuportados = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];
      const mimeType = tiposSuportados.find((tipo) => MediaRecorder.isTypeSupported(tipo));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      streamAudioRef.current = stream;
      partesAudioRef.current = [];
      cancelarGravacaoRef.current = false;
      tamanhoAudioRef.current = 0;
      inicioGravacaoRef.current = Date.now();
      setSegundosGravacao(0);
      setGravandoAudio(true);
      anunciarAtividade('recording');

      recorder.ondataavailable = (evento) => {
        if (!evento.data.size) return;
        tamanhoAudioRef.current += evento.data.size;
        partesAudioRef.current.push(evento.data);
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(partesAudioRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        streamAudioRef.current = null;
        recorderRef.current = null;
        setGravandoAudio(false);
        setSegundosGravacao(0);
        window.clearInterval(timerGravacaoRef.current);
        anunciarAtividade('idle');
        if (cancelarGravacaoRef.current || !audioBlob.size) return;

        setEnviando(true);
        setErro('');
        let blobParaEnviar = audioBlob;
        const reproduzivel = await testarAudioReproduzivel(audioBlob);
        if (!reproduzivel) {
          try {
            const { normalizarAudio } = await import('../services/normalizarVideo');
            blobParaEnviar = await normalizarAudio(audioBlob);
          } catch (erroConversao) {
            console.error('Não foi possível converter o áudio gravado para um formato compatível:', erroConversao);
            setErro('Este navegador gravou um áudio em um formato incomum e não foi possível convertê-lo. Tente outro navegador.');
            setEnviando(false);
            return;
          }
        }
        if (blobParaEnviar.size > 10 * 1024 * 1024) {
          setErro('O áudio excedeu o limite de 10 MB. Grave uma mensagem mais curta.');
          setEnviando(false);
          return;
        }
        enviarAudio(blobParaEnviar);
      };

      recorder.onerror = (evento) => {
        console.error('Erro durante gravação de áudio privado:', evento.error);
        stream.getTracks().forEach((track) => track.stop());
        streamAudioRef.current = null;
        recorderRef.current = null;
        setGravandoAudio(false);
        window.clearInterval(timerGravacaoRef.current);
        anunciarAtividade('idle');
        setErro('A gravação de voz falhou. Tente gravar novamente.');
      };

      recorder.start();
      timerGravacaoRef.current = window.setInterval(() => {
        setSegundosGravacao(Math.floor((Date.now() - inicioGravacaoRef.current) / 1000));
      }, 500);
    } catch (erroGravacao) {
      (streamAudioRef.current ?? stream)?.getTracks().forEach((track) => track.stop());
      streamAudioRef.current = null;
      recorderRef.current = null;
      setGravandoAudio(false);
      window.clearInterval(timerGravacaoRef.current);
      console.error('Não foi possível iniciar gravação de áudio:', erroGravacao);
      setErro(erroGravacao.name === 'NotAllowedError'
        ? 'Permita o acesso ao microfone para gravar áudio.'
        : 'Não foi possível iniciar a gravação de áudio.');
      anunciarAtividade('idle');
    }
  }

  function pararGravacao(cancelar = false) {
    cancelarGravacaoRef.current = cancelar;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  useEffect(() => () => {
    window.clearTimeout(timerAtividadeRef.current);
    window.clearInterval(timerGravacaoRef.current);
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    if (recorderRef.current?.state === 'recording') {
      cancelarGravacaoRef.current = true;
      recorderRef.current.stop();
    }
    streamAudioRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  if (!usuarioId) {
    return <main className="componente-carregando">Entre na sua conta para acessar as mensagens privadas.</main>;
  }

  return (
    <>
      <header className="area-header mensagens-privadas-header">
        <div className="barra-menu">
          <div className="lado-esquerdo"><div className="area-logo-site"><p>Viciados Em Souls</p></div></div>
          <div className="lado-direito">
            <button className="btn-filtro" type="button" onClick={() => navigate('/')}>Voltar à comunidade</button>
          </div>
        </div>
      </header>
      <main className={`mensagens-privadas-page mp-organizado${amigoSelecionado ? ' com-conversa' : ''}`}>
        <aside className="mensagens-privadas-lista">
          <header>
            <div className="mp-lista-titulo">
              <h1>Conversas</h1>
              <p>Um espaço para trocar ideias.</p>
            </div>
            <span className="mp-total-amigos">{amigos.length} {amigos.length === 1 ? 'amigo' : 'amigos'}</span>
            <label className="mp-busca-amigos">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
              <input type="search" value={buscaAmigo} onChange={(evento) => setBuscaAmigo(evento.target.value)} placeholder="Buscar amigo" aria-label="Buscar amigo" />
            </label>
          </header>
          {carregandoAmizades ? (
            <p className="mensagens-privadas-vazio">Carregando amigos...</p>
          ) : amigos.length ? (
            amigosFiltrados.length ? amigosFiltrados.map((amigo) => (
              <button className={`mensagem-privada-contato${amigo.id === pessoaId ? ' ativo' : ''}`} aria-current={amigo.id === pessoaId ? 'page' : undefined} key={amigo.id} type="button" onClick={() => navegarConversa(`/mensagens/${amigo.id}`)}>
                <span className="mensagem-privada-avatar-wrap">
                  {amigo.avatar ? <img src={amigo.avatar} alt="" /> : <span className="mensagem-privada-avatar-vazio">{(amigo.nome || 'Viciado em Souls').charAt(0).toLocaleUpperCase('pt-BR')}</span>}
                  <i role="img" className={`mensagem-privada-presenca${amigosOnline[amigo.id] ? ' online' : ''}`} aria-label={amigosOnline[amigo.id] ? 'Online' : 'Offline'} />
                </span>
                <span className="mensagem-privada-contato-info">
                  <strong>{amigo.nome || 'Viciado em Souls'}</strong>
                  <small className={amigosOnline[amigo.id] ? 'online' : ''}>{amigosOnline[amigo.id] ? 'Online' : 'Offline'}</small>
                </span>
                <svg className="mp-contato-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
              </button>
            )) : <p className="mensagens-privadas-vazio" role="status">Nenhum amigo encontrado com esse nome.</p>
          ) : (
            <p className="mensagens-privadas-vazio">Você ainda não tem amigos. Visite um perfil e envie um pedido de amizade.</p>
          )}
        </aside>

        <section className="mensagens-privadas-conversa" aria-label="Conversa privada">
          {amigoSelecionado ? (
            <>
              <header className="mensagem-privada-cabecalho">
                <button type="button" className="mensagem-privada-voltar" onClick={() => navegarConversa('/mensagens')} aria-label="Voltar às conversas"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg></button>
                <span className="mensagem-privada-avatar-wrap">
                  {amigoSelecionado.avatar ? <img src={amigoSelecionado.avatar} alt="" /> : <span className="mensagem-privada-avatar-vazio">{(amigoSelecionado.nome || 'Viciado em Souls').charAt(0).toLocaleUpperCase('pt-BR')}</span>}
                  <i role="img" className={`mensagem-privada-presenca${amigosOnline[amigoSelecionado.id] ? ' online' : ''}`} aria-label={amigosOnline[amigoSelecionado.id] ? 'Online' : 'Offline'} />
                </span>
                <div>
                  <strong>{amigoSelecionado.nome || 'Viciado em Souls'}</strong>
                  <span className={atividadeAmigo ? 'mensagem-privada-atividade' : ''}>
                    {atividadeAmigo === 'typing'
                      ? 'digitando...'
                      : atividadeAmigo === 'recording'
                        ? 'gravando áudio...'
                        : amigosOnline[amigoSelecionado.id] ? 'online' : 'offline'}
                  </span>
                </div>
                <button type="button" className="mensagem-privada-perfil" onClick={() => navigate(`/perfil/${amigoSelecionado.id}`)}>Ver perfil</button>
              </header>
              <div className="mensagens-privadas-historico" ref={listaRef} role="log" aria-live="polite" onScroll={(evento) => {
                const lista = evento.currentTarget;
                rolagemRef.current.noFim = lista.scrollHeight - lista.scrollTop - lista.clientHeight <= 36;
                if (rolagemRef.current.noFim) setNovasMensagens(0);
              }}>
                {carregandoMensagens ? (
                  <p className="mensagens-privadas-vazio">Carregando conversa...</p>
                ) : mensagens.length ? (
                  itensMensagens.map(({ mensagem, novoDia, agrupada }) => (
                    <div className="mp-mensagem-bloco" key={mensagem.id}>
                      {novoDia && <div className="mp-dia" role="separator"><span>{rotuloDoDia(mensagem.criado_em)}</span></div>}
                      <div className={`mp-mensagem-linha${mensagem.remetente_id === usuarioId ? ' propria' : ''}${agrupada ? ' agrupada' : ''}`}>
                        {mensagem.remetente_id !== usuarioId && (
                          agrupada ? <span className="mp-avatar-espaco" aria-hidden="true" /> :
                            <button className="mp-avatar-autor" type="button" onClick={() => navigate(`/perfil/${amigoSelecionado.id}`)} aria-label={`Abrir perfil de ${amigoSelecionado.nome || 'amigo'}`}>
                              {amigoSelecionado.avatar ? <img src={amigoSelecionado.avatar} alt="" /> : <span>{(amigoSelecionado.nome || 'A').charAt(0)}</span>}
                            </button>
                        )}
                        <div className="mp-mensagem-corpo">
                          {!agrupada && mensagem.remetente_id !== usuarioId && <span className="mp-autor-nome">{amigoSelecionado.nome || 'Amigo'}</span>}
                    <article className={`mensagem-privada-balao${mensagem.midia_path && mensagem.midia_url && !mensagem.audio_path ? ' mp-balao-midia' : ''}${mensagem.remetente_id === usuarioId ? ' propria' : ''}${respondendoA?.id === mensagem.id ? ' respondendo' : ''}`} data-mensagem-privada-id={mensagem.id} tabIndex={0} aria-label="Mensagem. Pressione Enter para abrir ações." aria-haspopup="dialog" aria-expanded={mensagemDoMenu?.id === mensagem.id} onClick={(evento) => abrirMenuMensagem(evento, mensagem)} onKeyDown={(evento) => {
                      if (evento.target !== evento.currentTarget) return;
                      if (evento.key === 'Enter' || evento.key === ' ') {
                        evento.preventDefault();
                        abrirMenuMensagem(evento, mensagem);
                      }
                    }}>
                      {mensagem.resposta_mensagem_id && (
                        <button
                          className="mensagem-privada-resposta-preview"
                          type="button"
                          onClick={() => irParaMensagemOriginal(mensagem.resposta_mensagem_id)}
                          title="Ir para a mensagem respondida"
                        >
                          <strong>{mensagem.resposta_remetente_id === usuarioId ? 'Você' : amigoSelecionado.nome || 'Amigo'}</strong>
                          <span>{mensagem.resposta_texto || 'Mensagem'}</span>
                        </button>
                      )}
                      {mensagem.audio_path ? (
                        mensagem.audio_url
                          ? <AudioPrivado key={mensagem.audio_url} src={mensagem.audio_url} />
                          : <p className="mensagem-privada-audio-erro" role="alert">Não foi possível acessar o áudio. Confira a política de leitura do bucket privado no Supabase.</p>
                      ) : mensagem.midia_path ? (
                        mensagem.midia_url
                          ? <>
                            {mensagem.midia_tipo?.startsWith('video/')
                              ? <button className="mp-midia-botao mp-video" type="button" onClick={() => setMidiaAberta({ conversa: pessoaId, id: mensagem.id })} aria-label="Ampliar vídeo"><video className="mensagem-privada-midia" src={mensagem.midia_url} muted playsInline preload="metadata" onLoadedMetadata={manterNoFim} /><span className="mp-video-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 5 11 7-11 7V5Z" /></svg></span></button>
                              : <button className="mp-midia-botao" type="button" onClick={() => setMidiaAberta({ conversa: pessoaId, id: mensagem.id })} aria-label="Ampliar imagem"><img className="mensagem-privada-midia imagem" src={mensagem.midia_url} alt={mensagem.midia_nome || 'Imagem enviada'} loading="lazy" onLoad={manterNoFim} /></button>}
                            {mensagem.texto && <p className="mensagem-privada-legenda">{mensagem.texto}</p>}
                          </>
                          : <p className="mensagem-privada-audio-erro">Mídia temporariamente indisponível.</p>
                      ) : mensagem.figurinha_id ? (
                        mensagem.figurinha?.midia_url
                          ? <button className="mp-midia-botao" type="button" onClick={() => setMidiaAberta({ conversa: pessoaId, id: mensagem.id })} aria-label="Ampliar figurinha"><img className="mensagem-privada-figurinha" src={mensagem.figurinha.midia_url} alt={mensagem.figurinha.midia_nome || 'Figurinha'} loading="lazy" onLoad={manterNoFim} /></button>
                          : <p className="mensagem-privada-audio-erro">Figurinha indisponível.</p>
                      ) : <TextoMensagemPrivada texto={mensagem.texto} />}
                      <div className="mp-balao-rodape">
                      <footer>
                        <time dateTime={mensagem.criado_em}>{formatarHora(mensagem.criado_em)}</time>
                        {mensagem.editada && <span className="mensagem-privada-editada">editada</span>}
                        {mensagem.remetente_id === usuarioId && (
                          <span className={`mensagem-privada-recibo${mensagem.lida_em ? ' lida' : ''}`} aria-label={mensagem.lida_em ? 'Lida' : 'Enviada'}>
                            {mensagem.lida_em ? '✓✓' : '✓'}
                          </span>
                        )}
                      </footer>
                      </div>
                    </article>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="mensagens-privadas-vazio">Esta conversa está vazia. Envie uma mensagem para começar.</p>
                )}
              </div>
              {novasMensagens > 0 && <button className="mp-novas-mensagens" type="button" onClick={() => {
                rolagemRef.current.noFim = true;
                setNovasMensagens(0);
                listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: 'smooth' });
              }}>↓ {novasMensagens} {novasMensagens === 1 ? 'nova mensagem' : 'novas mensagens'}</button>}
              {erro && <p className="mensagens-privadas-erro" role="alert">{erro}</p>}
              <form className="mensagens-privadas-compositor" onSubmit={enviarMensagem}>
                {(respondendoA || editandoId) && (
                  <div className="mensagem-privada-compositor-contexto" role="status">
                    <div>
                      <strong>{editandoId ? 'Editando mensagem' : `Respondendo a ${respondendoA.remetente_id === usuarioId ? 'você' : amigoSelecionado.nome || 'amigo'}`}</strong>
                      <span>{editandoId ? 'Altere o texto e pressione Enter para salvar.' : respondendoA.texto || respondendoA.midia_nome || (respondendoA.audio_path ? 'Áudio' : respondendoA.figurinha_id ? 'Figurinha' : 'Mensagem')}</span>
                    </div>
                    <button type="button" onClick={cancelarRespostaEdicao} aria-label="Cancelar resposta ou edição">×</button>
                  </div>
                )}
                {arquivoSelecionado && (
                  <div className="mensagem-privada-arquivo-preview">
                    {arquivoSelecionado.type.startsWith('video/')
                      ? <video src={arquivoPreviewUrl} muted />
                      : <img src={arquivoPreviewUrl} alt="Prévia da imagem" />}
                    <span>{arquivoSelecionado.name}</span>
                    <button type="button" onClick={limparArquivoSelecionado} aria-label="Remover anexo">×</button>
                  </div>
                )}
                {gravandoAudio ? (
                  <div className="mensagem-privada-gravacao" role="status">
                    <span className="mensagem-privada-gravacao-ponto" />
                    <span>Gravando áudio</span>
                    <strong>{formatarDuracao(segundosGravacao)}</strong>
                  </div>
                ) : (
                  <textarea
                    ref={textoRef}
                    id="mensagem-privada-texto"
                    value={texto}
                    onChange={(evento) => {
                      const novoTexto = evento.target.value;
                      setTexto(novoTexto);
                      window.clearTimeout(timerAtividadeRef.current);
                      if (novoTexto.trim()) {
                        anunciarAtividade('typing');
                        timerAtividadeRef.current = window.setTimeout(() => anunciarAtividade('idle'), 1600);
                      } else {
                        anunciarAtividade('idle');
                      }
                    }}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Escape') { cancelarRespostaEdicao(); setFigurinhasAbertas(false); }
                      if (evento.key === 'Enter' && !evento.shiftKey && !evento.nativeEvent.isComposing) {
                        evento.preventDefault();
                        enviarMensagem(evento);
                      }
                    }}
                    maxLength={2000}
                    rows={1}
                    placeholder={arquivoSelecionado ? 'Digite uma legenda ou pressione Enter para enviar' : `Mensagem para ${amigoSelecionado.nome || 'seu amigo'}`}
                    aria-label="Mensagem privada"
                    disabled={enviando}
                  />
                )}
                <input
                  ref={arquivoInputRef}
                  className="mensagem-privada-input-arquivo"
                  type="file"
                  accept="image/gif,image/jpeg,image/png,image/webp,video/*"
                  onChange={selecionarArquivo}
                  disabled={enviando || gravandoAudio || Boolean(editandoId)}
                  aria-label="Anexar imagem ou vídeo"
                />
                {!gravandoAudio && (
                  <button
                    className="mensagem-privada-anexar"
                    type="button"
                    onClick={() => arquivoInputRef.current?.click()}
                    disabled={enviando || Boolean(editandoId)}
                    aria-label="Anexar imagem ou vídeo"
                    title="Anexar imagem ou vídeo"
                  >+</button>
                )}
                {gravandoAudio ? (
                  <>
                    <button className="mensagem-privada-cancelar-audio" type="button" onClick={() => pararGravacao(true)} aria-label="Cancelar gravação">Cancelar</button>
                    <button className="mensagem-privada-parar-audio" type="button" onClick={() => pararGravacao()} aria-label="Enviar áudio gravado">Enviar áudio</button>
                  </>
                ) : (
                  <>
                    <button className="mensagem-privada-microfone" type="button" onClick={iniciarGravacao} disabled={enviando || Boolean(editandoId)} aria-label="Gravar áudio" title="Gravar áudio">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" /></svg>
                    </button>
                    <div className="mensagens-privadas-figurinhas">
                      {figurinhasAbertas && (
                        <div className="mensagens-privadas-seletor-figurinhas" role="dialog" aria-label="Minhas figurinhas">
                          <header>
                            <strong>Figurinhas</strong>
                            <label className="mensagens-privadas-adicionar-figurinha">
                              <input
                                ref={figurinhaInputRef}
                                type="file"
                                accept="image/gif,image/jpeg,image/png,image/webp"
                                onChange={adicionarFigurinha}
                                disabled={adicionandoFigurinha || figurinhas.length >= 100}
                              />
                              {adicionandoFigurinha ? 'Adicionando...' : '+ Adicionar'}
                            </label>
                          </header>
                          <label className="mensagens-privadas-busca-figurinha">
                            <input type="search" value={buscaFigurinha} onChange={(evento) => setBuscaFigurinha(evento.target.value)} placeholder="Pesquisar figurinhas" aria-label="Pesquisar figurinhas" />
                          </label>
                          {carregandoFigurinhas ? (
                            <p className="mensagens-privadas-figurinhas-vazio">Carregando coleção...</p>
                          ) : figurinhasFiltradas.length ? (
                            <div className="mensagens-privadas-grade-figurinhas">
                              {figurinhasFiltradas.map((figurinha) => (
                                <button
                                  key={figurinha.id}
                                  type="button"
                                  title={figurinha.midia_nome}
                                  aria-label={`Enviar figurinha: ${figurinha.midia_nome}`}
                                  disabled={enviando}
                                  onClick={() => {
                                    setFigurinhasAbertas(false);
                                    enviarMensagem({ preventDefault() {} }, figurinha);
                                  }}
                                >
                                  <img src={figurinha.midia_url} alt="" loading="lazy" />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="mensagens-privadas-figurinhas-vazio">{buscaFigurinha ? 'Nenhuma figurinha encontrada.' : 'Sua coleção está vazia. Adicione uma imagem ou GIF.'}</p>
                          )}
                        </div>
                      )}
                      <button className="mensagem-privada-botao-figurinhas" type="button" onClick={() => setFigurinhasAbertas((aberto) => !aberto)} disabled={Boolean(editandoId)} aria-label="Abrir figurinhas" aria-expanded={figurinhasAbertas} title="Figurinhas">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3.5h10l4 4v13H5z" /><path d="M14.5 3.5v5h4.5M8 12h8M8 16h5" /></svg>
                      </button>
                    </div>
                    <button className="mp-enviar" type="submit" disabled={enviando || (!texto.trim() && !arquivoSelecionado)} aria-label={editandoId ? 'Salvar edição' : 'Enviar mensagem'} title={editandoId ? 'Salvar edição' : 'Enviar mensagem'}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">{editandoId ? <path d="m5 12 5 5L20 7" /> : <path d="M4 12 20 4l-6 16-3-7-7-1Z" />}</svg>
                    </button>
                  </>
                )}
              </form>
              <div className="mp-compositor-dica"><span>{enviando ? 'Enviando...' : 'Enter envia · Shift + Enter quebra a linha'}</span>{texto.length > 1600 && <span>{texto.length}/2000</span>}</div>
            </>
          ) : (
            <div className="mensagens-privadas-selecione">
              <span className="mp-selecione-icone" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 3.5V5Z" /><path d="M8 9h8M8 12h5" /></svg></span>
              <h2>{pessoaId && !carregandoAmizades ? 'Conversa indisponível' : 'Suas conversas privadas'}</h2>
              <p>{pessoaId && !carregandoAmizades ? 'Você precisa aceitar o pedido de amizade para conversar com essa pessoa.' : 'Selecione um amigo ou adicione alguém pela página de perfil.'}</p>
              {erro && <p className="mensagens-privadas-erro" role="alert">{erro}</p>}
            </div>
          )}
        </section>
      </main>
      {mensagemDoMenu && createPortal(
        <div className="mp-menu-mensagem" ref={menuMensagemRef} role="dialog" aria-label="Ações da mensagem" style={{ left: menuMensagem.x, top: menuMensagem.y }}>
          <button type="button" onClick={() => { fecharMenuMensagem(); responderMensagem(mensagemDoMenu); }}>Responder</button>
          {mensagemDoMenu.remetente_id === usuarioId && !mensagemDoMenu.audio_path && !mensagemDoMenu.midia_path && !mensagemDoMenu.figurinha_id && mensagemDoMenu.texto && (
            <button type="button" onClick={() => { fecharMenuMensagem(); editarMensagem(mensagemDoMenu); }}>Editar</button>
          )}
          {mensagemDoMenu.remetente_id === usuarioId && (
            <button className="mp-menu-excluir" type="button" onClick={() => { fecharMenuMensagem(true); excluirMensagem(mensagemDoMenu); }}>Excluir</button>
          )}
        </div>,
        document.body
      )}
      {midiaAberta && midiaAberta.conversa === pessoaId && (
        <GaleriaMidiasPrivadas key={`${pessoaId}:${midiaAberta.id}`} inicialId={midiaAberta.id} midias={midiasGaleria} aoFechar={fecharGaleria} />
      )}
    </>
  );
}

export default MensagensPrivadas;
