import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRanking } from './useRanking';
import { etapaDesafio, formatarDataRanking } from '../../services/ranking';
import { classificarBuilds, tituloEtapaBuilds } from '../../services/classificacaoBuilds';
import CardParticipacao from './CardParticipacao';

function TabelaBuilds({ desafio, participacoes, mostrarCards = false }) {
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const tabelaId = useId();
  const builds = classificarBuilds(desafio, participacoes);
  const posicoesVisiveis = mostrarTodos ? builds : builds.slice(0, 6);
  const lider = builds[0];
  return builds.length ? (
    <>
    {desafio.etapa === 3 && !desafio.vencedor_id && <p className="ranking-vazio" role="status">
      A final terminou sem votos: a competição foi encerrada sem vencedor e sem prêmio.
    </p>}
    <article className="ranking-builds-primeiro" aria-label="Primeiro lugar da competição">
      <span className="ranking-builds-primeiro-posicao">1º lugar</span>
      <img src={lider.autor_avatar || '/svg-animado/icone-usuario.svg'} alt="" loading="lazy" />
      <div className="ranking-builds-primeiro-identidade">
        <h3><Link to={`/ranking?desafio=${desafio.id}#participacao-${lider.id}`}>{lider.titulo}</Link></h3>
        <p>{lider.autor_nome}{desafio.vencedor_id === lider.id && ' · Vencedor'}</p>
      </div>
      <strong>{lider.votos} <small>{Number(lider.votos) === 1 ? 'voto' : 'votos'} nesta etapa</small></strong>
      {desafio.vencedor_id === lider.id && <div className="ranking-builds-primeiro-final">
        {desafio.final_vencedor ? <>
          <span>Final conquistado</span>
          <strong>{desafio.final_vencedor.titulo}</strong>
          <p>{desafio.final_vencedor.final} · {desafio.final_vencedor.jogo}</p>
        </> : <p>O vencedor ainda está escolhendo seu final.</p>}
      </div>}
    </article>
    <div className="ranking-builds-tabela-container">
      <table className="ranking-builds-tabela" id={tabelaId} aria-label={`Classificação de ${desafio.titulo}`}>
        <thead><tr><th scope="col">Posição</th><th scope="col">Build e jogador</th><th scope="col">Votos</th></tr></thead>
        <tbody>{posicoesVisiveis.slice(1).map((build, index) => (
          <tr key={build.id}>
            <td>{index + 2}º</td>
            <td><div className="ranking-builds-identidade">
              <img src={build.autor_avatar || '/svg-animado/icone-usuario.svg'} alt="" loading="lazy" />
              <div>
                <Link to={`/ranking?desafio=${desafio.id}#participacao-${build.id}`}>{build.titulo}</Link>
                <span>{build.autor_nome}{desafio.vencedor_id === build.id && ' · Vencedor'}</span>
              </div>
            </div></td>
            <td>{build.votos}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
    {builds.length > 6 && <div className="ranking-builds-expandir">
      <button className="btn-filtro" type="button" aria-expanded={mostrarTodos} aria-controls={tabelaId}
        onClick={() => setMostrarTodos((anterior) => !anterior)}>
        {mostrarTodos ? 'Mostrar só os 6 primeiros' : 'Mostrar todas as posições'}
      </button>
    </div>}
    {mostrarCards && <section className="ranking-builds-galeria" aria-label="Builds enviadas">
      <h3 className="rk-grade-titulo">{tituloEtapaBuilds(desafio.etapa)} ({builds.length})</h3>
      <div className="rk-grade">
        {builds.map((build, index) => <CardParticipacao key={build.id} participacao={build}
          desafio={desafio} resumo posicao={index + 1} />)}
      </div>
    </section>}
    </>
  ) : <p className="ranking-vazio">Ainda não há builds nesta etapa.</p>;
}

function ClassificacaoReal({ desafioId, mostrarCards }) {
  const { dados, erro, carregando, atualizar } = useRanking(desafioId);
  if (carregando) return <p role="status">Carregando classificação das builds…</p>;
  if (erro) return <p className="ranking-erro" role="alert">{erro} <button type="button" onClick={atualizar}>Tentar novamente</button></p>;
  const desafio = dados.desafios.find((d) => d.id === desafioId);
  if (!desafio) return <p role="status">Esta competição não está mais disponível. Escolha outra competição.</p>;
  return <TabelaBuilds key={`${desafio.id}:${desafio.etapa}`} desafio={desafio} participacoes={dados.participacoes} mostrarCards={mostrarCards} />;
}

export default function ClassificacaoBuilds({ dados, mostrarCards = false }) {
  const seletorId = useId();
  const [selecionada, setSelecionada] = useState('');
  const competicoes = dados.desafios.filter((d) => d.tipo === 'build');
  // Sem escolha, abre a competicao mais recente que ja comecou (agendadas ainda nao tem builds).
  const desafio = competicoes.find((d) => d.id === selecionada)
    || competicoes.find((d) => Date.parse(d.inicio) <= Date.parse(dados.agora)) || competicoes[0];
  if (!desafio) return <p className="ranking-vazio">Nenhuma competição de builds publicada ainda.</p>;
  return (
    <div className="ranking-builds-classificacao">
      <label htmlFor={seletorId}>Competição de builds
        <select id={seletorId} value={desafio.id} onChange={(event) => setSelecionada(event.target.value)}>
          {competicoes.map((d) => <option key={d.id} value={d.id}>{d.titulo} — {etapaDesafio(d, Date.parse(dados.agora))}</option>)}
        </select>
      </label>
      {mostrarCards && <div className="rk-participar-acao rk-envio-curto">
        {Date.parse(dados.agora) < Date.parse(desafio.inicio)
          ? <span className="rk-participar-prazo">As inscrições abrem em <b>{formatarDataRanking(desafio.inicio)}</b>.</span>
          : Date.parse(dados.agora) < Date.parse(desafio.fim) ? <>
            <Link className="rk-btn rk-btn--principal" to={`/ranking?desafio=${desafio.id}&participar=1`}>+ Criar minha build</Link>
            <span className="rk-participar-prazo">Inscrições até <b>{formatarDataRanking(desafio.fim)}</b></span>
          </> : <span className="rk-participar-prazo">Inscrições encerradas.{desafio.etapa < 3 ? ' Vote nas builds da etapa atual.' : ''}</span>}
      </div>}
      <ClassificacaoReal key={desafio.id} desafioId={desafio.id} mostrarCards={mostrarCards} />
    </div>
  );
}
