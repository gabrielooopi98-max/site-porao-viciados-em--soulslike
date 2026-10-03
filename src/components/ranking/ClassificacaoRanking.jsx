import { Link } from 'react-router-dom';
import { posicoesRanking } from '../../services/ranking';
import './FinaisRanking.css';

export default function ClassificacaoRanking({ jogadores, demonstracao = false }) {
  const posicoes = posicoesRanking(jogadores);
  return jogadores.length ? (
    <ol className="ranking-real-lista">
      {jogadores.map((jogador, index) => (
        <li key={jogador.usuario_id}>
          <span>{posicoes[index]}º</span>
          <img className="ranking-avatar-lista" src={jogador.avatar || '/svg-animado/icone-usuario.svg'} alt="" loading="lazy" />
          <span className="ranking-nome-lista">
            {demonstracao ? <span className="ranking-demo-nome">{jogador.nome}</span> : <Link to={`/perfil/${jogador.usuario_id}`}>{jogador.nome}</Link>}
            {jogador.titulo && <span className="ranking-titulo-jogador">{jogador.titulo}{jogador.finais > 1 ? ` · ${jogador.finais} finais` : ''}</span>}
          </span>
          <strong>{jogador.pontos} <small>pts</small></strong>
        </li>
      ))}
    </ol>
  ) : <p className="ranking-vazio">O ranking está começando! Participe de um desafio para conquistar seus primeiros pontos.</p>;
}
