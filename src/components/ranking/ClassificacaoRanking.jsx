import { Link } from 'react-router-dom';
import { posicoesRanking } from '../../services/ranking';

export default function ClassificacaoRanking({ jogadores, demonstracao = false }) {
  const posicoes = posicoesRanking(jogadores);
  return jogadores.length ? (
    <ol className="ranking-real-lista">
      {jogadores.map((jogador, index) => (
        <li key={jogador.usuario_id}>
          <span>{posicoes[index]}º</span>
          <img className="ranking-avatar-lista" src={jogador.avatar || '/svg-animado/icone-usuario.svg'} alt="" loading="lazy" />
          {demonstracao ? <span className="ranking-demo-nome">{jogador.nome}</span> : <Link className="ranking-nome-lista" to={`/perfil/${jogador.usuario_id}`}>{jogador.nome}</Link>}
          <strong>{jogador.pontos} <small>pts</small></strong>
        </li>
      ))}
    </ol>
  ) : <p className="ranking-vazio">Nenhum ponto concedido ainda. Os primeiros desafios vão abrir a classificação.</p>;
}
