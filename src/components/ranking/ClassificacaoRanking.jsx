import { Link } from 'react-router-dom';
import { posicoesRanking } from '../../services/ranking';

// Ranking geral: pontos de desafios do ADM aprovados + competicoes de builds vencidas.
export default function ClassificacaoRanking({ jogadores, usuarioId, meusPontos, limite = jogadores.length }) {
  const posicoes = posicoesRanking(jogadores);
  const visiveis = jogadores.slice(0, limite);
  const minhaPosicao = jogadores.findIndex((j) => j.usuario_id === usuarioId);
  if (!jogadores.length) {
    return <p className="ranking-vazio">O ranking está começando! Conclua um desafio do ADM ou vença uma competição de builds para conquistar seus primeiros pontos.</p>;
  }
  return (
    <>
      <div className="ranking-builds-tabela-container">
        <table className="ranking-builds-tabela ranking-geral-tabela" aria-label="Ranking geral dos jogadores">
          <thead>
            <tr>
              <th scope="col">Posição</th>
              <th scope="col">Jogador</th>
              <th scope="col" className="ranking-geral-detalhe">Desafios</th>
              <th scope="col" className="ranking-geral-detalhe">Builds vencidas</th>
              <th scope="col">Pontos</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((jogador, index) => (
              <tr key={jogador.usuario_id} className={`${posicoes[index] <= 3 ? `ranking-geral-podio-${posicoes[index]}` : ''} ${jogador.usuario_id === usuarioId ? 'ranking-geral-voce' : ''}`}
                aria-current={jogador.usuario_id === usuarioId ? 'true' : undefined}>
                <td>{posicoes[index]}º</td>
                <td><div className="ranking-builds-identidade">
                  <img src={jogador.avatar || '/svg-animado/icone-usuario.svg'} alt="" loading="lazy" />
                  <div>
                    <Link to={`/perfil/${jogador.usuario_id}`}>{jogador.nome}</Link>
                    {jogador.usuario_id === usuarioId && <small className="ranking-geral-voce-selo"> · Você</small>}
                    {jogador.titulo && <span>{jogador.titulo}{jogador.finais > 1 ? ` · ${jogador.finais} finais` : ''}</span>}
                  </div>
                </div></td>
                <td className="ranking-geral-detalhe">{jogador.conquistas}</td>
                <td className="ranking-geral-detalhe">{jogador.vitorias}</td>
                <td><strong>{jogador.pontos}</strong> pts</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {usuarioId && minhaPosicao === -1 && <p className="ranking-geral-meus-pontos">
        {Number(meusPontos) > 0 ? `Você tem ${meusPontos} pts, ainda fora do top ${jogadores.length}.` : 'Você ainda não pontuou. Conclua um desafio para entrar no ranking.'}
      </p>}
      {usuarioId && minhaPosicao >= limite && <p className="ranking-geral-meus-pontos">Sua posição: {posicoes[minhaPosicao]}º com {jogadores[minhaPosicao].pontos} pts.</p>}
    </>
  );
}
