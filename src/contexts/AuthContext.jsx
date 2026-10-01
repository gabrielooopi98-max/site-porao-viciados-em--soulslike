import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { AuthContext } from './authContextStore';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      if (!mounted) return;
      setSession(novaSessao);
      setCarregando(false);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.error('Erro ao recuperar sessão:', error);
      setSession(data?.session ?? null);
      setCarregando(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      session,
      carregando,
      signOut: () => supabase.auth.signOut(),
    }}>
      {children}
    </AuthContext.Provider>
  );
}
