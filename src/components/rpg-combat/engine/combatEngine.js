// Motor do combate: logica pura, sem React. A interface so le o estado,
// chama executarAcao/definirGuarda nos inputs e avancar() a cada frame.
//
// Tempo de jogo (estado.t) pode desacelerar (perfect dodge, golpe final);
// estado.relogio e o tempo real, usado para expirar efeitos visuais.
import { CRITICO, FRASCO } from '../data/arquetipos.js';
import { AUMENTO_LIMIAR_APOS_DISPARO, DECAIMENTO_STATUS_POR_SEGUNDO, STATUS } from '../data/status.js';
import { devePunirDuranteBrecha, escolherProximoAtaque, faseAtual } from './bossAI.js';
import { statsDaBuild } from './buildStats.js';
import { criarRng } from './rng.js';

export const DURACAO_INTRO = 2600;
const DURACAO_TRANSICAO = 3800;
const DURACAO_FINAL = 2800;
const ATRASO_REGEN = 450;
const DURACAO_EXAUSTAO = 1400;
const DURACAO_ATORDOADO = 380;
const JANELA_CONTRA = 1100;
const BONUS_CONTRA = 1.4;
const DURACAO_EVENTO = 1700;
const MAX_LOG = 40;
const LIMIAR_PODRIDAO_JOGADOR = 100;

export function criarCombate({ build, chefe, semente = Date.now() }) {
    const stats = build?.arquetipo && build?.esquiva ? build : statsDaBuild(build);
    return {
        t: 0,
        relogio: 0,
        seq: 0,
        semente,
        rng: criarRng(semente),
        status: 'intro',
        statusAte: DURACAO_INTRO,
        lentoAte: 0,
        tremorId: 0,
        build: stats,
        chefe,
        player: {
            hp: stats.hpMax, hpMax: stats.hpMax,
            stamina: stats.staminaMax, staminaMax: stats.staminaMax,
            fp: stats.fpMax, fpMax: stats.fpMax,
            acao: null,
            guardando: false,
            exaustoAte: 0,
            atordoadoAte: 0,
            atingidoId: 0,
            ultimaAcaoFim: 0,
            ultimaEsquivaFim: -9999,
            ultimaEsquivaUtil: false,
            contraAte: 0,
            frascos: FRASCO.cargas,
            status: { podridao: { acumulo: 0, limiar: LIMIAR_PODRIDAO_JOGADOR } },
            dots: [],
        },
        boss: {
            hp: chefe.hpMax, hpMax: chefe.hpMax,
            fase: 1,
            estado: 'idle',
            comportamento: 'Observando',
            postura: 0, posturaMax: chefe.posturaMax,
            vulneravelAte: 0,
            transicaoAte: 0,
            acao: null,
            proximaAcaoEm: DURACAO_INTRO + 1500,
            fila: [],
            historicoPadroes: [],
            golpesRecentes: [],
            ultimoGolpeRecebido: -9999,
            reacaoLiberadaEm: 0,
            atingidoId: 0,
            status: {},
            dots: [],
            quebraDefesa: null,
            imunidadesAvisadas: [],
        },
        metricas: {
            danoCausado: 0, danoRecebido: 0, perfectDodges: 0, esquivas: 0,
            parries: 0, criticos: 0, maiorGolpe: 0, frascosUsados: 0, golpesSofridos: 0,
        },
        eventos: [],
        log: [],
    };
}

// Copia rasa por frame: a interface recebe objetos novos e re-renderiza.
export function snapshot(estado) {
    return {
        ...estado,
        player: { ...estado.player },
        boss: { ...estado.boss },
        metricas: { ...estado.metricas },
    };
}

export function tempoDeLuta(estado) {
    return Math.max(0, estado.t - DURACAO_INTRO);
}

/* ---------- eventos visuais e log ---------- */

function emitir(estado, evento) {
    estado.eventos = [...estado.eventos, { id: ++estado.seq, relogio: estado.relogio, ...evento }];
}

function registrar(estado, icone, texto, tipo = 'neutro') {
    estado.log = [...estado.log.slice(-(MAX_LOG - 1)), { id: ++estado.seq, t: tempoDeLuta(estado), icone, texto, tipo }];
}

function tremer(estado) {
    estado.tremorId = ++estado.seq;
}

