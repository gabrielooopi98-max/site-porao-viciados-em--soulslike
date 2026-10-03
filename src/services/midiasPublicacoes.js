import { supabase } from './supabase';
import { gerarIdUnico } from '../gerarIdUnico';

export async function removerUploads(midias) {
  const caminhos = midias.map((midia) => midia.caminho).filter(Boolean);
  if (!caminhos.length) return;
  const { error } = await supabase.storage.from('midias').remove(caminhos);
  if (error) console.error('Erro ao remover uploads incompletos:', error);
}

export async function enviarMidias(arquivos, aoAtualizarStatus, pasta = '') {
  const midiasEnviadas = [];
  try {
    for (const [ordem, arquivoOriginal] of arquivos.entries()) {
      let arquivo = arquivoOriginal;
      if (arquivo.type.startsWith('video/')) {
        const { normalizarVideo } = await import('./normalizarVideo');
        arquivo = await normalizarVideo(arquivo, ({ etapa, progresso }) => {
          aoAtualizarStatus(etapa === 'carregando'
            ? `Preparando o vídeo ${ordem + 1} de ${arquivos.length}...`
            : `Convertendo vídeo ${ordem + 1} de ${arquivos.length}... ${progresso}%`);
        });
      }
      aoAtualizarStatus(`Enviando mídia ${ordem + 1} de ${arquivos.length}...`);
      const extensao = arquivo.name.split('.').pop()?.toLowerCase() || 'bin';
      const caminho = `${pasta}${gerarIdUnico()}.${extensao}`;
      const { error } = await supabase.storage.from('midias').upload(caminho, arquivo);
      if (error) throw new Error(`Falha ao enviar ${arquivo.name}: ${error.message || error.name || 'erro desconhecido'}`);
      const { data } = supabase.storage.from('midias').getPublicUrl(caminho);
      midiasEnviadas.push({ caminho, midia_url: data.publicUrl, tipo_midia: arquivo.type, ordem });
    }
    return midiasEnviadas;
  } catch (error) {
    await removerUploads(midiasEnviadas);
    throw error;
  }
}
