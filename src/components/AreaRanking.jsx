import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ImagemDecorativaAdiada from './ImagemDecorativaAdiada';
import DivisoriaSecao from './DivisoriaSecao';
import { useRanking } from './ranking/useRanking';
import ClassificacaoRanking from './ranking/ClassificacaoRanking';
import CardParticipacao from './ranking/CardParticipacao';
import { dadosDemonstracaoRanking } from './ranking/dadosDemonstracao';
import { competicaoEmDestaque, etapaDesafio, formatarDataRanking } from '../services/ranking';
import './AreaRanking.css';
import './ranking/Ranking.css';

function CompeticaoRanking({ desafio, participacoes, agora, demonstracao = false }) {
  const encerrada = desafio.etapa === 3;
  const prazo = desafio.etapa === 1 ? desafio.fim_semifinal : desafio.fim_final;
  // Mesmo desempate do banco: vencedor, votos e participacao enviada primeiro.
  const builds = participacoes.filter((p) => p.desafio_id === desafio.id)
    .sort((a, b) => (b.id === desafio.vencedor_id) - (a.id === desafio.vencedor_id)
      || Number(b.votos) - Number(a.votos)
      || String(a.criado_em ?? '').localeCompare(String(b.criado_em ?? '')));

  return (
    <section className="ranking-home-competicao" aria-labelledby={`competicao-home-${desafio.id}`}>
      <header className="ranking-home-competicao-topo">
        <div>
          <span className="ranking-home-etapa">{etapaDesafio(desafio, agora)}</span>
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
        <div><dt>Prêmio do vencedor</dt><dd>{desafio.pontos} <small>pts no ranking</small></dd></div>
        <div><dt>{encerrada ? 'Finalistas' : 'Builds nesta etapa'}</dt><dd>{builds.length}</dd></div>
        <div><dt>{encerrada ? 'Final encerrada em' : 'Vote até'}</dt><dd><time dateTime={prazo}>{formatarDataRanking(prazo)}</time></dd></div>
      </dl>
      {encerrada ? <p className="ranking-home-votacao">Resultado disponível por 3 dias após a final.</p>
        : <p className="ranking-home-votacao">Nova etapa, novos votos. Você pode votar novamente nas builds que avançaram.</p>}
      <div className="ranking-competidores">
        {builds.map((p) => <CardParticipacao key={p.id} participacao={p} desafio={desafio} resumo demonstracao={demonstracao} />)}
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
  const demonstracao = import.meta.env.DEV && new URLSearchParams(search).get('rankingDemo') === '1';
  return demonstracao
    ? <ConteudoRanking dados={dadosDemonstracaoRanking(etapa)} demonstracao etapa={etapa} aoMudarEtapa={setEtapa} />
    : <RankingReal />;
}

function ConteudoRanking({ dados, erro, carregando, atualizar, demonstracao = false, etapa, aoMudarEtapa }) {
  const agora = dados ? Date.parse(dados.agora) : 0;
  const competicoes = dados?.desafios.filter(competicaoEmDestaque) || [];
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
            <Link to="/ranking">Ver ranking e participar dos desafios →</Link>
          </div>
        </header>
        {demonstracao && <aside className="ranking-home-demo" aria-label="Demonstração do ranking">
          <div>
            <strong>Demonstração · Dados fictícios</strong>
            <p>Jogadores, builds, votos e datas de exemplo. Imagens ilustrativas. Nada é salvo no banco.</p>
          </div>
          <label>Visualizar etapa
            <select value={etapa} onChange={(event) => aoMudarEtapa(Number(event.target.value))}>
              <option value={1}>Semifinal · 6 builds</option>
              <option value={2}>Final · 3 builds</option>
              <option value={3}>Encerrada · vencedor e prêmio</option>
            </select>
          </label>
          <Link className="ranking-home-link" to="/#ranking">Sair da demonstração</Link>
        </aside>}
        {carregando && <p className="ranking-home-status" role="status">Carregando ranking…</p>}
        {erro && <p className="ranking-erro" role="alert">{erro} <button type="button" onClick={atualizar}>Tentar novamente</button></p>}
        {dados && !erro && <>
          <section className="ranking-home-classificacao" aria-labelledby="ranking-home-classificacao-titulo">
            <header className="ranking-home-secao-topo">
              <div>
                <h3 id="ranking-home-classificacao-titulo">Classificação geral</h3>
                <p>Pontos por desafios concluídos e competições vencidas.</p>
              </div>
              <Link className="ranking-home-link" to="/ranking">Ver classificação completa <span aria-hidden="true">→</span></Link>
            </header>
            <ClassificacaoRanking jogadores={dados.jogadores.slice(0, 6)} demonstracao={demonstracao} />
          </section>
          <section className="ranking-home-disputas" aria-labelledby="ranking-home-disputas-titulo">
            <header className="ranking-home-secao-topo">
              <div>
                <h3 id="ranking-home-disputas-titulo">Builds em disputa</h3>
                <p>Da semifinal à final, a comunidade decide quem leva o prêmio.</p>
              </div>
              <Link className="ranking-home-link" to="/ranking">Explorar desafios <span aria-hidden="true">→</span></Link>
            </header>
            {competicoes.map((d) => <CompeticaoRanking key={d.id} desafio={d}
              participacoes={dados.participacoes} agora={agora} demonstracao={demonstracao} />)}
            {!competicoes.length && <div className="ranking-home-sem-disputa">
              <strong>As próximas disputas aparecem aqui</strong>
              <p>Quando a classificatória terminar, as builds selecionadas ganham espaço para a comunidade votar.</p>
              <Link className="ranking-home-link" to="/ranking">Ver desafios e participar <span aria-hidden="true">→</span></Link>
            </div>}
          </section>
        </>}
      </div>
    </section>
  );
}
