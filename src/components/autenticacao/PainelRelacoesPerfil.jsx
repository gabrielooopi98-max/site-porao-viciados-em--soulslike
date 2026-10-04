import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

const ABAS = [
  { id: 'amigos', nome: 'Amigos', plural: 'amigos' },
  { id: 'seguindo', nome: 'Seguindo', plural: 'seguindo' },
  { id: 'seguidores', nome: 'Seguidores', plural: 'seguidores' },
];

export default function PainelRelacoesPerfil({
  usuarioId,
  usuarioNome,
  visualizadorId,
  abaInicial,
  contagens,
  aoFechar,
  aoAlterarContagem,
}) {
  const navigate = useNavigate();
  const dialogoRef = useRef(null);
  const buscaRef = useRef(null);
  const [aba, setAba] = useState(abaInicial);
  const [lista, setLista] = useState({ aba: null, pessoas: [], carregando: true, erro: '' });
  const [busca, setBusca] = useState('');
  const [removendoId, setRemovendoId] = useState(null);
  const [erroAcao, setErroAcao] = useState('');
  const proprioPerfil = usuarioId === visualizadorId;
  const abaAtual = ABAS.find((item) => item.id === aba) || ABAS[0];
  const carregando = lista.aba !== aba || lista.carregando;
  const erro = lista.aba === aba ? lista.erro : '';
  const pessoasVisiveis = useMemo(() => {
    const consulta = busca.trim().toLocaleLowerCase();
    const pessoas = lista.aba === aba ? lista.pessoas : [];
    return consulta
      ? pessoas.filter((pessoa) => pessoa.nome.toLocaleLowerCase().includes(consulta))
      : pessoas;
  }, [aba, busca, lista]);

  useEffect(() => {
    let ativo = true;

    supabase.rpc('perfil_listar_relacoes', { p_usuario: usuarioId, p_tipo: aba })
      .then(({ data, error: erroConsulta }) => {
        if (!ativo) return;
        if (erroConsulta) {
          console.error('Erro ao carregar relações do perfil:', erroConsulta);
          setLista({ aba, pessoas: [], carregando: false, erro: 'Não foi possível carregar esta lista. Tente novamente.' });
        } else {
          setLista({ aba, pessoas: data ?? [], carregando: false, erro: '' });
        }
      })
      .catch((erroConsulta) => {
        if (!ativo) return;
        console.error('Erro ao carregar relações do perfil:', erroConsulta);
        setLista({ aba, pessoas: [], carregando: false, erro: 'Não foi possível carregar esta lista. Tente novamente.' });
      });

    return () => { ativo = false; };
  }, [aba, usuarioId]);

  useEffect(() => {
    const anterior = document.activeElement;
    document.body.classList.add('perfil-relacoes-modal-aberto');
    buscaRef.current?.focus();

    function tratarTecla(evento) {
      if (evento.key === 'Escape') {
        aoFechar();
        return;
      }
      if (evento.key !== 'Tab' || !dialogoRef.current) return;
      const focaveis = [...dialogoRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
      if (!focaveis.length) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', tratarTecla);
    return () => {
      document.body.classList.remove('perfil-relacoes-modal-aberto');
      document.removeEventListener('keydown', tratarTecla);
      anterior?.focus?.();
    };
  }, [aoFechar]);

  async function removerRelacao(pessoa) {
    if (!proprioPerfil || removendoId) return;
    setRemovendoId(pessoa.usuario_id);
    setErroAcao('');
    try {
      let resultado;
      if (aba === 'amigos') {
        resultado = await supabase.from('amizades')
          .delete()
          .eq('id', pessoa.relacao_id)
          .eq('status', 'aceita');
      } else if (aba === 'seguindo') {
        resultado = await supabase.from('seguidores')
          .delete()
          .eq('id', pessoa.relacao_id)
          .eq('seguidor_id', usuarioId);
      } else {
        resultado = await supabase.rpc('perfil_remover_seguidor', { p_seguidor: pessoa.usuario_id });
      }

      if (resultado.error) throw resultado.error;
      setLista((atual) => ({
        ...atual,
        pessoas: atual.pessoas.filter((item) => item.usuario_id !== pessoa.usuario_id),
      }));
      aoAlterarContagem?.(aba, -1);
    } catch (erroRemocao) {
      console.error('Erro ao remover relação do perfil:', erroRemocao);
      setErroAcao('Não foi possível remover esta relação. Tente novamente.');
    } finally {
      setRemovendoId(null);
    }
  }

  return (
    <div className="perfil-relacoes-overlay" onMouseDown={(evento) => {
      if (evento.target === evento.currentTarget) aoFechar();
    }}>
      <section
        className="perfil-relacoes-dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="perfil-relacoes-titulo"
        ref={dialogoRef}
        tabIndex={-1}
      >
        <header className="perfil-relacoes-cabecalho">
          <h2 id="perfil-relacoes-titulo">{usuarioNome}</h2>
          <button className="perfil-relacoes-fechar" type="button" aria-label="Fechar painel" onClick={aoFechar}>×</button>
        </header>
        <div className="perfil-relacoes-abas" role="tablist" aria-label="Relações do perfil">
          {ABAS.map((item) => (
            <button
              key={item.id}
              id={`perfil-relacoes-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={aba === item.id}
              aria-controls="perfil-relacoes-lista"
              onClick={() => { setBusca(''); setErroAcao(''); setAba(item.id); }}
            >
              {item.nome} <span>({contagens[item.id] ?? 0})</span>
            </button>
          ))}
        </div>
        <label className="perfil-relacoes-busca">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
          <input
            ref={buscaRef}
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder={`Pesquisar ${abaAtual.plural}`}
            aria-label={`Pesquisar ${abaAtual.plural}`}
          />
        </label>
        <div
          className="perfil-relacoes-lista"
          id="perfil-relacoes-lista"
          role="tabpanel"
          aria-labelledby={`perfil-relacoes-tab-${aba}`}
        >
          {erroAcao && <p className="perfil-relacoes-mensagem" role="alert">{erroAcao}</p>}
          {carregando ? (
            <p className="perfil-relacoes-mensagem" role="status">Carregando {abaAtual.plural}...</p>
          ) : erro ? (
            <p className="perfil-relacoes-mensagem" role="alert">{erro}</p>
          ) : pessoasVisiveis.length ? pessoasVisiveis.map((pessoa) => (
            <article className="perfil-relacao-pessoa" key={pessoa.usuario_id}>
              <button className="perfil-relacao-identidade" type="button" onClick={() => {
                aoFechar();
                navigate(`/perfil/${pessoa.usuario_id}`);
              }}>
                {pessoa.avatar_url
                  ? <img src={pessoa.avatar_url} alt="" loading="lazy" />
                  : <span className="perfil-relacao-avatar-vazio" aria-hidden="true">{pessoa.nome.slice(0, 1).toUpperCase()}</span>}
                <strong>{pessoa.nome}</strong>
              </button>
              {proprioPerfil ? (
                <button
                  className="perfil-relacao-acao"
                  type="button"
                  disabled={removendoId !== null}
                  onClick={() => removerRelacao(pessoa)}
                >
                  {removendoId === pessoa.usuario_id ? 'Removendo...' : 'Remover'}
                </button>
              ) : (
                <button className="perfil-relacao-acao" type="button" onClick={() => {
                  aoFechar();
                  navigate(`/perfil/${pessoa.usuario_id}`);
                }}>
                  Ver perfil
                </button>
              )}
            </article>
          )) : (
            <p className="perfil-relacoes-mensagem">
              {busca ? 'Nenhuma pessoa encontrada.' : `Ainda não há ${abaAtual.plural} para mostrar.`}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
