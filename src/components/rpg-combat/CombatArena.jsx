import Boss from './Boss';
import DamagePopup from './DamagePopup';
import HealthBar, { StaminaBar } from './HealthBar';
import PlayerCharacter from './PlayerCharacter';
import { CenarioArena } from './Silhuetas';
import { STATUS } from './data/status.js';
import { faseAtual } from './engine/bossAI.js';
import { proximoGolpe } from './engine/leitura.js';

const ANTECEDENCIA_TELEGRAFO = 1100;
const BRASAS = Array.from({ length: 18 }, (_, i) => ({
    left: (i * 53) % 100,
    delay: (i * 0.73) % 6,
    dur: 6 + ((i * 1.7) % 5),
    size: 2 + (i % 3),
}));

// Anel que fecha no personagem ate o instante do impacto: ensina o timing.
function Telegrafo({ boss, build, t }) {
    const acao = boss.acao;
    if (!acao || acao.def.tipo) return null;
    const golpe = proximoGolpe(acao);
    if (!golpe) return null;
    const restante = acao.inicio + golpe.em - t;
    if (restante > ANTECEDENCIA_TELEGRAFO || restante < 0) return null;
    const progresso = 1 - restante / ANTECEDENCIA_TELEGRAFO;
    const perigo = golpe.aparavel === false || golpe.ignoraBloqueio;
    const naJanela = restante <= build.esquiva.perfeita;
    return (
        <div
            className={`rpg-telegrafo ${perigo ? 'rpg-telegrafo--perigo' : ''} ${naJanela ? 'rpg-telegrafo--janela' : ''}`}
            style={{ '--escala': 2.8 - 1.8 * progresso, opacity: Math.min(1, progresso * 2.2) }}
            aria-hidden="true"
        >
            <span className="rpg-telegrafo-anel" />
            <span className="rpg-telegrafo-alvo" />
        </div>
    );
}

function HudJogador({ player, build, t }) {
    const exausto = player.exaustoAte > t;
    const podridao = player.status.podridao;
    return (
        <div className="rpg-hud rpg-hud--jogador">
            <div className="rpg-hud-identidade">
                <strong>{build.nome}</strong>
                <span>{build.rotuloArquetipo} · Nv. {build.nivel} · {build.arma.nome}</span>
            </div>
            <HealthBar valor={player.hp} max={player.hpMax} tipo="hp" rotulo="HP" mostrarValor alerta={player.hp < player.hpMax * 0.25} />
            <StaminaBar valor={player.stamina} max={player.staminaMax} exausto={exausto} />
            {player.fpMax > 0 && <HealthBar valor={player.fp} max={player.fpMax} tipo="fp" rotulo="FP" />}
            <div className="rpg-hud-chips">
                <span className="rpg-chip" title="Frascos de cura">⚱ {player.frascos}</span>
                {exausto && <span className="rpg-chip rpg-chip--perigo">Sem fôlego</span>}
                {player.contraAte > t && <span className="rpg-chip rpg-chip--ouro">Contra-ataque</span>}
                {podridao?.acumulo > 0 && (
                    <span className="rpg-chip rpg-chip--status" style={{ '--cor-status': STATUS.podridao.cor }}>
                        {STATUS.podridao.icone}
                        <i style={{ width: `${(podridao.acumulo / podridao.limiar) * 100}%` }} />
                    </span>
                )}
                {player.dots.map((dot) => (
                    <span key={`${dot.status}-${dot.ate}`} className="rpg-chip rpg-chip--perigo">
                        {STATUS[dot.status]?.icone} {Math.ceil((dot.ate - t) / 1000)}s
                    </span>
                ))}
            </div>
        </div>
    );
}

