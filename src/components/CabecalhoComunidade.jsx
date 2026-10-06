import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import AvisosHeader from './AvisosHeader';
import MensagensHeader from './MensagensHeader';
import './CabecalhoComunidade.css';

function IconeMenu({ nome }) {
  const icones = {
    inicio: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    posts: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 12h7M9 16h7" /></>,
    builds: <><path d="m14 6 4-4 4 4-4 4" /><path d="m2 22 12-12" /><path d="m7 7 10 10M4 10l10 10" /></>,
    ranking: <><path d="M8 21h8M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4" /></>,
    batalhas: <><path d="M14.5 17.5 3 6V3h3l11.5 11.5" /><path d="m13 19 6-6M16 16l4 4M19 21l2-2" /></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-2 2v-6.5A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></>,
  };

  return <svg className="header-menu-icone" viewBox="0 0 24 24" aria-hidden="true">{icones[nome]}</svg>;
}

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
                <div className="header-menu-identidade">
                  <div>
                    <span>Menu da comunidade</span>
                    <h2 id="menu-comunidade-titulo">Viciados Em Souls</h2>
                  </div>
                </div>
                <button className="header-menu-botao" type="button" aria-label="Fechar menu" onClick={() => setMenuAberto(false)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                </button>
              </div>
              <div className="header-menu-secao">Navegação</div>
              <nav className="header-menu-links" aria-label="Comunidade">
              <NavLink to="/" end onClick={() => setMenuAberto(false)}>
                <i><IconeMenu nome="inicio" /></i><span>Início</span>
              </NavLink>
              <NavLink to="/posts" onClick={() => setMenuAberto(false)}>
                <i><IconeMenu nome="posts" /></i><span>Posts</span>
              </NavLink>
              <NavLink to="/builds" onClick={() => setMenuAberto(false)}>
                <i><IconeMenu nome="builds" /></i><span>Builds</span>
              </NavLink>
              <NavLink to="/batalhas" onClick={() => setMenuAberto(false)}>
                <i><IconeMenu nome="batalhas" /></i><span>Batalhas</span>
              </NavLink>
              <NavLink to="/ranking" onClick={() => setMenuAberto(false)}>
                <i><IconeMenu nome="ranking" /></i><span>Ranking e desafios</span>
              </NavLink>
              <NavLink to="/chat" onClick={() => setMenuAberto(false)}>
                <i><IconeMenu nome="chat" /></i><span>Chat da comunidade</span>
              </NavLink>
              </nav>
              <div className="header-menu-rodape">
                <span><small>Conta</small><strong>{user ? 'Meu perfil' : 'Não está conectado'}</strong></span>
                <Link to={user ? '/perfil' : '/login'} onClick={() => setMenuAberto(false)}
                  aria-label={user ? 'Abrir meu perfil' : 'Entrar na comunidade'}>{user ? 'Perfil' : 'Entrar'}</Link>
              </div>
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
