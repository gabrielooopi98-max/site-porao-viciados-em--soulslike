import { STATUS } from './data/status.js';
import { DANOS } from '../../services/perfilBuild.js';

// Mostra como a build se traduz em combate antes de entrar na arena.
export default function BuildStats({ stats }) {
    const janelaEsquiva = stats.esquiva.iframes[1] - stats.esquiva.iframes[0];
    const linhas = [
        { rotulo: 'HP', valor: stats.hpMax },
        { rotulo: 'Stamina', valor: stats.staminaMax },
        { rotulo: 'FP', valor: stats.fpMax },
        { rotulo: 'Dano base', valor: Math.round(stats.base * stats.multArma) },
        { rotulo: 'Defesa', valor: `${Math.round(stats.defesa * 100)}%` },
        { rotulo: 'Esquiva', valor: `${janelaEsquiva} ms` },
        { rotulo: 'Bloqueio', valor: `${Math.round(stats.bloqueio.reducao * 100)}%` },
        { rotulo: 'Parry', valor: `${stats.parry.janela} ms` },
    ];
    return (
        <div className="rpg-build-stats">
            <div className="rpg-build-stats-topo">
                <span className="rpg-selo">{stats.rotuloArquetipo}</span>
                <span>{stats.arma.nome}</span>
                <span>Dano {DANOS[stats.tipoDano]?.rotulo || stats.tipoDano}</span>
            </div>
            <p>{stats.descricaoArquetipo}</p>
            <dl>
                {linhas.map((linha) => (
                    <div key={linha.rotulo}><dt>{linha.rotulo}</dt><dd>{linha.valor}</dd></div>
                ))}
            </dl>
            <p className="rpg-build-stats-habilidade">
                <strong>Habilidade:</strong> {stats.habilidade.nome}
                {Object.keys(stats.status).length > 0 && (
                    <> · <strong>Acúmulo:</strong> {Object.keys(stats.status).map((id) => STATUS[id]?.rotulo).join(', ')}</>
                )}
            </p>
        </div>
    );
}