/* ---------- acoes do jogador ---------- */

function definicaoDaAcao(estado, tipo) {
    const { build } = estado;
    if (tipo === 'critico') return CRITICO;
    if (tipo === 'frasco') return FRASCO;
    return build[tipo];
}

// A recuperacao de uma acao pode ser cancelada em esquiva depois que ela "resolveu":
// esquiva apos os i-frames, ataque apos o ultimo golpe sair, parry apos a janela.
function podeCancelarEmEsquiva(acao, t) {
    const rel = t - acao.inicio;
    if (acao.tipo === 'esquiva') return rel >= acao.iframes[1];
    if (acao.tipo === 'parry') return rel >= acao.janelaParry[1] + 120;
    if (acao.tipo === 'frasco' || acao.tipo === 'critico' || !acao.golpes.length) return false;
    return rel >= acao.golpes[acao.golpes.length - 1].em + 120;
}

// Diz se a acao pode ser usada agora. Retorna null quando pode, ou o motivo.
export function motivoBloqueio(estado, tipo) {
    const { player, boss, t } = estado;
    if (estado.status !== 'luta') return 'fora-de-luta';
    if (player.hp <= 0) return 'morto';
    if (player.acao && !(tipo === 'esquiva' && podeCancelarEmEsquiva(player.acao, t))) return 'ocupado';
    if (player.atordoadoAte > t) return 'atordoado';
    const exausto = player.exaustoAte > t;
    if (tipo === 'frasco') return player.frascos > 0 ? null : 'sem-frascos';
    if (exausto) return 'exausto';
    if (tipo === 'critico' && !(boss.estado === 'vulneravel' && boss.vulneravelAte > t)) return 'sem-abertura';
    const def = definicaoDaAcao(estado, tipo);
    if (!def) return 'invalida';
    if (def.fp && player.fp < def.fp) return 'sem-fp';
    if (def.custo && player.stamina <= 0) return 'sem-stamina';
    return null;
}

function gastarStamina(estado, custo) {
    const { player, t } = estado;
    if (!custo) return;
    player.stamina -= custo;
    if (player.stamina <= 0) {
        player.stamina = 0;
        player.exaustoAte = t + DURACAO_EXAUSTAO;
        player.guardando = false;
        emitir(estado, { tipo: 'texto', alvo: 'jogador', texto: 'SEM FÔLEGO', variante: 'perigo' });
        registrar(estado, '💨', 'Sua stamina acabou. Você está vulnerável.', 'perigo');
    }
}

export function executarAcao(estado, tipo) {
    const motivo = motivoBloqueio(estado, tipo);
    if (motivo) {
        if (motivo === 'sem-fp') emitir(estado, { tipo: 'texto', alvo: 'jogador', texto: 'FP insuficiente', variante: 'neutro' });
        if (motivo === 'sem-frascos') emitir(estado, { tipo: 'texto', alvo: 'jogador', texto: 'Sem frascos', variante: 'neutro' });
        return false;
    }

    const { player, boss, t, build } = estado;
    const def = definicaoDaAcao(estado, tipo);
    const acao = {
        id: ++estado.seq,
        tipo,
        nome: def.nome,
        inicio: t,
        duracao: def.duracao,
        golpes: (def.golpes || []).map((golpe) => ({ ...golpe, aplicado: false })),
        iframes: def.iframes || null,
        superArmadura: Boolean(def.superArmadura),
        conjuracao: Boolean(def.conjuracao),
        distancia: Boolean(def.distancia),
        contra: false,
    };

    if (player.acao) {
        // Cancelando a recuperacao (so chega aqui se motivoBloqueio permitiu)
        if (player.acao.tipo === 'esquiva') {
            player.ultimaEsquivaFim = t;
            player.ultimaEsquivaUtil = Boolean(player.acao.evadiu);
        }
        player.ultimaAcaoFim = t;
    }

    if (tipo === 'esquiva') {
        acao.iframes = build.esquiva.iframes;
        // Esquiva emendada a outra que nao evitou nada nao pode ser perfeita:
        // apertar sem parar nao funciona, mas encadear esquivas certas num combo sim.
        acao.semPerfeita = t - player.ultimaEsquivaFim < 260 && !player.ultimaEsquivaUtil;
        gastarStamina(estado, build.esquiva.custo);
    } else if (tipo === 'parry') {
        acao.janelaParry = [build.parry.inicio, build.parry.inicio + build.parry.janela];
        gastarStamina(estado, build.parry.custo);
    } else if (tipo === 'frasco') {
        acao.curaEm = FRASCO.curaEm;
        player.frascos -= 1;
        estado.metricas.frascosUsados += 1;
        registrar(estado, '⚱', 'Você bebeu do frasco.');
    } else {
        if (tipo === 'critico') {
            const golpe = CRITICO.golpes[0].em;
            boss.vulneravelAte = Math.max(boss.vulneravelAte, t + golpe + 60);
            boss.proximaAcaoEm = Math.max(boss.proximaAcaoEm, t + CRITICO.duracao + 400);
        }
        if (['rapido', 'pesado', 'habilidade'].includes(tipo) && player.contraAte > t) {
            acao.contra = true;
            player.contraAte = 0;
        }
        if (def.fp) player.fp = Math.max(0, player.fp - def.fp);
        gastarStamina(estado, def.custo);
        if (tipo === 'habilidade') registrar(estado, '✦', `${def.nome}!`, 'habilidade');
    }

    player.guardando = false;
    player.acao = acao;
    return true;
}

