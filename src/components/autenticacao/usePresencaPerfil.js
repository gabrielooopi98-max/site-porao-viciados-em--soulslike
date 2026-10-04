import { useContext } from 'react';
import PresencaPerfilContext from './presencaPerfilContext';

export default function usePresencaPerfil(usuarioId) {
  const usuariosOnline = useContext(PresencaPerfilContext);
  if (!usuarioId || usuariosOnline === null) return null;
  return usuariosOnline?.has(usuarioId) ?? null;
}
