import EscolhaFinal from './EscolhaFinal';
import { agruparFinais, formatarDataRanking } from '../../services/ranking';
import './FinaisRanking.css';

export default function ColecaoFinais({ finais = [], vitorias = [], aoAtualizar }) {
  const pendentes = vitorias.filter((v) => !v.final_id);
  const conquistados = new Set(vitorias.map((v) => v.final_id).filter(Boolean));
  return (
    <section className="ranking-colecao-finais" aria-labelledby="titulo-colecao-finais">
      <header>
        <div>
          <span className="banner-kicker">Competições de builds</span>
          <h2 id="titulo-colecao-finais">Coleção de finais</h2>
          <p>Vença competições de builds para desbloquear os finais dos soulslike.</p>
        </div>
        <div className="ranking-colecao-total">
          <strong>{conquistados.size}<small> / {finais.length}</small></strong>
          <span>Finais conquistados</span>
        </div>
      </header>
      <progress className="ranking-colecao-progresso" value={conquistados.size} max={finais.length || 1} aria-label="Progresso da coleção de finais" />

      {pendentes.map((vitoria) => (
        <div className="ranking-vitoria-pendente" key={vitoria.participacao_id}>
          <p>
            Você venceu <strong>{vitoria.desafio_titulo || 'uma competição de builds'}</strong>
            {' '}em {formatarDataRanking(vitoria.criado_em)} e ainda não escolheu o final.
          </p>
          <EscolhaFinal finais={finais} participacaoId={vitoria.participacao_id} aoEscolhido={aoAtualizar} />
        </div>
      ))}

      <div className="ranking-colecao-jogos">
        {agruparFinais(finais).map(([jogo, lista]) => {
          const total = lista.filter((f) => conquistados.has(f.id)).length;
          return (
          <details className="ranking-colecao-jogo" key={jogo} open={total > 0}>
            <summary>
              <span><strong>{jogo}</strong><small>{total} de {lista.length} conquistados</small></span>
              <span className="ranking-colecao-expandir" aria-hidden="true">+</span>
            </summary>
            <progress className="ranking-colecao-progresso" value={total} max={lista.length} aria-label={`Progresso em ${jogo}`} />
            <ul>
              {lista.map((f) => {
                const desbloqueado = conquistados.has(f.id);
                return (
                  <li key={f.id} className={desbloqueado ? 'desbloqueado' : ''}>
                    <span className="ranking-final-icone" aria-hidden="true">
                      {desbloqueado ? <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
                        : <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>}
                    </span>
                    <div><strong>{desbloqueado ? f.titulo : 'Título bloqueado'}</strong><small>{f.final}</small>
                      <span className="ranking-final-status">{desbloqueado ? 'Conquistado' : 'Ainda não conquistado'}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </details>
          );
        })}
      </div>
      {!finais.length && <p className="ranking-colecao-vazia">Os finais disponíveis aparecerão aqui quando o catálogo estiver pronto.</p>}
    </section>
  );
}
