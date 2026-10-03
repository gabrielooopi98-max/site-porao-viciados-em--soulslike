import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import CabecalhoComunidade from '../CabecalhoComunidade';
import { useRanking } from './useRanking';
import ClassificacaoBuilds from './ClassificacaoBuilds';
import ClassificacaoRanking from './ClassificacaoRanking';
import CardParticipacao from './CardParticipacao';
import FormularioDesafio from './FormularioDesafio';
import FormularioParticipacao from './FormularioParticipacao';
import RegrasBuild from './RegrasBuild';
import LinhaDoTempoDesafio from './LinhaDoTempoDesafio';
import PainelParticipacao from './PainelParticipacao';
import { etapaDesafio, executarRanking, formatarDataRanking } from '../../services/ranking';
import './Ranking.css';
import { classificarBuilds, ordenarParticipacoesBuild, tituloEtapaBuilds } from '../../services/classificacaoBuilds';

export default function PaginaRanking() {
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
  const doDesafio = (dados?.participacoes || []).filter((p) => p.desafio_id === desafioId);
  const minhaParticipacao = user ? doDesafio.find((p) => p.autor_id === user.id) : null;
  const mostrarFormulario = Boolean(formularioParticipacaoAberto && user && inscricoesAbertas && !minhaParticipacao);
  const ordenadas = desafio?.tipo === 'build' ? ordenarParticipacoesBuild(desafio, doDesafio) : doDesafio;
  const participacoes = ordenadas.filter((p) => filtro === 'todos' || p.status === filtro);
  const naEtapa = desafio?.tipo === 'build' ? classificarBuilds(desafio, doDesafio) : [];
  const posicoes = new Map(naEtapa.map((p, index) => [p.id, index + 1]));
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
    if (mostrarFormulario) document.getElementById('enviar-participacao')?.scrollIntoView({ block: 'start' });
  }, [mostrarFormulario]);
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
            <label htmlFor="ranking-escolher-desafio">Acessar ranking ou desafio</label>
            <select id="ranking-escolher-desafio" value={desafioId || ''}
              onChange={(event) => {
                setParams(event.target.value ? { desafio: event.target.value } : {});
                setParticipar(false);
                setFiltro('todos');
                setPagina(1);
              }}>
              <option value="">Visão geral do ranking</option>
              {desafioId && !desafio && <option value={desafioId}>Desafio não encontrado</option>}
              {dados.desafios.map((d) => <option key={d.id} value={d.id}>{d.titulo} — {etapaDesafio(d, agora)}</option>)}
            </select>
            <span>{dados.desafios.length} {dados.desafios.length === 1 ? 'desafio publicado' : 'desafios publicados'}</span>
          </div>
          <aside className="ranking-desafios">
            <div className="ranking-desafios-titulo"><h2>Desafios e provas</h2><span>{dados.desafios.length}</span></div>
            <p className="ranking-desafios-ajuda">Os cards abaixo abrem regras, inscrições e provas. Eles são desafios, não tabelas de ranking.</p>
            <Link className={`ranking-link-geral ${!desafioId ? 'selecionado' : ''}`} aria-current={!desafioId ? 'page' : undefined} to="/ranking" onClick={() => { setParticipar(false); setPagina(1); }}>Visão geral do ranking <span aria-hidden="true">→</span></Link>
            {!dados.desafios.length && <p>Nenhum desafio publicado ainda.</p>}
            {dados.desafios.map((d) => <button className="ranking-desafio-card" type="button" key={d.id} aria-pressed={d.id === desafioId}
              onClick={() => { setParams({ desafio: d.id }); setParticipar(false); setFiltro('todos'); setPagina(1); }}>
              <span className="ranking-desafio-card-topo"><span>{d.tipo === 'build' ? 'Builds' : 'Conquista'}</span><span className="ranking-desafio-status">{etapaDesafio(d, agora)}</span></span>
              <strong>{d.titulo}</strong>
              <span className="ranking-desafio-card-jogo">{d.jogo}</span>
              <span className="ranking-desafio-card-descricao">{d.descricao}</span>
              {d.tipo === 'conquista' && <span className="ranking-desafio-card-concluidas">{Number(d.concluidas) === 1 ? '1 jogador concluiu' : `${d.concluidas} jogadores concluíram`}</span>}
              <span className="ranking-desafio-card-rodape"><span><b>{d.pontos} pts</b><small>Recompensa</small></span><span><small>{d.tipo === 'build' ? 'Final até' : 'Inscrições até'}</small><time dateTime={d.tipo === 'build' ? d.fim_final : d.fim}>{formatarDataRanking(d.tipo === 'build' ? d.fim_final : d.fim)}</time></span></span>
            </button>)}
          </aside>
          <section className={`ranking-feed ${!desafioId ? 'ranking-feed-visao-geral' : ''}`} aria-label="Conteúdo do ranking">
            {!desafioId ? <>
              <nav className="ranking-indice" aria-label="Seções do ranking">
                <a href="#ranking-geral"><strong>01</strong><span>Ranking geral</span></a>
                <a href="#ranking-builds"><strong>02</strong><span>Classificação de builds</span></a>
                <a href="#ranking-cards-builds"><strong>03</strong><span>Cards da competição</span></a>
              </nav>
              <section className="ranking-bloco ranking-bloco-geral" id="ranking-geral" aria-labelledby="ranking-geral-titulo">
                <header className="ranking-classificacao-header">
                  <span className="ranking-bloco-etiqueta">PONTUAÇÃO ACUMULADA · JOGADORES</span>
                  <h2 id="ranking-geral-titulo">Ranking geral</h2>
                  <p>Soma de pontos por desafios aprovados e vitórias em competições. Votos não entram nesta tabela.</p>
                </header>
                <ClassificacaoRanking jogadores={dados.jogadores} usuarioId={user?.id} meusPontos={dados.meus_pontos} />
              </section>
              <section className="ranking-bloco ranking-bloco-builds" id="ranking-builds" aria-labelledby="ranking-builds-titulo">
                <header className="ranking-classificacao-header">
                  <span className="ranking-bloco-etiqueta">VOTOS POR ETAPA · COMPETIÇÕES</span>
                  <h2 id="ranking-builds-titulo">Classificação das builds</h2>
                  <p>Esta tabela mostra as posições das builds na competição selecionada. Os votos valem para a etapa atual.</p>
                </header>
                <ClassificacaoBuilds dados={dados} mostrarCards />
              </section>
            </> : desafio ? <>
              <div className="ranking-desafio-detalhe">
                <span>{desafio.jogo} · {etapaDesafio(desafio, agora)}</span>
                <h2>{desafio.titulo}</h2>
                <dl className="ranking-resumo-desafio">
                  <div><dt>Modalidade</dt><dd>{desafio.tipo === 'build' ? 'Competição de builds' : 'Desafio de conquista'}</dd></div>
                  <div><dt>Prêmio</dt><dd>{desafio.pontos} pts {desafio.tipo === 'build' ? 'para o vencedor' : 'por desafio aprovado'}</dd></div>
                  <div><dt>Quem decide</dt><dd>{desafio.tipo === 'build' ? 'A comunidade, por votos' : 'O ADM, conferindo a prova'}</dd></div>
                </dl>
                <PainelParticipacao desafio={desafio} agora={agora} user={user} minhaParticipacao={minhaParticipacao}
                  formularioAberto={mostrarFormulario} aoAbrir={() => setParticipar(true)} aoFechar={fecharParticipacao} />
                {mostrarFormulario && <div id="enviar-participacao" className="rk-participar-formulario">
                  <FormularioParticipacao key={desafio.id} desafio={desafio} aoPublicar={atualizar} aoFechar={fecharParticipacao} />
                </div>}
                <h3 className="ranking-subtitulo">Objetivo e regras</h3>
                <p className="ranking-texto">{desafio.descricao}</p>
                <LinhaDoTempoDesafio desafio={desafio} agora={agora} />
                {desafio.tipo === 'build' && <details className="rk-dobra">
                  <summary>O que sua build precisa mostrar (5 itens obrigatórios)</summary>
                  <div><RegrasBuild semTitulo /></div>
                </details>}
                <details className="ranking-regras">
                  <summary>Regras detalhadas e desempates</summary>
                <p>{desafio.tipo === 'build'
                  ? 'Os votos só definem quem avança: até 4 builds passam à semifinal e até 2 à final. Empates: participação enviada primeiro. Votos reabrem em cada etapa. Somente o vencedor recebe pontos no ranking geral.'
                  : 'Todo jogador com a prova aprovada pelo ADM recebe os pontos. Não há votação: a comunidade comenta as provas e pode apontar problemas, e o ADM decide. A análise do ADM pode continuar por até 3 dias após o fim.'}</p>
                {desafio.tipo === 'build' && <p>Toda build enviada durante a classificatória entra na disputa na hora; o ADM só remove builds que quebrem as regras. Havendo menos participantes, avançam os disponíveis. Sem votos na final, a competição termina sem vencedor e sem prêmio.</p>}
                <p>Três dias após o fim, o desafio, as participações e os comentários são removidos. Os pontos conquistados continuam no ranking geral.</p>
                <p>Provas recusadas e builds removidas ficam visíveis apenas para o autor e o ADM.</p>
                </details>
                {dados.admin && <div className="ranking-acoes ranking-acoes-adm">
                  <span className="ranking-secao-label">Administração</span>
                  {agora < Date.parse(desafio.inicio) && <button type="button" onClick={() => setFormularioAdm(desafio)}>Editar desafio</button>}
                  <button type="button" disabled={excluindo} onClick={excluirDesafio}>{excluindo ? 'Excluindo…' : 'Excluir desafio'}</button>
                </div>}
                {erroExclusao && <p className="ranking-erro" role="alert">{erroExclusao}</p>}
              </div>
              <div className="ranking-feed-filtros">
                <h3>{desafio.tipo === 'build'
                  ? `Cards das builds · ${tituloEtapaBuilds(desafio.etapa)} (${naEtapa.length})`
                  : `Cards das provas enviadas (${participacoes.length})`}</h3>
                <label>Mostrar<select value={filtro} onChange={(event) => { setFiltro(event.target.value); setPagina(1); }}>
                  <option value="todos">Todas</option>{desafio.tipo === 'conquista' && <option value="pendente">Aguardando ADM</option>}
                  <option value="aprovada">{desafio.tipo === 'build' ? 'Na disputa' : 'Aprovadas'}</option><option value="recusada">{desafio.tipo === 'build' ? 'Removidas' : 'Recusadas'}</option>
                </select></label>
              </div>
              {!participacoes.length && <p className="ranking-vazio">{filtro === 'todos'
                ? `Nenhuma ${desafio.tipo === 'build' ? 'build' : 'prova'} enviada ainda.${inscricoesAbertas ? ' Seja o primeiro a participar!' : ''}`
                : 'Nenhuma participação neste filtro.'}</p>}
              <div className="rk-grade">
                {participacoes.slice(0, limite).map((p) => <div id={`participacao-${p.id}`} key={p.id}>
                  <CardParticipacao participacao={p} desafio={desafio} user={user} admin={dados.admin} finais={dados.finais} posicao={posicoes.get(p.id)}
                    comentarios={dados.comentarios.filter((c) => c.participacao_id === p.id)} aoAtualizar={atualizar} agora={agora} />
                </div>)}
              </div>
              {participacoes.length > limite && <button className="rk-btn" type="button" onClick={() => setPagina(Math.ceil(limite / 12) + 1)}>Ver mais participações</button>}
            </> : <p role="alert">Desafio não encontrado. Escolha um desafio na lista.</p>}
          </section>
        </div>}
      </main>
    </>
  );
}
