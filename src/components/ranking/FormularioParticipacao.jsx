import { useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import AnexosPublicacao from '../AnexosPublicacao';
import { enviarMidias, removerUploads } from '../../services/midiasPublicacoes';
import { executarRanking, pastaMidiasRanking } from '../../services/ranking';
import RegrasBuild from './RegrasBuild';
import '../painel-criar-post/PainelCriarPost.css';

export default function FormularioParticipacao({ desafio, aoPublicar, aoFechar }) {
  const { user } = useAuth();
  const [midias, setMidias] = useState([]);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [status, setStatus] = useState('');
  async function publicar(event) {
    event.preventDefault();
    if (ocupado) return;
    setOcupado(true);
    setErro('');
    let enviadas = [];
    let persistiu = false;
    try {
      if (midias.length > 8) throw new Error('Envie no máximo oito imagens ou vídeos.');
      if (midias.some((arquivo) => !/^(image|video)\//.test(arquivo.type))) throw new Error('Escolha somente imagens e vídeos.');
      const campos = new FormData(event.currentTarget);
      enviadas = await enviarMidias(midias, setStatus, pastaMidiasRanking(user.id));
      await executarRanking('ranking_publicar', {
        p_desafio: desafio.id,
        p_dados: {
          titulo: campos.get('titulo'), descricao: campos.get('descricao'), midias: enviadas,
          atributos: desafio.tipo === 'build' ? {
            nivel: campos.get('nivel'), foco: campos.get('foco'), equipamentos: campos.get('equipamentos'),
          } : {},
        },
      });
      persistiu = true;
      await aoPublicar();
      aoFechar();
    } catch (error) {
      if (!persistiu) await removerUploads(enviadas);
      setErro(error.message);
    } finally {
      setOcupado(false);
      setStatus('');
    }
  }
  return (
    <form className="ranking-formulario" onSubmit={publicar}>
      <h3>{desafio.tipo === 'build' ? 'Publicar build concorrente' : 'Publicar desafio concluído'}</h3>
      <p>Uma participação por pessoa neste desafio. Confira as regras antes de enviar: a prova não poderá ser alterada depois.</p>
      {desafio.tipo === 'build' && <RegrasBuild />}
      <fieldset disabled={ocupado}>
        <label>{desafio.tipo === 'build' ? 'Nome da build' : 'Título'}<input name="titulo" required minLength={3} maxLength={160} /></label>
        <label>Descrição e prova do desafio<textarea name="descricao" required minLength={10} maxLength={6000} /></label>
        {desafio.tipo === 'build' && <>
          <div className="ranking-form-grid">
            <label>Nível<input name="nivel" type="number" min="1" max="9999" /></label>
            <label>Foco / atributos<input name="foco" maxLength={200} placeholder="Ex.: Inteligência 60, vigor 40…" /></label>
          </div>
          <label>Equipamentos e estratégia<textarea name="equipamentos" maxLength={2000} placeholder="Armas e melhorias, itens, consumíveis, magias e milagres utilizados. Explique como usar a build." /></label>
        </>}
        <AnexosPublicacao id="ranking-anexos" midias={midias} setMidias={setMidias} publicando={ocupado}
          titulo="Anexe sua prova" descricao="Até oito imagens ou vídeos. Siga o que o ADM pediu nas regras." />
      </fieldset>
      {status && <p role="status">{status}</p>}
      {erro && <p className="ranking-erro" role="alert">{erro}</p>}
      <div className="ranking-acoes">
        <button type="submit" disabled={ocupado}>{ocupado ? 'Publicando…' : 'Enviar para avaliação'}</button>
        <button type="button" disabled={ocupado} onClick={aoFechar}>Cancelar</button>
      </div>
    </form>
  );
}
