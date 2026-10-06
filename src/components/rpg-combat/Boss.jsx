import { proximoGolpe, ultimoGolpeAplicado } from './engine/leitura.js';
import { SilhuetaChefe } from './Silhuetas';

function poseDoChefe(boss, t) {
    if (boss.estado === 'morto') return { pose: 'morto', x: 68 };
    if (boss.estado === 'transicao') return { pose: 'transicao', x: 70 };
    if (boss.estado === 'vulneravel') return { pose: 'vulneravel', x: 62 };
    if (boss.estado === 'recuo') return { pose: 'recuo', x: 80 };
    const acao = boss.acao;
    if (acao && acao.golpes.length) {
        const proximo = proximoGolpe(acao);
        const ultimoAplicado = ultimoGolpeAplicado(acao);
        const ateImpacto = proximo ? acao.inicio + proximo.em - t : Infinity;
        const desdeImpacto = ultimoAplicado ? t - (acao.inicio + ultimoAplicado.em) : Infinity;
        if (ateImpacto < 170 || desdeImpacto < 230) return { pose: 'golpeando', x: 38 };
        return { pose: 'preparando', x: 64 };
    }
    return { pose: 'idle', x: 68 };
}

export default function Boss({ boss, chefe, t }) {
    const { pose, x } = poseDoChefe(boss, t);
    const perigo = boss.acao?.def.perigo;
    const dots = boss.dots.map((dot) => `rpg-chefe--dot-${dot.status}`).join(' ');
    return (
        <div className="rpg-ator rpg-ator--chefe" style={{ left: `${x}%` }}>
            <div
                key={boss.acao?.id ?? pose}
                className={`rpg-chefe rpg-chefe--${pose} rpg-chefe--fase-${boss.fase} ${perigo ? 'rpg-chefe--perigo' : ''} ${dots}`}
                style={{ '--dur': `${boss.acao?.duracao ?? 1000}ms` }}
            >
                <div key={boss.atingidoId} className={boss.atingidoId ? 'rpg-recuo-chefe' : ''}>
                    {chefe.imagem
                        ? <img className="rpg-img-ator" src={chefe.imagem} alt="" />
                        : <SilhuetaChefe fase={boss.fase} />}
                </div>
                <span className="rpg-sombra" aria-hidden="true" />
            </div>
            {boss.acao && !boss.acao.def.tipo && pose === 'preparando' && (
                <span className={`rpg-chefe-aviso ${perigo ? 'rpg-chefe-aviso--perigo' : ''}`}>
                    {perigo && <span aria-hidden="true">◆ </span>}{boss.acao.def.nome}
                </span>
            )}
        </div>
    );
}
