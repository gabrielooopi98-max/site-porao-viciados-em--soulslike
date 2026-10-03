import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classificarBuilds, etapaEliminacao, ordenarParticipacoesBuild } from '../src/services/classificacaoBuilds.js';
import { alternarVotoDemonstracao } from '../src/components/ranking/dadosDemonstracao.js';

const desafio = { id: 'builds', tipo: 'build', etapa: 1, vencedor_id: null };
const build = (id, votos, campos = {}) => ({
  id, votos, desafio_id: 'builds', status: 'aprovada', etapa_max: 1,
  criado_em: '2026-10-02T12:00:00Z', ...campos,
});

test('ordena por votos e desempata pelo envio sem alterar a lista original', () => {
  const participacoes = [build('a', 2), build('b', 10, { criado_em: '2026-10-03T12:00:00Z' }), build('c', 10)];
  assert.deepEqual(classificarBuilds(desafio, participacoes).map((p) => p.id), ['c', 'b', 'a']);
  assert.deepEqual(participacoes.map((p) => p.id), ['a', 'b', 'c']);
});

test('ignora outras competicoes, pendentes, recusadas e builds eliminadas', () => {
  const participacoes = [
    build('ativa', 5), build('outra', 50, { desafio_id: 'outro' }),
    build('pendente', 50, { status: 'pendente' }), build('recusada', 50, { status: 'recusada' }),
    build('eliminada', 50, { etapa_max: 0 }),
  ];
  assert.deepEqual(classificarBuilds(desafio, participacoes).map((p) => p.id), ['ativa']);
});

test('final e encerramento mostram apenas finalistas e identificam o vencedor', () => {
  const participacoes = [build('semifinalista', 99), build('finalista', 0, { etapa_max: 2 })];
  assert.deepEqual(classificarBuilds({ ...desafio, etapa: 2 }, participacoes).map((p) => p.id), ['finalista']);
  assert.deepEqual(classificarBuilds({ ...desafio, etapa: 3, vencedor_id: 'finalista' }, participacoes).map((p) => p.id), ['finalista']);
});

test('classificatoria aceita aprovadas e votos zero, sem usar pontos do jogador', () => {
  const resultado = classificarBuilds({ ...desafio, etapa: 0 }, [
    build('b', 0, { etapa_max: 0, pontos: 1000 }), build('a', 0, { etapa_max: 0, pontos: 0 }),
  ]);
  assert.deepEqual(resultado.map((p) => p.id), ['a', 'b']);
  assert.deepEqual(classificarBuilds(desafio, []), []);
});

test('pagina do desafio lista a etapa atual primeiro e marca as eliminadas', () => {
  const participacoes = [
    build('eliminada', 50, { etapa_max: 0 }), build('pendente', 0, { status: 'pendente', etapa_max: 0 }),
    build('segunda', 3), build('primeira', 8),
  ];
  assert.deepEqual(ordenarParticipacoesBuild(desafio, participacoes).map((p) => p.id),
    ['primeira', 'segunda', 'eliminada', 'pendente']);
  assert.equal(etapaEliminacao(desafio, participacoes[0]), 0);
  assert.equal(etapaEliminacao(desafio, participacoes[1]), null);
  assert.equal(etapaEliminacao(desafio, participacoes[2]), null);
  assert.equal(etapaEliminacao({ ...desafio, etapa: 3 }, build('semi', 0)), 1);
  assert.equal(etapaEliminacao({ ...desafio, tipo: 'conquista' }, participacoes[0]), null);
});

test('demonstracao permite votar em varias builds por etapa, como ranking_votar', () => {
  let votos = alternarVotoDemonstracao({}, 1, 'a');
  votos = alternarVotoDemonstracao(votos, 1, 'b');
  votos = alternarVotoDemonstracao(votos, 2, 'a');
  assert.deepEqual(votos, { 1: { a: true, b: true }, 2: { a: true } });
  assert.deepEqual(alternarVotoDemonstracao(votos, 1, 'a')[1], { b: true });
});
