import { Link } from 'react-router-dom';
import ImagemDecorativaAdiada from './ImagemDecorativaAdiada';
import DivisoriaSecao from './DivisoriaSecao';
import { useAuth } from '../contexts/useAuth';
import { useRanking } from './ranking/useRanking';
import ClassificacaoBuilds from './ranking/ClassificacaoBuilds';
import ClassificacaoRanking from './ranking/ClassificacaoRanking';
import CardParticipacao from './ranking/CardParticipacao';
import { competicaoEmDestaque, formatarDataRanking } from '../services/ranking';
import { classificarBuilds, tituloEtapaBuilds } from '../services/classificacaoBuilds';
import './AreaRanking.css';
import './ranking/Ranking.css';

function CompeticaoRanking({ desafio, participacoes }) {
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
        <Link className="ranking-home-link" to={`/ranking?desafio=${desafio.id}`}>Acompanhar competição <span aria-hidden="true">→</span></Link>
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
        {builds.map((p) => <CardParticipacao key={p.id} participacao={p} desafio={desafio} resumo />)}
      </div>
      {!builds.length && <p className="ranking-vazio">Nenhuma build validada para esta competição.</p>}
    </section>
  );
}

export default function AreaRanking() {
  const { user } = useAuth();
  const { dados, erro, carregando, atualizar } = useRanking();
  const competicoes = dados?.desafios.filter(competicaoEmDestaque) || [];
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
        {carregando && <p className="ranking-home-status" role="status">Carregando ranking…</p>}
        {erro && <p className="ranking-erro" role="alert">{erro} <button type="button" onClick={atualizar}>Tentar novamente</button></p>}
        {dados && !erro && <>
          <section className="ranking-home-classificacao" aria-labelledby="ranking-home-geral-titulo">
            <header className="ranking-home-secao-topo">
              <div>
                <h3 id="ranking-home-geral-titulo">Ranking geral</h3>
                <p>Pontos de desafios do ADM aprovados e competições de builds vencidas.</p>
              </div>
              <Link className="ranking-home-link" to="/ranking">Ver ranking completo <span aria-hidden="true">→</span></Link>
            </header>
            <ClassificacaoRanking jogadores={dados.jogadores} usuarioId={user?.id} meusPontos={dados.meus_pontos} limite={10} />
          </section>
          <section className="ranking-home-classificacao ranking-home-secao-seguinte" aria-labelledby="ranking-home-classificacao-titulo">
            <header className="ranking-home-secao-topo">
              <div>
                <h3 id="ranking-home-classificacao-titulo">Classificação das builds</h3>
                <p>Veja as posições das builds pelos votos de cada competição.</p>
              </div>
              <Link className="ranking-home-link" to="/ranking">Ver competições <span aria-hidden="true">→</span></Link>
            </header>
            <ClassificacaoBuilds dados={dados} />
          </section>
          <section className="ranking-home-disputas" aria-labelledby="ranking-home-disputas-titulo">
            <header className="ranking-home-secao-topo">
              <div>
                <h3 id="ranking-home-disputas-titulo">{tituloDisputas}</h3>
                <p>Da semifinal à final, a comunidade decide quem leva o prêmio.</p>
              </div>
            </header>
            {competicoes.map((d) => <CompeticaoRanking key={d.id} desafio={d} participacoes={dados.participacoes} />)}
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
