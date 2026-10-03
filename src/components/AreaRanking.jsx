import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ImagemDecorativaAdiada from './ImagemDecorativaAdiada';
import DivisoriaSecao from './DivisoriaSecao';
import { useRanking } from './ranking/useRanking';
import ClassificacaoBuilds from './ranking/ClassificacaoBuilds';
import CardParticipacao from './ranking/CardParticipacao';
import { alternarVotoDemonstracao, dadosDemonstracaoRanking } from './ranking/dadosDemonstracao';
import { competicaoEmDestaque, formatarDataRanking } from '../services/ranking';
import { classificarBuilds, tituloEtapaBuilds } from '../services/classificacaoBuilds';
import './AreaRanking.css';
import './ranking/Ranking.css';

function CompeticaoRanking({ desafio, participacoes, demonstracao = false, aoVotarDemonstracao }) {
  const encerrada = desafio.etapa === 3;
  const prazo = desafio.etapa === 0 ? desafio.fim : desafio.etapa === 1 ? desafio.fim_semifinal : desafio.fim_final;
  const builds = classificarBuilds(desafio, participacoes);

  return (
    <section className="ranking-home-competicao" aria-labelledby={`competicao-home-${desafio.id}`}>
      <header className="ranking-home-competicao-topo">
        <div>
          <h4 id={`competicao-home-${desafio.id}`}>{desafio.titulo}</h4>
          <p>{desafio.jogo}</p>
        </div>
        {!demonstracao && <Link className="ranking-home-link" to={`/ranking?desafio=${desafio.id}`}>Acompanhar competição <span aria-hidden="true">→</span></Link>}
      </header>
      <ol className="ranking-home-etapas" aria-label="Etapas da competição">
        {['Classificatória', 'Semifinal', 'Final'].map((etapa, index) => (
          <li key={etapa} aria-current={desafio.etapa === index ? 'step' : undefined}
            className={desafio.etapa > index ? 'concluida' : ''}>
            <span aria-hidden="true">{index + 1}</span>{etapa}
          </li>
        ))}
      </ol>
      <dl className="ranking-home-informacoes">
        <div><dt>{encerrada ? 'Finalistas' : 'Builds nesta etapa'}</dt><dd>{builds.length}</dd></div>
        <div className="ranking-home-premio"><dt>Prêmio do vencedor</dt><dd>{desafio.pontos} pts</dd></div>
        <div><dt>{encerrada ? 'Final encerrada em' : 'Vote até'}</dt><dd><time dateTime={prazo}>{formatarDataRanking(prazo)}</time></dd></div>
      </dl>
      {encerrada ? <p className="ranking-home-votacao">Resultado disponível por 3 dias após a final.</p>
        : <p className="ranking-home-votacao">Nova etapa, novos votos. Você pode votar novamente nas builds que avançaram.</p>}
      <h5 className="ranking-home-builds-titulo">{tituloEtapaBuilds(desafio.etapa)}</h5>
      <div className="ranking-competidores">
        {builds.map((p) => <CardParticipacao key={p.id} participacao={p} desafio={desafio} resumo demonstracao={demonstracao} aoVotarDemonstracao={aoVotarDemonstracao} />)}
      </div>
      {!builds.length && <p className="ranking-vazio">Nenhuma build validada para esta competição.</p>}
    </section>
  );
}

function RankingReal() {
  const { dados, erro, carregando, atualizar } = useRanking();
  return <ConteudoRanking dados={dados} erro={erro} carregando={carregando} atualizar={atualizar} />;
}

export default function AreaRanking() {
  const { search } = useLocation();
  const [etapa, setEtapa] = useState(1);
  const [votosSimulados, setVotosSimulados] = useState({});
  const demonstracao = import.meta.env.DEV && new URLSearchParams(search).get('rankingDemo') !== '0';
  function votarDemonstracao(id) {
    setVotosSimulados((anteriores) => alternarVotoDemonstracao(anteriores, etapa, id));
  }
  return demonstracao
    ? <ConteudoRanking dados={dadosDemonstracaoRanking(etapa, votosSimulados)} demonstracao etapa={etapa} aoMudarEtapa={setEtapa} aoVotarDemonstracao={votarDemonstracao} />
    : <RankingReal />;
}

