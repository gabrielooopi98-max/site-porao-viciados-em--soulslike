import assert from 'node:assert/strict';
import { test } from 'node:test';
import malenia from '../src/components/rpg-combat/data/chefes/malenia.js';
import { BUILDS_DEMO, definirArquetipo, statsDaBuild } from '../src/components/rpg-combat/engine/buildStats.js';
import { avancar, calcularDano, criarCombate, executarAcao, motivoBloqueio } from '../src/components/rpg-combat/engine/combatEngine.js';
import { aplicarResultado, progressoInicial } from '../src/components/rpg-combat/engine/progressao.js';

const demo = (id) => BUILDS_DEMO.find((build) => build.id === id);

function rodar(estado, ms) {
    for (let passado = 0; passado < ms; passado += 10) avancar(estado, Math.min(10, ms - passado));
}

// Combate ja em luta, com o chefe parado ate forcarmos um ataque.
function combateEmLuta(buildId = 'demo-destreza') {
    const estado = criarCombate({ build: demo(buildId), chefe: malenia, semente: 42 });
    rodar(estado, 2600);
    estado.boss.proximaAcaoEm = Infinity;
    return estado;
}

function forcarAtaque(estado, ataqueId) {
    const def = malenia.ataques[ataqueId];
    estado.boss.acao = { id: 999, ataqueId, def, inicio: estado.t, duracao: def.duracao, golpes: def.golpes.map((g) => ({ ...g, aplicado: false })) };
    estado.boss.estado = 'atacando';
    return estado.t + def.golpes[0].em;
}

test('formula de dano segue (bruto - defesa) x multiplicador da arma', () => {
    assert.equal(calcularDano({ base: 620, defesa: 180, multArma: 1.15 }), 506);
    assert.equal(calcularDano({ base: 100, defesa: 500 }), 20);
});

test('builds do site viram arquetipos diferentes', () => {
    assert.equal(definirArquetipo(demo('demo-sangramento')), 'sangramento');
    assert.equal(definirArquetipo(demo('demo-forca')), 'forca');
    assert.equal(definirArquetipo(demo('demo-destreza')), 'destreza');
    assert.equal(definirArquetipo(demo('demo-magia')), 'magia');
    assert.equal(definirArquetipo(demo('demo-tanque')), 'tanque');
    assert.equal(definirArquetipo({ foco: 'Força / Destreza', dano: 'Físico' }), 'qualidade');
    const tanque = statsDaBuild(demo('demo-tanque'));
    const destreza = statsDaBuild(demo('demo-destreza'));
    assert.ok(tanque.hpMax > destreza.hpMax);
    assert.ok(destreza.esquiva.iframes[1] - destreza.esquiva.iframes[0] > tanque.esquiva.iframes[1] - tanque.esquiva.iframes[0]);
});

test('esquiva no tempo certo vira PERFECT DODGE e abre contra-ataque', () => {
    const estado = combateEmLuta();
    const impacto = forcarAtaque(estado, 'corte_rapido');
    rodar(estado, impacto - estado.t - 100);
    assert.ok(executarAcao(estado, 'esquiva'));
    rodar(estado, 300);
    assert.equal(estado.metricas.perfectDodges, 1);
    assert.equal(estado.player.hp, estado.player.hpMax);
    assert.ok(estado.player.contraAte > estado.t);
});

test('esquivar cedo demais leva o golpe', () => {
    const estado = combateEmLuta();
    const impacto = forcarAtaque(estado, 'investida');
    rodar(estado, impacto - estado.t - 500);
    executarAcao(estado, 'esquiva');
    rodar(estado, 700);
    assert.equal(estado.metricas.perfectDodges, 0);
    assert.ok(estado.player.hp < estado.player.hpMax);
});

test('esquivas emendadas nao contam como perfeitas', () => {
    const estado = combateEmLuta();
    executarAcao(estado, 'esquiva');
    rodar(estado, estado.build.esquiva.duracao + 10);
    const impacto = forcarAtaque(estado, 'corte_rapido');
    rodar(estado, impacto - estado.t - 600);
    executarAcao(estado, 'esquiva');
    rodar(estado, estado.build.esquiva.duracao + 10);
    executarAcao(estado, 'esquiva');
    rodar(estado, 500);
    assert.equal(estado.metricas.perfectDodges, 0);
});

