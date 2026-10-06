import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import CabecalhoComunidade from '../CabecalhoComunidade';
import { useAuth } from '../../contexts/useAuth';
import { supabase } from '../../services/supabase';
import BuildStats from './BuildStats';
import ProgressoJogador from './ProgressoJogador';
import RPGCombat from './RPGCombat';
import { SilhuetaChefe } from './Silhuetas';
import { CHEFES, buscarChefe } from './data/chefes/index.js';
import { BUILDS_DEMO, statsDaBuild } from './engine/buildStats.js';
import { aplicarResultado, carregarProgresso, salvarProgresso } from './engine/progressao.js';
import { TECLAS } from './useCombate';
import './RPGCombat.css';

const CAMPOS_BUILD = 'id, titulo, categoria, nivel, foco, dano, descricao, autor_id';

const CONTROLES = [
    ['rapido', 'Ataque rápido'], ['pesado', 'Ataque pesado'], ['habilidade', 'Habilidade'],
    ['esquiva', 'Esquivar'], ['bloqueio', 'Bloquear (segurar)'], ['parry', 'Parry'],
    ['critico', 'Ataque crítico'], ['frasco', 'Frasco'],
];

function ConteudoBatalhas({ usuarioId }) {
    const [params] = useSearchParams();
    const buildPedida = params.get('build');
    const [minhasBuilds, setMinhasBuilds] = useState([]);
    const [buildExterna, setBuildExterna] = useState(null);
    const [carregandoBuilds, setCarregandoBuilds] = useState(Boolean(usuarioId));
    const [selecionadaId, setSelecionadaId] = useState(buildPedida || BUILDS_DEMO[0].id);
    const [chefeId, setChefeId] = useState(CHEFES[0].id);
    const [emCombate, setEmCombate] = useState(false);
    const [progresso, setProgresso] = useState(() => carregarProgresso(usuarioId));

    useEffect(() => {
        if (!usuarioId) return undefined;
        let ativo = true;
        supabase
            .from('builds')
            .select(CAMPOS_BUILD)
            .eq('autor_id', usuarioId)
            .order('criado_em', { ascending: false })
            .limit(30)
            .then(({ data, error }) => {
                if (!ativo) return;
                if (error) console.error('Erro ao carregar builds para a arena:', error);
                const builds = data ?? [];
                setMinhasBuilds(builds);
                setCarregandoBuilds(false);
                if (!buildPedida && builds.length) setSelecionadaId(String(builds[0].id));
            });
        return () => {
            ativo = false;
        };
    }, [usuarioId, buildPedida]);

    useEffect(() => {
        if (!buildPedida || buildPedida.startsWith('demo-')) return undefined;
        let ativo = true;
        supabase
            .from('builds')
            .select(CAMPOS_BUILD)
            .eq('id', buildPedida)
            .maybeSingle()
            .then(({ data, error }) => {
                if (!ativo) return;
                if (error) console.error('Erro ao carregar build para a arena:', error);
                if (data) setBuildExterna(data);
            });
        return () => {
            ativo = false;
        };
    }, [buildPedida]);

    const builds = [
        ...minhasBuilds,
        ...(buildExterna && !minhasBuilds.some((build) => String(build.id) === String(buildExterna.id)) ? [buildExterna] : []),
        ...BUILDS_DEMO,
    ];
    const selecionada = builds.find((build) => String(build.id) === String(selecionadaId)) || BUILDS_DEMO[0];
    const stats = statsDaBuild(selecionada);
    const chefe = buscarChefe(chefeId);

    function registrarResultado(resumo) {
        const resultado = aplicarResultado(progresso, resumo, chefe);
        salvarProgresso(usuarioId, resultado.progresso);
        setProgresso(resultado.progresso);
        return { resumo, ...resultado };
    }

    function entrar() {
        setEmCombate(true);
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    if (emCombate) {
        return (
            <main className="rpg-pagina rpg-pagina--arena">
                <RPGCombat
                    key={`${selecionada.id}-${chefe.id}`}
                    build={stats}
                    chefe={chefe}
                    aoTerminar={registrarResultado}
                    onSair={() => setEmCombate(false)}
                />
            </main>
        );
    }

    return (
        <main className="rpg-pagina">
            <header className="rpg-pagina-topo">
                <span className="rpg-kicker">Arena dos Viciados</span>
                <h1>Batalhas</h1>
                <p>Leve sua build para a arena. Aprenda os padrões do chefe, acerte o tempo da esquiva e do parry e prove que ela funciona de verdade.</p>
            </header>

            <div className="rpg-selecao">
                <div className="rpg-selecao-passos">
                    <section className="rpg-passo" aria-labelledby="rpg-passo-build">
                        <h2 id="rpg-passo-build"><span>1</span> Escolha sua build</h2>
                        {!usuarioId && <p className="rpg-passo-nota"><Link to="/login">Entre</Link> para lutar com as builds que você publicou. Enquanto isso, use uma build de exemplo.</p>}
                        {usuarioId && !carregandoBuilds && !minhasBuilds.length && (
                            <p className="rpg-passo-nota">Você ainda não publicou builds. <Link to="/builds">Crie uma</Link> ou use uma de exemplo.</p>
                        )}
                        <div className="rpg-lista-builds" role="radiogroup" aria-label="Builds disponíveis">
                            {carregandoBuilds && <span className="rpg-carregando">Carregando suas builds…</span>}
                            {builds.map((build) => {
                                const ativa = String(build.id) === String(selecionada.id);
                                const resumo = statsDaBuild(build);
                                return (
                                    <button
                                        key={build.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={ativa}
                                        className={`rpg-card-build ${ativa ? 'rpg-card-build--ativa' : ''}`}
                                        onClick={() => setSelecionadaId(String(build.id))}
                                    >
                                        <span className="rpg-selo">{build.demo ? 'Exemplo' : resumo.rotuloArquetipo}</span>
                                        <strong>{build.titulo || 'Build sem nome'}</strong>
                                        <small>{[build.categoria, build.nivel && `Nv. ${build.nivel}`, build.demo && resumo.rotuloArquetipo].filter(Boolean).join(' · ')}</small>
                                    </button>
                                );
                            })}
                        </div>
                        <BuildStats stats={stats} />
                        {!selecionada.demo && (
                            <Link className="rpg-link" to={`/build/${selecionada.id}`}>Ver detalhes da build →</Link>
                        )}
                    </section>

                    <section className="rpg-passo" aria-labelledby="rpg-passo-chefe">
                        <h2 id="rpg-passo-chefe"><span>2</span> Escolha o chefe</h2>
                        <div className="rpg-lista-chefes" role="radiogroup" aria-label="Chefes">
                            {CHEFES.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={item.id === chefe.id}
                                    className={`rpg-card-chefe ${item.id === chefe.id ? 'rpg-card-chefe--ativo' : ''}`}
                                    onClick={() => setChefeId(item.id)}
                                >
                                    <span className="rpg-card-chefe-arte" aria-hidden="true">
                                        {item.imagem ? <img src={item.imagem} alt="" /> : <SilhuetaChefe fase={1} />}
                                    </span>
                                    <span className="rpg-card-chefe-texto">
                                        <span className="rpg-selo">{item.jogo}</span>
                                        <strong>{item.nome}</strong>
                                        <small>{item.titulo}</small>
                                        <span className="rpg-card-chefe-dados">
                                            {item.hpMax.toLocaleString('pt-BR')} HP · {item.fases.length} fases · +{item.recompensa.xp} XP
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="rpg-passo rpg-passo--entrar" aria-labelledby="rpg-passo-arena">
                        <h2 id="rpg-passo-arena"><span>3</span> Entre na arena</h2>
                        <ul className="rpg-controles">
                            {CONTROLES.map(([acao, rotulo]) => (
                                <li key={acao}><kbd>{TECLAS[acao].rotulo}</kbd>{rotulo}</li>
                            ))}
                            <li><kbd>Esc</kbd>Pausar</li>
                        </ul>
                        <button type="button" className="rpg-botao rpg-botao--primario rpg-botao--grande" onClick={entrar}>
                            Enfrentar {chefe.nomeCurto} com {selecionada.titulo || 'esta build'}
                        </button>
                    </section>
                </div>

                <ProgressoJogador progresso={progresso} convidado={!usuarioId} />
            </div>
        </main>
    );
}

export default function PaginaBatalhas() {
    const { user, carregando } = useAuth();
    return (
        <>
            <CabecalhoComunidade />
            {carregando
                ? <main className="componente-carregando" role="status">Preparando a arena...</main>
                : <ConteudoBatalhas key={user?.id || 'convidado'} usuarioId={user?.id || null} />}
        </>
    );
}