function ConteudoRanking({ dados, erro, carregando, atualizar, demonstracao = false, etapa, aoMudarEtapa, aoVotarDemonstracao }) {
  const competicoes = dados?.desafios.filter((d) => competicaoEmDestaque(d)
    || (demonstracao && d.tipo === 'build')) || [];
  const etapas = dados?.desafios.filter((d) => d.tipo === 'build').map((d) => d.etapa) || [];
  const tituloDisputas = tituloEtapaBuilds(Math.max(0, ...etapas));
  return (
    <section className="area-ranking ranking-comunidade" id="ranking" aria-labelledby="ranking-titulo">
      <DivisoriaSecao />
      <div className="ranking-conteudo">
        <header className="ranking-header cabecalho-cenario-amplo">
          <div className="ranking-ilustracao" aria-hidden="true">
            <ImagemDecorativaAdiada src="/svg-animado/lua-bloodborne-banner-1760x575.svg" alt="" className="ranking-cenario" />
          </div>
          <div className="ranking-header-texto">
            <span className="ranking-sobretitulo">Ranking da comunidade</span>
            <h2 id="ranking-titulo">Cada jornada deixa sua marca</h2>
            <p>Desafios concluídos e competições de builds. Veja os destaques da comunidade.</p>
          </div>
        </header>
        {demonstracao && <aside className="ranking-home-demo" aria-label="Demonstração do ranking">
          <div>
            <strong>Demonstração · Dados fictícios</strong>
            <p>Jogadores, builds e datas de exemplo. Como no ranking real, vote em quantas builds quiser, uma vez em cada por etapa. Nada é salvo no banco. Recarregar reinicia a demonstração.</p>
          </div>
          <label>Visualizar etapa
            <select value={etapa} onChange={(event) => aoMudarEtapa(Number(event.target.value))}>
              <option value={0}>Classificação · 6 builds</option>
              <option value={1}>Semifinal · 4 builds</option>
              <option value={2}>Final · 2 builds</option>
              <option value={3}>Encerrada · vencedor e prêmio</option>
            </select>
          </label>
          <Link className="ranking-home-link" to="/?rankingDemo=0#ranking">Ver dados reais</Link>
        </aside>}
        {carregando && <p className="ranking-home-status" role="status">Carregando ranking…</p>}
        {erro && <p className="ranking-erro" role="alert">{erro} <button type="button" onClick={atualizar}>Tentar novamente</button></p>}
        {dados && !erro && <>
          <section className="ranking-home-classificacao" aria-labelledby="ranking-home-classificacao-titulo">
            <header className="ranking-home-secao-topo">
              <div>
                <h3 id="ranking-home-classificacao-titulo">Classificação das builds</h3>
                <p>Veja as posições das builds pelos votos de cada competição.</p>
              </div>
              <Link className="ranking-home-link" to={demonstracao ? '/ranking?rankingDemo=1' : '/ranking'}>Ver classificação completa <span aria-hidden="true">→</span></Link>
            </header>
            <ClassificacaoBuilds dados={dados} demonstracao={demonstracao} />
          </section>
          <section className="ranking-home-disputas" aria-labelledby="ranking-home-disputas-titulo">
            <header className="ranking-home-secao-topo">
              <div>
                <h3 id="ranking-home-disputas-titulo">{tituloDisputas}</h3>
                <p>Da semifinal à final, a comunidade decide quem leva o prêmio.</p>
              </div>
            </header>
            {competicoes.map((d) => <CompeticaoRanking key={d.id} desafio={d}
              participacoes={dados.participacoes} demonstracao={demonstracao} aoVotarDemonstracao={aoVotarDemonstracao} />)}
            {!competicoes.length && <div className="ranking-home-sem-disputa">
              <strong>As próximas disputas aparecem aqui</strong>
              <p>As votações das builds começam quando o desafio avançar para a semifinal.</p>
              <Link className="ranking-home-link" to="/ranking">Ver desafios e participar <span aria-hidden="true">→</span></Link>
            </div>}
          </section>
        </>}
      </div>
    </section>
  );
}
