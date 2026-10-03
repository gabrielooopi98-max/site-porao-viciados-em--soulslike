import { useState } from 'react';
import { Link } from 'react-router-dom';
import { executarRanking } from '../../services/ranking';

const AVATAR_PADRAO = '/svg-animado/icone-usuario.svg';
const PRINCIPAIS_VISIVEIS = 3;
const formatoRelativo = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
const unidades = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];

function tempoRelativo(data) {
  const segundos = (Date.parse(data) - Date.now()) / 1000;
  const [unidade, tamanho] = unidades.find(([, s]) => Math.abs(segundos) >= s) || ['second', 1];
  if (unidade === 'second') return 'agora';
  return formatoRelativo.format(Math.round(segundos / tamanho), unidade);
}

function AvatarComentario({ comentario }) {
  if (!comentario.autor_avatar) return <img className="rk-coment-avatar" src={AVATAR_PADRAO} alt="" />;
  return (
    <span className="rk-coment-avatar">
      <img src={comentario.autor_avatar} alt="" loading="lazy" style={{
        objectPosition: `${comentario.avatar_pos_x ?? 50}% ${comentario.avatar_pos_y ?? 50}%`,
        transform: `scale(${comentario.avatar_zoom ?? 1})`,
      }} />
    </span>
  );
}

const iconeLike = <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />;
const iconeDeslike = <path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />;

function CampoComentario({ rotulo, placeholder, enviar, aoCancelar, autoFocus = false }) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function aoEnviar(event) {
    event.preventDefault();
    if (enviando || !texto.trim()) return;
    setEnviando(true);
    if (await enviar(texto)) setTexto('');
    setEnviando(false);
  }
  return (
    <form className="rk-coment-form" onSubmit={aoEnviar}>
      <textarea aria-label={rotulo} placeholder={placeholder} value={texto} required maxLength={2000} rows={2}
        autoFocus={autoFocus} disabled={enviando} onChange={(event) => setTexto(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) aoEnviar(event);
          if (event.key === 'Escape' && aoCancelar) aoCancelar();
        }} />
      <div className="rk-coment-form-acoes">
        {aoCancelar && <button className="rk-coment-acao" type="button" disabled={enviando} onClick={aoCancelar}>Cancelar</button>}
        <button className="rk-btn rk-btn--principal rk-btn--compacto" type="submit" disabled={enviando || !texto.trim()}>
          {enviando ? 'Enviando…' : 'Comentar'}
        </button>
      </div>
    </form>
  );
}

