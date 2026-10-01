import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../services/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatarHora(data) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(data));
}

function MensagensPrivadas() {
  const { user } = useAuth();
  const usuarioId = user?.id;
  const navigate = useNavigate();
  const { pessoaId } = useParams();
  const [amizades, setAmizades] = useState([]);
  const [mensagens, setMensagens] = useState([]);
  const [mensagensCarregadasPara, setMensagensCarregadasPara] = useState(null);
  const [texto, setTexto] = useState('');
  const [carregandoAmizades, setCarregandoAmizades] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const listaRef = useRef(null);

  useEffect(() => {
    if (!usuarioId) return undefined;
    let ativo = true;
    supabase
      .from('amizades')
      .select('id, solicitante_id, destinatario_id, solicitante_nome, solicitante_avatar_url, destinatario_nome, destinatario_avatar_url')
      .eq('status', 'aceita')
      .or(`solicitante_id.eq.${usuarioId},destinatario_id.eq.${usuarioId}`)
      .order('criado_em', { ascending: false })
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

  const amigos = useMemo(() => !usuarioId ? [] : amizades.map((amizade) => (
    amizade.solicitante_id === usuarioId
      ? { id: amizade.destinatario_id, nome: amizade.destinatario_nome, avatar: amizade.destinatario_avatar_url }
      : { id: amizade.solicitante_id, nome: amizade.solicitante_nome, avatar: amizade.solicitante_avatar_url }
  )), [amizades, usuarioId]);
  const amigoSelecionado = amigos.find((amigo) => amigo.id === pessoaId) ?? null;

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
      }, (payload) => {
        if (!ativo) return;
        const mensagem = payload.new;
        if (![usuarioId, pessoaId].includes(mensagem.remetente_id) || ![usuarioId, pessoaId].includes(mensagem.destinatario_id)) return;
        if (!historicoCarregado) eventosDuranteCarregamento.push(mensagem);
        setMensagens((atuais) => (
          atuais.some((item) => item.id === mensagem.id)
            ? atuais
            : [...atuais, mensagem].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
        ));
      })
      .subscribe();

    supabase
      .from('mensagens_privadas')
      .select('id, remetente_id, destinatario_id, texto, criado_em')
      .or(`and(remetente_id.eq.${usuarioId},destinatario_id.eq.${pessoaId}),and(remetente_id.eq.${pessoaId},destinatario_id.eq.${usuarioId})`)
      .order('criado_em', { ascending: false })
      .limit(100)
      .then(({ data, error: erroConsulta }) => {
        if (!ativo) return;
        if (erroConsulta) {
          console.error('Erro ao carregar conversa privada:', erroConsulta);
          setErro(`Não foi possível carregar a conversa: ${erroConsulta.message}`);
          setMensagens([]);
        } else {
          const historico = [...(data ?? [])].reverse();
          const combinado = [...historico];
          eventosDuranteCarregamento.forEach((mensagem) => {
            if (!combinado.some((item) => item.id === mensagem.id)) combinado.push(mensagem);
          });
          combinado.sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
          setMensagens(combinado);
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
  }, [amigoSelecionado, pessoaId, usuarioId]);

  const carregandoMensagens = Boolean(amigoSelecionado && mensagensCarregadasPara !== pessoaId);
  const mensagensVisiveis = useMemo(
    () => mensagensCarregadasPara === pessoaId ? mensagens : [],
    [mensagens, mensagensCarregadasPara, pessoaId]
  );

  useEffect(() => {
    if (listaRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight;
  }, [mensagensVisiveis, carregandoMensagens]);

  async function enviarMensagem(evento) {
    evento.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || !amigoSelecionado || enviando) return;

    setEnviando(true);
    setErro('');
    try {
      const { data, error: erroEnvio } = await supabase
        .from('mensagens_privadas')
        .insert({
          remetente_id: usuarioId,
          destinatario_id: amigoSelecionado.id,
          texto: conteudo,
        })
        .select('id, remetente_id, destinatario_id, texto, criado_em')
        .single();

      if (erroEnvio) {
        console.error('Erro ao enviar mensagem privada:', erroEnvio);
        setErro(`Não foi possível enviar a mensagem: ${erroEnvio.message}`);
      } else {
        setMensagens((atuais) => (
          atuais.some((item) => item.id === data.id)
            ? atuais
            : [...atuais, data].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
        ));
        setTexto('');
      }
    } catch (erroEnvio) {
      console.error('Erro ao enviar mensagem privada:', erroEnvio);
      setErro('Não foi possível enviar a mensagem. Confira sua conexão e tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

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
      <main className={`mensagens-privadas-page${amigoSelecionado ? ' com-conversa' : ''}`}>
        <aside className="mensagens-privadas-lista">
          <header><h1>Conversas</h1><span>{amigos.length} amigos</span></header>
          {carregandoAmizades ? (
            <p className="mensagens-privadas-vazio">Carregando amigos...</p>
          ) : amigos.length ? (
            amigos.map((amigo) => (
              <button className={`mensagem-privada-contato${amigo.id === pessoaId ? ' ativo' : ''}`} key={amigo.id} type="button" onClick={() => navigate(`/mensagens/${amigo.id}`)}>
                {amigo.avatar ? <img src={amigo.avatar} alt="" /> : <span className="mensagem-privada-avatar-vazio">?</span>}
                <strong>{amigo.nome || 'Viciado em Souls'}</strong>
              </button>
            ))
          ) : (
            <p className="mensagens-privadas-vazio">Você ainda não tem amigos. Visite um perfil e envie um pedido de amizade.</p>
          )}
        </aside>

        <section className="mensagens-privadas-conversa" aria-label="Conversa privada">
          {amigoSelecionado ? (
            <>
              <header className="mensagem-privada-cabecalho">
                <button type="button" className="mensagem-privada-voltar" onClick={() => navigate('/mensagens')}>Conversas</button>
                {amigoSelecionado.avatar ? <img src={amigoSelecionado.avatar} alt="" /> : <span className="mensagem-privada-avatar-vazio">?</span>}
                <div><strong>{amigoSelecionado.nome || 'Viciado em Souls'}</strong><span>Amigo</span></div>
                <button type="button" className="mensagem-privada-perfil" onClick={() => navigate(`/perfil/${amigoSelecionado.id}`)}>Ver perfil</button>
              </header>
              <div className="mensagens-privadas-historico" ref={listaRef} role="log" aria-live="polite">
                {carregandoMensagens ? (
                  <p className="mensagens-privadas-vazio">Carregando conversa...</p>
                ) : mensagens.length ? (
                  mensagensVisiveis.map((mensagem) => (
                    <article className={`mensagem-privada-balao${mensagem.remetente_id === usuarioId ? ' propria' : ''}`} key={mensagem.id}>
                      <p>{mensagem.texto}</p><time dateTime={mensagem.criado_em}>{formatarHora(mensagem.criado_em)}</time>
                    </article>
                  ))
                ) : (
                  <p className="mensagens-privadas-vazio">Esta conversa está vazia. Envie uma mensagem para começar.</p>
                )}
              </div>
              {erro && <p className="mensagens-privadas-erro" role="alert">{erro}</p>}
              <form className="mensagens-privadas-compositor" onSubmit={enviarMensagem}>
                <textarea value={texto} onChange={(evento) => setTexto(evento.target.value)} onKeyDown={(evento) => {
                  if (evento.key === 'Enter' && !evento.shiftKey) {
                    evento.preventDefault();
                    enviarMensagem(evento);
                  }
                }} maxLength={2000} rows={1} placeholder={`Mensagem para ${amigoSelecionado.nome || 'seu amigo'}`} aria-label="Mensagem privada" />
                <button type="submit" disabled={!texto.trim() || enviando}>{enviando ? 'Enviando...' : 'Enviar'}</button>
              </form>
            </>
          ) : (
            <div className="mensagens-privadas-selecione">
              <h2>{pessoaId && !carregandoAmizades ? 'Conversa indisponível' : 'Suas conversas privadas'}</h2>
              <p>{pessoaId && !carregandoAmizades ? 'Você precisa aceitar o pedido de amizade para conversar com essa pessoa.' : 'Selecione um amigo ou adicione alguém pela página de perfil.'}</p>
              {erro && <p className="mensagens-privadas-erro" role="alert">{erro}</p>}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default MensagensPrivadas;
