export const BANNERS_FINAIS = {
  er_chama: {
    src: '/svg-animado/banner-cavaleiro-chama-1760x575-detalhado.svg',
    nome: 'Senhor da Chama Frenética',
    titulo: 'Lorde da Chama Frenética',
  },
  ds1_chama: {
    src: '/svg-animado/banner-caverna-fogo-1760x575.svg',
    nome: 'Era do Fogo',
    titulo: 'Herdeiro da Chama',
  },
  ds1_trevas: {
    src: '/svg-animado/banner-ruinas-1760x575.svg',
    nome: 'Era das Trevas',
    titulo: 'Lorde Sombrio',
  },
};

export function finalBannerAtivo(banner) {
  return banner.previa || banner.dados?.final_id || null;
}
