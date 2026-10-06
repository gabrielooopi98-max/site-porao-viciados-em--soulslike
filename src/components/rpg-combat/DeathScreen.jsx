import { formatarTempo } from './engine/progressao.js';

export default function DeathScreen({ chefe, resultado, onTentar, onVoltar }) {
    const { resumo, recompensa } = resultado;
    return (
        <div className="rpg-tela-final rpg-tela-final--morte" role="dialog" aria-modal="true" aria-labelledby="rpg-morte-titulo">
            <div className="rpg-tela-final-conteudo">
                <h2 id="rpg-morte-titulo">Você morreu</h2>
                <p className="rpg-tela-final-sub">{chefe.nomeCurto} venceu.</p>
                <dl className="rpg-resumo rpg-resumo--curto">
                    <div><dt>Tempo sobrevivido</dt><dd>{formatarTempo(resumo.tempo)}</dd></div>
                    <div><dt>Dano causado</dt><dd>{Number(resumo.danoCausado).toLocaleString('pt-BR')}</dd></div>
                    <div><dt>Perfect Dodges</dt><dd>{resumo.perfectDodges}</dd></div>
                    {recompensa?.xp > 0 && <div><dt>Experiência</dt><dd>+{recompensa.xp} XP</dd></div>}
                </dl>
                <div className="rpg-tela-final-acoes">
                    <button type="button" className="rpg-botao rpg-botao--primario" onClick={onTentar}>Tentar novamente</button>
                    <button type="button" className="rpg-botao" onClick={onVoltar}>Voltar para minha build</button>
                </div>
            </div>
        </div>
    );
}
