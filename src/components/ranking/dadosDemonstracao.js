const nomes = ['Guardião de Catarina', 'Lua de Lothric', 'Cinzas do Abismo', 'Caçadora de Yharnam', 'Fogueira Acesa', 'Peregrino de Astora'];
const titulos = ['Cavaleiro pesado · Força e resistência', 'Feiticeira da lua · Inteligência pura', 'Espadachim do abismo · Qualidade', 'Piromante de combate · Fogo e destreza', 'Guardião solar · Fé e suporte', 'Lâminas gêmeas · Destreza'];
const votos = { 1: [42, 35, 29, 24, 18, 12], 2: [21, 17, 12], 3: [21, 17, 12] };

export function dadosDemonstracaoRanking(etapa) {
  const desafio = {
    id: 'demo-builds',
    tipo: 'build',
    titulo: 'Monte sua melhor build para enfrentar os chefes',
    jogo: 'Dark Souls III',
    etapa,
    pontos: 200,
    inicio: '2026-10-01T12:00:00Z',
    fim: '2026-10-05T00:00:00Z',
    fim_semifinal: '2026-10-10T00:00:00Z',
    fim_final: '2026-10-15T00:00:00Z',
    vencedor_id: etapa === 3 ? 'demo-build-0' : null,
    final_vencedor: etapa === 3 ? { id: 'ds3_ligar', titulo: 'Lorde das Cinzas', final: 'Ligar a Primeira Chama', jogo: 'Dark Souls III' } : null,
  };
  return {
    agora: { 1: '2026-10-06T12:00:00Z', 2: '2026-10-11T12:00:00Z', 3: '2026-10-16T12:00:00Z' }[etapa],
    desafios: [desafio],
    jogadores: nomes.map((nome, index) => ({
      usuario_id: `demo-jogador-${index}`,
      nome,
      titulo: ['Lorde das Cinzas', 'Shura', null, 'Caçador Desperto', null, null][index] || undefined,
      finais: [3, 1, 0, 2, 0, 0][index],
      avatar: '/svg-animado/icone-usuario.svg',
      pontos: [860, 720, 610, 480, 350, 240][index] + (etapa === 3 && index === 0 ? 200 : 0),
    })),
    participacoes: votos[etapa].map((quantidade, index) => ({
      id: `demo-build-${index}`,
      desafio_id: desafio.id,
      autor_id: `demo-jogador-${index}`,
      autor_nome: nomes[index],
      titulo: titulos[index],
      status: 'aprovada',
      votos: quantidade,
      midias: [{
        id: `demo-midia-${index}`,
        midia_url: index % 2 === 0
          ? '/svg-animado/dark-souls-banner-1760x575-otimizado.svg'
          : '/svg-animado/lua-bloodborne-banner-1760x575.svg',
        tipo_midia: 'image/svg+xml',
      }],
    })),
  };
}