export function definirGuarda(estado, guardando) {
    const { player, t } = estado;
    player.guardando = Boolean(guardando) && estado.status === 'luta' && player.hp > 0 && player.exaustoAte <= t;
}

/* ---------- dano no jogador ---------- */

function aplicarDanoJogador(estado, valor, { bloqueado = false, dot = false } = {}) {
    const { player, boss, chefe, metricas } = estado;
    const dano = Math.max(1, Math.round(valor));
    player.hp = Math.max(0, player.hp - dano);
    metricas.danoRecebido += dano;
    if (!dot) metricas.golpesSofridos += 1;
    emitir(estado, { tipo: 'dano', alvo: 'jogador', valor: dano, variante: bloqueado ? 'bloqueado' : dot ? 'dot' : 'normal' });
    if (!dot && !bloqueado) {
        player.atingidoId = ++estado.seq;
        if (dano >= 320) tremer(estado);
    }

    if (!dot && !bloqueado && chefe.curaPorGolpe && boss.hp > 0 && boss.estado !== 'transicao') {
        const cura = Math.round(dano * chefe.curaPorGolpe);
        boss.hp = Math.min(boss.hpMax, boss.hp + cura);
        emitir(estado, { tipo: 'cura', alvo: 'boss', valor: cura });
    }

    if (player.hp <= 0) {
        player.acao = null;
        player.guardando = false;
        player.dots = [];
        boss.acao = null;
        boss.estado = 'idle';
        boss.comportamento = 'Vitoriosa';
        estado.status = 'morte';
        registrar(estado, '☠', 'Você morreu.', 'perigo');
    }
}

function acumularNoJogador(estado, status) {
    const { player, t } = estado;
    for (const [id, valor] of Object.entries(status || {})) {
        const registro = player.status[id] || (player.status[id] = { acumulo: 0, limiar: LIMIAR_PODRIDAO_JOGADOR });
        registro.acumulo += valor;
        if (registro.acumulo >= registro.limiar) {
            registro.acumulo = 0;
            player.dots = [...player.dots, { status: id, porSegundo: Math.round(player.hpMax * 0.025), ate: t + 8000, proximoTick: t + 1000 }];
            emitir(estado, { tipo: 'texto', alvo: 'jogador', texto: `${STATUS[id]?.rotulo || id} ativada`.toUpperCase(), variante: 'perigo' });
            registrar(estado, STATUS[id]?.icone || '✿', `${STATUS[id]?.rotulo || id} tomou conta de você.`, 'perigo');
        }
    }
}

