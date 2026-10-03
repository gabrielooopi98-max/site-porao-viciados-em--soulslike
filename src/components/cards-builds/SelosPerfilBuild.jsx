import { interpretarDano, interpretarFoco } from '../../services/perfilBuild';
import { ICONES_DANO } from './iconesPerfilBuild';
import './PerfilBuild.css';

// Selos do perfil da build: nivel, atributos de foco (com sigla colorida) e tipos de dano (com icone).
export default function SelosPerfilBuild({ nivel, foco, dano, className = '' }) {
    const focos = interpretarFoco(foco);
    const danos = interpretarDano(dano);
    if (!nivel && !focos.length && !danos.length) return null;

    return (
        <ul className={`perfil-build-selos ${className}`} aria-label="Perfil da build">
            {nivel && (
                <li className="perfil-selo perfil-selo--nivel" title={`Nível ${nivel}`}>
                    <span aria-hidden="true">NV</span>
                    <b>{nivel}</b>
                    <span className="perfil-sr-only">Nível {nivel}</span>
                </li>
            )}
            {focos.map((item) => (
                <li key={`foco-${item.id || item.rotulo}`} className={`perfil-selo perfil-selo--atributo${item.id ? '' : ' perfil-selo--livre'}`}
                    style={item.cor ? { '--perfil-cor': item.cor } : undefined} title={`Foco: ${item.rotulo}${item.valor ? ` ${item.valor}` : ''}`}>
                    {item.sigla && <b className="perfil-selo-sigla" aria-hidden="true">{item.sigla}</b>}
                    <span className="perfil-selo-texto">{item.rotulo}</span>
                    {item.valor && <em>{item.valor}</em>}
                </li>
            ))}
            {danos.map((item) => (
                <li key={`dano-${item.id || item.rotulo}`} className={`perfil-selo perfil-selo--dano${item.id ? '' : ' perfil-selo--livre'}`}
                    style={item.cor ? { '--perfil-cor': item.cor } : undefined} title={`Dano: ${item.rotulo}`}>
                    <svg className="perfil-selo-icone" viewBox="0 0 24 24" aria-hidden="true">{ICONES_DANO[item.icone || 'espada']}</svg>
                    <span className="perfil-selo-texto">{item.rotulo}</span>
                </li>
            ))}
        </ul>
    );
}
