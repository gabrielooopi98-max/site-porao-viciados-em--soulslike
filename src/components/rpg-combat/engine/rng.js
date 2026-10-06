// Gerador deterministico (mulberry32): a mesma semente repete a mesma luta,
// o que deixa a IA aprendivel e os testes reproduziveis.
export function criarRng(semente = Date.now()) {
    let estado = semente >>> 0;
    const proximo = () => {
        estado = (estado + 0x6d2b79f5) >>> 0;
        let t = estado;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
        proximo,
        entre: (min, max) => min + proximo() * (max - min),
        estado: () => estado,
    };
}

// Sorteio ponderado: [{ valor, peso }] -> valor
export function sortearPonderado(rng, opcoes) {
    const total = opcoes.reduce((soma, opcao) => soma + Math.max(0, opcao.peso), 0);
    if (total <= 0) return opcoes[0]?.valor;
    let alvo = rng.proximo() * total;
    for (const opcao of opcoes) {
        alvo -= Math.max(0, opcao.peso);
        if (alvo < 0) return opcao.valor;
    }
    return opcoes[opcoes.length - 1].valor;
}