function resolverGolpeNoJogador(estado, golpe, momento) {
    const { player, boss, build, chefe, metricas } = estado;
    if (player.hp <= 0) return;

    const fase = faseAtual(chefe, boss);
    const danoBase = golpe.dano * fase.dano;
    const acao = player.acao;
    const ativa = acao && momento <= acao.inicio + acao.duracao;
    const rel = ativa ? momento - acao.inicio : -1;

    // 1. Invulnerabilidade (esquiva ou habilidade com i-frames)
    if (ativa && acao.iframes && rel >= acao.iframes[0] && rel <= acao.iframes[1]) {
        acao.evadiu = true;
        if (acao.tipo === 'esquiva') {
            const perfeita = !acao.semPerfeita && !acao.perfeitaUsada && rel <= acao.iframes[0] + build.esquiva.perfeita;
            if (perfeita) {
                acao.perfeitaUsada = true;
                metricas.perfectDodges += 1;
                player.contraAte = momento + JANELA_CONTRA;
                player.stamina = Math.min(player.staminaMax, player.stamina + build.esquiva.custo * 0.6);
                estado.lentoAte = estado.t + 280;
                emitir(estado, { tipo: 'texto', alvo: 'jogador', texto: 'PERFECT DODGE', variante: 'ouro' });
                registrar(estado, '↩️', 'PERFECT DODGE — janela de contra-ataque!', 'ouro');
            } else {
                metricas.esquivas += 1;
                emitir(estado, { tipo: 'texto', alvo: 'jogador', texto: 'Esquivou', variante: 'neutro' });
            }
        } else {
            emitir(estado, { tipo: 'texto', alvo: 'jogador', texto: 'Evitado', variante: 'neutro' });
        }
        return;
    }

    // 2. Parry
    if (ativa && acao.tipo === 'parry' && rel >= acao.janelaParry[0] && rel <= acao.janelaParry[1]) {
        if (golpe.aparavel !== false) {
            metricas.parries += 1;
            boss.acao = null;
            boss.fila = [];
            boss.estado = 'vulneravel';
            boss.comportamento = 'Desequilibrada';
            boss.vulneravelAte = momento + chefe.vulneravelDuracao;
            boss.proximaAcaoEm = boss.vulneravelAte + 400;
            boss.postura = boss.posturaMax;
            player.acao = null;
            estado.lentoAte = estado.t + 360;
            tremer(estado);
            emitir(estado, { tipo: 'texto', alvo: 'boss', texto: 'PARRY PERFEITO', variante: 'ouro' });
            emitir(estado, { tipo: 'impacto', alvo: 'jogador', variante: 'faisca' });
            registrar(estado, '✦', `PARRY PERFEITO — ${chefe.nomeCurto} está vulnerável!`, 'ouro');
            return;
        }
        emitir(estado, { tipo: 'texto', alvo: 'jogador', texto: 'Não pode ser aparado', variante: 'perigo' });
    }

    // 3. Bloqueio
    if (!acao && player.guardando && !golpe.ignoraBloqueio && player.exaustoAte <= momento) {
        const reducao = build.bloqueio.reducao * (golpe.perfuraGuarda ?? 1);
        player.stamina -= danoBase * 0.09 * build.bloqueio.custoMult;
        player.ultimaAcaoFim = momento;
        emitir(estado, { tipo: 'impacto', alvo: 'jogador', variante: 'faisca' });
        if (player.stamina <= 0) {
            player.stamina = 0;
            player.guardando = false;
            player.exaustoAte = momento + DURACAO_EXAUSTAO + 300;
            player.atordoadoAte = momento + DURACAO_ATORDOADO * 2;
            emitir(estado, { tipo: 'texto', alvo: 'jogador', texto: 'GUARDA QUEBRADA', variante: 'perigo' });
            registrar(estado, '🛡', 'Sua guarda foi quebrada!', 'perigo');
            aplicarDanoJogador(estado, danoBase * (1 - build.defesa) * (1 - reducao * 0.5), { bloqueado: true });
        } else {
            registrar(estado, '🛡', 'Golpe bloqueado.');
            aplicarDanoJogador(estado, danoBase * (1 - build.defesa) * (1 - reducao), { bloqueado: true });
        }
        return;
    }

    // 4. Acerto em cheio
    let mult = 1 - build.defesa;
    if (player.exaustoAte > momento) mult *= 1.2;
    if (ativa && acao.conjuracao) mult *= 1.3;
    if (!(ativa && acao.superArmadura)) {
        player.acao = null;
        player.atordoadoAte = momento + DURACAO_ATORDOADO;
    }
    emitir(estado, { tipo: 'impacto', alvo: 'jogador', variante: golpe.ignoraBloqueio ? 'explosao' : 'corte' });
    const dano = Math.max(1, Math.round(danoBase * mult));
    registrar(estado, '🩸', `${boss.acao?.def.nome || chefe.nomeCurto} te atingiu: -${dano} HP`, 'dano');
    aplicarDanoJogador(estado, dano);
    if (player.hp > 0) acumularNoJogador(estado, golpe.status);
}