test('parry perfeito deixa o chefe vulneravel e libera o ataque critico', () => {
    const estado = combateEmLuta();
    const impacto = forcarAtaque(estado, 'corte_rapido');
    rodar(estado, impacto - estado.t - estado.build.parry.inicio - 40);
    executarAcao(estado, 'parry');
    rodar(estado, 120);
    assert.equal(estado.metricas.parries, 1);
    assert.equal(estado.boss.estado, 'vulneravel');
    assert.equal(motivoBloqueio(estado, 'critico'), null);
    const hpAntes = estado.boss.hp;
    executarAcao(estado, 'critico');
    rodar(estado, 2500);
    assert.equal(estado.metricas.criticos, 1);
    assert.ok(hpAntes - estado.boss.hp > 1000);
});

test('ataque que nao pode ser aparado atravessa o parry', () => {
    const estado = combateEmLuta();
    const impacto = forcarAtaque(estado, 'danca');
    rodar(estado, impacto - estado.t - estado.build.parry.inicio - 40);
    executarAcao(estado, 'parry');
    rodar(estado, 200);
    assert.equal(estado.metricas.parries, 0);
    assert.ok(estado.player.hp < estado.player.hpMax);
});

test('stamina acaba e deixa o jogador exausto', () => {
    const estado = combateEmLuta('demo-forca');
    let golpes = 0;
    while (golpes < 20 && !motivoBloqueio(estado, 'pesado')) {
        executarAcao(estado, 'pesado');
        rodar(estado, estado.build.pesado.duracao + 5);
        golpes += 1;
    }
    assert.ok(golpes < 6);
    assert.equal(estado.player.stamina < 5, true);
});

test('metade do HP inicia a fase 2 com transicao', () => {
    const estado = combateEmLuta();
    estado.boss.hp = estado.boss.hpMax * 0.5 + 10;
    executarAcao(estado, 'pesado');
    rodar(estado, 900);
    assert.equal(estado.boss.fase, 2);
    assert.equal(estado.boss.estado, 'transicao');
    assert.ok(estado.eventos.some((evento) => evento.tipo === 'fase'));
});

test('build de sangramento dispara hemorragia', () => {
    const estado = combateEmLuta('demo-sangramento');
    for (let i = 0; i < 20 && !estado.log.some((linha) => linha.texto.startsWith('Sangramento ativado')); i += 1) {
        estado.player.stamina = estado.player.staminaMax;
        executarAcao(estado, 'rapido');
        rodar(estado, estado.build.rapido.duracao + 5);
    }
    assert.ok(estado.log.some((linha) => linha.texto.startsWith('Sangramento ativado')));
});

test('o chefe ataca sozinho e a mesma semente repete a luta', () => {
    const a = criarCombate({ build: demo('demo-destreza'), chefe: malenia, semente: 7 });
    const b = criarCombate({ build: demo('demo-destreza'), chefe: malenia, semente: 7 });
    rodar(a, 20000);
    rodar(b, 20000);
    assert.ok(a.player.hp < a.player.hpMax);
    assert.equal(a.player.hp, b.player.hp);
    assert.deepEqual(a.boss.historicoPadroes, b.boss.historicoPadroes);
});

test('vitoria rende XP, sobe nivel e registra recordes', () => {
    const resumo = { vitoria: true, chefeId: 'malenia', tempo: 170000, danoCausado: 18000, danoRecebido: 500, perfectDodges: 12, parries: 3, criticos: 2, maiorGolpe: 3000, frascosUsados: 0 };
    const { progresso, recompensa, niveisGanhos, novasConquistas } = aplicarResultado(progressoInicial(), resumo, malenia);
    assert.ok(recompensa.xp >= 500);
    assert.ok(niveisGanhos >= 1);
    assert.equal(progresso.vitorias, 1);
    assert.equal(progresso.melhorTempo.malenia, 170000);
    assert.ok(novasConquistas.includes('primeira-vitoria'));
    assert.ok(novasConquistas.includes('relampago'));
});
