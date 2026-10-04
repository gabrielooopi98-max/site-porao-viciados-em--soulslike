import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import { supabase } from '../../services/supabase';
import PresencaPerfilContext from './presencaPerfilContext';

export function PresencaPerfilProvider({ children }) {
  const { user } = useAuth();
  const [presenca, setPresenca] = useState({ usuarioId: null, usuariosOnline: null });

  useEffect(() => {
    let ativo = true;
    const canal = supabase.channel('presenca-perfis');

    function atualizarPresenca() {
      if (!ativo) return;
      const ids = Object.values(canal.presenceState())
        .flat()
        .map((registro) => registro.user_id)
        .filter(Boolean);
      setPresenca({ usuarioId: user?.id ?? null, usuariosOnline: new Set(ids) });
    }

    canal
      .on('presence', { event: 'sync' }, atualizarPresenca)
      .on('presence', { event: 'join' }, atualizarPresenca)
      .on('presence', { event: 'leave' }, atualizarPresenca)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          if (user?.id) {
            const { error } = await canal.track({ user_id: user.id });
            if (error) console.error('Não foi possível publicar presença do perfil:', error);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Falha ao conectar presença dos perfis:', status);
        }
      });

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, [user?.id]);

  const usuariosOnline = presenca.usuarioId === (user?.id ?? null) ? presenca.usuariosOnline : null;

  return (
    <PresencaPerfilContext.Provider value={usuariosOnline}>
      {children}
    </PresencaPerfilContext.Provider>
  );
}
