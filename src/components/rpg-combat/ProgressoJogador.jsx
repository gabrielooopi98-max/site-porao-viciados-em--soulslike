import { CHEFES } from './data/chefes/index.js';
import { CONQUISTAS, formatarTempo, totalChefesDerrotados, xpParaNivel } from './engine/progressao.js';

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

export default function ProgressoJogador({ progresso, convidado }) {
    const necessario = xpParaNivel(progresso.nivel);
    const melhores = CHEFES.filter((chefe) => progresso.melhorTempo[chefe.id]);
    return (
        <aside className="rpg-progresso" aria-labelledby="rpg-progresso-titulo">
            <span className="rpg-kicker">Sua jornada</span>
            <h2 id="rpg-progresso-titulo">Nível {progresso.nivel}</h2>
            <div className="rpg-progresso-xp">
                <div className="rpg-barra rpg-barra--xp">
                    <div className="rpg-barra-trilho" role="meter" aria-label="Experiência" aria-valuemin={0} aria-valuemax={necessario} aria-valuenow={progresso.xp}>
                        <span className="rpg-barra-preenchimento" style={{ width: `${(progresso.xp / necessario) * 100}%` }} />
                    </div>
                </div>
                <span>{numero(progresso.xp)} / {numero(necessario)} XP</span>
            </div>
            <dl className="rpg-progresso-numeros">
                <div><dt>Chefes derrotados</dt><dd>{totalChefesDerrotados(progresso)}</dd></div>
                <div><dt>Vitórias</dt><dd>{progresso.vitorias}</dd></div>
                <div><dt>Derrotas</dt><dd>{progresso.derrotas}</dd></div>
                <div><dt>Souls</dt><dd>{numero(progresso.souls)}</dd></div>
                <div><dt>Maior dano</dt><dd>{numero(progresso.maiorDano)}</dd></div>
                <div><dt>Perfect Dodges</dt><dd>{progresso.perfectDodges}</dd></div>
                <div><dt>Parries</dt><dd>{progresso.parries}</dd></div>
                <div><dt>Críticos</dt><dd>{progresso.criticos}</dd></div>
            </dl>
            {melhores.length > 0 && (
                <ul className="rpg-progresso-recordes">
                    {melhores.map((chefe) => (
                        <li key={chefe.id}><span>Melhor tempo · {chefe.nomeCurto}</span><strong>{formatarTempo(progresso.melhorTempo[chefe.id])}</strong></li>
                    ))}
                </ul>
            )}
            <h3>Conquistas</h3>
            <ul className="rpg-conquistas">
                {CONQUISTAS.map((conquista) => {
                    const obtida = progresso.conquistas.includes(conquista.id);
                    return (
                        <li key={conquista.id} className={obtida ? 'rpg-conquista--obtida' : ''} title={conquista.descricao}>
                            <span aria-hidden="true">{obtida ? '✦' : '◇'}</span>
                            <div><strong>{conquista.nome}</strong><small>{conquista.descricao}</small></div>
                        </li>
                    );
                })}
            </ul>
            {convidado && <p className="rpg-progresso-aviso">Entre na sua conta para manter o progresso ligado ao seu perfil.</p>}
        </aside>
    );
}
