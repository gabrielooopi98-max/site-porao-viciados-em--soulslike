import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import AvisosHeader from './AvisosHeader';
import MensagensHeader from './MensagensHeader';
import './CabecalhoComunidade.css';

export default function CabecalhoComunidade() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef(null);
  const botaoRef = useRef(null);
  useEffect(() => {
    if (!menuAberto) return undefined;
    const painel = menuRef.current;
    const botao = botaoRef.current;
    const overflow = document.body.style.overflow;
    painel.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      painel.close();
      document.body.style.overflow = overflow;
      botao?.focus();
    };
  }, [menuAberto]);
  return (
    <header className="area-header">
      <div className="barra-menu">
        <div className="lado-esquerdo header-comunidade-esquerda">
          <div className="header-menu">
            <button className="header-menu-botao" type="button" ref={botaoRef} aria-label="Menu da comunidade"
              aria-expanded={menuAberto} aria-controls="menu-comunidade" onClick={() => setMenuAberto(!menuAberto)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <dialog id="menu-comunidade" className="header-menu-painel" ref={menuRef}
              aria-labelledby="menu-comunidade-titulo"
              onCancel={() => setMenuAberto(false)}
              onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                const rect = event.currentTarget.getBoundingClientRect();
                if (event.clientX < rect.left || event.clientX > rect.right ||
                    event.clientY < rect.top || event.clientY > rect.bottom) setMenuAberto(false);
              }}>
              <div className="header-menu-painel-topo">
                <div><span>Comunidade</span><h2 id="menu-comunidade-titulo">Viciados Em Souls</h2></div>
                <button className="header-menu-botao" type="button" aria-label="Fechar menu" onClick={() => setMenuAberto(false)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                </button>
              </div>
              <nav className="header-menu-links" aria-label="Comunidade">
              <Link to="/" onClick={() => setMenuAberto(false)}>Início</Link>
              <Link to="/posts" onClick={() => setMenuAberto(false)}>Posts</Link>
              <Link to="/builds" onClick={() => setMenuAberto(false)}>Builds</Link>
              <Link to="/ranking" onClick={() => setMenuAberto(false)}>Ranking e desafios</Link>
              <Link to="/chat" onClick={() => setMenuAberto(false)}>Chat da comunidade</Link>
              </nav>
            </dialog>
          </div>
        </div>
        <div className="lado-direito">
          {user ? <>
            <AvisosHeader />
            <MensagensHeader />
            <button className="botao-avatar-header" type="button" aria-label="Abrir perfil" onClick={() => navigate('/perfil')}>
              {user.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="" /> : <span aria-hidden="true">?</span>}
            </button>
          </> : <button className="btn-filtro" type="button" onClick={() => navigate('/login')}>Entrar</button>}
        </div>
      </div>
    </header>
  );
}
