import { useEffect, useRef } from 'react';

export function useDialogoPublicacao(aoFechar, publicando) {
    const painelRef = useRef(null);
    const tituloRef = useRef(null);

    useEffect(() => {
        const focoAnterior = document.activeElement;
        const overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        tituloRef.current?.focus();

        return () => {
            document.body.style.overflow = overflowAnterior;
            if (focoAnterior instanceof HTMLElement && focoAnterior.isConnected) focoAnterior.focus();
        };
    }, []);

    useEffect(() => {
        function controlarTeclado(evento) {
            if (evento.key === 'Escape' && !publicando) {
                evento.preventDefault();
                aoFechar();
            }
            if (evento.key !== 'Tab') return;

            const elementos = painelRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), video[controls]');
            if (!elementos?.length) {
                evento.preventDefault();
                painelRef.current?.focus();
                return;
            }
            const primeiro = elementos[0];
            const ultimo = elementos[elementos.length - 1];
            if (!painelRef.current.contains(document.activeElement)) {
                evento.preventDefault();
                primeiro.focus();
            } else if (evento.shiftKey && (document.activeElement === primeiro || document.activeElement === painelRef.current || document.activeElement === tituloRef.current)) {
                evento.preventDefault();
                ultimo.focus();
            } else if (!evento.shiftKey && document.activeElement === ultimo) {
                evento.preventDefault();
                primeiro.focus();
            }
        }

        document.addEventListener('keydown', controlarTeclado);
        return () => document.removeEventListener('keydown', controlarTeclado);
    }, [aoFechar, publicando]);

    return { painelRef, tituloRef };
}
