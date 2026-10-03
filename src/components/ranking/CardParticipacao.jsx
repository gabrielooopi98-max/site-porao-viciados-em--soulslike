import { useState } from 'react';
import { Link } from 'react-router-dom';
import EscolhaFinal, { SeloFinal } from './EscolhaFinal';
import { executarRanking, podeVotarRanking } from '../../services/ranking';
import MidiasBuildRanking from './MidiasBuildRanking';
import { etapaEliminacao } from '../../services/classificacaoBuilds';
import './CardsRanking.css';

const AVATAR_PADRAO = '/svg-animado/icone-usuario.svg';

function textoStatus(p, { vencedor, eliminadaEm, conquista }) {
  if (vencedor) return 'Vencedor';
  if (eliminadaEm !== null) return `Eliminada na ${['classificatória', 'semifinal'][eliminadaEm]}`;
  return { pendente: 'Aguardando ADM', aprovada: conquista ? 'Aprovada' : 'Na disputa', recusada: 'Recusada' }[p.status];
}

export default function CardParticipacao({ participacao, desafio, user, admin = false, comentarios = [], finais = [], aoAtualizar, resumo = false, agora = 0, posicao = null }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [motivo, setMotivo] = useState('');
  const [texto, setTexto] = useState('');
  const [mostrarComentarios, setMostrarComentarios] = useState(false);
  const [descricaoExpandida, setDescricaoExpandida] = useState(false);
  const p = participacao;
  const conquista = desafio.tipo === 'conquista';
  const vencedor = desafio.vencedor_id === p.id;
  const eliminadaEm = etapaEliminacao(desafio, p);
  const minha = Boolean(user) && p.autor_id === user.id;
  const podeAvaliar = admin && !minha && (conquista || agora < Date.parse(desafio.fim));
  const votacaoPermitida = podeVotarRanking(desafio, p, user?.id, agora);
  const linkCompleto = `/ranking?desafio=${desafio.id}#participacao-${p.id}`;
  const status = textoStatus(p, { vencedor, eliminadaEm, conquista });
  const classeStatus = vencedor ? 'vencedor' : eliminadaEm !== null ? 'eliminada' : p.status;

  async function acao(funcao, parametros) {
    if (ocupado) return;
    setOcupado(true);
    setErro('');
    try {
      await executarRanking(funcao, parametros);
      if (funcao === 'ranking_comentar') setTexto('');
      await aoAtualizar();
    } catch (error) {
      setErro(error.message);
      await aoAtualizar();
    } finally {
      setOcupado(false);
    }
  }

  const classes = ['rk-card', conquista ? 'rk-card--prova' : 'rk-card--build',
    vencedor && 'rk-card--vencedor', minha && 'rk-card--minha',
    (eliminadaEm !== null || p.status === 'recusada') && 'rk-card--apagada'].filter(Boolean).join(' ');

  const avatar = <img src={p.autor_avatar || AVATAR_PADRAO} alt="" loading="lazy" />;
  const nome = <Link to={`/perfil/${p.autor_id}`}>{p.autor_nome}</Link>;

  return (
    <article className={classes} aria-label={conquista ? `Prova de ${p.autor_nome}` : `Build ${p.titulo} de ${p.autor_nome}`}>
      {conquista ? (
        <header className="rk-card-topo">
          <div className="rk-card-pessoa">
            {avatar}
            <div>
              {nome}
              <small>{minha ? <span className="rk-tag-voce">Sua prova</span> : `Prova enviada para ${desafio.jogo}`}</small>
            </div>
          </div>
          <span className={`ranking-status-chip ${classeStatus}`}>{status}</span>
        </header>
      ) : (
        <header className={`rk-card-topo ${posicao ? '' : 'rk-card-topo--sem-posicao'}`}>
          {posicao && <span className={`rk-posicao ${posicao <= 3 ? `rk-posicao--${posicao}` : ''}`} aria-label={`${posicao}º lugar`}>{posicao}º</span>}
          <div className="rk-card-identidade">
            <h3 className="rk-card-titulo">{p.titulo}</h3>
            <p className="rk-card-autor">{avatar}{nome}{minha && <span className="rk-tag-voce">· Sua build</span>}</p>
          </div>
          <span className={`ranking-status-chip ${classeStatus}`}>{status}</span>
        </header>
      )}

      <MidiasBuildRanking participacao={p} abas={!conquista} limite={resumo && conquista ? 1 : undefined} />

      {!conquista && p.descricao?.trim() && <div>
        <p className={`rk-descricao ${resumo && !descricaoExpandida ? 'rk-descricao--previa' : ''}`}>{p.descricao}</p>
        {resumo && p.descricao.length > 160 && <button className="rk-link-texto" type="button" aria-expanded={descricaoExpandida}
          onClick={() => setDescricaoExpandida((anterior) => !anterior)}>{descricaoExpandida ? 'Mostrar menos' : 'Ler descrição completa'}</button>}
      </div>}

      {!resumo && !conquista && p.atributos?.equipamentos && <details className="rk-dobra">
        <summary>Equipamentos e estratégia</summary>
        <div><p className="rk-descricao">{p.atributos.equipamentos}</p></div>
      </details>}

      {!resumo && !conquista && <ul className="rk-historico" aria-label="Votos recebidos em cada etapa">
        {['Classificatória', 'Semifinal', 'Final'].map((nome, i) => <li key={nome}>{nome} <b>{p.historico_votos?.[i] ?? 0}</b></li>)}
      </ul>}

      {vencedor && (desafio.final_vencedor ? <SeloFinal final={desafio.final_vencedor} />
        : !resumo && minha ? <EscolhaFinal finais={finais} participacaoId={p.id} aoEscolhido={aoAtualizar} />
          : <p className="ranking-aguardando-final">Aguardando o vencedor escolher o final.</p>)}

      {!resumo && p.motivo && <p className={`rk-parecer ${p.status === 'aprovada' ? 'rk-parecer--aprovada' : ''}`}>
        <strong>Parecer do ADM</strong>{p.motivo}
      </p>}

      <footer className="rk-card-rodape">
        {conquista
          ? <span className={`rk-placar rk-placar--${p.status}`}>
            {p.status === 'aprovada' ? `+${desafio.pontos} pts` : `${desafio.pontos} pts`}
            <small>{{ aprovada: 'concedidos no ranking', pendente: 'se o ADM aprovar', recusada: 'não concedidos' }[p.status]}</small>
          </span>
          : <span className="rk-placar">{p.votos}<small>{Number(p.votos) === 1 ? 'voto nesta etapa' : 'votos nesta etapa'}</small></span>}
        <div className="rk-acoes">
          {resumo ? <Link className="rk-btn" to={linkCompleto}>{conquista ? 'Ver prova' : desafio.etapa === 3 ? 'Ver build' : 'Ver e votar'}</Link> : <>
            {!conquista && <button className={`rk-btn ${p.votou ? 'rk-btn--votado' : 'rk-btn--principal'}`} type="button"
              disabled={ocupado || !votacaoPermitida} aria-pressed={p.votou}
              title={!user ? 'Entre na sua conta para votar' : minha ? 'Você não pode votar na sua build' : p.votou ? 'Clique para retirar seu voto' : undefined}
              onClick={() => acao('ranking_votar', { p_participacao: p.id, p_etapa: desafio.etapa })}>
              {p.votou ? '✓ Votado' : 'Votar'}
            </button>}
            <button className="rk-btn" type="button" onClick={() => setMostrarComentarios(!mostrarComentarios)} aria-expanded={mostrarComentarios}>
              {conquista ? 'Comentários' : 'Avaliações'} ({comentarios.length})
            </button>
          </>}
        </div>
      </footer>

      {!resumo && <>
        {mostrarComentarios && <div className="rk-bloco">
          <h4>{conquista ? 'Comentários da comunidade' : 'Avaliações da comunidade'}</h4>
          {!comentarios.length && <p className="rk-comentario">Ninguém comentou ainda.</p>}
          {comentarios.map((c) => <p className="rk-comentario" key={c.id}><Link to={`/perfil/${c.autor_id}`}>{c.autor_nome}</Link>{c.texto}</p>)}
          {user ? <form onSubmit={(event) => { event.preventDefault(); acao('ranking_comentar', { p_participacao: p.id, p_texto: texto }); }}>
            <label>{conquista ? 'Comente a prova (o ADM lê antes de aprovar)' : 'Avalie a build'}
              <textarea value={texto} onChange={(event) => setTexto(event.target.value)} required maxLength={2000} disabled={ocupado} />
            </label>
            <button className="rk-btn" disabled={ocupado || !texto.trim()} type="submit">Comentar</button>
          </form> : <Link className="rk-btn" to="/login">Entre para comentar</Link>}
        </div>}
        {podeAvaliar && <div className="rk-bloco rk-bloco--adm">
          <h4>Avaliação do ADM</h4>
          <label>Parecer (obrigatório ao recusar)
            <textarea maxLength={2000} value={motivo} onChange={(event) => setMotivo(event.target.value)} disabled={ocupado} />
          </label>
          <div className="rk-acoes">
            <button className="rk-btn rk-btn--principal" type="button" disabled={ocupado || p.status === 'aprovada'} onClick={() => acao('ranking_avaliar', { p_participacao: p.id, p_aprovar: true, p_motivo: motivo })}>Aprovar</button>
            <button className="rk-btn" type="button" disabled={ocupado || motivo.trim().length < 3} onClick={() => acao('ranking_avaliar', { p_participacao: p.id, p_aprovar: false, p_motivo: motivo })}>Recusar</button>
          </div>
        </div>}
        {erro && <p className="ranking-erro" role="alert">{erro}</p>}
      </>}
    </article>
  );
}