/* ---------- dano no chefe ---------- */

function iniciarTransicao(estado) {
    const { boss, chefe, t } = estado;
    const fase = chefe.fases[1];
    boss.fase = 2;
    boss.estado = 'transicao';
    boss.comportamento = 'Despertando';
    boss.acao = null;
    boss.fila = [];
    boss.historicoPadroes = [];
    boss.postura = 0;
    boss.vulneravelAte = 0;
    boss.transicaoAte = t + DURACAO_TRANSICAO;
    boss.proximaAcaoEm = boss.transicaoAte + 500;
    tremer(estado);
    emitir(estado, { tipo: 'fase', alvo: 'arena', texto: fase.nome, valor: 2 });
    registrar(estado, '❀', `FASE 2 — ${fase.nome}`, 'fase');
}

function derrotarChefe(estado) {
    const { boss, player, chefe, t } = estado;
    boss.hp = 0;
    boss.estado = 'morto';
    boss.comportamento = 'Derrotada';
    boss.acao = null;
    boss.dots = [];
    player.dots = [];
    estado.status = 'finalizando';
    estado.statusAte = t + DURACAO_FINAL;
    estado.lentoAte = t + 900;
    tremer(estado);
    registrar(estado, '🏆', `${chefe.nomeCurto} foi derrotada!`, 'ouro');
}

function aplicarDanoChefe(estado, valor, { variante = 'normal', status = null } = {}) {
    const { boss, chefe, metricas } = estado;
    if (boss.hp <= 0) return;
    const dano = Math.max(1, Math.round(valor));
    boss.hp = Math.max(0, boss.hp - dano);
    metricas.danoCausado += dano;
    metricas.maiorGolpe = Math.max(metricas.maiorGolpe, dano);
    emitir(estado, { tipo: 'dano', alvo: 'boss', valor: dano, variante, status });

    const proxima = chefe.fases[boss.fase];
    if (boss.hp <= 0) derrotarChefe(estado);
    else if (proxima && boss.hp <= boss.hpMax * proxima.limiar) iniciarTransicao(estado);
}

function acumularNoChefe(estado, id, valor) {
    const { boss, chefe, t } = estado;
    const limiarBase = chefe.resistencias?.[id] ?? 300;
    if (!Number.isFinite(limiarBase)) {
        if (!boss.imunidadesAvisadas.includes(id)) {
            boss.imunidadesAvisadas = [...boss.imunidadesAvisadas, id];
            emitir(estado, { tipo: 'texto', alvo: 'boss', texto: `Imune a ${STATUS[id]?.rotulo || id}`, variante: 'neutro' });
            registrar(estado, '✕', `${chefe.nomeCurto} é imune a ${STATUS[id]?.rotulo || id}.`);
        }
        return;
    }
    const atual = boss.status[id] || { acumulo: 0, limiar: limiarBase };
    const registro = { ...atual, acumulo: atual.acumulo + valor };
    boss.status = { ...boss.status, [id]: registro };
    if (registro.acumulo < registro.limiar) return;

    boss.status = { ...boss.status, [id]: { acumulo: 0, limiar: Math.round(registro.limiar * AUMENTO_LIMIAR_APOS_DISPARO), disparadoEm: t } };
    const definicao = STATUS[id];
    const efeito = definicao.disparo(boss);
    emitir(estado, { tipo: 'impacto', alvo: 'boss', variante: 'status', status: id });
    emitir(estado, { tipo: 'texto', alvo: 'boss', texto: `${definicao.rotulo.toUpperCase()} ATIVADO`, variante: 'status', status: id });
    registrar(estado, definicao.icone, `${definicao.rotulo} ativado!${efeito.dano ? ` +${efeito.dano} de dano` : ''}`, 'status');
    if (efeito.dot) boss.dots = [...boss.dots, { status: id, porSegundo: efeito.dot.porSegundo, ate: t + efeito.dot.duracao, proximoTick: t + 1000 }];
    if (efeito.quebraDefesa) boss.quebraDefesa = { fator: efeito.quebraDefesa.fator, ate: t + efeito.quebraDefesa.duracao };
    if (efeito.dano) {
        tremer(estado);
        aplicarDanoChefe(estado, efeito.dano, { variante: 'status', status: id });
    }
}

