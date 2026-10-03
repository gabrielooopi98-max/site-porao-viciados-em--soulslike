import { dataRemocaoDesafio, formatarDataRanking } from '../../services/ranking';

function etapasDoDesafio(desafio) {
  const remocao = dataRemocaoDesafio(desafio);
  if (desafio.tipo === 'build') {
    return [
      { nome: 'Classificatória', ate: desafio.fim, texto: 'Inscrições abertas. Os votos escolhem as 4 melhores builds.' },
      { nome: 'Semifinal', ate: desafio.fim_semifinal, texto: 'Até 4 builds. Os votos recomeçam do zero.' },
      { nome: 'Final', ate: desafio.fim_final, texto: 'Duelo entre 2 builds. A mais votada vence.' },
      { nome: 'Resultado', ate: remocao, texto: `O vencedor recebe ${desafio.pontos} pts. Depois o desafio é removido.` },
    ];
  }
  return [
    { nome: 'Envio das provas', ate: desafio.fim, texto: 'Envie sua prova. A comunidade comenta e o ADM confere.' },
    { nome: 'Análise final do ADM', ate: remocao, texto: `Provas aprovadas recebem ${desafio.pontos} pts. Depois o desafio é removido.` },
  ];
}

function etapaAtual(desafio, agora) {
  if (agora < Date.parse(desafio.inicio)) return -1;
  if (desafio.tipo === 'build') return desafio.etapa;
  return agora < Date.parse(desafio.fim) ? 0 : 1;
}

function orientacao(desafio, atual) {
  const data = formatarDataRanking;
  if (atual === -1) return `As inscrições abrem em ${data(desafio.inicio)}.`;
  if (desafio.tipo === 'build') {
    return [
      `Envie sua build e vote nas builds da comunidade até ${data(desafio.fim)}.`,
      `Semifinal: vote nas builds classificadas até ${data(desafio.fim_semifinal)}.`,
      `Final: vote na sua favorita entre as duas finalistas até ${data(desafio.fim_final)}.`,
      `Competição encerrada. Este desafio sai do site em ${data(dataRemocaoDesafio(desafio))}; os pontos ficam.`,
    ][atual];
  }
  return atual === 0
    ? `Envie sua prova até ${data(desafio.fim)}. O ADM confere e concede os pontos.`
    : `Inscrições encerradas. O ADM finaliza as análises; o desafio sai do site em ${data(dataRemocaoDesafio(desafio))}.`;
}

export default function LinhaDoTempoDesafio({ desafio, agora }) {
  const etapas = etapasDoDesafio(desafio);
  const atual = etapaAtual(desafio, agora);
  return (
    <section className="ranking-linha-tempo" aria-labelledby={`linha-tempo-${desafio.id}`}>
      <h3 id={`linha-tempo-${desafio.id}`}>Etapas do desafio</h3>
      <p className="ranking-agora" role="status"><strong>Agora</strong>{orientacao(desafio, atual)}</p>
      <ol>
        <li className={atual === -1 ? 'atual' : 'concluida'} aria-current={atual === -1 ? 'step' : undefined}>
          <span className="ranking-linha-marcador" aria-hidden="true" />
          <strong>Início</strong>
          <time dateTime={desafio.inicio}>{formatarDataRanking(desafio.inicio)}</time>
          <span>Desafio publicado e aguardando abertura.</span>
        </li>
        {etapas.map((etapa, index) => {
          const estado = index < atual ? 'concluida' : index === atual ? 'atual' : '';
          return (
            <li key={etapa.nome} className={estado} aria-current={estado === 'atual' ? 'step' : undefined}>
              <span className="ranking-linha-marcador" aria-hidden="true" />
              <strong>{etapa.nome}</strong>
              <time dateTime={etapa.ate}>até {formatarDataRanking(etapa.ate)}</time>
              <span>{etapa.texto}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
