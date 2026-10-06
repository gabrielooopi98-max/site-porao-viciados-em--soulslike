import CombatActions from './CombatActions';
import CombatArena from './CombatArena';
import CombatLog from './CombatLog';
import DeathScreen from './DeathScreen';
import VictoryScreen from './VictoryScreen';
import { tempoDeLuta } from './engine/combatEngine.js';
import { formatarTempo } from './engine/progressao.js';
import { useCombate } from './useCombate';
import './RPGCombat.css';

export default function RPGCombat({ build, chefe, aoTerminar, onSair }) {
    const { quadro, pausado, resultado, agir, guardar, alternarPausa, reiniciar, motivo } = useCombate({ build, chefe, aoTerminar });
    const { boss, player, status } = quadro;
    const vulneravel = boss.estado === 'vulneravel' && boss.vulneravelAte > quadro.t;

    return (
        <section className="rpg-combate" aria-label={`Batalha contra ${chefe.nome}`}>
            <div className="rpg-combate-topo">
                <button type="button" className="rpg-botao rpg-botao--discreto" onClick={onSair}>
                    <span aria-hidden="true">←</span> Sair da arena
                </button>
                <span className="rpg-cronometro" aria-label="Tempo de luta">{formatarTempo(tempoDeLuta(quadro))}</span>
                <button type="button" className="rpg-botao rpg-botao--discreto" onClick={alternarPausa} disabled={!['luta', 'intro'].includes(status)}>
                    {pausado ? 'Continuar' : 'Pausar'} <kbd>Esc</kbd>
                </button>
            </div>

            <div className="rpg-combate-palco">
                <CombatArena quadro={quadro} />
                {pausado && (
                    <div className="rpg-pausa" role="dialog" aria-modal="true" aria-labelledby="rpg-pausa-titulo">
                        <h2 id="rpg-pausa-titulo">Pausado</h2>
                        <div className="rpg-tela-final-acoes">
                            <button type="button" className="rpg-botao rpg-botao--primario" onClick={alternarPausa} autoFocus>Continuar</button>
                            <button type="button" className="rpg-botao" onClick={reiniciar}>Recomeçar luta</button>
                            <button type="button" className="rpg-botao" onClick={onSair}>Sair da arena</button>
                        </div>
                    </div>
                )}
                {status === 'vitoria' && resultado && (
                    <VictoryScreen chefe={chefe} resultado={resultado} onRepetir={reiniciar} onVoltar={onSair} />
                )}
                {status === 'morte' && resultado && (
                    <DeathScreen chefe={chefe} resultado={resultado} onTentar={reiniciar} onVoltar={onSair} />
                )}
            </div>

            <div className="rpg-combate-painel">
                <CombatActions build={build} player={player} motivo={motivo} agir={agir} guardar={guardar} vulneravel={vulneravel} />
                <CombatLog log={quadro.log} />
            </div>
            <p className="rpg-dica">
                Observe o anel prateado fechar sobre você: esquive ou apare no instante em que ele se completa.
                Anel vermelho = ataque que não pode ser aparado.
            </p>
        </section>
    );
}
