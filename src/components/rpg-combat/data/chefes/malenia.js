// Chefe de demonstracao. Para adicionar outro chefe, copie este arquivo,
// ajuste ataques/padroes e registre-o em data/chefes/index.js.
//
// Ataques: tempos em ms relativos ao inicio da animacao.
// golpes[].em = instante do impacto. aparavel=false impede parry,
// ignoraBloqueio=true atravessa a guarda, perfuraGuarda reduz a eficiencia do bloqueio.

export default {
    id: 'malenia',
    nome: 'Malenia, Espada de Miquella',
    nomeCurto: 'Malenia',
    jogo: 'Elden Ring',
    titulo: 'A Lâmina que Jamais Conheceu Derrota',
    imagem: null,
    fundo: null,
    hpMax: 18000,
    posturaMax: 170,
    posturaRegen: 9,
    vulneravelDuracao: 2600,
    curaPorGolpe: 0.5,
    defesa: { fisico: 140, magia: 110, fogo: 120, raio: 120, sagrado: 165, trevas: 120, arcano: 120 },
    resistencias: { sangramento: 300, veneno: 320, congelamento: 340, queimadura: 300, podridao: Infinity },
    recompensa: { xp: 500, souls: 120 },
    intervalo: [260, 620],

    fases: [
        {
            numero: 1,
            nome: 'Malenia, Espada de Miquella',
            velocidade: 1,
            dano: 1,
            padroes: [
                { id: 'cortes', sequencia: ['corte_rapido', 'corte_rapido', 'pausa'], peso: 3 },
                { id: 'combo-recuo', sequencia: ['combo_triplo', 'recuo', 'investida'], peso: 3 },
                { id: 'atrasado', sequencia: ['golpe_atrasado', 'corte_rapido', 'pausa'], peso: 2.2 },
                { id: 'pressao', sequencia: ['investida', 'combo_triplo', 'pausa'], peso: 2 },
                { id: 'danca', sequencia: ['danca', 'pausa'], peso: 1.1, recarga: 3 },
            ],
        },
        {
            numero: 2,
            nome: 'Malenia, Deusa da Podridão',
            limiar: 0.5,
            velocidade: 0.86,
            dano: 1.15,
            intervalo: [150, 380],
            padroes: [
                { id: 'furia', sequencia: ['combo_quadruplo', 'corte_rapido', 'pausa'], peso: 3 },
                { id: 'salto', sequencia: ['salto', 'combo_triplo'], peso: 2.4 },
                { id: 'atrasado', sequencia: ['golpe_atrasado', 'investida', 'pausa'], peso: 2 },
                { id: 'danca', sequencia: ['danca', 'recuo', 'investida'], peso: 1.6, recarga: 2 },
                { id: 'aeonia', sequencia: ['aeonia', 'pausa'], peso: 1.3, recarga: 3 },
            ],
        },
    ],

    // Reacoes tem prioridade sobre os padroes quando a condicao aparece.
    reacoes: [
        { quando: 'jogadorBebendo', sequencia: ['investida'], chance: 0.75 },
        { quando: 'jogadorExausto', sequencia: ['investida'], chance: 0.6 },
        { quando: 'sobPressao', sequencia: ['recuo', 'golpe_atrasado'], chance: 0.5 },
    ],

    ataques: {
        corte_rapido: {
            nome: 'Corte Ágil', comportamento: 'Avançando com a lâmina',
            duracao: 1150, golpes: [{ em: 620, dano: 300 }],
        },
        combo_triplo: {
            nome: 'Combo da Lâmina', comportamento: 'Iniciando um combo',
            duracao: 2050, golpes: [{ em: 700, dano: 230 }, { em: 1080, dano: 230 }, { em: 1460, dano: 290 }],
        },
        investida: {
            nome: 'Estocada Investida', comportamento: 'Preparando investida',
            duracao: 1700, golpes: [{ em: 1050, dano: 480 }],
        },
        golpe_atrasado: {
            nome: 'Corte Atrasado', comportamento: 'Segurando o golpe…',
            duracao: 2000, golpes: [{ em: 1450, dano: 440 }],
        },
        danca: {
            nome: 'Dança da Ave Aquática', comportamento: 'Saltando para o alto', perigo: true,
            duracao: 4100,
            golpes: [
                { em: 1500, dano: 150, aparavel: false, perfuraGuarda: 0.5 },
                { em: 1620, dano: 150, aparavel: false, perfuraGuarda: 0.5 },
                { em: 1740, dano: 150, aparavel: false, perfuraGuarda: 0.5 },
                { em: 2350, dano: 150, aparavel: false, perfuraGuarda: 0.5 },
                { em: 2470, dano: 150, aparavel: false, perfuraGuarda: 0.5 },
                { em: 2590, dano: 150, aparavel: false, perfuraGuarda: 0.5 },
                { em: 3200, dano: 170, aparavel: false, perfuraGuarda: 0.5 },
                { em: 3320, dano: 170, aparavel: false, perfuraGuarda: 0.5 },
                { em: 3440, dano: 170, aparavel: false, perfuraGuarda: 0.5 },
            ],
        },
        combo_quadruplo: {
            nome: 'Fúria da Valquíria', comportamento: 'Furiosa',
            duracao: 2300, golpes: [{ em: 600, dano: 230 }, { em: 900, dano: 230 }, { em: 1200, dano: 250 }, { em: 1720, dano: 330 }],
        },
        salto: {
            nome: 'Salto Aéreo', comportamento: 'Saltando', perigo: true,
            duracao: 2000, golpes: [{ em: 1300, dano: 520, aparavel: false }],
        },
        aeonia: {
            nome: 'Florescer Escarlate', comportamento: 'A podridão desabrocha', perigo: true,
            duracao: 2900, golpes: [{ em: 1900, dano: 640, aparavel: false, ignoraBloqueio: true, status: { podridao: 70 } }],
        },
        pausa: { nome: 'Observando', comportamento: 'Observando', tipo: 'pausa', duracao: 1300, golpes: [] },
        recuo: { nome: 'Recuo', comportamento: 'Recuando', tipo: 'recuo', duracao: 900, golpes: [] },
    },
};
