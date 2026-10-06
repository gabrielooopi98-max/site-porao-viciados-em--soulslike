import { STATUS } from './data/status.js';

// Posicao base (em % da arena) de cada alvo + deslocamento estavel por id,
// para numeros seguidos nao ficarem um em cima do outro.
const POSICAO = {
    boss: { x: 72, y: 30 },
    jogador: { x: 24, y: 40 },
    arena: { x: 50, y: 30 },
};

function deslocamento(id) {
    return { x: ((id * 37) % 9) - 4, y: ((id * 53) % 7) - 3 };
}

function conteudo(evento) {
    if (evento.tipo === 'cura') return `+${evento.valor}`;
    if (evento.tipo === 'texto') return evento.texto;
    if (evento.alvo === 'jogador') return `-${evento.valor}`;
    if (evento.variante === 'critico') return `✦ -${evento.valor}`;
    if (evento.variante === 'status') return `+${evento.valor}`;
    if (evento.variante === 'dot') return `-${evento.valor}`;
    return `⚔ -${evento.valor}`;
}

export default function DamagePopup({ eventos }) {
    return (
        <div className="rpg-popups" aria-hidden="true">
            {eventos.map((evento) => {
                if (evento.tipo === 'impacto') {
                    const base = POSICAO[evento.alvo] || POSICAO.arena;
                    return (
                        <span
                            key={evento.id}
                            className={`rpg-impacto rpg-impacto--${evento.variante} ${evento.status ? `rpg-impacto--${evento.status}` : ''}`}
                            style={{ left: `${base.x - (evento.alvo === 'boss' ? 2 : -2)}%`, top: `${base.y + 16}%` }}
                        >
                            <svg viewBox="0 0 100 100">
                                <path d="M8 78 Q50 46 94 14" />
                                {(evento.variante === 'pesado' || evento.variante === 'critico') && <path d="M14 92 Q56 58 98 34" />}
                            </svg>
                        </span>
                    );
                }
                if (!['dano', 'cura', 'texto'].includes(evento.tipo)) return null;
                const base = POSICAO[evento.alvo] || POSICAO.arena;
                const offset = deslocamento(evento.id);
                const grande = evento.variante === 'ouro' || evento.variante === 'critico';
                const cor = evento.status ? STATUS[evento.status]?.cor : undefined;
                return (
                    <span
                        key={evento.id}
                        className={`rpg-popup rpg-popup--${evento.tipo} rpg-popup--${evento.alvo} rpg-popup--${evento.variante || 'normal'}`}
                        style={{
                            left: `${base.x + (grande ? 0 : offset.x)}%`,
                            top: `${base.y + (grande ? -8 : offset.y)}%`,
                            ...(cor ? { '--cor-status': cor } : {}),
                        }}
                    >
                        {evento.variante === 'status' && evento.tipo === 'dano' && <small>{STATUS[evento.status]?.rotulo}</small>}
                        {conteudo(evento)}
                    </span>
                );
            })}
        </div>
    );
}
