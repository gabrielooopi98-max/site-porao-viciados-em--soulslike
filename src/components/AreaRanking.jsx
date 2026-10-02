import ImagemDecorativaAdiada from './ImagemDecorativaAdiada';
import DivisoriaSecao from './DivisoriaSecao';
import './AreaRanking.css';

const jogadoresExemplo = [
  { posicao: 1, nome: 'Gabriel Moreira', pontos: 150 },
  { posicao: 2, nome: 'Gabriel Moreira', pontos: 150 },
  { posicao: 3, nome: 'Gabriel Moreira', pontos: 150 },
  { posicao: 4, nome: 'Gabriel Moreira', pontos: 150 },
  { posicao: 5, nome: 'Gabriel Moreira', pontos: 150 },
  { posicao: 6, nome: 'Gabriel Moreira', pontos: 150 },
];

export default function AreaRanking() {
  return (
    <section className="area-ranking ranking-comunidade" id="ranking" aria-labelledby="ranking-titulo">
      <DivisoriaSecao />
      <div className="ranking-conteudo">
        <header className="ranking-header">
          <div className="ranking-ilustracao" aria-hidden="true">
            <ImagemDecorativaAdiada
              src="/svg-animado/lua-bloodborne-banner-1760x575.svg"
              alt=""
              className="ranking-cenario"
            />
          </div>
          <div className="ranking-header-texto">
            <span className="ranking-sobretitulo">Ranking da comunidade</span>
            <h2 id="ranking-titulo">Cada jornada deixa sua marca</h2>
            <p>Quem enfrenta os desafios e compartilha o que aprendeu merece seu lugar entre os destaques.</p>
          </div>
        </header>

        <div className="ranking-apresentacao">
          <div className="ranking-apresentacao-detalhe" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M3 20V11h6v9M9 20V5h6v15M15 20v-6h6v6M2 20h20" />
            </svg>
          </div>
          <div>
            <h3>Classificação</h3>
          </div>
        </div>

        <ol className="ranking-podio" aria-label="Três primeiros lugares de exemplo">
          {jogadoresExemplo.slice(0, 3).map((jogador) => (
            <li className={`ranking-destaque ranking-destaque-${jogador.posicao}`} key={jogador.posicao}>
              <div className="ranking-destaque-topo">
                <span className="ranking-colocacao">{jogador.posicao}º lugar</span>
                {jogador.posicao === 1 && (
                  <svg className="ranking-coroa" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m3 7 5 4 4-7 4 7 5-4-2 12H5L3 7Z" />
                    <path d="M6 22h12" />
                  </svg>
                )}
              </div>
              <img className="ranking-avatar" src="/avatar.png" alt="" loading="lazy" width="64" height="64" />
              <span className="ranking-jogador-nome">{jogador.nome}</span>
              <div className="ranking-destaque-pontos">
                <strong>{jogador.pontos}</strong>
                <span>pontos</span>
              </div>
            </li>
          ))}
        </ol>

        <div className="ranking-lista-painel">
          <div className="ranking-lista-cabecalho" aria-hidden="true">
            <span>Posição / Jogador</span>
            <span>Pontos</span>
          </div>
          <ol className="ranking-lista" start="4" aria-label="Demais posições de exemplo">
            {jogadoresExemplo.slice(3).map((jogador) => (
              <li className="ranking-linha" key={jogador.posicao}>
                <span className="ranking-numero" aria-label={`${jogador.posicao}º lugar`}>
                  {String(jogador.posicao).padStart(2, '0')}
                </span>
                <img src="/avatar.png" alt="" loading="lazy" width="40" height="40" />
                <span className="ranking-jogador-nome">{jogador.nome}</span>
                <span className="ranking-linha-pontos"><strong>{jogador.pontos}</strong> <span>pts</span></span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
