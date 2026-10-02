import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../services/supabase';
import './MensagensHeader.css';

function ContadorMensagens({ usuarioId }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [quantidade, setQuantidade] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    let carregando = false;
    let atualizarNovamente = false;

    async function atualizarContador() {
      if (!ativo) return;
      if (carregando) {
        atualizarNovamente = true;
        return;
      }
      carregando = true;
      do {
        atualizarNovamente = false;
        try {
          const { count, error } = await supabase
            .from('mensagens_privadas')
            .select('id', { count: 'exact', head: true })
            .eq('destinatario_id', usuarioId)
            .is('lida_em', null);

          if (!ativo) return;
          if (error || count === null) {
            console.error('Não foi possível contar mensagens não lidas:', error ?? 'Contagem indisponível.');
            setErro(true);
          } else {
            setQuantidade(count);
            setErro(false);
          }
        } catch (error) {
          if (!ativo) return;
          console.error('Não foi possível contar mensagens não lidas:', error);
          setErro(true);
        }
      } while (ativo && atualizarNovamente);
      carregando = false;
    }

    const canal = supabase
      .channel(`contador-mensagens-${usuarioId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensagens_privadas',
        filter: `destinatario_id=eq.${usuarioId}`,
      }, atualizarContador)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'mensagens_privadas',
        filter: `destinatario_id=eq.${usuarioId}`,
      }, atualizarContador)
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'mensagens_privadas',
      }, atualizarContador)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') atualizarContador();
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Não foi possível atualizar o contador de mensagens em tempo real:', status);
          if (ativo) setErro(true);
        }
      });

    atualizarContador();
    window.addEventListener('focus', atualizarContador);
    window.addEventListener('mensagens-privadas-lidas', atualizarContador);
    return () => {
      ativo = false;
      window.removeEventListener('focus', atualizarContador);
      window.removeEventListener('mensagens-privadas-lidas', atualizarContador);
      supabase.removeChannel(canal);
    };
  }, [usuarioId, pathname]);

  const descricao = erro
    ? 'Mensagens — não foi possível atualizar o contador'
    : quantidade > 0
      ? `Mensagens — ${quantidade} ${quantidade === 1 ? 'mensagem não lida' : 'mensagens não lidas'}`
      : 'Mensagens';

  return (
    <button
      className="btn-filtro btn-mensagens-header"
      type="button"
      aria-label={descricao}
      title={descricao}
      onClick={() => navigate('/mensagens')}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 11.5a8 8 0 0 1-8 8H5l-4 3 1.5-6A8 8 0 1 1 20 11.5Z" />
        <path d="M7 11h8M7 14h5" />
      </svg>
      {erro ? (
        <strong className="mensagens-header-erro" aria-hidden="true">!</strong>
      ) : quantidade > 0 && (
        <strong aria-hidden="true">{quantidade > 99 ? '99+' : quantidade}</strong>
      )}
    </button>
  );
}

export default function MensagensHeader() {
  const { user } = useAuth();
  return user ? <ContadorMensagens key={user.id} usuarioId={user.id} /> : null;
}
