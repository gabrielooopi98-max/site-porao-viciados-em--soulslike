import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/useAuth';
import { validarNomeExibicao } from '../../services/moderacaoConteudo';

function obterMensagemErroAutenticacao(error, modoCadastro) {
  const codigo = String(error?.code ?? '').toLowerCase();
  const mensagem = String(error?.message ?? '').toLowerCase();

  if (
    codigo.includes('user_already_exists') ||
    mensagem.includes('already registered') ||
    mensagem.includes('already been registered')
  ) {
    return 'Este e-mail já possui uma conta. Entre com sua senha.';
  }

  if (
    codigo.includes('email_not_confirmed') ||
    mensagem.includes('email not confirmed')
  ) {
    return 'Confirme seu e-mail pelo link enviado antes de entrar.';
  }

  if (codigo.includes('invalid') && mensagem.includes('email')) {
    return 'Digite um e-mail válido.';
  }

  if (
    codigo.includes('weak_password') ||
    mensagem.includes('password')
  ) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }

  return modoCadastro
    ? 'Não foi possível criar a conta. Confira os dados e tente novamente.'
    : 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
}

function PaginaLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const returnTo = location.state?.returnTo === '/chat' ? '/chat' : '/';
  const veioDoChat = returnTo === '/chat';

  const [modoCadastro, setModoCadastro] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  async function enviarFormulario(evento) {
    evento.preventDefault();

    setErro('');
    setAviso('');
    setCarregando(true);

    try {
      if (modoCadastro) {
        const erroNome = validarNomeExibicao(nome);
        if (erroNome) {
          setErro(erroNome);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            emailRedirectTo: `${window.location.origin}/configurar-perfil`,
            data: {
              display_name: nome.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.user?.identities?.length === 0) {
          throw { code: 'user_already_exists' };
        }

        if (!data.session) {
          setAviso('Conta criada. Confirme seu e-mail para continuar.');
          return;
        }

        navigate('/configurar-perfil', { replace: true });
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });

        if (error) throw error;
      }

      navigate(returnTo, { replace: true });

    } catch (error) {
      console.error('Erro de autenticação:', error);

      setErro(
        obterMensagemErroAutenticacao(error, modoCadastro)
      );

    } finally {
      setCarregando(false);
    }
  }

  async function sairDaConta() {
    const { error } = await signOut();

    if (error) {
      setErro('Não foi possível sair da conta agora.');
    }
  }

  function irParaLogin() {
    setModoCadastro(false);
    setErro('');
    setAviso('');
  }

  function irParaCadastro() {
    setModoCadastro(true);
    setErro('');
    setAviso('');
  }

  return (
    <main className="autenticacao-page">

      <section
        className={`autenticacao-painel ${user ? 'painel-conta' : ''}`}
        aria-labelledby="titulo-autenticacao"
      >

        {/* =========================
            USUÁRIO LOGADO
        ========================= */}

        {user ? (

          <>
            <span className="banner-kicker">
              Viciados em Souls
            </span>

            <h1 id="titulo-autenticacao">
              Sua conta
            </h1>

            <div className="autenticacao-sessao">

              <p>
                Conectado como{' '}
                <strong>
                  {user.user_metadata?.display_name || user.email}
                </strong>
              </p>

              <button
                className="btn-criar-post"
                type="button"
                onClick={sairDaConta}
              >
                Sair da conta
              </button>

            </div>
          </>

        ) : (

          /* =========================
             LOGIN + CADASTRO
          ========================= */

          <div
            className={`container-login ${modoCadastro ? 'modo-cadastro' : ''
              }`}
          >

            {/* =================================================
                LADO DO LOGIN
            ================================================= */}

            <div className="form-side caixa-login">

              <button
                className="btn-filtro autenticacao-voltar"
                type="button"
                onClick={() => navigate(returnTo)}
              >
                {veioDoChat ? 'Voltar ao chat' : 'Voltar à comunidade'}
              </button>

              <h1 id="titulo-autenticacao">
                Entrar
              </h1>

              <p className="autenticacao-descricao">
                Entre para continuar na comunidade.
              </p>


              <form
                className="autenticacao-form"
                onSubmit={enviarFormulario}
              >
                <label>
                  E-mail

                  <input
                    autoComplete="email"
                    type="email"
                    required
                    value={email}
                    onChange={(evento) =>
                      setEmail(evento.target.value)
                    }
                  />
                </label>

                <label>
                  Senha

                  <input
                    autoComplete="current-password"
                    type="password"
                    minLength={6}
                    required
                    value={senha}
                    onChange={(evento) =>
                      setSenha(evento.target.value)
                    }
                  />
                </label>

                {erro && !modoCadastro && (
                  <p
                    className="autenticacao-erro"
                    role="alert"
                  >
                    {erro}
                  </p>
                )}

                {aviso && !modoCadastro && (
                  <p
                    className="autenticacao-aviso"
                    role="status"
                  >
                    {aviso}
                  </p>
                )}

                <button
                  className="btn-criar-post autenticacao-enviar"
                  type="submit"
                  disabled={carregando}
                >
                  {carregando
                    ? 'Aguarde...'
                    : 'Entrar'}
                </button>

              </form>
            </div>


            {/* =================================================
                LADO DO CADASTRO
            ================================================= */}

            <div className="form-side caixa-cadastro">

              <button
                className="btn-filtro autenticacao-voltar"
                type="button"
                onClick={() => navigate(returnTo)}
              >
                {veioDoChat ? 'Voltar ao chat' : 'Voltar à comunidade'}
              </button>

              <h1>
                Criar conta
              </h1>

              <p className="autenticacao-descricao">
                Crie sua conta para participar da comunidade.
              </p>

              <form
                className="autenticacao-form"
                onSubmit={enviarFormulario}
              >

                <label>
                  Nome de exibição

                  <input
                    autoComplete="nickname"
                    maxLength={32}
                    required
                    value={nome}
                    onChange={(evento) =>
                      setNome(evento.target.value)
                    }
                  />
                </label>

                <label>
                  E-mail

                  <input
                    autoComplete="email"
                    type="email"
                    required
                    value={email}
                    onChange={(evento) =>
                      setEmail(evento.target.value)
                    }
                  />
                </label>


                <label>
                  Senha

                  <input
                    autoComplete="new-password"
                    type="password"
                    minLength={6}
                    required
                    value={senha}
                    onChange={(evento) =>
                      setSenha(evento.target.value)
                    }
                  />
                </label>


                {erro && modoCadastro && (
                  <p
                    className="autenticacao-erro"
                    role="alert"
                  >
                    {erro}
                  </p>
                )}


                {aviso && modoCadastro && (
                  <p
                    className="autenticacao-aviso"
                    role="status"
                  >
                    {aviso}
                  </p>
                )}


                <button
                  className="btn-criar-post autenticacao-enviar"
                  type="submit"
                  disabled={carregando}
                >
                  {carregando
                    ? 'Aguarde...'
                    : 'Criar conta'}
                </button>


              </form>

            </div>


            {/* =================================================
                OVERLAY
            ================================================= */}

            <div className="overlay-container">

              <div className="overlay">

                <div className="overlay-painel overlay-esquerdo">

                  <span className="banner-kicker">
                    Viciados em Souls
                  </span>

                  <h2>
                    Bem-vindo de volta!
                  </h2>

                  <p>
                    Entre com seu e-mail e senha
                    para continuar na comunidade.
                  </p>

                  <button
                    className="btn-outline"
                    type="button"
                    onClick={irParaLogin}
                  >
                    Entrar
                  </button>
                </div>

                <div className="overlay-painel overlay-direita">

                  <span className="banner-kicker">
                    Viciados em Souls
                  </span>

                  <h2>
                    Novo por aqui?
                  </h2>

                  <p>
                    Crie sua conta e comece
                    a participar da comunidade.
                  </p>

                  <button
                    className="btn-outline"
                    type="button"
                    onClick={irParaCadastro}
                  >
                    Criar conta
                  </button>
                </div>
              </div>
            </div>
          </div>

        )}
      </section>
    </main>
  );
}

export default PaginaLogin;