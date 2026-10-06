import { CONQUISTAS, formatarTempo } from './engine/progressao.js';

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

export default function VictoryScreen({ chefe, resultado, onRepetir, onVoltar }) {
    const { resumo, recompensa, niveisGanhos, novasConquistas = [], progresso } = resultado;
    return (
        <div className="rpg-tela-final rpg-tela-final--vitoria" role="dialog" aria-modal="true" aria-labelledby="rpg-vitoria-titulo">
            <div className="rpg-tela-final-conteudo">
                <span className="rpg-tela-final-icone" aria-hidden="true">🏆</span>
                <h2 id="rpg-vitoria-titulo">Chefe derrotado</h2>
                <p className="rpg-tela-final-sub">{chefe.nome}</p>
                <dl className="rpg-resumo">
                    <div><dt>Tempo</dt><dd>{formatarTempo(resumo.tempo)}</dd></div>
                    <div><dt>Dano causado</dt><dd>{numero(resumo.danoCausado)}</dd></div>
                    <div><dt>Dano recebido</dt><dd>{numero(resumo.danoRecebido)}</dd></div>
                    <div><dt>Perfect Dodges</dt><dd>{resumo.perfectDodges}</dd></div>
                    <div><dt>Parries</dt><dd>{resumo.parries}</dd></div>
                    <div><dt>Críticos</dt><dd>{resumo.criticos}</dd></div>
                    <div><dt>Maior golpe</dt><dd>{numero(resumo.maiorGolpe)}</dd></div>
                    <div><dt>Frascos usados</dt><dd>{resumo.frascosUsados}</dd></div>
                </dl>
                {recompensa && (
                    <p className="rpg-recompensa">
                        <strong>+{numero(recompensa.xp)} XP</strong>
                        <strong>+{numero(recompensa.souls)} Souls</strong>
                    </p>
                )}
                {niveisGanhos > 0 && <p className="rpg-subiu-nivel">Você alcançou o nível {progresso.nivel}!</p>}
                {novasConquistas.length > 0 && (
                    <ul className="rpg-conquistas-novas" aria-label="Conquistas desbloqueadas">
                        {novasConquistas.map((id) => {
                            const conquista = CONQUISTAS.find((item) => item.id === id);
                            return <li key={id}><strong>{conquista?.nome}</strong><span>{conquista?.descricao}</span></li>;
                        })}
                    </ul>
                )}
                <div className="rpg-tela-final-acoes">
                    <button type="button" className="rpg-botao rpg-botao--primario" onClick={onRepetir}>Lutar novamente</button>
                    <button type="button" className="rpg-botao" onClick={onVoltar}>Voltar para minha build</button>
                </div>
            </div>
        </div>
    );
}
