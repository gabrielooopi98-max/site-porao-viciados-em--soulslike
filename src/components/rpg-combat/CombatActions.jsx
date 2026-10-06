import { TECLAS } from './useCombate';

const ICONES = {
    rapido: <path d="M5 19 19 5M15 5h4v4" />,
    pesado: <path d="M4 20 14 10M12 4l8 8-3 3-8-8z" />,
    habilidade: <path d="m12 3 2.6 5.6L20 9.5l-4 4 1 5.8L12 16.6 7 19.3l1-5.8-4-4 5.4-.9z" />,
    esquiva: <path d="M4 15c3-6 9-8 15-5M15 6l4 4-4 4" />,
    bloqueio: <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" />,
    parry: <path d="M4 12h5l2-5 2 10 2-5h5" />,
    critico: <path d="m5 5 14 14M19 5 5 19M9 3h-4v4M15 21h4v-4" />,
    frasco: <path d="M10 3h4M10 3v5L6 16a4 4 0 0 0 3.6 5h4.8A4 4 0 0 0 18 16l-4-8V3" />,
};

function custoTexto(def) {
    if (!def) return '';
    const partes = [];
    if (def.custo) partes.push(`${def.custo} ST`);
    if (def.fp) partes.push(`${def.fp} FP`);
    return partes.join(' · ');
}

export default function CombatActions({ build, player, motivo, agir, guardar, vulneravel }) {
    const botoes = [
        { tipo: 'rapido', nome: build.rapido.nome, detalhe: custoTexto(build.rapido), rotulo: 'Ataque rápido' },
        { tipo: 'pesado', nome: build.pesado.nome, detalhe: custoTexto(build.pesado), rotulo: 'Ataque pesado' },
        { tipo: 'habilidade', nome: build.habilidade.nome, detalhe: custoTexto(build.habilidade), rotulo: 'Habilidade' },
        { tipo: 'esquiva', nome: 'Esquivar', detalhe: custoTexto(build.esquiva), rotulo: 'Esquivar', destaque: true },
        { tipo: 'bloqueio', nome: 'Bloquear', detalhe: 'Segure', rotulo: 'Bloquear (segurar)' },
        { tipo: 'parry', nome: 'Parry', detalhe: custoTexto(build.parry), rotulo: 'Parry' },
        { tipo: 'critico', nome: 'Crítico', detalhe: vulneravel ? 'Abertura!' : 'Após parry', rotulo: 'Ataque crítico' },
        { tipo: 'frasco', nome: 'Frasco', detalhe: `${player.frascos} restantes`, rotulo: 'Beber frasco' },
    ];

    return (
        <div className="rpg-acoes" role="group" aria-label="Ações de combate">
            {botoes.map((botao) => {
                const bloqueio = motivo(botao.tipo === 'bloqueio' ? 'rapido' : botao.tipo);
                const indisponivel = ['sem-fp', 'sem-frascos', 'sem-abertura', 'exausto', 'sem-stamina', 'morto', 'fora-de-luta'].includes(bloqueio);
                const eventos = botao.tipo === 'bloqueio'
                    ? {
                        onPointerDown: (evento) => {
                            evento.preventDefault();
                            evento.currentTarget.setPointerCapture?.(evento.pointerId);
                            guardar(true);
                        },
                        onPointerUp: () => guardar(false),
                        onPointerCancel: () => guardar(false),
                        onLostPointerCapture: () => guardar(false),
                    }
                    : {
                        onPointerDown: (evento) => {
                            evento.preventDefault();
                            agir(botao.tipo);
                        },
                        onClick: (evento) => {
                            if (evento.detail === 0) agir(botao.tipo);
                        },
                    };
                return (
                    <button
                        key={botao.tipo}
                        type="button"
                        className={`rpg-acao rpg-acao--${botao.tipo} ${botao.destaque ? 'rpg-acao--destaque' : ''} ${indisponivel ? 'rpg-acao--indisponivel' : ''} ${botao.tipo === 'critico' && vulneravel ? 'rpg-acao--pronta' : ''} ${botao.tipo === 'bloqueio' && player.guardando ? 'rpg-acao--ativa' : ''}`}
                        aria-label={`${botao.rotulo} (tecla ${TECLAS[botao.tipo].rotulo})`}
                        aria-disabled={indisponivel}
                        onContextMenu={(evento) => evento.preventDefault()}
                        {...eventos}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">{ICONES[botao.tipo]}</svg>
                        <span className="rpg-acao-nome">{botao.nome}</span>
                        <span className="rpg-acao-detalhe">{botao.detalhe}</span>
                        <kbd>{TECLAS[botao.tipo].rotulo}</kbd>
                    </button>
                );
            })}
        </div>
    );
}