// Comentarios de uma build ou prova: perfil do autor, like/deslike e respostas em um nivel.
export default function ComentariosRanking({ participacaoId, comentarios, user, conquista, aoAtualizar }) {
  const [respondendo, setRespondendo] = useState(null);
  const [reagindo, setReagindo] = useState(null);
  const [abertos, setAbertos] = useState({});
  const [todos, setTodos] = useState(false);
  const [erro, setErro] = useState('');

  const respostas = new Map();
  for (const c of comentarios) {
    if (c.resposta_a) respostas.set(c.resposta_a, [...(respostas.get(c.resposta_a) || []), c]);
  }
  const principais = comentarios.filter((c) => !c.resposta_a).reverse();
  const visiveis = todos ? principais : principais.slice(0, PRINCIPAIS_VISIVEIS);

  async function comentar(texto, respostaA = null) {
    setErro('');
    try {
      await executarRanking('ranking_comentar', { p_participacao: participacaoId, p_texto: texto, p_resposta_a: respostaA });
      if (respostaA) {
        setRespondendo(null);
        setAbertos((atuais) => ({ ...atuais, [respostaA]: true }));
      }
      await aoAtualizar();
      return true;
    } catch (error) {
      setErro(error.message);
      return false;
    }
  }

  async function reagir(comentario, tipo) {
    if (!user || reagindo) return;
    setReagindo(comentario.id);
    setErro('');
    try {
      await executarRanking('ranking_reagir_comentario', { p_comentario: comentario.id, p_tipo: tipo });
      await aoAtualizar();
    } catch (error) {
      setErro(error.message);
    } finally {
      setReagindo(null);
    }
  }

  function renderComentario(c, principalId) {
    const semConta = !user ? 'Entre na sua conta para reagir' : undefined;
    return (
      <article className="rk-coment" key={c.id}>
        <Link to={`/perfil/${c.autor_id}`} aria-hidden="true" tabIndex={-1}><AvatarComentario comentario={c} /></Link>
        <div className="rk-coment-corpo">
          <div className="rk-coment-balao">
            <header className="rk-coment-cabecalho">
              <Link to={`/perfil/${c.autor_id}`}>{c.autor_nome}</Link>
              {user?.id === c.autor_id && <span className="rk-tag-voce">você</span>}
              <time dateTime={c.criado_em} title={new Date(c.criado_em).toLocaleString('pt-BR')}>{tempoRelativo(c.criado_em)}</time>
            </header>
            <p>{c.texto}</p>
          </div>
          <div className="rk-coment-acoes">
            <button className="rk-coment-acao rk-coment-reacao" type="button" aria-pressed={c.minha_reacao === 1}
              aria-label={`Curtir (${c.likes})`} title={semConta} disabled={!user || reagindo === c.id} onClick={() => reagir(c, 1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{iconeLike}</svg><span>{c.likes}</span>
            </button>
            <button className="rk-coment-acao rk-coment-reacao rk-coment-reacao--neg" type="button" aria-pressed={c.minha_reacao === -1}
              aria-label={`Não curtir (${c.deslikes})`} title={semConta} disabled={!user || reagindo === c.id} onClick={() => reagir(c, -1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{iconeDeslike}</svg><span>{c.deslikes}</span>
            </button>
            {user && <button className="rk-coment-acao" type="button" onClick={() => setRespondendo({ id: principalId, nome: c.autor_nome })}>Responder</button>}
          </div>
        </div>
      </article>
    );
  }

  return (
    <section className="rk-coments" aria-label="Comentários">
      {user
        ? <CampoComentario rotulo={conquista ? 'Comente a prova' : 'Comente a build'}
          placeholder={conquista ? 'Comente a prova (o ADM lê antes de aprovar)…' : 'O que achou desta build?'}
          enviar={(texto) => comentar(texto)} />
        : <p className="rk-coments-vazio"><Link to="/login">Entre na sua conta</Link> para comentar e reagir.</p>}
      {erro && <p className="ranking-erro" role="alert">{erro}</p>}
      {!principais.length && <p className="rk-coments-vazio">Ninguém comentou ainda. Seja o primeiro!</p>}
      <ul className="rk-coments-lista">
        {visiveis.map((c) => {
          const fio = respostas.get(c.id) || [];
          const aberto = abertos[c.id] ?? fio.length <= 2;
          return (
            <li key={c.id}>
              {renderComentario(c, c.id)}
              {(fio.length > 0 || respondendo?.id === c.id) && <div className="rk-coment-respostas">
                {fio.length > 2 && <button className="rk-coment-acao rk-coment-toggle" type="button" aria-expanded={aberto}
                  onClick={() => setAbertos((atuais) => ({ ...atuais, [c.id]: !aberto }))}>
                  {aberto ? 'Ocultar respostas' : `Ver ${fio.length} respostas`}
                </button>}
                {aberto && fio.map((r) => renderComentario(r, c.id))}
                {respondendo?.id === c.id && <CampoComentario autoFocus rotulo={`Responder a ${respondendo.nome}`}
                  placeholder={`Responder a ${respondendo.nome}…`} aoCancelar={() => setRespondendo(null)}
                  enviar={(texto) => comentar(texto, c.id)} />}
              </div>}
            </li>
          );
        })}
      </ul>
      {principais.length > PRINCIPAIS_VISIVEIS && <button className="rk-coment-acao rk-coment-toggle" type="button" onClick={() => setTodos(!todos)}>
        {todos ? 'Mostrar menos' : `Ver todos os ${principais.length} comentários`}
      </button>}
    </section>
  );
}
