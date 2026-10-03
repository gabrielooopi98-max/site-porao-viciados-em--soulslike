export function tituloEtapaBuilds(etapa) {
  return etapa === 0 ? 'Builds em classificação'
    : etapa === 1 ? 'Builds em Semifinais' : 'Builds em final';
}

// Etapa em que uma build aprovada ficou de fora; null se ainda disputa ou nao se aplica.
export function etapaEliminacao(desafio, participacao) {
  if (desafio.tipo !== 'build' || participacao.status !== 'aprovada') return null;
  return participacao.etapa_max < Math.min(desafio.etapa, 2) ? participacao.etapa_max : null;
}

// Pagina do desafio: builds da etapa atual na ordem da classificacao, depois as demais.
export function ordenarParticipacoesBuild(desafio, participacoes) {
  const classificadas = classificarBuilds(desafio, participacoes);
  const ids = new Set(classificadas.map((p) => p.id));
  return [...classificadas, ...participacoes.filter((p) => !ids.has(p.id))];
}

export function classificarBuilds(desafio, participacoes) {
  const etapa = Math.min(desafio.etapa, 2);
  return participacoes
    .filter((p) => p.desafio_id === desafio.id && p.status === 'aprovada' && p.etapa_max >= etapa)
    .sort((a, b) => Number(b.id === desafio.vencedor_id) - Number(a.id === desafio.vencedor_id)
      || Number(b.votos) - Number(a.votos)
      || String(a.criado_em).localeCompare(String(b.criado_em))
      || a.id.localeCompare(b.id));
}