function HudChefe({ boss, chefe, build, t }) {
    const fase = faseAtual(chefe, boss);
    const statusDaBuild = Object.keys(build.status || {});
    return (
        <div className="rpg-hud rpg-hud--chefe">
            <div className="rpg-hud-chefe-topo">
                <strong>{fase.nome}</strong>
                <span className="rpg-hud-fase">Fase {boss.fase}</span>
            </div>
            <HealthBar
                valor={boss.hp}
                max={boss.hpMax}
                tipo="chefe"
                marcadores={chefe.fases.slice(1).map((proxima) => proxima.limiar)}
            />
            <div className="rpg-hud-chefe-rodape">
                <HealthBar valor={boss.postura} max={boss.posturaMax} tipo="postura" rotulo="Postura" alerta={boss.estado === 'vulneravel'} />
                {statusDaBuild.map((id) => {
                    const registro = boss.status[id];
                    const imune = !Number.isFinite(chefe.resistencias?.[id] ?? 300);
                    const recente = registro?.disparadoEm && t - registro.disparadoEm < 900;
                    return (
                        <span
                            key={id}
                            className={`rpg-medidor-status ${recente ? 'rpg-medidor-status--ativado' : ''} ${imune ? 'rpg-medidor-status--imune' : ''}`}
                            style={{ '--cor-status': STATUS[id]?.cor }}
                            title={imune ? `Imune a ${STATUS[id]?.rotulo}` : STATUS[id]?.rotulo}
                        >
                            <b>{STATUS[id]?.icone}</b>
                            <i><em style={{ width: `${registro ? (registro.acumulo / registro.limiar) * 100 : 0}%` }} /></i>
                        </span>
                    );
                })}
                <span className="rpg-hud-comportamento">{boss.comportamento}</span>
            </div>
        </div>
    );
}

export default function CombatArena({ quadro }) {
    const { player, boss, build, chefe, t, status } = quadro;
    const tremor = quadro.tremorId ? (quadro.tremorId % 2 ? 'rpg-tremor-a' : 'rpg-tremor-b') : '';
    const transicao = boss.estado === 'transicao';
    return (
        <div
            className={`rpg-arena rpg-arena--fase-${boss.fase} ${transicao ? 'rpg-arena--transicao' : ''} ${status === 'finalizando' || status === 'vitoria' ? 'rpg-arena--vitoria' : ''} ${status === 'morte' ? 'rpg-arena--morte' : ''}`}
        >
            <div className={`rpg-arena-mundo ${tremor}`}>
                <div className="rpg-ceu" style={chefe.fundo ? { backgroundImage: `url(${chefe.fundo})` } : undefined} />
                <span className="rpg-lua" aria-hidden="true" />
                <CenarioArena />
                <div className="rpg-nevoa rpg-nevoa--fundo" aria-hidden="true" />
                <div className="rpg-chao" aria-hidden="true" />
                <div className="rpg-particulas" aria-hidden="true">
                    {BRASAS.map((brasa, i) => (
                        <span
                            key={i}
                            style={{ left: `${brasa.left}%`, animationDelay: `${brasa.delay}s`, animationDuration: `${brasa.dur}s`, width: brasa.size, height: brasa.size }}
                        />
                    ))}
                </div>
                <div className="rpg-palco">
                    <Telegrafo boss={boss} build={build} t={t} />
                    <PlayerCharacter player={player} build={build} t={t} />
                    <Boss boss={boss} chefe={chefe} t={t} />
                </div>
                <div className="rpg-nevoa rpg-nevoa--frente" aria-hidden="true" />
                <DamagePopup eventos={quadro.eventos} />
            </div>

            <HudJogador player={player} build={build} t={t} />
            <HudChefe boss={boss} chefe={chefe} build={build} t={t} />

            {status === 'intro' && (
                <div className="rpg-faixa rpg-faixa--intro" role="status">
                    <span>{chefe.jogo}</span>
                    <h2>{chefe.nome}</h2>
                    <p>{chefe.titulo}</p>
                </div>
            )}
            {transicao && (
                <div className="rpg-faixa rpg-faixa--fase" role="status">
                    <span>Fase {boss.fase}</span>
                    <h2>{faseAtual(chefe, boss).nome}</h2>
                    <p>O chefe entrou em sua segunda fase.</p>
                </div>
            )}
            {status === 'finalizando' && (
                <div className="rpg-faixa rpg-faixa--derrotado" role="status">
                    <h2>Chefe derrotado</h2>
                </div>
            )}
        </div>
    );
}
