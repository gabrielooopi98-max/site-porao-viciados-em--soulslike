// Leituras do estado usadas pela interface (sem efeitos colaterais).

export function proximoGolpe(acao) {
    if (!acao) return null;
    return acao.golpes.find((golpe) => !golpe.aplicado) || null;
}

export function ultimoGolpeAplicado(acao) {
    if (!acao) return null;
    for (let i = acao.golpes.length - 1; i >= 0; i -= 1) {
        if (acao.golpes[i].aplicado) return acao.golpes[i];
    }
    return null;
}
