import { useState } from 'react';
import { executarRanking, prepararDesafio } from '../../services/ranking';
import RegrasBuild from './RegrasBuild';

const jogos = [
  'Dark Souls Remastered',
  'Dark Souls II',
  'Dark Souls III',
  'Elden Ring',
  'Elden Ring Nightreign',
  'Bloodborne',
  "Demon's Souls",
  'Sekiro: Shadows Die Twice',
  'Lies of P',
];

function dataLocal(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  return new Date(data.getTime() - data.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function FormularioDesafio({ desafio, aoSalvar, aoFechar }) {
  const [formulario, setFormulario] = useState(() => ({
    titulo: desafio?.titulo || '', descricao: desafio?.descricao || '', jogo: desafio?.jogo || '',
    tipo: desafio?.tipo || 'conquista', pontos: desafio?.pontos || 100,
    inicio: dataLocal(desafio?.inicio), fim: dataLocal(desafio?.fim),
    fim_semifinal: dataLocal(desafio?.fim_semifinal), fim_final: dataLocal(desafio?.fim_final),
  }));
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  function alterar(event) {
    setFormulario((anterior) => ({ ...anterior, [event.target.name]: event.target.value }));
  }
  async function salvar(event) {
    event.preventDefault();
    if (ocupado) return;
    setOcupado(true);
    setErro('');
    try {
      const id = await executarRanking('ranking_salvar_desafio', {
        p_dados: prepararDesafio(formulario), p_id: desafio?.id || null,
      });
      await aoSalvar(id);
      aoFechar();
    } catch (error) {
      setErro(error.message);
    } finally {
      setOcupado(false);
    }
  }
  return (
    <form className="ranking-formulario ranking-formulario-adm" onSubmit={salvar}>
      <header className="ranking-form-header">
        <span className="ranking-secao-label">Administração</span>
      <h2>{desafio ? 'Editar desafio agendado' : 'Lançar desafio'}</h2>
      <p>Defina o objetivo, a premiação e o calendário da disputa.</p>
      </header>
      <fieldset disabled={ocupado}>
        <legend className="ranking-secao-label">O desafio</legend>
        <label>Título<input name="titulo" placeholder="Ex.: Malenia sem tomar dano" value={formulario.titulo} onChange={alterar} required minLength={3} maxLength={160} /></label>
        <div className="ranking-form-grid">
        <label>Jogo<select name="jogo" value={formulario.jogo} onChange={alterar} required>
          <option value="">Selecione o jogo</option>
          {formulario.jogo && !jogos.includes(formulario.jogo) && <option value={formulario.jogo}>{formulario.jogo}</option>}
          {jogos.map((jogo) => <option key={jogo} value={jogo}>{jogo}</option>)}
        </select></label>
        <label>Modalidade<select name="tipo" value={formulario.tipo} onChange={alterar}>
          <option value="conquista">Desafio de conquista — aprovação do ADM</option>
          <option value="build">Competição de builds — votação por etapas</option>
        </select></label>
        </div>
        {formulario.tipo === 'build' && <RegrasBuild />}
        <label>{formulario.tipo === 'build' ? 'Objetivo e regras específicas do desafio' : 'Regras e provas exigidas'}<textarea name="descricao" placeholder={formulario.tipo === 'build' ? 'Ex.: montar uma build de mago para PvE, sem itens de DLC. As regras padrão já aparecem automaticamente.' : 'Explique o objetivo, as restrições e o que o jogador precisa mostrar para validar a participação.'} value={formulario.descricao} onChange={alterar} required minLength={10} maxLength={6000} /></label>
      </fieldset>
      <fieldset disabled={ocupado}>
        <legend className="ranking-secao-label">Pontuação</legend>
        <div className="ranking-form-grid">
        <label>{formulario.tipo === 'build' ? 'Prêmio do vencedor no ranking geral' : 'Pontos por conclusão aprovada'}
          <input name="pontos" type="number" min="1" max="100000" required value={formulario.pontos} onChange={alterar} />
        </label>
        </div>
        <p className="ranking-form-nota">{formulario.tipo === 'build' ? 'Votos só definem quem avança de etapa. Apenas o vencedor recebe pontos no ranking geral.' : 'Os pontos são concedidos após a aprovação da prova pelo ADM.'}</p>
      </fieldset>
      <fieldset disabled={ocupado}>
        <legend className="ranking-secao-label">Calendário</legend>
        <p className="ranking-form-nota">Horário local. Regras e prêmios não podem ser alterados depois do início. Três dias após o fim, o desafio e as participações são removidos; os pontos concedidos continuam no ranking.</p>
        <div className="ranking-form-grid">
          <label>Início<input name="inicio" type="datetime-local" required value={formulario.inicio} onChange={alterar} /></label>
          <label>{formulario.tipo === 'build' ? 'Fim da classificatória e das inscrições' : 'Fim das inscrições e votos'}<input name="fim" type="datetime-local" required value={formulario.fim} onChange={alterar} /></label>
          {formulario.tipo === 'build' && <>
            <label>Fim da semifinal (até 4 builds)<input name="fim_semifinal" type="datetime-local" required value={formulario.fim_semifinal} onChange={alterar} /></label>
            <label>Fim da final (duelo entre 2 builds)<input name="fim_final" type="datetime-local" required value={formulario.fim_final} onChange={alterar} /></label>
          </>}
        </div>
      </fieldset>
      {erro && <p className="ranking-erro" role="alert">{erro}</p>}
      <div className="ranking-acoes">
        <button className="ranking-botao-principal" type="submit" disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar desafio'}</button>
        <button type="button" disabled={ocupado} onClick={aoFechar}>Cancelar</button>
      </div>
    </form>
  );
}
