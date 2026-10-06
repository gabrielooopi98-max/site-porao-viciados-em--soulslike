// Arquetipos de combate. Cada build do site cai em um deles (ver buildStats.js)
// e os atributos/nivel da build ajustam os numeros a partir daqui.
//
// Tempos em milissegundos, relativos ao inicio da acao:
// - golpes[].em: momento em que o golpe conecta
// - esquiva.iframes: janela de invulnerabilidade
// - esquiva.perfeita: quanto tempo antes do impacto a esquiva conta como perfeita
// - parry.janela: duracao da janela ativa do parry (comeca em parry.inicio)

export const ARQUETIPOS = {
    forca: {
        id: 'forca',
        rotulo: 'Força',
        descricao: 'Golpes lentos e devastadores. Quebra a postura do chefe rápido.',
        hpMax: 1500, staminaMax: 100, staminaRegen: 30, fpMax: 40, fpRegen: 0.6,
        defesa: 0.14, base: 560, tipoDano: 'fisico',
        arma: { nome: 'Grande Martelo de Ferro', forma: 'martelo', imagem: null },
        rapido: { nome: 'Golpe', custo: 20, duracao: 640, golpes: [{ em: 400, mult: 1, postura: 14 }] },
        pesado: { nome: 'Esmagar', custo: 32, duracao: 1180, superArmadura: true, golpes: [{ em: 820, mult: 2.05, postura: 36 }] },
        habilidade: {
            nome: 'Golpe Devastador', custo: 40, fp: 18, duracao: 1500, superArmadura: true,
            golpes: [{ em: 1060, mult: 3.1, postura: 62 }],
        },
        esquiva: { custo: 22, duracao: 720, iframes: [60, 330], perfeita: 150 },
        bloqueio: { reducao: 0.72, custoMult: 0.9 },
        parry: { custo: 16, duracao: 640, inicio: 70, janela: 130 },
    },
    destreza: {
        id: 'destreza',
        rotulo: 'Destreza',
        descricao: 'Rápida e precisa. Esquiva com folga, dano menor por golpe.',
        hpMax: 1250, staminaMax: 120, staminaRegen: 44, fpMax: 50, fpRegen: 0.8,
        defesa: 0.06, base: 380, tipoDano: 'fisico',
        arma: { nome: 'Katana Curva', forma: 'katana', imagem: null },
        rapido: { nome: 'Corte', custo: 12, duracao: 400, golpes: [{ em: 210, mult: 1, postura: 7 }] },
        pesado: { nome: 'Corte em Arco', custo: 26, duracao: 840, golpes: [{ em: 540, mult: 1.85, postura: 20 }] },
        habilidade: {
            nome: 'Investida Relâmpago', custo: 28, fp: 12, duracao: 760, iframes: [0, 260],
            golpes: [{ em: 280, mult: 1.15, postura: 10 }, { em: 460, mult: 1.15, postura: 10 }],
        },
        esquiva: { custo: 15, duracao: 520, iframes: [30, 390], perfeita: 210 },
        bloqueio: { reducao: 0.55, custoMult: 1.2 },
        parry: { custo: 12, duracao: 560, inicio: 60, janela: 150 },
    },
    magia: {
        id: 'magia',
        rotulo: 'Magia',
        descricao: 'Feitiços à distância e dano mágico alto. Vulnerável ao conjurar.',
        hpMax: 1150, staminaMax: 90, staminaRegen: 34, fpMax: 140, fpRegen: 2.4,
        defesa: 0.04, base: 470, tipoDano: 'magia',
        arma: { nome: 'Cajado de Feiticeiro', forma: 'cajado', imagem: null },
        rapido: { nome: 'Projétil Arcano', custo: 10, fp: 5, duracao: 540, conjuracao: true, distancia: true, golpes: [{ em: 380, mult: 1, postura: 6 }] },
        pesado: { nome: 'Lança Arcana', custo: 18, fp: 16, duracao: 1120, conjuracao: true, distancia: true, golpes: [{ em: 860, mult: 2.25, postura: 18 }] },
        habilidade: {
            nome: 'Feitiço: Cometa', custo: 20, fp: 34, duracao: 1700, conjuracao: true, distancia: true,
            golpes: [{ em: 1340, mult: 3.5, postura: 30 }],
        },
        esquiva: { custo: 18, duracao: 620, iframes: [50, 320], perfeita: 160 },
        bloqueio: { reducao: 0.45, custoMult: 1.3 },
        parry: { custo: 14, duracao: 620, inicio: 70, janela: 120 },
    },
    sangramento: {
        id: 'sangramento',
        rotulo: 'Sangramento',
        descricao: 'Cada golpe acumula sangramento. Medidor cheio = hemorragia.',
        hpMax: 1300, staminaMax: 110, staminaRegen: 38, fpMax: 70, fpRegen: 1,
        defesa: 0.08, base: 360, tipoDano: 'fisico',
        arma: { nome: 'Lâmina Rubra Gêmea', forma: 'laminaRubra', imagem: null },
        status: { sangramento: 20 },
        rapido: { nome: 'Corte', custo: 14, duracao: 430, golpes: [{ em: 240, mult: 1, postura: 8 }] },
        pesado: { nome: 'Corte Cruzado', custo: 28, duracao: 900, golpes: [{ em: 600, mult: 1.75, postura: 22, acumulo: 1.6 }] },
        habilidade: {
            nome: 'Lâmina Ensanguentada', custo: 22, fp: 16, duracao: 1000, distancia: true,
            golpes: [{ em: 620, mult: 1.6, postura: 16, acumulo: 3.2 }],
        },
        esquiva: { custo: 16, duracao: 560, iframes: [40, 360], perfeita: 190 },
        bloqueio: { reducao: 0.55, custoMult: 1.1 },
        parry: { custo: 13, duracao: 580, inicio: 60, janela: 140 },
    },
    tanque: {
        id: 'tanque',
        rotulo: 'Tanque',
        descricao: 'HP e defesa altos, bloqueio eficiente. Esquiva pesada.',
        hpMax: 2250, staminaMax: 88, staminaRegen: 30, fpMax: 40, fpRegen: 0.6,
        defesa: 0.26, base: 450, tipoDano: 'fisico',
        arma: { nome: 'Maça e Escudo-Torre', forma: 'escudo', imagem: null },
        rapido: { nome: 'Golpe de Maça', custo: 18, duracao: 580, golpes: [{ em: 350, mult: 1, postura: 12 }] },
        pesado: { nome: 'Pancada', custo: 30, duracao: 1080, golpes: [{ em: 760, mult: 1.95, postura: 30 }] },
        habilidade: {
            nome: 'Investida de Escudo', custo: 28, fp: 12, duracao: 900, superArmadura: true,
            golpes: [{ em: 480, mult: 1.2, postura: 58 }],
        },
        esquiva: { custo: 26, duracao: 800, iframes: [80, 300], perfeita: 120 },
        bloqueio: { reducao: 0.92, custoMult: 0.4 },
        parry: { custo: 12, duracao: 600, inicio: 60, janela: 170 },
    },
    qualidade: {
        id: 'qualidade',
        rotulo: 'Qualidade',
        descricao: 'Equilibrada: nada excepcional, nada fraco.',
        hpMax: 1400, staminaMax: 105, staminaRegen: 36, fpMax: 60, fpRegen: 1,
        defesa: 0.1, base: 440, tipoDano: 'fisico',
        arma: { nome: 'Espada Longa', forma: 'espada', imagem: null },
        rapido: { nome: 'Corte', custo: 15, duracao: 480, golpes: [{ em: 280, mult: 1, postura: 10 }] },
        pesado: { nome: 'Estocada Pesada', custo: 29, duracao: 960, golpes: [{ em: 650, mult: 1.9, postura: 26 }] },
        habilidade: {
            nome: 'Corte Duplo', custo: 30, fp: 14, duracao: 980,
            golpes: [{ em: 360, mult: 1.25, postura: 14 }, { em: 640, mult: 1.45, postura: 18 }],
        },
        esquiva: { custo: 18, duracao: 600, iframes: [45, 350], perfeita: 170 },
        bloqueio: { reducao: 0.65, custoMult: 1 },
        parry: { custo: 13, duracao: 600, inicio: 65, janela: 140 },
    },
};

// Ataque critico (apos parry perfeito ou postura quebrada) e frasco de cura sao iguais para todos.
export const CRITICO = { nome: 'Ataque Crítico', custo: 0, duracao: 1250, golpes: [{ em: 720, mult: 4.2, postura: 0, critico: true }] };
export const FRASCO = { nome: 'Frasco', duracao: 1150, curaEm: 760, cura: 0.42, cargas: 3 };

// Acumulo de status por golpe (multiplicado por golpe.acumulo) a partir do tipo de dano da build.
export const ACUMULO_POR_DANO = {
    sangramento: { status: 'sangramento', valor: 20 },
    veneno: { status: 'veneno', valor: 22 },
    podridao: { status: 'podridao', valor: 18 },
    congelamento: { status: 'congelamento', valor: 20 },
    fogo: { status: 'queimadura', valor: 16 },
};
