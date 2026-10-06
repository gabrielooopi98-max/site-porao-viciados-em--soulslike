// Progressao RPG: XP, nivel, recordes e conquistas.
// Funcoes puras + leitura/escrita no localStorage (por usuario).
// Para alimentar o ranking, basta enviar o objeto de progresso ao Supabase.

export const CONQUISTAS = [
    { id: 'primeira-vitoria', nome: 'Primeira Vitória', descricao: 'Derrote um chefe.', checar: (r) => r.vitoria },
    { id: 'danca-perfeita', nome: 'Dança Perfeita', descricao: '10 Perfect Dodges em uma luta.', checar: (r) => r.perfectDodges >= 10 },
    { id: 'mestre-parry', nome: 'Mestre do Parry', descricao: '3 parries perfeitos em uma luta.', checar: (r) => r.parries >= 3 },
    { id: 'quase-intocavel', nome: 'Quase Intocável', descricao: 'Vença recebendo até 600 de dano.', checar: (r) => r.vitoria && r.danoRecebido <= 600 },
    { id: 'sem-frascos', nome: 'Sem Frascos', descricao: 'Vença sem beber do frasco.', checar: (r) => r.vitoria && r.frascosUsados === 0 },
    { id: 'relampago', nome: 'Relâmpago', descricao: 'Vença em menos de 3 minutos.', checar: (r) => r.vitoria && r.tempo < 180000 },
    { id: 'golpe-titanico', nome: 'Golpe Titânico', descricao: 'Cause 2.500 de dano em um único golpe.', checar: (r) => r.maiorGolpe >= 2500 },
    { id: 'persistente', nome: 'Persistente', descricao: 'Morra 10 vezes e continue tentando.', checar: (_r, p) => p.derrotas >= 10 },
];

export function xpParaNivel(nivel) {
    return Math.round((400 * Math.pow(1.11, nivel - 1)) / 10) * 10;
}

export function progressoInicial() {
    return {
        nivel: 1, xp: 0, xpTotal: 0, souls: 0,
        vitorias: 0, derrotas: 0,
        chefesDerrotados: {},
        maiorDano: 0,
        melhorTempo: {},
        perfectDodges: 0, parries: 0, criticos: 0,
        conquistas: [],
    };
}

export function calcularRecompensa(resumo, chefe) {
    if (resumo.vitoria) {
        const bonus = Math.min(250, resumo.perfectDodges * 6 + resumo.parries * 15 + resumo.criticos * 10);
        return { xp: chefe.recompensa.xp + bonus, souls: chefe.recompensa.souls };
    }
    const proporcao = Math.min(1, resumo.danoCausado / chefe.hpMax);
    return { xp: Math.round(20 + chefe.recompensa.xp * 0.25 * proporcao), souls: 0 };
}

export function aplicarResultado(progressoAtual, resumo, chefe) {
    const anterior = { ...progressoInicial(), ...progressoAtual };
    const recompensa = calcularRecompensa(resumo, chefe);
    const p = {
        ...anterior,
        chefesDerrotados: { ...anterior.chefesDerrotados },
        melhorTempo: { ...anterior.melhorTempo },
        conquistas: [...anterior.conquistas],
    };

    p.xp += recompensa.xp;
    p.xpTotal += recompensa.xp;
    p.souls += recompensa.souls;
    let niveisGanhos = 0;
    while (p.xp >= xpParaNivel(p.nivel)) {
        p.xp -= xpParaNivel(p.nivel);
        p.nivel += 1;
        niveisGanhos += 1;
    }

    if (resumo.vitoria) {
        p.vitorias += 1;
        p.chefesDerrotados[resumo.chefeId] = (p.chefesDerrotados[resumo.chefeId] || 0) + 1;
        const recorde = p.melhorTempo[resumo.chefeId];
        if (!recorde || resumo.tempo < recorde) p.melhorTempo[resumo.chefeId] = resumo.tempo;
    } else {
        p.derrotas += 1;
    }
    p.maiorDano = Math.max(p.maiorDano, resumo.maiorGolpe);
    p.perfectDodges += resumo.perfectDodges;
    p.parries += resumo.parries;
    p.criticos += resumo.criticos;

    const novasConquistas = CONQUISTAS
        .filter((conquista) => !p.conquistas.includes(conquista.id) && conquista.checar(resumo, p))
        .map((conquista) => conquista.id);
    p.conquistas.push(...novasConquistas);

    return { progresso: p, recompensa, niveisGanhos, novasConquistas };
}

export function totalChefesDerrotados(progresso) {
    return Object.values(progresso.chefesDerrotados || {}).reduce((soma, valor) => soma + valor, 0);
}

const chave = (usuarioId) => `viciados-rpg-progresso:${usuarioId || 'convidado'}`;

export function carregarProgresso(usuarioId) {
    try {
        const salvo = JSON.parse(localStorage.getItem(chave(usuarioId)) || 'null');
        return salvo ? { ...progressoInicial(), ...salvo } : progressoInicial();
    } catch {
        return progressoInicial();
    }
}

export function salvarProgresso(usuarioId, progresso) {
    try {
        localStorage.setItem(chave(usuarioId), JSON.stringify(progresso));
    } catch {
        // Sem armazenamento (aba privada): o progresso vale so para esta sessao.
    }
}

export function formatarTempo(ms) {
    const total = Math.floor((ms || 0) / 1000);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
