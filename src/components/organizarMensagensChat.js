export function rotuloDoDia(data) {
  const dia = new Date(data);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  if (dia.toDateString() === hoje.toDateString()) return 'Hoje';
  if (dia.toDateString() === ontem.toDateString()) return 'Ontem';
  return dia.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    ...(dia.getFullYear() !== hoje.getFullYear() && { year: 'numeric' }),
  });
}

export function organizarMensagens(mensagens, campoAutor = 'autor_id') {
  return mensagens.map((mensagem, indice) => {
    const anterior = mensagens[indice - 1];
    const novoDia = !anterior || new Date(anterior.criado_em).toDateString() !== new Date(mensagem.criado_em).toDateString();
    const intervalo = anterior ? new Date(mensagem.criado_em) - new Date(anterior.criado_em) : 0;
    const agrupada = !novoDia && anterior[campoAutor] === mensagem[campoAutor]
      && intervalo >= 0 && intervalo < 5 * 60 * 1000;
    return { mensagem, novoDia, agrupada };
  });
}
