const nomes = ['Guardião de Catarina', 'Lua de Lothric', 'Cinzas do Abismo', 'Caçadora de Yharnam', 'Fogueira Acesa', 'Peregrino de Astora'];
const titulos = ['Cavaleiro pesado · Força e resistência', 'Feiticeira da lua · Inteligência pura', 'Espadachim do abismo · Qualidade', 'Piromante de combate · Fogo e destreza', 'Guardião solar · Fé e suporte', 'Lâminas gêmeas · Destreza'];
const votos = { 0: [18, 15, 12, 9, 6, 3], 1: [42, 35, 29, 24, 18, 12], 2: [21, 17, 12], 3: [21, 17, 12] };

// Mesma regra de ranking_votar: um voto por build em cada etapa, em quantas builds quiser.
export function alternarVotoDemonstracao(votosSimulados, etapa, id) {
  const daEtapa = { ...votosSimulados[etapa] };
  if (daEtapa[id]) delete daEtapa[id];
  else daEtapa[id] = true;
  return { ...votosSimulados, [etapa]: daEtapa };
}

export function dadosDemonstracaoRanking(etapa, votosSimulados = {}) {
  const votosDaEtapa = votosSimulados[Math.min(etapa, 2)] || {};
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
    agora: { 0: '2026-10-03T12:00:00Z', 1: '2026-10-06T12:00:00Z', 2: '2026-10-11T12:00:00Z', 3: '2026-10-16T12:00:00Z' }[etapa],
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
      descricao: [
        'Montei essa build para aguentar os golpes dos chefes e aproveitar as aberturas com uma arma pesada. Uso armadura com boa resistência e controlo a stamina para não ficar sem esquiva depois de atacar.',
        'Essa é minha build de mago para PvE. A ideia é manter distância, alternar as magias conforme o chefe e guardar recursos para a segunda fase. No vídeo mostro os equipamentos e como uso a combinação.',
        'Busquei um equilíbrio entre força e destreza para testar diferentes armas sem mudar a distribuição de atributos. Prefiro golpes rápidos e uso o escudo apenas quando preciso criar uma abertura.',
        'Misturei piromancias com uma arma leve para lutar de perto e de longe. A descrição do desafio me fez testar combinações novas; no vídeo mostro o resultado contra um dos chefes.',
        'Fiz essa build pensando em ajudar nas lutas cooperativas, com cura e suporte sem abrir mão do dano. O objetivo é manter o grupo vivo e aproveitar os momentos seguros para atacar.',
        'Uso lâminas gêmeas e esquivas rápidas para manter a pressão. Evito trocar golpes com o chefe e tento encaixar sequências curtas antes de recuar. Essa foi a combinação que funcionou melhor nos meus testes.',
      ][index],
      status: 'aprovada',
      etapa_max: Math.min(etapa, 2),
      criado_em: `2026-10-02T12:0${index}:00Z`,
      votou: Boolean(votosDaEtapa[`demo-build-${index}`]),
      votos: quantidade + Number(Boolean(votosDaEtapa[`demo-build-${index}`])),
      atributos: { nivel: 125, foco: ['Força', 'Inteligência', 'Qualidade', 'Piromancia', 'Fé', 'Destreza'][index] },
      midias: [{
        id: `demo-video-${index}`,
        midia_url: '/ranking-demo.mp4',
        tipo_midia: 'video/mp4',
      }],
    })),
  };
}
