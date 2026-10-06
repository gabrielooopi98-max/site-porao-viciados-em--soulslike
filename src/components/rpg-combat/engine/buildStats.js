// Converte uma build publicada no site (categoria, nivel, foco, dano) nos
// numeros do combate. Builds diferentes precisam jogar diferente.
import { interpretarDano, interpretarFoco } from '../../../services/perfilBuild.js';
import { ACUMULO_POR_DANO, ARQUETIPOS } from '../data/arquetipos.js';

const FOCO_MAGICO = ['inteligencia', 'fe', 'magia', 'arcano', 'hex', 'sangue'];
const DANO_MAGICO = ['magia', 'sagrado', 'trevas', 'raio', 'arcano'];
const FOCO_RAPIDO = ['destreza', 'habilidade', 'tecnica', 'combate'];
const FOCO_DEFENSIVO = ['vigor', 'vitalidade', 'folego', 'postura'];

export function definirArquetipo(build) {
    const foco = interpretarFoco(build?.foco).map((item) => item.id).filter(Boolean);
    const danos = interpretarDano(build?.dano).map((item) => item.id).filter(Boolean);
    const texto = `${build?.titulo || ''} ${build?.descricao || ''}`.toLowerCase();

    if (danos.includes('sangramento') || /sangr|bleed|hemorrag/.test(texto)) return 'sangramento';
    if (foco.some((id) => FOCO_MAGICO.includes(id)) && (danos.some((id) => DANO_MAGICO.includes(id)) || !danos.includes('fisico'))) return 'magia';
    if (/tanque|tank|escudo|shield/.test(texto) || (foco.length && foco.every((id) => FOCO_DEFENSIVO.includes(id)))) return 'tanque';
    if (foco.includes('forca') && !foco.some((id) => FOCO_RAPIDO.includes(id))) return 'forca';
    if (foco.some((id) => FOCO_RAPIDO.includes(id)) && !foco.includes('forca')) return 'destreza';
    if (foco.includes('motividade')) return 'forca';
    if (foco.includes('avanco')) return 'magia';
    return 'qualidade';
}

const limitar = (valor, min, max) => Math.min(max, Math.max(min, valor));

// "Força 60 / Fé" -> maior valor numerico informado (60), usado como bonus de escala
function maiorValorFoco(build) {
    return interpretarFoco(build?.foco).reduce((maior, item) => Math.max(maior, Number(item.valor) || 0), 0);
}

function escolherTipoDano(arquetipo, build) {
    const danos = interpretarDano(build?.dano).map((item) => item.id).filter(Boolean);
    const elementar = danos.find((id) => ['magia', 'fogo', 'raio', 'sagrado', 'trevas', 'arcano'].includes(id));
    if (arquetipo.id === 'magia') return elementar || 'magia';
    return danos.includes('fisico') || !elementar ? 'fisico' : elementar;
}

export function statsDaBuild(build) {
    const arquetipo = ARQUETIPOS[definirArquetipo(build)];
    const nivel = limitar(parseInt(build?.nivel, 10) || 60, 1, 713);
    const escalaNivel = 0.88 + (Math.min(nivel, 150) / 150) * 0.26;
    const valorFoco = maiorValorFoco(build);
    const multArma = Number(limitar(1 + (valorFoco ? (valorFoco - 30) / 160 : 0.1), 0.95, 1.4).toFixed(2));

    const status = { ...(arquetipo.status || {}) };
    for (const item of interpretarDano(build?.dano)) {
        const acumulo = ACUMULO_POR_DANO[item.id];
        if (acumulo && !status[acumulo.status]) status[acumulo.status] = acumulo.valor;
    }

    return {
        arquetipo: arquetipo.id,
        rotuloArquetipo: arquetipo.rotulo,
        descricaoArquetipo: arquetipo.descricao,
        nome: build?.titulo?.trim() || 'Build sem nome',
        jogo: build?.categoria || '',
        nivel,
        hpMax: Math.round(arquetipo.hpMax * escalaNivel),
        staminaMax: Math.round(arquetipo.staminaMax * (0.94 + escalaNivel * 0.06)),
        staminaRegen: arquetipo.staminaRegen,
        fpMax: arquetipo.fpMax,
        fpRegen: arquetipo.fpRegen,
        defesa: arquetipo.defesa,
        base: Math.round(arquetipo.base * escalaNivel),
        multArma,
        tipoDano: escolherTipoDano(arquetipo, build),
        arma: { ...arquetipo.arma },
        imagem: build?.imagemCombate || null,
        status,
        rapido: arquetipo.rapido,
        pesado: arquetipo.pesado,
        habilidade: arquetipo.habilidade,
        esquiva: arquetipo.esquiva,
        bloqueio: arquetipo.bloqueio,
        parry: arquetipo.parry,
    };
}

// Builds de exemplo para quem ainda nao publicou nenhuma.
export const BUILDS_DEMO = [
    { id: 'demo-sangramento', titulo: 'Lâmina Rubra', categoria: 'Elden Ring', nivel: '125', foco: 'Destreza 50 / Arcano 45', dano: 'Físico / Sangramento', demo: true },
    { id: 'demo-forca', titulo: 'Colosso de Ferro', categoria: 'Elden Ring', nivel: '125', foco: 'Força 80 / Vigor 50', dano: 'Físico', demo: true },
    { id: 'demo-destreza', titulo: 'Duelista Veloz', categoria: 'Dark Souls III', nivel: '120', foco: 'Destreza 60 / Vigor 40', dano: 'Físico', demo: true },
    { id: 'demo-magia', titulo: 'Feiticeiro da Academia', categoria: 'Elden Ring', nivel: '125', foco: 'Inteligência 80 / Mente 40', dano: 'Magia', demo: true },
    { id: 'demo-tanque', titulo: 'Muralha Inabalável', categoria: 'Dark Souls III', nivel: '120', foco: 'Vigor 60 / Fôlego 40', dano: 'Físico', descricao: 'Escudo-torre e paciência.', demo: true },
];
