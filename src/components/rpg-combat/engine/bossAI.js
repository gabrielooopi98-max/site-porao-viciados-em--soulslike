// IA do chefe: padroes fixos (aprendiveis) sorteados de forma ponderada,
// sem repetir o mesmo padrao em seguida, mais reacoes ao que o jogador faz.
import { sortearPonderado } from './rng.js';

const RECARGA_REACAO = 4500;

export function faseAtual(chefe, boss) {
    return chefe.fases[boss.fase - 1] || chefe.fases[0];
}

function condicaoAtiva(quando, estado) {
    const { player, boss, t } = estado;
    if (quando === 'jogadorBebendo') return player.acao?.tipo === 'frasco';
    if (quando === 'jogadorExausto') return player.exaustoAte > t;
    if (quando === 'sobPressao') return boss.golpesRecentes.filter((momento) => t - momento < 2000).length >= 3;
    return false;
}

export function reacaoDisponivel(estado, rng) {
    const { boss, chefe, t } = estado;
    if (boss.reacaoLiberadaEm > t) return null;
    for (const reacao of chefe.reacoes || []) {
        if (condicaoAtiva(reacao.quando, estado) && rng.proximo() < reacao.chance) return reacao;
    }
    return null;
}

function sortearPadrao(estado, rng) {
    const { boss, chefe } = estado;
    const fase = faseAtual(chefe, boss);
    const historico = boss.historicoPadroes;
    const ultimo = historico[historico.length - 1];
    const candidatos = fase.padroes.filter((padrao) => {
        if (padrao.id === ultimo) return false;
        if (!padrao.recarga) return true;
        const usadoHa = historico.length - 1 - historico.lastIndexOf(padrao.id);
        return historico.lastIndexOf(padrao.id) === -1 || usadoHa >= padrao.recarga;
    });
    const lista = candidatos.length ? candidatos : fase.padroes;
    return sortearPonderado(rng, lista.map((padrao) => ({ valor: padrao, peso: padrao.peso })));
}

// Retorna o id do proximo ataque e atualiza a fila do chefe.
export function escolherProximoAtaque(estado, rng) {
    const { boss, t } = estado;
    const reacao = reacaoDisponivel(estado, rng);
    if (reacao) {
        boss.reacaoLiberadaEm = t + RECARGA_REACAO;
        boss.fila = [...reacao.sequencia.slice(1), ...boss.fila];
        return { id: reacao.sequencia[0], reacao: reacao.quando };
    }
    if (!boss.fila.length) {
        const padrao = sortearPadrao(estado, rng);
        boss.historicoPadroes = [...boss.historicoPadroes.slice(-8), padrao.id];
        boss.fila = [...padrao.sequencia];
    }
    const [id, ...resto] = boss.fila;
    boss.fila = resto;
    return { id };
}

// Durante uma pausa o chefe pode cortar a espera para punir o jogador.
export function devePunirDuranteBrecha(estado) {
    const { player, boss, t } = estado;
    if (boss.reacaoLiberadaEm > t) return false;
    return player.acao?.tipo === 'frasco' || player.exaustoAte > t;
}
