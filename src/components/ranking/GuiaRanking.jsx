const modalidades = [
  {
    titulo: 'Desafio de conquista',
    resumo: 'Cumpra o objetivo e prove.',
    passos: ['Leia as regras do desafio', 'Envie a prova com imagens ou vídeos', 'O ADM confere e aprova', 'Prova aprovada soma os pontos do desafio'],
  },
  {
    titulo: 'Competição de builds',
    resumo: 'A comunidade escolhe a melhor build.',
    passos: ['Envie sua build durante a classificatória', 'As 6 mais votadas vão à semifinal', 'As 3 mais votadas vão à final', 'A mais votada na final vence e leva o prêmio'],
  },
  {
    titulo: 'Classificação geral',
    resumo: 'Todos os seus pontos somados.',
    passos: ['Cada conquista aprovada e cada competição vencida soma pontos', 'Votos não dão pontos, só definem quem avança', 'Empatados dividem a mesma posição', 'Os pontos continuam mesmo depois que o desafio é removido'],
  },
];

const ciclo = [
  { nome: 'Agendado', texto: 'Publicado pelo ADM. Ainda não aceita participações.' },
  { nome: 'Aberto', texto: 'Envie sua participação e vote nas da comunidade.' },
  { nome: 'Encerrado', texto: 'Resultado definido. O vencedor fica em destaque.' },
  { nome: 'Removido', texto: '3 dias após o fim, o desafio sai do site. Os pontos ficam.' },
];

const status = [
  { classe: 'pendente', nome: 'Aguardando ADM', texto: 'Enviada e ainda não conferida.' },
  { classe: 'aprovada', nome: 'Validada pelo ADM', texto: 'Conferida e valendo no desafio.' },
  { classe: 'recusada', nome: 'Recusada', texto: 'Com o motivo do ADM. Só o autor e o ADM veem.' },
  { classe: 'vencedor', nome: 'Vencedor', texto: 'Build mais votada na final.' },
];

export default function GuiaRanking() {
  return (
    <details className="ranking-guia" open>
      <summary>
        <span className="ranking-secao-label">Guia rápido</span>
        <strong>Como funciona o ranking</strong>
        <small>Modalidades, pontos, etapas e status em um só lugar.</small>
      </summary>

      <div className="ranking-guia-modalidades">
        {modalidades.map((modalidade, index) => (
          <section key={modalidade.titulo} aria-labelledby={`guia-modalidade-${index}`}>
            <span className="ranking-guia-numero" aria-hidden="true">{index + 1}</span>
            <h3 id={`guia-modalidade-${index}`}>{modalidade.titulo}</h3>
            <p>{modalidade.resumo}</p>
            <ol>{modalidade.passos.map((passo) => <li key={passo}>{passo}</li>)}</ol>
          </section>
        ))}
      </div>

      <section className="ranking-guia-bloco" aria-labelledby="guia-ciclo">
        <h3 id="guia-ciclo">Ciclo de vida de um desafio</h3>
        <ol className="ranking-guia-ciclo">
          {ciclo.map((etapa) => <li key={etapa.nome}><strong>{etapa.nome}</strong><span>{etapa.texto}</span></li>)}
        </ol>
      </section>

      <section className="ranking-guia-bloco" aria-labelledby="guia-status">
        <h3 id="guia-status">O que significa cada status</h3>
        <dl className="ranking-guia-status">
          {status.map((item) => (
            <div key={item.nome}>
              <dt><span className={`ranking-status-chip ${item.classe}`}>{item.nome}</span></dt>
              <dd>{item.texto}</dd>
            </div>
          ))}
        </dl>
      </section>
    </details>
  );
}
