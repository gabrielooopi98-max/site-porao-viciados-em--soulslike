// Efeitos de status. O alvo acumula ate o limiar (resistencia) e o efeito dispara.
// Cada disparo aumenta o limiar seguinte, como nos Souls.

export const STATUS = {
    sangramento: {
        rotulo: 'Sangramento', icone: '🩸', cor: '#c4363f',
        disparo: (alvo) => ({ dano: Math.round(alvo.hpMax * 0.04 + 130) }),
    },
    congelamento: {
        rotulo: 'Gelo', icone: '❄', cor: '#9fd8ec',
        disparo: (alvo) => ({ dano: Math.round(alvo.hpMax * 0.03 + 200), quebraDefesa: { fator: 0.75, duracao: 8000 } }),
    },
    veneno: {
        rotulo: 'Veneno', icone: '☠', cor: '#8fb85a',
        disparo: (alvo) => ({ dot: { porSegundo: Math.round(alvo.hpMax * 0.0025 + 8), duracao: 14000 } }),
    },
    podridao: {
        rotulo: 'Podridão', icone: '✿', cor: '#d0703f',
        disparo: (alvo) => ({ dot: { porSegundo: Math.round(alvo.hpMax * 0.004 + 10), duracao: 10000 } }),
    },
    queimadura: {
        rotulo: 'Fogo', icone: '🔥', cor: '#e08a3c',
        disparo: (alvo) => ({ dano: Math.round(alvo.hpMax * 0.012 + 120), dot: { porSegundo: Math.round(alvo.hpMax * 0.0018 + 6), duracao: 6000 } }),
    },
};

export const DECAIMENTO_STATUS_POR_SEGUNDO = 9;
export const AUMENTO_LIMIAR_APOS_DISPARO = 1.25;