// Formula propria: (dano bruto - defesa do tipo) x multiplicador da arma, com piso de 20%.
export function calcularDano({ base, mult = 1, defesa = 0, multArma = 1, variacao = 1, bonus = 1 }) {
    const bruto = base * mult * bonus;
    return Math.round(Math.max(bruto * 0.2, bruto - defesa) * multArma * variacao);
}

function resolverGolpeNoChefe(estado, golpe, acao, momento) {
    const { boss, chefe, build, metricas, rng } = estado;
    if (boss.hp <= 0) return;
    if (boss.estado === 'transicao') {
        emitir(estado, { tipo: 'texto', alvo: 'boss', texto: 'Imune', variante: 'neutro' });
        return;
    }
    if (boss.acao?.def.tipo === 'recuo' && !acao.distancia) {
        emitir(estado, { tipo: 'texto', alvo: 'boss', texto: 'Errou', variante: 'neutro' });
        registrar(estado, '·', `${chefe.nomeCurto} recuou e você errou o golpe.`);
        return;
    }

    let defesa = chefe.defesa[build.tipoDano] ?? 120;
    if (boss.quebraDefesa && boss.quebraDefesa.ate > momento) defesa *= boss.quebraDefesa.fator;
    const vulneravel = boss.estado === 'vulneravel';
    const bonus = (acao.contra ? BONUS_CONTRA : 1) * (vulneravel && !golpe.critico ? 1.2 : 1);
    const dano = calcularDano({ base: build.base, mult: golpe.mult, defesa, multArma: build.multArma, variacao: rng.entre(0.94, 1.06), bonus });

    const variante = golpe.critico ? 'critico' : acao.contra ? 'contra' : ['pesado', 'habilidade'].includes(acao.tipo) ? 'pesado' : 'normal';
    emitir(estado, { tipo: 'impacto', alvo: 'boss', variante: build.tipoDano !== 'fisico' && !golpe.critico ? 'magia' : variante });
    boss.atingidoId = ++estado.seq;
    boss.ultimoGolpeRecebido = momento;
    boss.golpesRecentes = [...boss.golpesRecentes.slice(-5), momento];

    const icone = golpe.critico ? '✦' : acao.contra ? '↩️' : '⚔️';
    const rotulo = golpe.critico ? 'ATAQUE CRÍTICO' : acao.contra ? 'Contra-ataque' : acao.nome;
    registrar(estado, icone, `${rotulo}: -${dano} HP`, golpe.critico ? 'ouro' : 'ataque');
    if (golpe.critico || variante === 'pesado') tremer(estado);

    if (golpe.critico) {
        metricas.criticos += 1;
        boss.vulneravelAte = momento;
        boss.estado = 'idle';
        boss.postura = 0;
        boss.comportamento = 'Recompondo-se';
        boss.proximaAcaoEm = momento + 900;
    }

    aplicarDanoChefe(estado, dano, { variante });
    if (boss.hp <= 0 || boss.estado === 'transicao') return;

    if (!vulneravel && !golpe.critico && golpe.postura) {
        boss.postura += golpe.postura * (acao.contra ? 1.3 : 1);
        if (boss.postura >= boss.posturaMax) {
            boss.postura = boss.posturaMax;
            boss.estado = 'vulneravel';
            boss.comportamento = 'Postura quebrada';
            boss.acao = null;
            boss.fila = [];
            boss.vulneravelAte = momento + chefe.vulneravelDuracao;
            boss.proximaAcaoEm = boss.vulneravelAte + 400;
            tremer(estado);
            emitir(estado, { tipo: 'texto', alvo: 'boss', texto: 'POSTURA QUEBRADA', variante: 'ouro' });
            registrar(estado, '✦', 'Postura quebrada! Ataque crítico disponível.', 'ouro');
        }
    }

    for (const [id, valor] of Object.entries(build.status || {})) {
        acumularNoChefe(estado, id, valor * (golpe.acumulo ?? 1) * (acao.contra ? 1.3 : 1));
        if (boss.hp <= 0 || boss.estado === 'transicao') return;
    }
}

