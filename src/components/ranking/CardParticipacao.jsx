import { useState } from 'react';
import { Link } from 'react-router-dom';
import MidiasPublicacao from '../MidiasPublicacao';
import EscolhaFinal, { SeloFinal } from './EscolhaFinal';
import { executarRanking, podeVotarRanking } from '../../services/ranking';
import MidiasBuildRanking from './MidiasBuildRanking';
import { etapaEliminacao } from '../../services/classificacaoBuilds';
import '../cards-builds/CardBuild.css';

export default function CardParticipacao({ participacao, desafio, user, admin = false, comentarios = [], finais = [], aoAtualizar, resumo = false, agora = 0, demonstracao = false, aoVotarDemonstracao }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [motivo, setMotivo] = useState('');
  const [texto, setTexto] = useState('');
  const [mostrarComentarios, setMostrarComentarios] = useState(false);
  const [descricaoExpandida, setDescricaoExpandida] = useState(false);
  const p = participacao;
  const vencedor = desafio.vencedor_id === p.id;
  const eliminadaEm = etapaEliminacao(desafio, p);
  const podeAvaliar = admin && p.autor_id !== user?.id && (desafio.tipo === 'conquista' || agora < Date.parse(desafio.fim));
  const votacaoPermitida = podeVotarRanking(desafio, p, user?.id, agora);
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
  return (
    <article className={`ranking-participacao ${desafio.tipo === 'build' ? 'ranking-build-card' : 'ranking-prova-card'} ${vencedor ? 'ranking-vencedor' : ''}`}>
      <header>
        <div className="ranking-build-autor">
          <img src={p.autor_avatar || '/svg-animado/icone-usuario.svg'} alt="" loading="lazy" />
          {demonstracao ? <b>{p.autor_nome}</b> : <Link to={`/perfil/${p.autor_id}`}>{p.autor_nome}</Link>}
        </div>
        <span className={`ranking-status-chip ${vencedor ? 'vencedor' : eliminadaEm !== null ? 'eliminada' : p.status}`}>
          {vencedor ? 'Vencedor' : eliminadaEm !== null ? `Eliminada na ${['classificatória', 'semifinal'][eliminadaEm]}`
            : { pendente: 'Aguardando ADM', aprovada: 'Validada pelo ADM', recusada: 'Recusada' }[p.status]}
        </span>
      </header>
      {desafio.tipo === 'build' && <div className="ranking-build-titulo">
        <p className="ranking-build-jogo">{desafio.jogo}</p>
        <h3>{p.titulo}</h3>
      </div>}
      {resumo && desafio.tipo === 'build' && p.descricao?.trim() && <div className="ranking-build-descricao">
        <p className={`ranking-texto ${descricaoExpandida ? '' : 'ranking-build-descricao-previa'}`}>{p.descricao}</p>
        <button type="button" aria-expanded={descricaoExpandida} onClick={() => setDescricaoExpandida((anterior) => !anterior)}>
          {descricaoExpandida ? 'Mostrar menos' : 'Ler descrição completa'}
        </button>
      </div>}
      {vencedor && (desafio.final_vencedor ? <SeloFinal final={desafio.final_vencedor} />
        : !resumo && p.autor_id === user?.id ? <EscolhaFinal finais={finais} participacaoId={p.id} aoEscolhido={aoAtualizar} />
          : <p className="ranking-aguardando-final">Aguardando o vencedor escolher o final.</p>)}
      {!resumo && desafio.tipo === 'build' && <p className="ranking-texto">{p.descricao}</p>}
      {desafio.tipo === 'build' && p.midias.length > 0 ? <MidiasBuildRanking participacao={p} /> : p.midias.length > 0 && <>
        <div className="ranking-prova-midias" role="region" aria-label={`Prova de ${p.autor_nome}`} tabIndex={p.midias.length > 1 ? 0 : undefined}>
          <MidiasPublicacao publicacao={resumo ? { ...p, midias: p.midias.slice(0, 1) } : p}
            itemClassName="ranking-midia-item" mediaClassName="ranking-midia" permitirAmpliar />
        </div>
        {!resumo && p.midias.length > 1 && <small className="ranking-prova-anexos">{p.midias.length} anexos · Deslize para ver todas as mídias</small>}
      </>}
      {resumo && desafio.tipo !== 'build' && p.midias.length > 1 && <small>{p.midias.length} anexos na participação completa</small>}
      {!resumo && desafio.tipo === 'build' && <div className="ranking-atributos">
        {p.atributos.equipamentos && <p className="ranking-texto">{p.atributos.equipamentos}</p>}
      </div>}
      <footer>
        {desafio.tipo === 'build'
          ? <strong className="ranking-build-votos">{p.votos}<span>{Number(p.votos) === 1 ? 'voto nesta etapa' : 'votos nesta etapa'}</span></strong>
          : <strong>{p.votos} {Number(p.votos) === 1 ? 'voto' : 'votos'}</strong>}
        {demonstracao ? <button className="btn-filtro" type="button" disabled={desafio.etapa === 3 || !aoVotarDemonstracao}
          aria-pressed={p.votou} onClick={() => aoVotarDemonstracao(p.id)}>
          {desafio.etapa === 3 ? 'Votação encerrada' : p.votou ? 'Retirar voto' : 'Votar'}
        </button> : resumo ? <Link to={`/ranking?desafio=${desafio.id}#participacao-${p.id}`}>{desafio.etapa === 3 ? 'Ver build' : 'Ver e votar'}</Link> : <>
          <button type="button" disabled={ocupado || !votacaoPermitida} aria-pressed={p.votou}
            onClick={() => acao('ranking_votar', { p_participacao: p.id, p_etapa: desafio.etapa })}>{p.votou ? 'Retirar voto' : 'Votar'}</button>
          <button type="button" onClick={() => setMostrarComentarios(!mostrarComentarios)} aria-expanded={mostrarComentarios}>
            Avaliações ({comentarios.length})
          </button>
        </>}
      </footer>
      {!resumo && <>
        {p.motivo && <p className="ranking-parecer">Parecer do ADM: {p.motivo}</p>}
        {desafio.tipo === 'build' && <small>Histórico de votos: classificatória {p.historico_votos[0]} · semifinal {p.historico_votos[1]} · final {p.historico_votos[2]}</small>}
        {mostrarComentarios && <div className="ranking-comentarios">
          {comentarios.map((c) => <p key={c.id}><Link to={`/perfil/${c.autor_id}`}>{c.autor_nome}</Link><br />{c.texto}</p>)}
          {user ? <form onSubmit={(event) => { event.preventDefault(); acao('ranking_comentar', { p_participacao: p.id, p_texto: texto }); }}>
            <label>Avaliar a prova<textarea value={texto} onChange={(event) => setTexto(event.target.value)} required maxLength={2000} disabled={ocupado} /></label>
            <button disabled={ocupado || !texto.trim()} type="submit">Comentar</button>
          </form> : <Link to="/login">Entre para avaliar</Link>}
        </div>}
        {podeAvaliar && <div className="ranking-moderacao">
          <label>Parecer do ADM (obrigatório ao recusar)<textarea maxLength={2000} value={motivo} onChange={(event) => setMotivo(event.target.value)} disabled={ocupado} /></label>
          <div className="ranking-acoes">
            <button type="button" disabled={ocupado || p.status === 'aprovada'} onClick={() => acao('ranking_avaliar', { p_participacao: p.id, p_aprovar: true, p_motivo: motivo })}>Aprovar</button>
            <button type="button" disabled={ocupado || motivo.trim().length < 3} onClick={() => acao('ranking_avaliar', { p_participacao: p.id, p_aprovar: false, p_motivo: motivo })}>Recusar</button>
          </div>
        </div>}
        {erro && <p className="ranking-erro" role="alert">{erro}</p>}
      </>}
    </article>
  );
}
