import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import CabecalhoComunidade from '../CabecalhoComunidade';
import { useRanking } from './useRanking';
import ClassificacaoRanking from './ClassificacaoRanking';
import CardParticipacao from './CardParticipacao';
import FormularioDesafio from './FormularioDesafio';
import FormularioParticipacao from './FormularioParticipacao';
import RegrasBuild from './RegrasBuild';
import GuiaRanking from './GuiaRanking';
import LinhaDoTempoDesafio from './LinhaDoTempoDesafio';
import { etapaDesafio, executarRanking } from '../../services/ranking';
import './Ranking.css';

export default function PaginaRanking() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const desafioId = params.get('desafio');
  const { dados, erro, carregando, atualizar } = useRanking(desafioId);
  const [formularioAdm, setFormularioAdm] = useState(null);
  const [participar, setParticipar] = useState(false);
  const [filtro, setFiltro] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');
  const desafio = dados?.desafios.find((d) => d.id === desafioId);
  const agora = dados ? Date.parse(dados.agora) : 0;
  const inscricoesAbertas = desafio && agora >= Date.parse(desafio.inicio) && agora < Date.parse(desafio.fim);
  const jaParticipou = dados?.participacoes.some((p) => p.desafio_id === desafioId && p.autor_id === user?.id);
  const participacoes = (dados?.participacoes || []).filter((p) =>
    p.desafio_id === desafioId && (filtro === 'todos' || p.status === filtro));
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
  return (
    <>
      <CabecalhoComunidade />
      <main className="ranking-page">
        <header className="ranking-page-titulo">
          <div>
            <span className="posts-sobretitulo">Desafios da comunidade</span>
            <h1>Ranking</h1>
            <p>Conquistas, provas e builds da comunidade. Escolha um desafio para participar.</p>
          </div>
          {dados?.admin && <button className="ranking-botao-principal" type="button" onClick={() => setFormularioAdm({})}><span aria-hidden="true">+</span> Lançar desafio</button>}
        </header>
        {erro && <p className="ranking-erro" role="alert">{erro} <button type="button" onClick={atualizar}>Tentar novamente</button></p>}
        {carregando && <p role="status">Carregando desafios…</p>}
        {formularioAdm && <FormularioDesafio key={formularioAdm.id || 'novo'} desafio={formularioAdm.id ? formularioAdm : null}
          aoFechar={() => setFormularioAdm(null)} aoSalvar={async (id) => { await atualizar(); setParams({ desafio: id }); }} />}
        {dados && !erro && <div className="ranking-page-layout">
          <div className="ranking-navegacao-mobile">
            <label htmlFor="ranking-escolher-desafio">Ver classificação ou desafio</label>
            <select id="ranking-escolher-desafio" value={desafioId || ''}
              onChange={(event) => {
                setParams(event.target.value ? { desafio: event.target.value } : {});
                setParticipar(false);
                setFiltro('todos');
                setPagina(1);
              }}>
              <option value="">Classificação geral</option>
              {desafioId && !desafio && <option value={desafioId}>Desafio não encontrado</option>}
              {dados.desafios.map((d) => <option key={d.id} value={d.id}>{d.titulo} — {etapaDesafio(d, agora)}</option>)}
            </select>
            <span>{dados.desafios.length} {dados.desafios.length === 1 ? 'desafio publicado' : 'desafios publicados'}</span>
          </div>
          <aside className="ranking-desafios">
            <div className="ranking-desafios-titulo"><h2>Desafios</h2><span>{dados.desafios.length}</span></div>
            <Link className={`ranking-link-geral ${!desafioId ? 'selecionado' : ''}`} aria-current={!desafioId ? 'page' : undefined} to="/ranking" onClick={() => { setParticipar(false); setPagina(1); }}>Classificação geral <span aria-hidden="true">→</span></Link>
            {!dados.desafios.length && <p>Nenhum desafio publicado ainda.</p>}
            {dados.desafios.map((d) => <button type="button" key={d.id} aria-pressed={d.id === desafioId}
              onClick={() => { setParams({ desafio: d.id }); setParticipar(false); setFiltro('todos'); setPagina(1); }}>
              <span className="ranking-desafio-status">{etapaDesafio(d, agora)}</span>
              <strong>{d.titulo}</strong><span>{d.jogo}</span>
              <small>{d.tipo === 'build' ? 'Builds' : 'Conquista'} <span aria-hidden="true">·</span> {d.pontos} pts</small>
            </button>)}
          </aside>
          <section className="ranking-feed" aria-label="Conteúdo do ranking">
            {!desafioId ? <>
              <div className="ranking-classificacao-header">
                <span className="ranking-secao-label">Jogadores</span>
                <h2>Classificação geral</h2>
                <p>Pontos por desafios aprovados e competições vencidas. <a href="#guia-ranking">Como funciona?</a></p>
              </div>
              <ClassificacaoRanking jogadores={dados.jogadores} />
              <div id="guia-ranking"><GuiaRanking /></div>
            </> : desafio ? <>
              <div className="ranking-desafio-detalhe">
                <span>{desafio.jogo} · {etapaDesafio(desafio, agora)}</span>
                <h2>{desafio.titulo}</h2>
                <dl className="ranking-resumo-desafio">
                  <div><dt>Modalidade</dt><dd>{desafio.tipo === 'build' ? 'Competição de builds' : 'Desafio de conquista'}</dd></div>
                  <div><dt>Prêmio</dt><dd>{desafio.pontos} pts {desafio.tipo === 'build' ? 'para o vencedor' : 'por prova aprovada'}</dd></div>
                  <div><dt>Quem decide</dt><dd>{desafio.tipo === 'build' ? 'A comunidade, por votos' : 'O ADM, conferindo a prova'}</dd></div>
                </dl>
                <h3 className="ranking-subtitulo">Objetivo e regras</h3>
                <p className="ranking-texto">{desafio.descricao}</p>
                <LinhaDoTempoDesafio desafio={desafio} agora={agora} />
                {desafio.tipo === 'build' && <RegrasBuild />}
                <details className="ranking-regras">
                  <summary>Regras detalhadas e desempates</summary>
                <p>{desafio.tipo === 'build'
                  ? 'Os votos só definem quem avança: até 6 builds passam à semifinal e até 3 à final. Empates: participação enviada primeiro. Votos reabrem em cada etapa. Somente o vencedor recebe pontos no ranking geral.'
                  : 'A comunidade vota e comenta; só o ADM confirma a conclusão e concede os pontos. A análise do ADM pode continuar por até 3 dias após o fim.'}</p>
                {desafio.tipo === 'build' && <p>Somente builds aprovadas antes do fim da classificatória disputam vagas. Havendo menos participantes, avançam os disponíveis. Sem votos na final, a competição termina sem vencedor e sem prêmio.</p>}
                <p>Três dias após o fim, o desafio, as participações e os comentários são removidos. Os pontos conquistados continuam no ranking geral.</p>
                <p>Participações recusadas ficam visíveis apenas para o autor e o ADM.</p>
                </details>
                <div className="ranking-acoes">
                  {inscricoesAbertas && (user ? (jaParticipou ? <span>Sua participação já foi enviada.</span> :
                    <button className="ranking-botao-principal" type="button" onClick={() => setParticipar(!participar)}>{participar ? 'Fechar formulário' : 'Participar do desafio'}</button>) :
                    <Link to="/login">Entre para participar</Link>)}
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
              {participar && inscricoesAbertas && !jaParticipou && <FormularioParticipacao key={desafio.id} desafio={desafio} aoPublicar={atualizar} aoFechar={() => setParticipar(false)} />}
              <div className="ranking-feed-filtros">
                <h3>{desafio.tipo === 'build' ? 'Builds enviadas' : 'Provas enviadas'} ({participacoes.length})</h3>
                <label>Mostrar<select value={filtro} onChange={(event) => { setFiltro(event.target.value); setPagina(1); }}>
                  <option value="todos">Todas</option><option value="pendente">Aguardando ADM</option>
                  <option value="aprovada">Aprovadas</option><option value="recusada">Recusadas</option>
                </select></label>
              </div>
              {!participacoes.length && <p className="ranking-vazio">Nenhuma participação neste filtro.</p>}
              {participacoes.slice(0, limite).map((p) => <div id={`participacao-${p.id}`} key={p.id}>
                <CardParticipacao participacao={p} desafio={desafio} user={user} admin={dados.admin} finais={dados.finais}
                  comentarios={dados.comentarios.filter((c) => c.participacao_id === p.id)} aoAtualizar={atualizar} agora={agora} />
              </div>)}
              {participacoes.length > limite && <button type="button" onClick={() => setPagina(Math.ceil(limite / 12) + 1)}>Ver mais participações</button>}
            </> : <p role="alert">Desafio não encontrado. Escolha um desafio na lista.</p>}
          </section>
        </div>}
      </main>
    </>
  );
}