/* ---------- chefe ---------- */

function iniciarAtaqueChefe(estado) {
    const { boss, chefe, rng, t } = estado;
    const { id, reacao } = escolherProximoAtaque(estado, rng);
    const def = chefe.ataques[id];
    const velocidade = faseAtual(chefe, boss).velocidade;
    boss.acao = {
        id: ++estado.seq,
        ataqueId: id,
        def,
        inicio: t,
        duracao: def.duracao * velocidade,
        golpes: def.golpes.map((golpe) => ({ ...golpe, em: golpe.em * velocidade, aplicado: false })),
    };
    boss.estado = def.tipo === 'recuo' ? 'recuo' : def.tipo === 'pausa' ? 'idle' : 'atacando';
    boss.comportamento = reacao ? 'Punindo sua abertura' : def.comportamento;
    if (!def.tipo) registrar(estado, def.perigo ? '⚠' : '⚔️', `${chefe.nomeCurto} iniciou ${def.nome}`, def.perigo ? 'perigo' : 'chefe');
}

function intervaloEntreAtaques(estado) {
    const { chefe, boss, rng } = estado;
    const [min, max] = faseAtual(chefe, boss).intervalo || chefe.intervalo;
    return rng.entre(min, max);
}

function processarDots(estado, alvo, t, aplicar) {
    if (!alvo.dots.length) return;
    for (const dot of alvo.dots) {
        while (dot.proximoTick <= t && dot.proximoTick <= dot.ate) {
            dot.proximoTick += 1000;
            aplicar(dot);
        }
    }
    const ativos = alvo.dots.filter((dot) => dot.ate > t);
    if (ativos.length !== alvo.dots.length) alvo.dots = ativos;
}

/* ---------- loop ---------- */

