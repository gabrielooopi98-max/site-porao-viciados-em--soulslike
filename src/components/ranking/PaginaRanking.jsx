import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import CabecalhoComunidade from '../CabecalhoComunidade';
import { useRanking } from './useRanking';
import ClassificacaoBuilds from './ClassificacaoBuilds';
import CardParticipacao from './CardParticipacao';
import FormularioDesafio from './FormularioDesafio';
import FormularioParticipacao from './FormularioParticipacao';
import RegrasBuild from './RegrasBuild';
import LinhaDoTempoDesafio from './LinhaDoTempoDesafio';
import { etapaDesafio, executarRanking, formatarDataRanking } from '../../services/ranking';
import './Ranking.css';
import { alternarVotoDemonstracao, dadosDemonstracaoRanking } from './dadosDemonstracao';
import { classificarBuilds, ordenarParticipacoesBuild, tituloEtapaBuilds } from '../../services/classificacaoBuilds';

export default function PaginaRanking() {
  const [params] = useSearchParams();
  const demonstracao = import.meta.env.DEV && !params.get('desafio') && params.get('rankingDemo') === '1';
  return demonstracao ? <PaginaRankingDemonstracao /> : <PaginaRankingReal />;
}

function PaginaRankingDemonstracao() {
  const [etapa, setEtapa] = useState(1);
  const [votos, setVotos] = useState({});
  function votar(id) {
    setVotos((anteriores) => alternarVotoDemonstracao(anteriores, etapa, id));
  }
  return <>
    <CabecalhoComunidade />
    <main className="ranking-page">
      <header className="ranking-page-titulo">
        <div>
          <span className="posts-sobretitulo">Desafios pra comunidade</span>
          <h1>Classificação das builds</h1>
          <p>Demonstração com dados fictícios. Escolha a etapa e teste os votos; nada é salvo no banco.</p>
        </div>
        <Link className="btn-filtro" to="/ranking?rankingDemo=0">Ver dados reais</Link>
      </header>
      <section className="ranking-feed" aria-label="Demonstração das competições de builds">
        <label>Visualizar etapa
          <select value={etapa} onChange={(event) => setEtapa(Number(event.target.value))}>
            <option value={0}>Classificação · 6 builds</option>
            <option value={1}>Semifinal · 4 builds</option>
            <option value={2}>Final · 2 builds</option>
            <option value={3}>Encerrada · vencedor</option>
          </select>
        </label>
        <ClassificacaoBuilds dados={dadosDemonstracaoRanking(etapa, votos)} demonstracao mostrarCards aoVotarDemonstracao={votar} />
      </section>
    </main>
  </>;
}

