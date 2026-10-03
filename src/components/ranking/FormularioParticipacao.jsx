import { useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import AnexosPublicacao from '../AnexosPublicacao';
import { enviarMidias, removerUploads } from '../../services/midiasPublicacoes';
import { executarRanking, pastaMidiasRanking } from '../../services/ranking';
import RegrasBuild from './RegrasBuild';
import '../painel-criar-post/PainelCriarPost.css';
import './CardsRanking.css';

// Com `participacao`, edita a build ja enviada: sem novos anexos, as midias atuais sao mantidas.
export default function FormularioParticipacao({ desafio, participacao = null, aoPublicar, aoFechar }) {
  const { user } = useAuth();
  const [midias, setMidias] = useState([]);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [status, setStatus] = useState('');
  const editando = Boolean(participacao);
  const atributos = participacao?.atributos || {};
  async function publicar(event) {
    event.preventDefault();
    if (ocupado) return;
    setOcupado(true);
    setErro('');
    let enviadas = [];
    let persistiu = false;
    try {
      const manterMidias = editando && !midias.length;
      if (midias.length > 8) throw new Error('Envie no máximo oito imagens ou vídeos.');
      if (desafio.tipo === 'conquista' && !midias.length) throw new Error('Anexe pelo menos uma imagem ou um vídeo como prova do desafio.');
      if (midias.some((arquivo) => !/^(image|video)\//.test(arquivo.type))) throw new Error('Escolha somente imagens e vídeos.');
      if (desafio.tipo === 'build' && !manterMidias && (!midias.some((arquivo) => arquivo.type.startsWith('image/'))
        || !midias.some((arquivo) => arquivo.type.startsWith('video/')))) {
        throw new Error('Anexe pelo menos uma imagem da build e um vídeo mostrando como ela funciona.');
      }
      const campos = new FormData(event.currentTarget);
      enviadas = await enviarMidias(midias, setStatus, pastaMidiasRanking(user.id));
      const dados = {
        titulo: desafio.tipo === 'build' ? campos.get('titulo') : desafio.titulo,
        descricao: desafio.tipo === 'build' ? campos.get('descricao') : 'Prova do desafio enviada em mídia.',
        ...(manterMidias ? {} : { midias: enviadas }),
        atributos: desafio.tipo === 'build' ? {
          nivel: campos.get('nivel'), foco: campos.get('foco'), equipamentos: campos.get('equipamentos'),
        } : {},
      };
      await (editando
        ? executarRanking('ranking_editar_participacao', { p_participacao: participacao.id, p_dados: dados })
        : executarRanking('ranking_publicar', { p_desafio: desafio.id, p_dados: dados }));
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
    <form className="ranking-formulario rk-formulario" onSubmit={publicar}>
      <span className="rk-rotulo">{desafio.tipo === 'build' ? 'Sua build' : 'Sua prova'}</span>
      <h3>{editando ? 'Editar sua build' : desafio.tipo === 'build' ? 'Publicar build na competição' : 'Enviar prova do desafio'}</h3>
      <p>
        {editando ? 'As alterações aparecem na hora para a comunidade. Os votos que a build já recebeu continuam valendo. '
          : desafio.tipo === 'build' ? 'Uma build por pessoa. Ela entra na disputa assim que você publica, e você pode editá-la ou excluí-la até o fim das inscrições. '
            : 'Uma participação por pessoa. Depois de enviada, ela não pode ser alterada. '}
        Campos com <b className="rk-obrigatorio">*</b> são obrigatórios.
      </p>
      {desafio.tipo === 'build' && <details className="rk-dobra">
        <summary>Confira o que sua build precisa mostrar</summary>
        <div><RegrasBuild semTitulo /></div>
      </details>}
      <fieldset disabled={ocupado}>
        {desafio.tipo === 'build' && <>
          <legend className="rk-etapa-form"><span>1</span>Sobre a build</legend>
          <label><span>Nome da build <b className="rk-obrigatorio">*</b></span><input name="titulo" defaultValue={participacao?.titulo} required minLength={3} maxLength={160} placeholder="Ex.: Cavaleiro de Havel" /></label>
          <label><span>Descrição <b className="rk-obrigatorio">*</b></span><textarea name="descricao" defaultValue={participacao?.descricao} required minLength={10} maxLength={6000} placeholder="Para que serve a build, como jogar com ela e por que ela funciona." /></label>
          <div className="ranking-form-grid">
            <label>Nível<input name="nivel" defaultValue={atributos.nivel ?? ''} type="number" min="1" max="9999" placeholder="Ex.: 120" /></label>
            <label>Foco / atributos<input name="foco" defaultValue={atributos.foco ?? ''} maxLength={200} placeholder="Ex.: Inteligência 60, vigor 40…" /></label>
          </div>
          <label>Equipamentos e estratégia<textarea name="equipamentos" defaultValue={atributos.equipamentos ?? ''} maxLength={2000} placeholder="Armas e melhorias, itens, consumíveis, magias e milagres utilizados. Explique como usar a build." /></label>
        </>}
      </fieldset>
      <fieldset disabled={ocupado}>
        <legend className="rk-etapa-form"><span>{desafio.tipo === 'build' ? 2 : 1}</span>{desafio.tipo === 'build' ? 'Imagem e vídeo' : 'Anexe sua prova'}</legend>
        <AnexosPublicacao id="ranking-anexos" midias={midias} setMidias={setMidias} publicando={ocupado} obrigatorio={!editando}
          titulo={desafio.tipo === 'build' ? 'Imagem e vídeo da build' : 'Anexe sua prova'}
          descricao={editando ? 'Deixe vazio para manter as mídias atuais. Se anexar arquivos, eles substituem todas as mídias (pelo menos uma imagem e um vídeo).'
            : desafio.tipo === 'build' ? 'Obrigatório: pelo menos uma imagem e um vídeo da build em ação. Até oito arquivos no total.' : 'Anexe pelo menos uma imagem ou um vídeo. Até oito arquivos. Siga o que o ADM pediu nas regras.'} />
      </fieldset>
      {status && <p role="status">{status}</p>}
      {erro && <p className="ranking-erro" role="alert">{erro}</p>}
      <div className="rk-acoes">
        <button className="rk-btn rk-btn--principal" type="submit" disabled={ocupado}>{ocupado ? (editando ? 'Salvando…' : 'Publicando…') : editando ? 'Salvar alterações' : desafio.tipo === 'build' ? 'Publicar build' : 'Enviar para o ADM avaliar'}</button>
        <button className="rk-btn" type="button" disabled={ocupado} onClick={aoFechar}>Cancelar</button>
      </div>
    </form>
  );
}
