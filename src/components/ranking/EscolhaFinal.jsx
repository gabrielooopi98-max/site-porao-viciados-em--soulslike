import { useState } from 'react';
import { agruparFinais, executarRanking } from '../../services/ranking';
import './FinaisRanking.css';

export function SeloFinal({ final }) {
  return (
    <p className="ranking-selo-final">
      <span>Título conquistado</span>
      <strong>{final.titulo}</strong>
      <small>{final.final} · {final.jogo}</small>
    </p>
  );
}

export default function EscolhaFinal({ finais = [], participacaoId, aoEscolhido }) {
  const [escolhido, setEscolhido] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const final = finais.find((f) => f.id === escolhido);

  async function confirmar(event) {
    event.preventDefault();
    if (!final || ocupado) return;
    if (!window.confirm(`Escolher "${final.titulo}" (${final.final} · ${final.jogo})? O final não poderá ser trocado depois.`)) return;
    setOcupado(true);
    setErro('');
    try {
      await executarRanking('ranking_escolher_final', { p_participacao: participacaoId, p_final: final.id });
      await aoEscolhido?.();
    } catch (error) {
      setErro(error.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form className="ranking-escolha-final" onSubmit={confirmar}>
      <span className="ranking-secao-label">Você venceu a competição</span>
      <h4>Escolha seu final</h4>
      <p>O final escolhido vira o seu título no ranking geral e entra na sua coleção de finais.</p>
      <label>
        Final
        <select value={escolhido} onChange={(event) => setEscolhido(event.target.value)} disabled={ocupado} required>
          <option value="">Escolha seu final…</option>
          {agruparFinais(finais).map(([jogo, lista]) => (
            <optgroup key={jogo} label={jogo}>
              {lista.map((f) => <option key={f.id} value={f.id}>{f.titulo} — {f.final}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      {final && <SeloFinal final={final} />}
      {erro && <p className="ranking-erro" role="alert">{erro}</p>}
      <button className="ranking-botao-principal" type="submit" disabled={!final || ocupado}>
        {ocupado ? 'Salvando…' : 'Finalizar com este final'}
      </button>
    </form>
  );
}
