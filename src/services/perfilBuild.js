// Perfil da build: atributos de foco e tipos de dano padronizados por jogo.
// O banco continua guardando texto ("Força / Fé"), entao builds antigas,
// escritas a mao, tambem sao reconhecidas pelos apelidos abaixo.

export const SEPARADOR_PERFIL = ' / ';
export const MAXIMO_POR_GRUPO = 2;

export const ATRIBUTOS = {
    forca: { rotulo: 'Força', sigla: 'FOR', cor: '#e0a15b', apelidos: ['forca', 'str', 'strength'] },
    destreza: { rotulo: 'Destreza', sigla: 'DES', cor: '#c9cfd6', apelidos: ['destreza', 'dex', 'dexterity'] },
    qualidade: { rotulo: 'Qualidade', sigla: 'QUA', cor: '#d8c08a', apelidos: ['qualidade', 'quality', 'qual'] },
    inteligencia: { rotulo: 'Inteligência', sigla: 'INT', cor: '#7aa7ff', apelidos: ['inteligencia', 'int', 'intelligence'] },
    fe: { rotulo: 'Fé', sigla: 'FÉ', cor: '#f2d16b', apelidos: ['fe', 'fth', 'faith'] },
    arcano: { rotulo: 'Arcano', sigla: 'ARC', cor: '#c084fc', apelidos: ['arcano', 'arc', 'arcane'] },
    sorte: { rotulo: 'Sorte', sigla: 'SOR', cor: '#8fd19e', apelidos: ['sorte', 'lck', 'luck'] },
    vigor: { rotulo: 'Vigor', sigla: 'VIG', cor: '#ef7c7c', apelidos: ['vigor', 'vig'] },
    mente: { rotulo: 'Mente', sigla: 'MEN', cor: '#8ab4f8', apelidos: ['mente', 'mnd', 'mind'] },
    folego: { rotulo: 'Fôlego', sigla: 'FÔL', cor: '#9be0c9', apelidos: ['folego', 'end', 'endurance', 'resistencia'] },
    vitalidade: { rotulo: 'Vitalidade', sigla: 'VIT', cor: '#ef7c7c', apelidos: ['vitalidade', 'vit', 'vitality'] },
    hex: { rotulo: 'Hex', sigla: 'HEX', cor: '#a78bfa', apelidos: ['hex', 'hexes', 'maldicao'] },
    magia: { rotulo: 'Magia', sigla: 'MAG', cor: '#7aa7ff', apelidos: ['magia', 'magic'] },
    habilidade: { rotulo: 'Habilidade', sigla: 'HAB', cor: '#c9cfd6', apelidos: ['habilidade', 'skl', 'skill'] },
    sangue: { rotulo: 'Sangue', sigla: 'SAN', cor: '#e5484d', apelidos: ['sangue', 'blt', 'bloodtinge', 'bloodtinge'] },
    motividade: { rotulo: 'Motividade', sigla: 'MOT', cor: '#e0a15b', apelidos: ['motividade', 'motivity', 'motivacao'] },
    tecnica: { rotulo: 'Técnica', sigla: 'TÉC', cor: '#c9cfd6', apelidos: ['tecnica', 'technique', 'tec'] },
    avanco: { rotulo: 'Avanço', sigla: 'AVA', cor: '#7aa7ff', apelidos: ['avanco', 'advance'] },
    combate: { rotulo: 'Combate', sigla: 'CMB', cor: '#e0a15b', apelidos: ['combate', 'ataque', 'attack'] },
    postura: { rotulo: 'Postura', sigla: 'POS', cor: '#f2d16b', apelidos: ['postura', 'posture'] },
    protese: { rotulo: 'Prótese', sigla: 'PRÓ', cor: '#c9cfd6', apelidos: ['protese', 'prosthetic'] },
    furtividade: { rotulo: 'Furtividade', sigla: 'FUR', cor: '#8fd19e', apelidos: ['furtividade', 'stealth', 'shinobi'] },
};

export const DANOS = {
    fisico: { rotulo: 'Físico', cor: '#cfd3d8', icone: 'espada', apelidos: ['fisico', 'physical', 'phy'] },
    magia: { rotulo: 'Magia', cor: '#6ea8ff', icone: 'brilho', apelidos: ['magia', 'magic', 'magico'] },
    fogo: { rotulo: 'Fogo', cor: '#ff8a3d', icone: 'chama', apelidos: ['fogo', 'fire'] },
    raio: { rotulo: 'Raio', cor: '#ffd84a', icone: 'raio', apelidos: ['raio', 'lightning', 'bolt', 'eletrico', 'electric'] },
    sagrado: { rotulo: 'Sagrado', cor: '#f5d98b', icone: 'sol', apelidos: ['sagrado', 'holy'] },
    trevas: { rotulo: 'Trevas', cor: '#a58bff', icone: 'lua', apelidos: ['trevas', 'dark', 'escuridao', 'abismo'] },
    arcano: { rotulo: 'Arcano', cor: '#c084fc', icone: 'brilho', apelidos: ['arcano', 'arcane'] },
    sangramento: { rotulo: 'Sangramento', cor: '#ff4d5e', icone: 'gota', apelidos: ['sangramento', 'bleed', 'hemorragia', 'sangue', 'blood'] },
    veneno: { rotulo: 'Veneno', cor: '#7ddc6f', icone: 'frasco', apelidos: ['veneno', 'poison', 'toxico', 'toxic'] },
    podridao: { rotulo: 'Podridão', cor: '#e07b4f', icone: 'flor', apelidos: ['podridao', 'rot', 'scarlet rot', 'putrefacao'] },
    congelamento: { rotulo: 'Gelo', cor: '#8fe3ff', icone: 'floco', apelidos: ['gelo', 'congelamento', 'frost', 'frio', 'ice'] },
    loucura: { rotulo: 'Loucura', cor: '#ffc94d', icone: 'olho', apelidos: ['loucura', 'madness', 'frenesi', 'frenzy'] },
    terror: { rotulo: 'Terror', cor: '#b9a7ff', icone: 'olho', apelidos: ['terror', 'pavor'] },
    acido: { rotulo: 'Ácido', cor: '#b8e04a', icone: 'gota', apelidos: ['acido', 'acid'] },
    eletrico: { rotulo: 'Elétrico', cor: '#ffd84a', icone: 'raio', apelidos: ['eletrico', 'electric', 'eletricidade'] },
};

