import {
    MAXIMO_POR_GRUPO, interpretarDano, interpretarFoco, juntarPerfil, opcoesPerfilBuild,
} from '../../services/perfilBuild';
import { ICONES_DANO } from './iconesPerfilBuild';
import './PerfilBuild.css';

function GrupoSelos({ titulo, ajuda, opcoes, selecionados, aoMudar, tipo }) {
    const chave = (item) => item.id || item.rotulo;
    const marcados = new Set(selecionados.map(chave));
    // Valores antigos fora da lista do jogo continuam visiveis para poderem ser removidos.
    const lista = [...opcoes, ...selecionados.filter((item) => !opcoes.some((opcao) => opcao.id === item.id))];
    const cheio = selecionados.length >= MAXIMO_POR_GRUPO;

    function alternar(item) {
        const proximos = marcados.has(chave(item))
            ? selecionados.filter((atual) => chave(atual) !== chave(item))
            : [...selecionados, item];
        aoMudar(juntarPerfil(proximos.map((atual) => atual.rotulo)));
    }

    return (
        <div className="perfil-seletor-grupo" role="group" aria-label={titulo}>
            <div className="perfil-seletor-cabecalho">
                <span>{titulo}</span>
                <small>{ajuda} · {selecionados.length}/{MAXIMO_POR_GRUPO}</small>
            </div>
            <div className="perfil-seletor-opcoes">
                {lista.map((item) => {
                    const ativo = marcados.has(chave(item));
                    return (
                        <button key={chave(item)} type="button" aria-pressed={ativo} disabled={!ativo && cheio}
                            className={`perfil-selo perfil-selo--${tipo} perfil-selo--opcao${item.id ? '' : ' perfil-selo--livre'}`}
                            style={item.cor ? { '--perfil-cor': item.cor } : undefined} onClick={() => alternar(item)}>
                            {tipo === 'atributo' && item.sigla && <b className="perfil-selo-sigla" aria-hidden="true">{item.sigla}</b>}
                            {tipo === 'dano' && <svg className="perfil-selo-icone" viewBox="0 0 24 24" aria-hidden="true">{ICONES_DANO[item.icone || 'espada']}</svg>}
                            <span className="perfil-selo-texto">{item.rotulo}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Escolha do foco e do dano por selos, com as opcoes do jogo escolhido. Grava o mesmo texto de antes.
export default function SeletorPerfilBuild({ categoria, foco, dano, aoMudarFoco, aoMudarDano, desativado = false }) {
    const opcoes = opcoesPerfilBuild(categoria);
    return (
        <fieldset className="perfil-seletor" disabled={desativado}>
            {!categoria && <p className="perfil-seletor-dica">Escolha o jogo acima para ver os atributos e danos certos dele.</p>}
            <GrupoSelos titulo="Foco" ajuda="atributos principais" tipo="atributo" opcoes={opcoes.atributos}
                selecionados={interpretarFoco(foco)} aoMudar={aoMudarFoco} />
            <GrupoSelos titulo="Tipo de dano" ajuda="o que a build causa" tipo="dano" opcoes={opcoes.danos}
                selecionados={interpretarDano(dano)} aoMudar={aoMudarDano} />
        </fieldset>
    );
}
