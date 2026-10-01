import { useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../services/supabase';

function PresencaMensagensPrivadas() {
  const { user } = useAuth();
  const usuarioId = user?.id;

  useEffect(() => {
    if (!usuarioId) return undefined;

    const canal = supabase.channel(`private-friend-presence:${usuarioId}`, {
      config: { private: true, presence: { key: usuarioId } },
    });

    canal.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const { error } = await canal.track({ user_id: usuarioId });
        if (error) console.error('Não foi possível publicar presença:', error);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('Falha ao conectar presença das mensagens privadas:', status);
      }
    });

    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuarioId]);

  return null;
}

export default PresencaMensagensPrivadas;
