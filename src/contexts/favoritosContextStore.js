import { createContext, useContext } from 'react';

export const FavoritosContext = createContext(null);

export function useFavoritos() {
    const contexto = useContext(FavoritosContext);
    if (!contexto) throw new Error('useFavoritos precisa de FavoritosProvider.');
    return contexto;
}