export function avancar(estado, dtReal) {
    const dt = Math.min(Math.max(dtReal, 0), 50);
    estado.relogio += dt;
    if (estado.eventos.length && estado.relogio - estado.eventos[0].relogio > DURACAO_EVENTO) {
        estado.eventos = estado.eventos.filter((evento) => estado.relogio - evento.relogio <= DURACAO_EVENTO);
    }
    if (estado.status === 'vitoria' || estado.status === 'morte') return estado;

    const escala = estado.lentoAte > estado.t ? 0.35 : 1;
    const t0 = estado.t;
    const t1 = t0 + dt * escala;
    estado.t = t1;
    const { player, boss, build, chefe } = estado;

    if (estado.status === 'intro') {
        if (t1 >= estado.statusAte) {
            estado.status = 'luta';
            registrar(estado, '⚔️', `A luta contra ${chefe.nomeCurto} começou.`, 'chefe');
        }
        return estado;
    }

    // Golpes do chefe e do jogador, em ordem cronologica
    const pendentes = [];
    if (boss.acao) {
        for (const golpe of boss.acao.golpes) {
            const momento = boss.acao.inicio + golpe.em;
            if (!golpe.aplicado && momento <= t1) pendentes.push({ momento, lado: 'boss', golpe, acao: boss.acao });
        }
    }
    if (player.acao) {
        for (const golpe of player.acao.golpes) {
            const momento = player.acao.inicio + golpe.em;
            if (!golpe.aplicado && momento <= t1) pendentes.push({ momento, lado: 'jogador', golpe, acao: player.acao });
        }
    }
    pendentes.sort((a, b) => a.momento - b.momento);
    for (const item of pendentes) {
        if (estado.status === 'morte') break;
        if (item.lado === 'boss' && boss.acao !== item.acao) continue;
        if (item.lado === 'jogador' && player.acao !== item.acao) continue;
        item.golpe.aplicado = true;
        if (item.lado === 'boss') resolverGolpeNoJogador(estado, item.golpe, item.momento);
        else resolverGolpeNoChefe(estado, item.golpe, item.acao, item.momento);
    }
    if (estado.status === 'morte') return estado;

    // Frasco
    const acao = player.acao;
    if (acao?.tipo === 'frasco' && !acao.curado && t1 >= acao.inicio + acao.curaEm) {
        acao.curado = true;
        const cura = Math.round(player.hpMax * FRASCO.cura);
        player.hp = Math.min(player.hpMax, player.hp + cura);
        emitir(estado, { tipo: 'cura', alvo: 'jogador', valor: cura });
    }

    // Fim das acoes
    if (player.acao && t1 >= player.acao.inicio + player.acao.duracao) {
        const fim = player.acao.inicio + player.acao.duracao;
        if (player.acao.tipo === 'esquiva') {
            player.ultimaEsquivaFim = fim;
            player.ultimaEsquivaUtil = Boolean(player.acao.evadiu);
        }
        player.ultimaAcaoFim = fim;
        player.acao = null;
    }
    if (boss.acao && t1 >= boss.acao.inicio + boss.acao.duracao) {
        boss.acao = null;
        if (boss.estado === 'atacando' || boss.estado === 'recuo') boss.estado = 'idle';
        boss.comportamento = 'Observando';
        boss.proximaAcaoEm = t1 + intervaloEntreAtaques(estado);
    }
    if (boss.acao?.def.tipo === 'pausa' && devePunirDuranteBrecha(estado)) {
        boss.acao = null;
        boss.proximaAcaoEm = t1;
    }
    if (boss.estado === 'transicao' && t1 >= boss.transicaoAte) {
        boss.estado = 'idle';
        boss.comportamento = 'Furiosa';
    }
    if (boss.estado === 'vulneravel' && t1 >= boss.vulneravelAte) {
        boss.estado = 'idle';
        boss.postura = 0;
        boss.comportamento = 'Recompondo-se';
    }

    if (estado.status === 'luta' && !boss.acao && boss.estado === 'idle' && t1 >= boss.proximaAcaoEm) {
        iniciarAtaqueChefe(estado);
    }

    // Regeneracao
    const segundos = (t1 - t0) / 1000;
    if (!player.acao && t1 - player.ultimaAcaoFim > ATRASO_REGEN && player.stamina < player.staminaMax) {
        const fator = (player.guardando ? 0.35 : 1) * (player.exaustoAte > t1 ? 0.6 : 1);
        player.stamina = Math.min(player.staminaMax, player.stamina + build.staminaRegen * fator * segundos);
    }
    if (player.fp < player.fpMax) player.fp = Math.min(player.fpMax, player.fp + build.fpRegen * segundos);
    if (player.guardando && player.exaustoAte > t1) player.guardando = false;
    if (boss.estado !== 'vulneravel' && boss.postura > 0 && t1 - boss.ultimoGolpeRecebido > 2000) {
        boss.postura = Math.max(0, boss.postura - chefe.posturaRegen * segundos);
    }
    if (boss.quebraDefesa && boss.quebraDefesa.ate <= t1) boss.quebraDefesa = null;

    // Status e danos continuos
    let mudouStatus = false;
    const statusChefe = {};
    for (const [id, registro] of Object.entries(boss.status)) {
        const acumulo = Math.max(0, registro.acumulo - DECAIMENTO_STATUS_POR_SEGUNDO * segundos);
        if (acumulo !== registro.acumulo) mudouStatus = true;
        statusChefe[id] = { ...registro, acumulo };
    }
    if (mudouStatus) boss.status = statusChefe;
    for (const registro of Object.values(player.status)) {
        registro.acumulo = Math.max(0, registro.acumulo - DECAIMENTO_STATUS_POR_SEGUNDO * segundos);
    }
    processarDots(estado, boss, t1, (dot) => aplicarDanoChefe(estado, dot.porSegundo, { variante: 'dot', status: dot.status }));
    processarDots(estado, player, t1, (dot) => aplicarDanoJogador(estado, dot.porSegundo, { dot: true }));

    if (estado.status === 'finalizando' && t1 >= estado.statusAte) estado.status = 'vitoria';
    return estado;
}

export function resumoCombate(estado) {
    return {
        vitoria: estado.status === 'vitoria' || estado.status === 'finalizando',
        chefeId: estado.chefe.id,
        chefeNome: estado.chefe.nome,
        buildNome: estado.build.nome,
        tempo: Math.round(tempoDeLuta(estado)),
        ...estado.metricas,
    };
}
