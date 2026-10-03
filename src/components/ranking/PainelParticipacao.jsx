import { Link } from 'react-router-dom';
import { formatarDataRanking } from '../../services/ranking';
import './CardsRanking.css';

const passos = {
  build: [
    ['Monte e envie sua build', 'Informe o nome da build e os equipamentos usados. Envie 1 imagem legível dos atributos do personagem e 1 vídeo mostrando a build em ação contra um boss.'],
    ['Entra na disputa na hora', 'Sem espera: assim que você envia, a comunidade já pode votar.'],
    ['A comunidade vota', 'Você pode votar uma vez por etapa. Os votos se somam entre as fases: as 4 builds mais votadas avançam à semifinal, e as 2 mais votadas depois seguem para a final.'],
  ],
  conquista: [
    ['Cumpra o desafio', 'Siga as regras abaixo e grave ou fotografe tudo.'],
    ['Envie sua prova', 'Até oito imagens ou vídeos. A prova não pode ser editada depois.'],
    ['O ADM aprova', 'Prova aprovada soma os pontos no ranking geral.'],
  ],
};

const statusMinha = {
  build: { pendente: 'aguardando o ADM', aprovada: 'na disputa', recusada: 'removida pelo ADM' },
  conquista: { pendente: 'aguardando o ADM', aprovada: 'aprovada', recusada: 'recusada' },
};

// Bloco de chamada para participar, no topo do desafio: explica os passos e mostra a acao certa para cada situacao.
export default function PainelParticipacao({ desafio, agora, user, minhaParticipacao, formularioAberto, aoAbrir, aoFechar }) {
  const build = desafio.tipo === 'build';
  const abertura = Date.parse(desafio.inicio);
  const encerramento = Date.parse(desafio.fim);
  const nome = build ? 'build' : 'prova';

  let acao;
  if (agora < abertura) {
    acao = <p className="rk-participar-estado">As inscrições abrem em {formatarDataRanking(desafio.inicio)}.</p>;
  } else if (minhaParticipacao) {
    acao = <p className="rk-participar-estado">
      Você já enviou sua {nome}: <span className={`ranking-status-chip ${minhaParticipacao.status}`}>{statusMinha[desafio.tipo][minhaParticipacao.status]}</span>
      <a className={`rk-btn${build ? ' rk-btn--filtro' : ''}`} href={`#participacao-${minhaParticipacao.id}`}>Ver minha {nome}</a>
    </p>;
  } else if (agora >= encerramento) {
    acao = <p className="rk-participar-estado">
      As inscrições terminaram em {formatarDataRanking(desafio.fim)}.{build && desafio.etapa < 3 ? ' Você ainda pode votar nas builds abaixo.' : ''}
    </p>;
  } else if (!user) {
    acao = <Link className="rk-btn rk-btn--principal" to="/login">Entrar para participar</Link>;
  } else {
    acao = formularioAberto
      ? <button className="rk-btn" type="button" onClick={aoFechar}>Fechar formulário</button>
      : <button className="rk-btn rk-btn--principal" type="button" onClick={aoAbrir}>{build ? '+ Criar minha build' : '+ Enviar minha prova'}</button>;
  }
  const inscricoesAbertas = agora >= abertura && agora < encerramento;

  return (
    <section className="rk-participar" aria-labelledby={`participar-${desafio.id}`}>
      <div className="rk-participar-cabecalho">
        <h3 className="rk-participar-titulo" id={`participar-${desafio.id}`}>
          {build ? 'Como entrar na disputa' : 'Como enviar sua prova'}
        </h3>
        <p>{build ? 'Três passos para colocar sua build na competição.' : `Três passos para concluir o desafio e receber ${desafio.pontos} pts.`}</p>
      </div>
      <ol className="rk-passos">
        {passos[desafio.tipo].map(([titulo, texto]) => <li key={titulo}><span><strong>{titulo}</strong>{texto}</span></li>)}
      </ol>
      <div className="rk-participar-acao">
        {acao}
        {inscricoesAbertas && !minhaParticipacao && <span className="rk-participar-prazo">
          Inscrições até <b>{formatarDataRanking(desafio.fim)}</b>
        </span>}
      </div>
    </section>
  );
}
