import { useState } from 'react';
import { Link } from 'react-router-dom';
import EscolhaFinal, { SeloFinal } from './EscolhaFinal';
import { executarRanking, podeVotarRanking } from '../../services/ranking';
import MidiasBuildRanking from './MidiasBuildRanking';
import FormularioParticipacao from './FormularioParticipacao';
import ComentariosRanking from './ComentariosRanking';
import { etapaEliminacao } from '../../services/classificacaoBuilds';
import './CardsRanking.css';

const AVATAR_PADRAO = '/svg-animado/icone-usuario.svg';

function textoStatus(p, { vencedor, eliminadaEm, conquista }) {
  if (vencedor) return 'Vencedor';
  if (eliminadaEm !== null) return `Eliminada na ${['classificatória', 'semifinal'][eliminadaEm]}`;
  if (!conquista) return { pendente: 'Aguardando ADM', aprovada: 'Na disputa', recusada: 'Removida pelo ADM' }[p.status];
  return { pendente: 'Aguardando ADM', aprovada: 'Aprovada', recusada: 'Recusada' }[p.status];
}

const icones = {
  editar: <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />,
  excluir: <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />,
  comentarios: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />,
};

function Icone({ nome }) {
  return <svg className="rk-icone" viewBox="0 0 24 24" aria-hidden="true">{icones[nome]}</svg>;
}

