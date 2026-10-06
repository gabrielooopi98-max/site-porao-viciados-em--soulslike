import { formatarTempo } from './engine/progressao.js';

export default function CombatLog({ log }) {
    const recentes = log.slice(-14).reverse();
    return (
        <details className="rpg-log" open>
            <summary>Registro de combate</summary>
            <ol>
                {recentes.map((linha) => (
                    <li key={linha.id} className={`rpg-log-linha rpg-log-linha--${linha.tipo}`}>
                        <span className="rpg-log-icone" aria-hidden="true">{linha.icone}</span>
                        <span className="rpg-log-texto">{linha.texto}</span>
                        <time>{formatarTempo(linha.t)}</time>
                    </li>
                ))}
            </ol>
        </details>
    );
}
