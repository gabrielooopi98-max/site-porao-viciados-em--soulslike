import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRanking } from './useRanking';
import { etapaDesafio } from '../../services/ranking';
import { classificarBuilds, tituloEtapaBuilds } from '../../services/classificacaoBuilds';
import CardParticipacao from './CardParticipacao';

function TabelaBuilds({ desafio, participacoes, demonstracao, mostrarCards = false, aoVotarDemonstracao }) {
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
        {demonstracao ? <h3>{lider.titulo}</h3> : <h3><Link to={`/ranking?desafio=${desafio.id}#participacao-${lider.id}`}>{lider.titulo}</Link></h3>}
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
                {demonstracao ? <strong>{build.titulo}</strong> : <Link to={`/ranking?desafio=${desafio.id}#participacao-${build.id}`}>{build.titulo}</Link>}
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
      <h3>{tituloEtapaBuilds(desafio.etapa)} ({builds.length})</h3>
      <div className="ranking-competidores">
        {builds.map((build) => <CardParticipacao key={build.id} participacao={build}
          desafio={desafio} resumo demonstracao={demonstracao} aoVotarDemonstracao={aoVotarDemonstracao} />)}
      </div>
    </section>}
    </>
  ) : <p className="ranking-vazio">Ainda não há builds aprovadas nesta etapa.</p>;
}

function ClassificacaoReal({ desafioId, mostrarCards }) {
  const { dados, erro, carregando, atualizar } = useRanking(desafioId);
  if (carregando) return <p role="status">Carregando classificação das builds…</p>;
  if (erro) return <p className="ranking-erro" role="alert">{erro} <button type="button" onClick={atualizar}>Tentar novamente</button></p>;
  const desafio = dados.desafios.find((d) => d.id === desafioId);
  if (!desafio) return <p role="status">Esta competição não está mais disponível. Escolha outra competição.</p>;
  return <TabelaBuilds key={`${desafio.id}:${desafio.etapa}`} desafio={desafio} participacoes={dados.participacoes} mostrarCards={mostrarCards} />;
}

export default function ClassificacaoBuilds({ dados, demonstracao = false, mostrarCards = false, aoVotarDemonstracao }) {
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
      {mostrarCards && <div className="ranking-builds-envio">
        {demonstracao ? <>
          <div className="ranking-acoes">
            <Link className="btn-filtro" to="/ranking?rankingDemo=0">+ Criar build</Link>
            <Link className="btn-filtro" to="/ranking?rankingDemo=0">+ Enviar prova do desafio</Link>
          </div>
          <p>Escolha um desafio real com inscrições abertas para criar sua build ou enviar sua prova. Os desafios desta demonstração são fictícios.</p>
        </> : Date.parse(dados.agora) >= Date.parse(desafio.inicio) && Date.parse(dados.agora) < Date.parse(desafio.fim)
          ? <Link className="btn-filtro" to={`/ranking?desafio=${desafio.id}&participar=1#enviar-participacao`}>+ Criar build</Link>
          : <p>O envio de builds fica disponível durante as inscrições.</p>}
      </div>}
      {demonstracao
        ? <TabelaBuilds key={`${desafio.id}:${desafio.etapa}`} desafio={desafio} participacoes={dados.participacoes} demonstracao mostrarCards={mostrarCards} aoVotarDemonstracao={aoVotarDemonstracao} />
        : <ClassificacaoReal key={desafio.id} desafioId={desafio.id} mostrarCards={mostrarCards} />}
    </div>
  );
}
