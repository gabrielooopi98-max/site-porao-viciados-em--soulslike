import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { test } from 'node:test';
import { BANNERS_FINAIS, finalBannerAtivo } from '../src/services/bannersFinais.js';

test('banners dos finais possuem arquivos e titulos correspondentes', async () => {
  assert.equal(BANNERS_FINAIS.ds1_chama.nome, 'Era do Fogo');
  assert.equal(BANNERS_FINAIS.ds1_chama.titulo, 'Herdeiro da Chama');
  for (const arte of Object.values(BANNERS_FINAIS)) {
    await access(new URL(`../public${arte.src}`, import.meta.url));
  }
});

test('apenas um banner fica equipado: previa substitui salvo e fechar restaura salvo', () => {
  assert.equal(finalBannerAtivo({ previa: null, dados: null }), null);
  assert.equal(finalBannerAtivo({ previa: 'ds1_chama', dados: { final_id: 'er_chama' } }), 'ds1_chama');
  assert.equal(finalBannerAtivo({ previa: 'er_chama', dados: { final_id: 'ds1_chama' } }), 'er_chama');
  assert.equal(finalBannerAtivo({ previa: null, dados: { final_id: 'ds1_chama' } }), 'ds1_chama');
});