const PADRAO = {
    atributos: ['forca', 'destreza', 'qualidade', 'inteligencia', 'fe', 'vigor'],
    danos: ['fisico', 'magia', 'fogo', 'raio', 'sagrado', 'trevas', 'sangramento', 'veneno'],
};

const POR_JOGO = {
    'Dark Souls Remastered': {
        atributos: ['forca', 'destreza', 'qualidade', 'inteligencia', 'fe', 'vitalidade'],
        danos: ['fisico', 'magia', 'fogo', 'raio', 'trevas', 'sangramento', 'veneno'],
    },
    'Dark Souls II': {
        atributos: ['forca', 'destreza', 'qualidade', 'inteligencia', 'fe', 'hex', 'vigor'],
        danos: ['fisico', 'magia', 'fogo', 'raio', 'trevas', 'sangramento', 'veneno'],
    },
    'Dark Souls III': {
        atributos: ['forca', 'destreza', 'qualidade', 'inteligencia', 'fe', 'sorte', 'vigor'],
        danos: ['fisico', 'magia', 'fogo', 'raio', 'trevas', 'sangramento', 'veneno', 'congelamento'],
    },
    'Elden Ring': {
        atributos: ['forca', 'destreza', 'qualidade', 'inteligencia', 'fe', 'arcano', 'vigor', 'mente'],
        danos: ['fisico', 'magia', 'fogo', 'raio', 'sagrado', 'sangramento', 'veneno', 'podridao', 'congelamento', 'loucura'],
    },
    'Elden Ring Nightreign': {
        atributos: ['forca', 'destreza', 'inteligencia', 'fe', 'arcano', 'vigor', 'mente'],
        danos: ['fisico', 'magia', 'fogo', 'raio', 'sagrado', 'sangramento', 'veneno', 'podridao', 'congelamento', 'loucura'],
    },
    Bloodborne: {
        atributos: ['forca', 'habilidade', 'sangue', 'arcano', 'vitalidade'],
        danos: ['fisico', 'arcano', 'fogo', 'raio', 'sangramento', 'veneno', 'loucura'],
    },
    "Demon's Souls": {
        atributos: ['forca', 'destreza', 'qualidade', 'magia', 'fe', 'vitalidade'],
        danos: ['fisico', 'magia', 'fogo', 'sangramento', 'veneno'],
    },
    'Sekiro: Shadows Die Twice': {
        atributos: ['combate', 'postura', 'protese', 'furtividade'],
        danos: ['fisico', 'fogo', 'raio', 'veneno', 'terror'],
    },
    'Lies of P': {
        atributos: ['motividade', 'tecnica', 'avanco', 'vigor'],
        danos: ['fisico', 'fogo', 'eletrico', 'acido'],
    },
};

export function opcoesPerfilBuild(categoria) {
    const opcoes = POR_JOGO[categoria] || PADRAO;
    return {
        atributos: opcoes.atributos.map((id) => ({ id, ...ATRIBUTOS[id] })),
        danos: opcoes.danos.map((id) => ({ id, ...DANOS[id] })),
    };
}

function normalizar(texto) {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// "Inteligência 60, Fé" -> [{ id: 'inteligencia', rotulo, valor: '60', ... }, { id: 'fe', ... }]
// Pedacos nao reconhecidos voltam sem id e aparecem como selo neutro.
function interpretar(texto, catalogo) {
    if (!texto?.trim()) return [];
    const vistos = new Set();
    return String(texto)
        .split(/\s*(?:\/|,|;|\+|&|\||\be\b)\s*/i)
        .map((pedaco) => pedaco.trim())
        .filter(Boolean)
        .map((pedaco) => {
            const valor = pedaco.match(/\d+/)?.[0] || '';
            const nome = normalizar(pedaco.replace(/\d+/g, '').replace(/[()[\]:]/g, ''));
            const id = Object.keys(catalogo).find((chave) => catalogo[chave].apelidos.includes(nome));
            return id ? { id, ...catalogo[id], valor } : { id: null, rotulo: pedaco, valor: '' };
        })
        .filter((item) => {
            const chave = item.id || normalizar(item.rotulo);
            if (vistos.has(chave)) return false;
            vistos.add(chave);
            return true;
        });
}

export function interpretarFoco(texto) {
    return interpretar(texto, ATRIBUTOS);
}

export function interpretarDano(texto) {
    return interpretar(texto, DANOS);
}

export function juntarPerfil(rotulos) {
    return rotulos.join(SEPARADOR_PERFIL);
}
