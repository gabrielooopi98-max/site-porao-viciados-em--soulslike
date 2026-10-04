import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { test } from 'node:test';
import { CAPAS_JOGOS_COLECAO } from '../src/services/capasJogosColecao.js';

test('cada jogo da coleção usa sua capa dedicada existente', async () => {
  assert.deepEqual(Object.keys(CAPAS_JOGOS_COLECAO).sort(), [
    'Bloodborne',
    'Dark Souls II',
    'Dark Souls III',
    'Dark Souls Remastered',
    'Elden Ring',
    'Lies of P',
    'Sekiro: Shadows Die Twice',
  ].sort());

  for (const capa of Object.values(CAPAS_JOGOS_COLECAO)) {
    const caminho = decodeURIComponent(capa).replace(/^\//, '../public/');
    await access(new URL(caminho, import.meta.url));
  }
});
