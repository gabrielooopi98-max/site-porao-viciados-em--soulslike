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
        <strong>{conquistados.size}<small> de {finais.length}</small></strong>
      </header>

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
        {agruparFinais(finais).map(([jogo, lista]) => (
          <div key={jogo}>
            <h3>{jogo}</h3>
            <ul>
              {lista.map((f) => {
                const desbloqueado = conquistados.has(f.id);
                return (
                  <li key={f.id} className={desbloqueado ? 'desbloqueado' : ''}>
                    <strong>{desbloqueado ? f.titulo : '???'}</strong>
                    <small>{f.final}{desbloqueado ? '' : ' · bloqueado'}</small>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
