import { SilhuetaJogador } from './Silhuetas';

// Pose e posicao do personagem derivadas do estado do motor.
function poseDoJogador(player, t) {
    if (player.hp <= 0) return { pose: 'morto', x: 20 };
    const acao = player.acao;
    if (acao) {
        const rel = t - acao.inicio;
        const golpe = acao.golpes.find((g) => rel < g.em + 200) || acao.golpes[acao.golpes.length - 1];
        const avancando = !acao.distancia && golpe && rel > golpe.em - 200 && rel < golpe.em + 220;
        if (acao.tipo === 'esquiva') return { pose: 'esquiva', x: 9 };
        if (acao.tipo === 'parry') return { pose: 'parry', x: 22 };
        if (acao.tipo === 'frasco') return { pose: 'frasco', x: 18 };
        if (acao.tipo === 'critico') return { pose: 'critico', x: avancando ? 52 : 34 };
        return { pose: acao.conjuracao ? `${acao.tipo} rpg-jogador--conjurando` : acao.tipo, x: avancando ? (acao.tipo === 'habilidade' ? 50 : 48) : 21 };
    }
    if (player.atordoadoAte > t) return { pose: 'atingido', x: 15 };
    if (player.guardando) return { pose: 'bloqueio', x: 19 };
    if (player.exaustoAte > t) return { pose: 'exausto', x: 18 };
    return { pose: 'idle', x: 20 };
}

export default function PlayerCharacter({ player, build, t }) {
    const { pose, x } = poseDoJogador(player, t);
    const acao = player.acao;
    return (
        <div className="rpg-ator rpg-ator--jogador" style={{ left: `${x}%` }}>
            <div
                key={acao?.id ?? pose}
                className={`rpg-jogador rpg-jogador--${pose} ${player.contraAte > t ? 'rpg-jogador--contra' : ''}`}
                style={{ '--dur': `${acao?.duracao ?? 600}ms` }}
            >
                <div key={player.atingidoId} className={player.atingidoId ? 'rpg-recuo-jogador' : ''}>
                    {build.imagem
                        ? <img className="rpg-img-ator" src={build.imagem} alt="" />
                        : <SilhuetaJogador forma={build.arma.forma} />}
                </div>
                <span className="rpg-sombra" aria-hidden="true" />
            </div>
            {acao?.distancia && acao.golpes.map((golpe, indice) => (
                <span
                    key={`${acao.id}-${indice}`}
                    className={`rpg-projetil rpg-projetil--${build.tipoDano} ${build.arquetipo === 'sangramento' ? 'rpg-projetil--sangue' : ''}`}
                    style={{ animationDelay: `${golpe.em * 0.55}ms`, animationDuration: `${golpe.em * 0.45}ms` }}
                    aria-hidden="true"
                />
            ))}
        </div>
    );
}
