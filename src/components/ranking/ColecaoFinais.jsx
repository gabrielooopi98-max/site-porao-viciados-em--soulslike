import EscolhaFinal from './EscolhaFinal';
import { agruparFinais, formatarDataRanking } from '../../services/ranking';
import { BANNERS_FINAIS, finalBannerAtivo } from '../../services/bannersFinais';
import './FinaisRanking.css';

export default function ColecaoFinais({ finais = [], vitorias = [], aoAtualizar, banner }) {
  const pendentes = vitorias.filter((v) => !v.final_id);
  const conquistados = new Set(vitorias.map((v) => v.final_id).filter(Boolean));
  return (
    <section className="ranking-colecao-finais" aria-labelledby="titulo-colecao-finais">
      <header>
        <div>
          <span className="banner-kicker">Competições de builds</span>
          <h2 id="titulo-colecao-finais">Coleção de finais</h2>
          <p>Vença competições de builds para desbloquear os finais dos soulslike.</p>
          {banner && <p>Clique em um final conquistado com banner disponível para usá-lo no perfil.</p>}
          {banner && <p>Os banners disponíveis também podem ser testados sem conquista: a prévia não salva nem concede título.</p>}
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
                const arte = BANNERS_FINAIS[f.id];
                const temBanner = Boolean(arte);
                const teste = !desbloqueado && temBanner && Boolean(banner);
                const clicavel = temBanner && Boolean(banner);
                const aplicado = Boolean(banner && finalBannerAtivo(banner) === f.id);
                const conteudo = <>
                  {clicavel && <span className="ranking-final-capa">
                    <img className="ranking-final-banner" src={arte.src}
                      alt="" loading="lazy" />
                    <span className="ranking-final-liberado" aria-label={teste ? 'Liberado para prévia' : 'Final conquistado'}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 7.5-2M12 14v3" /></svg>
                    </span>
                    <span className="ranking-final-capa-nome"><strong>{f.final}</strong></span>
                    {aplicado && <span className="ranking-final-usando" role="status">Equipado</span>}
                  </span>}
                  {!clicavel && <span className="ranking-final-icone" aria-hidden="true">
                    {desbloqueado ? <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
                      : <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>}
                  </span>}
                  {!clicavel && <span className="ranking-final-informacoes"><strong>{desbloqueado ? f.titulo : 'Título bloqueado'}</strong><small>{f.final}</small>
                    <span className="ranking-final-status">{desbloqueado ? 'Conquistado' : 'Ainda não conquistado'}</span>
                    {desbloqueado && !temBanner && <span className="ranking-final-status">Banner ainda indisponível</span>}
                  </span>}
                </>;
                return (
                  <li key={f.id} className={`${desbloqueado ? 'desbloqueado' : ''}${clicavel ? ' ranking-final-com-banner' : ''}`}>
                    {clicavel ? <button className="ranking-final-aplicar" type="button"
                      aria-label={teste ? (aplicado ? `Fechar prévia de ${f.final}` : `Visualizar banner de ${f.final} no perfil`) : (aplicado ? `Remover banner de ${f.final}` : `Aplicar banner de ${f.final}`)}
                      aria-pressed={aplicado} disabled={banner.salvando || (!teste && !banner.dados)}
                      onClick={() => teste ? banner.alternarPrevia(f.id) : banner.aplicar(aplicado ? null : f.id)}>{conteudo}</button> : conteudo}
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
