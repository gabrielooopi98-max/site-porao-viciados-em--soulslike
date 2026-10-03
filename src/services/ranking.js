import { supabase } from './supabase';

export async function executarRanking(funcao, parametros = {}) {
  const { data, error } = await supabase.rpc(funcao, parametros);
  if (error) {
    console.error(`Erro no ranking (${funcao}):`, error);
    const semMigration = error.code === 'PGRST202' || error.code === '42P01';
    throw new Error(semMigration
      ? 'O ranking ainda precisa ser ativado no banco. O ADM deve executar a migration ranking_desafios.sql no Supabase.'
      : error.message || 'Não foi possível atualizar o ranking. Tente novamente.');
  }
  return data;
}

export function formatarDataRanking(data) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(data));
}

export function etapaDesafio(desafio, agora = Date.now()) {
  if (agora < Date.parse(desafio.inicio)) return 'Agendado';
  if (desafio.tipo === 'conquista') return agora >= Date.parse(desafio.fim) ? 'Encerrado' : 'Aberto';
  return ['Classificatória', 'Semifinal', 'Final', 'Encerrado'][desafio.etapa];
}

// Mesmo prazo de ranking_avancar: desafios encerrados saem do historico apos 3 dias.
export function dataRemocaoDesafio(desafio) {
  const fim = desafio.tipo === 'build' ? desafio.fim_final : desafio.fim;
  return new Date(Date.parse(fim) + 3 * 24 * 3600000).toISOString();
}

// O banco remove desafios 3 dias apos o fim; a home mostra builds da semifinal em diante.
export function competicaoEmDestaque(desafio) {
  return desafio.tipo === 'build' && desafio.etapa >= 1;
}

// Pasta exclusiva das provas: a limpeza automatica nunca alcanca midias de posts.
export function pastaMidiasRanking(usuarioId) {
  return `ranking/${usuarioId}/`;
}

// Apaga do Storage os arquivos de desafios removidos (somente o ADM tem permissao).
export async function limparMidiasRemovidas(caminhos) {
  if (!caminhos?.length) return;
  const { error } = await supabase.storage.from('midias').remove(caminhos);
  if (error) throw error;
  await executarRanking('ranking_confirmar_midias_removidas', { p_caminhos: caminhos });
}

// Finais agrupados por jogo, na ordem do catalogo, para <optgroup> e para a colecao.
export function agruparFinais(finais) {
  const grupos = new Map();
  for (const final of finais) grupos.set(final.jogo, [...(grupos.get(final.jogo) || []), final]);
  return [...grupos];
}

// Empatados dividem a posicao (1º, 1º, 3º).
export function posicoesRanking(jogadores) {
  return jogadores.map((jogador, index) => {
    let inicio = index;
    while (inicio > 0 && Number(jogadores[inicio - 1].pontos) === Number(jogador.pontos)) inicio--;
    return inicio + 1;
  });
}

// Um unico canal Realtime para todos os paineis abertos: a tabela de sinal
// muda a cada voto, envio, aprovacao ou troca de etapa.
const ouvintesRanking = new Set();
let canalRanking = null;

export function assinarAtualizacoesRanking(aoMudar) {
  ouvintesRanking.add(aoMudar);
  if (!canalRanking) {
    canalRanking = supabase
      .channel('ranking-atualizacoes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ranking_atualizacoes' },
        () => ouvintesRanking.forEach((ouvinte) => ouvinte()))
      .subscribe();
  }
  return () => {
    ouvintesRanking.delete(aoMudar);
    if (!ouvintesRanking.size && canalRanking) {
      supabase.removeChannel(canalRanking);
      canalRanking = null;
    }
  };
}

// Prazos so viram etapa quando o painel e consultado; o site consulta de novo no proximo prazo.
export function proximoPrazoRanking(desafios, agora) {
  const prazos = desafios.flatMap((d) => [d.inicio, d.fim, d.fim_semifinal, d.fim_final])
    .filter(Boolean).map(Date.parse).filter((prazo) => prazo > agora);
  return prazos.length ? Math.min(...prazos) : null;
}

export function podeVotarRanking(desafio, participacao, usuarioId, agora = Date.now()) {
  if (desafio.tipo !== 'build' || !usuarioId || participacao.autor_id === usuarioId) return false;
  if (agora < Date.parse(desafio.inicio)) return false;
  const prazo = [desafio.fim, desafio.fim_semifinal, desafio.fim_final][desafio.etapa];
  return desafio.etapa < 3 && agora < Date.parse(prazo)
    && participacao.status === 'aprovada' && participacao.etapa_max >= desafio.etapa;
}

export function prepararDesafio(formulario) {
  const datas = ['inicio', 'fim', ...(formulario.tipo === 'build' ? ['fim_semifinal', 'fim_final'] : [])];
  const tempos = datas.map((campo) => Date.parse(formulario[campo]));
  if (tempos.some((tempo) => !Number.isFinite(tempo)) || tempos.some((tempo, i) => i > 0 && tempo <= tempos[i - 1])) {
    throw new Error('As datas devem estar preenchidas e seguir a ordem: início, classificatória, semifinal e final.');
  }
  return {
    ...formulario,
    pontos: Number(formulario.pontos),
    inicio: new Date(tempos[0]).toISOString(),
    fim: new Date(tempos[1]).toISOString(),
    fim_semifinal: formulario.tipo === 'build' ? new Date(tempos[2]).toISOString() : null,
    fim_final: formulario.tipo === 'build' ? new Date(tempos[3]).toISOString() : null,
  };
}
