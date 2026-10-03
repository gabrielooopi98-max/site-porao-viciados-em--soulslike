import { Link } from 'react-router-dom';
import { useState } from 'react';
import { etapaDesafio, formatarDataRanking } from '../../services/ranking';

export default function AvisosDesafios({ aoAbrir, dados, erro, marcarLido }) {
  const [erroLeitura, setErroLeitura] = useState('');
  const [abrindo, setAbrindo] = useState(null);
  async function abrir(event, desafio) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (abrindo) return;
    setAbrindo(desafio.id);
    setErroLeitura('');
    try {
      if (desafio.lido === false) await marcarLido(desafio.id);
      aoAbrir(desafio.id);
    } catch (error) {
      setErroLeitura(error.message);
    } finally {
      setAbrindo(null);
    }
  }
  return (
    <div className="avisos-desafios-reais">
      {!dados && !erro && <p className="avisos-vazio" role="status">Carregando desafios…</p>}
      {erro && <p className="avisos-erro" role="alert">{erro}</p>}
      {erroLeitura && <p className="avisos-erro" role="alert">{erroLeitura}</p>}
      {dados && !erro && <>
        {dados.desafios.length === 0 && <p className="avisos-vazio">Nenhum desafio publicado ainda.</p>}
        {dados.desafios.map((d) => <div className={`aviso-item ${d.lido === false ? 'nao-lido' : ''}`} key={d.id}>
          <Link className="aviso-item-abrir" to={`/ranking?desafio=${d.id}`} onClick={(event) => abrir(event, d)} aria-busy={abrindo === d.id}>
            {d.lido === false && <span className="desafio-aviso-novo">Novo · Você ainda não viu</span>}
            <strong>{d.titulo}</strong>
            <small>{d.jogo} · {etapaDesafio(d, Date.parse(dados.agora))} · {d.pontos} pts de prêmio</small>
            <time>Início: {formatarDataRanking(d.inicio)}<br />Fim: {formatarDataRanking(d.tipo === 'build' ? d.fim_final : d.fim)}</time>
          </Link>
        </div>)}
      </>}
    </div>
  );
}