function PaginaRankingReal() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const desafioId = params.get('desafio');
  const { dados, erro, carregando, atualizar } = useRanking(desafioId);
  const [formularioAdm, setFormularioAdm] = useState(null);
  const [participar, setParticipar] = useState(false);
  const formularioParticipacaoAberto = participar || params.get('participar') === '1';
  function fecharParticipacao() {
    setParticipar(false);
    if (params.has('participar')) {
      const proximos = new URLSearchParams(params);
      proximos.delete('participar');
      setParams(proximos);
    }
  }
  const [filtro, setFiltro] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');
  const desafio = dados?.desafios.find((d) => d.id === desafioId);
  const agora = dados ? Date.parse(dados.agora) : 0;
  const inscricoesAbertas = desafio && agora >= Date.parse(desafio.inicio) && agora < Date.parse(desafio.fim);
  const jaParticipou = dados?.participacoes.some((p) => p.desafio_id === desafioId && p.autor_id === user?.id);
  const doDesafio = (dados?.participacoes || []).filter((p) => p.desafio_id === desafioId);
  const ordenadas = desafio?.tipo === 'build' ? ordenarParticipacoesBuild(desafio, doDesafio) : doDesafio;
  const participacoes = ordenadas.filter((p) => filtro === 'todos' || p.status === filtro);
  const buildsNaEtapa = desafio?.tipo === 'build' ? classificarBuilds(desafio, doDesafio).length : 0;
  const alvo = participacoes.findIndex((p) => hash === `#participacao-${p.id}`);
  const limite = Math.max(pagina * 12, alvo + 1);
  const carregou = Boolean(dados);
  async function excluirDesafio() {
    if (excluindo || !window.confirm(`Excluir "${desafio.titulo}"? Participações, votos, comentários e os pontos já concedidos por este desafio serão apagados. Esta ação não pode ser desfeita.`)) return;
    setExcluindo(true);
    setErroExclusao('');
    try {
      await executarRanking('ranking_excluir_desafio', { p_desafio: desafio.id });
      setParams({});
      await atualizar();
    } catch (error) {
      setErroExclusao(error.message);
    } finally {
      setExcluindo(false);
    }
  }
  useEffect(() => {
    if (carregou && hash.startsWith('#participacao-')) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [carregou, hash]);
  useEffect(() => {
    if (formularioParticipacaoAberto && user && inscricoesAbertas && !jaParticipou) {
      document.getElementById('enviar-participacao')?.scrollIntoView({ block: 'start' });
    }
  }, [formularioParticipacaoAberto, user, inscricoesAbertas, jaParticipou]);
  return (
    <>
      <CabecalhoComunidade />
      <main className="ranking-page">
        <header className="ranking-page-titulo">
          <div>
            <span className="posts-sobretitulo">Desafios pra comunidade</span>
            <h1>Ranking da comunidade</h1>
            <p>Veja a classificação ou escolha um desafio para conferir as regras, os prazos e as participações.</p>
          </div>
          {dados?.admin && <button className="btn-filtro" type="button" onClick={() => setFormularioAdm({})}><span aria-hidden="true">+</span> Criar desafio</button>}
        </header>
        {erro && <p className="ranking-erro" role="alert">{erro} <button type="button" onClick={atualizar}>Tentar novamente</button></p>}
        {carregando && <p role="status">Carregando desafios…</p>}
        {formularioAdm && <FormularioDesafio key={formularioAdm.id || 'novo'} desafio={formularioAdm.id ? formularioAdm : null}
          aoFechar={() => setFormularioAdm(null)} aoSalvar={async (id) => { await atualizar(); setParams({ desafio: id }); }} />}
        {dados && !erro && <div className="ranking-page-layout">
          <section className="ranking-page-indicadores" aria-label="Resumo do ranking">
            <div><span>Desafios publicados</span><strong>{dados.desafios.length}</strong></div>
            <div><span>Modalidades</span><strong>Conquistas <i aria-hidden="true">·</i> Builds</strong></div>
            <div><span>Competições de builds</span><strong>{dados.desafios.filter((d) => d.tipo === 'build').length}</strong></div>
          </section>
          <div className="ranking-navegacao-mobile">
            <label htmlFor="ranking-escolher-desafio">Ver classificação ou desafio</label>
            <select id="ranking-escolher-desafio" value={desafioId || ''}
              onChange={(event) => {
                setParams(event.target.value ? { desafio: event.target.value } : {});
                setParticipar(false);
                setFiltro('todos');
                setPagina(1);
              }}>
              <option value="">Classificação das builds</option>
              {desafioId && !desafio && <option value={desafioId}>Desafio não encontrado</option>}
              {dados.desafios.map((d) => <option key={d.id} value={d.id}>{d.titulo} — {etapaDesafio(d, agora)}</option>)}
            </select>
            <span>{dados.desafios.length} {dados.desafios.length === 1 ? 'desafio publicado' : 'desafios publicados'}</span>
          </div>
          <aside className="ranking-desafios">
            <div className="ranking-desafios-titulo"><h2>Desafios</h2><span>{dados.desafios.length}</span></div>
            <p className="ranking-desafios-ajuda">Escolha um desafio para ver detalhes e acompanhar as participações.</p>
            <Link className={`ranking-link-geral ${!desafioId ? 'selecionado' : ''}`} aria-current={!desafioId ? 'page' : undefined} to="/ranking" onClick={() => { setParticipar(false); setPagina(1); }}>Classificação das builds <span aria-hidden="true">→</span></Link>
            {!dados.desafios.length && <p>Nenhum desafio publicado ainda.</p>}
            {dados.desafios.map((d) => <button className="ranking-desafio-card" type="button" key={d.id} aria-pressed={d.id === desafioId}
              onClick={() => { setParams({ desafio: d.id }); setParticipar(false); setFiltro('todos'); setPagina(1); }}>
              <span className="ranking-desafio-card-topo"><span>{d.tipo === 'build' ? 'Builds' : 'Conquista'}</span><span className="ranking-desafio-status">{etapaDesafio(d, agora)}</span></span>
              <strong>{d.titulo}</strong>
              <span className="ranking-desafio-card-jogo">{d.jogo}</span>
              <span className="ranking-desafio-card-descricao">{d.descricao}</span>
              <span className="ranking-desafio-card-rodape"><span><b>{d.pontos} pts</b><small>Recompensa</small></span><span><small>{d.tipo === 'build' ? 'Final até' : 'Inscrições até'}</small><time dateTime={d.tipo === 'build' ? d.fim_final : d.fim}>{formatarDataRanking(d.tipo === 'build' ? d.fim_final : d.fim)}</time></span></span>
            </button>)}
          </aside>
          <section className="ranking-feed" aria-label="Conteúdo do ranking">
            {!desafioId ? <>
              <div className="ranking-classificacao-header">
                <span className="ranking-secao-label">Competições</span>
                <h2>Classificação das builds</h2>
                <p>Escolha uma competição para acompanhar as posições das builds pelos votos.</p>
              </div>
              <ClassificacaoBuilds dados={dados} mostrarCards />
            </> : desafio ? <>
              <div className="ranking-desafio-detalhe">
                <span>{desafio.jogo} · {etapaDesafio(desafio, agora)}</span>
                <h2>{desafio.titulo}</h2>
                <dl className="ranking-resumo-desafio">
                  <div><dt>Modalidade</dt><dd>{desafio.tipo === 'build' ? 'Competição de builds' : 'Desafio de conquista'}</dd></div>
                  <div><dt>Prêmio</dt><dd>{desafio.pontos} pts {desafio.tipo === 'build' ? 'para o vencedor' : 'por desafio aprovado'}</dd></div>
                  <div><dt>Quem decide</dt><dd>{desafio.tipo === 'build' ? 'A comunidade, por votos' : 'Comunidade e ADM'}</dd></div>
                </dl>
                <h3 className="ranking-subtitulo">Objetivo e regras</h3>
                <p className="ranking-texto">{desafio.descricao}</p>
                <LinhaDoTempoDesafio desafio={desafio} agora={agora} />
                {desafio.tipo === 'build' && <RegrasBuild />}
                <details className="ranking-regras">
                  <summary>Regras detalhadas e desempates</summary>
                <p>{desafio.tipo === 'build'
                  ? 'Os votos só definem quem avança: até 4 builds passam à semifinal e até 2 à final. Empates: participação enviada primeiro. Votos reabrem em cada etapa. Somente o vencedor recebe pontos no ranking geral.'
                  : 'A comunidade vota e comenta; só o ADM confirma a conclusão e concede os pontos. A análise do ADM pode continuar por até 3 dias após o fim.'}</p>
                {desafio.tipo === 'build' && <p>Somente builds aprovadas antes do fim da classificatória disputam vagas. Havendo menos participantes, avançam os disponíveis. Sem votos na final, a competição termina sem vencedor e sem prêmio.</p>}
                <p>Três dias após o fim, o desafio, as participações e os comentários são removidos. Os pontos conquistados continuam no ranking geral.</p>
                <p>Participações recusadas ficam visíveis apenas para o autor e o ADM.</p>
                </details>
                <div className="ranking-acoes">
                  {inscricoesAbertas && (user ? (jaParticipou ? <span>Sua participação já foi enviada.</span> :
                    <button className="btn-filtro" type="button" onClick={() => formularioParticipacaoAberto ? fecharParticipacao() : setParticipar(true)}>{formularioParticipacaoAberto ? 'Fechar formulário' : desafio.tipo === 'build' ? '+ Criar build' : '+ Enviar prova do desafio'}</button>) :
                    <Link className="btn-filtro" to="/login">{desafio.tipo === 'build' ? 'Entre para enviar sua build' : 'Entre para enviar sua prova'}</Link>)}
                  {!inscricoesAbertas && <span className="ranking-inscricoes-fechadas">
                    {agora < Date.parse(desafio.inicio) ? 'As inscrições ainda não abriram.' : 'As inscrições deste desafio estão encerradas.'}
                  </span>}
                </div>
                {dados.admin && <div className="ranking-acoes ranking-acoes-adm">
                  <span className="ranking-secao-label">Administração</span>
                  {agora < Date.parse(desafio.inicio) && <button type="button" onClick={() => setFormularioAdm(desafio)}>Editar desafio</button>}
                  <button type="button" disabled={excluindo} onClick={excluirDesafio}>{excluindo ? 'Excluindo…' : 'Excluir desafio'}</button>
                </div>}
                {erroExclusao && <p className="ranking-erro" role="alert">{erroExclusao}</p>}
              </div>
              {formularioParticipacaoAberto && user && inscricoesAbertas && !jaParticipou && <div id="enviar-participacao"><FormularioParticipacao key={desafio.id} desafio={desafio} aoPublicar={atualizar} aoFechar={fecharParticipacao} /></div>}
              <div className="ranking-feed-filtros">
                <h3>{desafio.tipo === 'build' ? `${tituloEtapaBuilds(desafio.etapa)} (${buildsNaEtapa})` : `Provas enviadas (${participacoes.length})`}</h3>
                <label>Mostrar<select value={filtro} onChange={(event) => { setFiltro(event.target.value); setPagina(1); }}>
                  <option value="todos">Todas</option><option value="pendente">Aguardando ADM</option>
                  <option value="aprovada">Aprovadas</option><option value="recusada">Recusadas</option>
                </select></label>
              </div>
              {!participacoes.length && <p className="ranking-vazio">Nenhuma participação neste filtro.</p>}
              <div className={desafio.tipo === 'conquista' ? 'ranking-provas-galeria' : undefined}>
                {participacoes.slice(0, limite).map((p) => <div id={`participacao-${p.id}`} key={p.id}>
                  <CardParticipacao participacao={p} desafio={desafio} user={user} admin={dados.admin} finais={dados.finais}
                    comentarios={dados.comentarios.filter((c) => c.participacao_id === p.id)} aoAtualizar={atualizar} agora={agora} />
                </div>)}
              </div>
              {participacoes.length > limite && <button type="button" onClick={() => setPagina(Math.ceil(limite / 12) + 1)}>Ver mais participações</button>}
            </> : <p role="alert">Desafio não encontrado. Escolha um desafio na lista.</p>}
          </section>
        </div>}
      </main>
    </>
  );
}