export default function CardParticipacao({ participacao, desafio, user, admin = false, comentarios = [], finais = [], aoAtualizar, resumo = false, agora = 0, posicao = null }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [motivo, setMotivo] = useState('');
  const [mostrarComentarios, setMostrarComentarios] = useState(false);
  const [descricaoExpandida, setDescricaoExpandida] = useState(false);
  const [editando, setEditando] = useState(false);
  const p = participacao;
  const conquista = desafio.tipo === 'conquista';
  const vencedor = desafio.vencedor_id === p.id;
  const eliminadaEm = etapaEliminacao(desafio, p);
  const minha = Boolean(user) && p.autor_id === user.id;
  const podeAvaliar = admin && !minha && (conquista || agora < Date.parse(desafio.fim));
  // Mesmo prazo de ranking_editar_participacao e ranking_excluir_participacao.
  const podeAlterar = !resumo && minha && !conquista && agora < Date.parse(desafio.fim);
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
      await aoAtualizar();
    } catch (error) {
      setErro(error.message);
      await aoAtualizar();
    } finally {
      setOcupado(false);
    }
  }

  function excluir() {
    if (!window.confirm(`Excluir a build "${p.titulo}"? Votos e comentários dela serão apagados. Você poderá enviar outra até o fim das inscrições.`)) return;
    acao('ranking_excluir_participacao', { p_participacao: p.id });
  }

  if (editando && podeAlterar) {
    return (
      <article className="rk-card rk-card--build rk-card--minha" aria-label={`Editar build ${p.titulo}`}>
        <FormularioParticipacao desafio={desafio} participacao={p} aoPublicar={aoAtualizar} aoFechar={() => setEditando(false)} />
      </article>
    );
  }

  const classes = ['rk-card', conquista ? 'rk-card--prova' : 'rk-card--build',
    vencedor && 'rk-card--vencedor', minha && 'rk-card--minha',
    (eliminadaEm !== null || p.status === 'recusada') && 'rk-card--apagada'].filter(Boolean).join(' ');

  const avatar = <img src={p.autor_avatar || AVATAR_PADRAO} alt="" loading="lazy" />;
  const nome = <Link to={`/perfil/${p.autor_id}`}>{p.autor_nome}</Link>;
  const lateral = (
    <div className="rk-card-lateral">
      <span className={`ranking-status-chip ${classeStatus}`}>{status}</span>
      {podeAlterar && <div className="rk-icones" role="group" aria-label="Gerenciar sua build">
        <button className="rk-icone-btn" type="button" disabled={ocupado} onClick={() => setEditando(true)}
          aria-label="Editar build" title="Editar build"><Icone nome="editar" /></button>
        <button className="rk-icone-btn rk-icone-btn--perigo" type="button" disabled={ocupado} onClick={excluir}
          aria-label="Excluir build" title="Excluir build"><Icone nome="excluir" /></button>
      </div>}
    </div>
  );

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
          {lateral}
        </header>
      ) : (
        <header className={`rk-card-topo ${posicao ? '' : 'rk-card-topo--sem-posicao'}`}>
          {posicao && <span className={`rk-posicao ${posicao <= 3 ? `rk-posicao--${posicao}` : ''}`} aria-label={`${posicao}º lugar`}>{posicao}º</span>}
          <div className="rk-card-identidade">
            <h3 className="rk-card-titulo">{p.titulo}</h3>
            <p className="rk-card-autor">{avatar}{nome}{minha && <span className="rk-tag-voce">· Sua build</span>}</p>
          </div>
          {lateral}
        </header>
      )}

      <MidiasBuildRanking participacao={p} abas={!conquista} limite={resumo && conquista ? 1 : undefined} />

      {!conquista && (p.descricao?.trim() || (!resumo && p.atributos?.equipamentos)) && <div className="rk-card-info">
        {p.descricao?.trim() && <div>
          <p className={`rk-descricao ${resumo && !descricaoExpandida ? 'rk-descricao--previa' : ''}`}>{p.descricao}</p>
          {resumo && p.descricao.length > 160 && <button className="rk-link-texto" type="button" aria-expanded={descricaoExpandida}
            onClick={() => setDescricaoExpandida((anterior) => !anterior)}>{descricaoExpandida ? 'Mostrar menos' : 'Ler descrição completa'}</button>}
        </div>}
        {!resumo && p.atributos?.equipamentos && <details className="rk-dobra">
          <summary>Equipamentos usados</summary>
          <div><p className="rk-descricao">{p.atributos.equipamentos}</p></div>
        </details>}
      </div>}

      {!resumo && !conquista && <ul className="rk-historico" aria-label="Votos recebidos em cada etapa">
        {['Classificatória', 'Semifinal', 'Final'].map((etapa, i) => <li key={etapa}><b>{p.historico_votos?.[i] ?? 0}</b>{etapa}</li>)}
      </ul>}

      {vencedor && (desafio.final_vencedor ? <SeloFinal final={desafio.final_vencedor} />
        : !resumo && minha ? <EscolhaFinal finais={finais} participacaoId={p.id} aoEscolhido={aoAtualizar} />
          : <p className="ranking-aguardando-final">Aguardando o vencedor escolher o final.</p>)}

      {!resumo && p.motivo && (conquista || p.status === 'recusada') && <p className={`rk-parecer ${p.status === 'aprovada' ? 'rk-parecer--aprovada' : ''}`}>
        <strong>{conquista ? 'Parecer do ADM' : 'Motivo da remoção'}</strong>{p.motivo}
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
            <button className={`rk-btn rk-btn--comentarios ${mostrarComentarios ? 'rk-btn--ativo' : ''}`} type="button"
              onClick={() => setMostrarComentarios(!mostrarComentarios)} aria-expanded={mostrarComentarios}
              aria-label={`Comentários (${comentarios.length})`}>
              <Icone nome="comentarios" /><span>{comentarios.length}</span>
            </button>
            {!conquista && <button className={`rk-btn ${p.votou ? 'rk-btn--votado' : 'rk-btn--principal'}`} type="button"
              disabled={ocupado || !votacaoPermitida} aria-pressed={p.votou}
              title={!user ? 'Entre na sua conta para votar' : minha ? 'Você não pode votar na sua build' : p.votou ? 'Clique para retirar seu voto' : undefined}
              onClick={() => acao('ranking_votar', { p_participacao: p.id, p_etapa: desafio.etapa })}>
              {p.votou ? '✓ Votado' : 'Votar'}
            </button>}
          </>}
        </div>
      </footer>

      {!resumo && <>
        {mostrarComentarios && <ComentariosRanking participacaoId={p.id} comentarios={comentarios} user={user}
          conquista={conquista} aoAtualizar={aoAtualizar} />}
        {podeAvaliar && (conquista ? <div className="rk-bloco rk-bloco--adm">
          <h4>Avaliação do ADM</h4>
          <label>Parecer (obrigatório ao recusar)
            <textarea maxLength={2000} value={motivo} onChange={(event) => setMotivo(event.target.value)} disabled={ocupado} />
          </label>
          <div className="rk-acoes">
            <button className="rk-btn rk-btn--principal" type="button" disabled={ocupado || p.status === 'aprovada'} onClick={() => acao('ranking_avaliar', { p_participacao: p.id, p_aprovar: true, p_motivo: motivo })}>Aprovar</button>
            <button className="rk-btn" type="button" disabled={ocupado || motivo.trim().length < 3} onClick={() => acao('ranking_avaliar', { p_participacao: p.id, p_aprovar: false, p_motivo: motivo })}>Recusar</button>
          </div>
        </div> : <details className="rk-bloco rk-bloco--adm">
          {/* Builds entram na disputa sozinhas; o ADM so remove as que quebram as regras. */}
          <summary>Moderação do ADM</summary>
          {p.status === 'recusada'
            ? <button className="rk-btn" type="button" disabled={ocupado} onClick={() => acao('ranking_avaliar', { p_participacao: p.id, p_aprovar: true, p_motivo: '' })}>Devolver à disputa</button>
            : <>
              <label>Motivo da remoção (o autor vê)
                <textarea maxLength={2000} value={motivo} onChange={(event) => setMotivo(event.target.value)} disabled={ocupado} />
              </label>
              <button className="rk-btn" type="button" disabled={ocupado || motivo.trim().length < 3} onClick={() => acao('ranking_avaliar', { p_participacao: p.id, p_aprovar: false, p_motivo: motivo })}>Remover da disputa</button>
            </>}
        </details>)}
        {erro && <p className="ranking-erro" role="alert">{erro}</p>}
      </>}
    </article>
  );
}
