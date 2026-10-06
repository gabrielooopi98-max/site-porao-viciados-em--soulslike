import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { avancar, criarCombate, definirGuarda, executarAcao, motivoBloqueio, resumoCombate, snapshot } from './engine/combatEngine.js';

// Teclas -> acoes. Bloquear e segurar (keydown/keyup).
export const TECLAS = {
    rapido: { teclas: ['j', 'z'], rotulo: 'J' },
    pesado: { teclas: ['k', 'x'], rotulo: 'K' },
    habilidade: { teclas: ['u', 'c'], rotulo: 'U' },
    esquiva: { teclas: [' ', 'shift'], rotulo: 'Espaço' },
    parry: { teclas: ['i', 'v'], rotulo: 'I' },
    bloqueio: { teclas: ['l', 'b'], rotulo: 'L' },
    critico: { teclas: ['f'], rotulo: 'F' },
    frasco: { teclas: ['r'], rotulo: 'R' },
};

const JANELA_BUFFER = 200;
const BLOQUEIOS_COM_BUFFER = ['ocupado', 'atordoado'];

function acaoDaTecla(tecla) {
    const chave = String(tecla || '').toLowerCase();
    return Object.keys(TECLAS).find((acao) => TECLAS[acao].teclas.includes(chave));
}

// Mantem o motor do combate (mutavel, fora do React) e publica um snapshot por frame.
export function useCombate({ build, chefe, aoTerminar }) {
    const [motor, setMotor] = useState(() => criarCombate({ build, chefe }));
    const [quadro, setQuadro] = useState(() => snapshot(motor));
    const [pausado, setPausado] = useState(false);
    const [resultado, setResultado] = useState(null);
    const bufferRef = useRef({ tipo: null, ate: 0 });
    const finalizadoRef = useRef(false);

    const registrarFim = useEffectEvent((resumo) => {
        setResultado(aoTerminar?.(resumo) ?? { resumo });
    });

    useEffect(() => {
        if (pausado) return undefined;
        let quadroId;
        let ultimo = performance.now();
        const loop = (agora) => {
            avancar(motor, agora - ultimo);
            ultimo = agora;
            const buffer = bufferRef.current;
            if (buffer.tipo && (motor.relogio > buffer.ate || executarAcao(motor, buffer.tipo))) buffer.tipo = null;
            if ((motor.status === 'vitoria' || motor.status === 'morte') && !finalizadoRef.current) {
                finalizadoRef.current = true;
                registrarFim(resumoCombate(motor));
            }
            setQuadro(snapshot(motor));
            quadroId = requestAnimationFrame(loop);
        };
        quadroId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(quadroId);
    }, [motor, pausado]);

    function agir(tipo) {
        if (pausado || tipo === 'bloqueio') return;
        if (executarAcao(motor, tipo)) {
            bufferRef.current.tipo = null;
            return;
        }
        // Input apertado um pouco antes da acao anterior terminar fica guardado.
        if (BLOQUEIOS_COM_BUFFER.includes(motivoBloqueio(motor, tipo))) {
            bufferRef.current = { tipo, ate: motor.relogio + JANELA_BUFFER };
        }
    }

    function guardar(ativo) {
        if (!pausado) definirGuarda(motor, ativo);
    }

    function alternarPausa() {
        if (['luta', 'intro'].includes(motor.status)) setPausado((atual) => !atual);
    }

    const aoTeclar = useEffectEvent((evento, pressionou) => {
        if (evento.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
        if (motor.status === 'vitoria' || motor.status === 'morte') return;
        if (pressionou && evento.key === 'Escape') {
            alternarPausa();
            return;
        }
        const acao = acaoDaTecla(evento.key);
        if (!acao) return;
        evento.preventDefault();
        if (acao === 'bloqueio') guardar(pressionou);
        else if (pressionou && !evento.repeat) agir(acao);
    });

    const aoPerderFoco = useEffectEvent(() => {
        definirGuarda(motor, false);
        if (document.hidden && ['luta', 'intro'].includes(motor.status)) setPausado(true);
    });

    useEffect(() => {
        const aoPressionar = (evento) => aoTeclar(evento, true);
        const aoSoltar = (evento) => aoTeclar(evento, false);
        window.addEventListener('keydown', aoPressionar);
        window.addEventListener('keyup', aoSoltar);
        window.addEventListener('blur', aoPerderFoco);
        document.addEventListener('visibilitychange', aoPerderFoco);
        return () => {
            window.removeEventListener('keydown', aoPressionar);
            window.removeEventListener('keyup', aoSoltar);
            window.removeEventListener('blur', aoPerderFoco);
            document.removeEventListener('visibilitychange', aoPerderFoco);
        };
    }, []);

    function reiniciar() {
        const novo = criarCombate({ build, chefe });
        bufferRef.current = { tipo: null, ate: 0 };
        finalizadoRef.current = false;
        setMotor(novo);
        setQuadro(snapshot(novo));
        setResultado(null);
        setPausado(false);
    }

    return {
        quadro,
        pausado,
        resultado,
        agir,
        guardar,
        alternarPausa,
        reiniciar,
        motivo: (tipo) => motivoBloqueio(quadro, tipo),
    };
}
