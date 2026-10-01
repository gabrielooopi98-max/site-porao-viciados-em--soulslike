import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gerarIdUnico } from '../../gerarIdUnico';
import { useAuth } from '../../contexts/useAuth';
import { supabase } from '../../services/supabase';
import { validarArquivoAvatar } from '../../services/moderacaoConteudo';

function PaginaConfigurarPerfil() {
  const navigate = useNavigate();
  const { user, carregando } = useAuth();
  const [foto, setFoto] = useState(null);
  const [previewFoto, setPreviewFoto] = useState('');
  const previewUrlRef = useRef('');
  const [zoom, setZoom] = useState(() => Number(user?.user_metadata?.avatar_zoom ?? 1));
  const [posicaoX, setPosicaoX] = useState(() => Number(user?.user_metadata?.avatar_pos_x ?? 50));
  const [posicaoY, setPosicaoY] = useState(() => Number(user?.user_metadata?.avatar_pos_y ?? 50));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const arrastoRef = useRef(null);
  const imagemParaPreview = previewFoto || user?.user_metadata?.avatar_url;

  function iniciarArrasto(evento) {
    if (!imagemParaPreview) return;
    evento.preventDefault();
    evento.currentTarget.setPointerCapture(evento.pointerId);
    arrastoRef.current = {
      x: evento.clientX,
      y: evento.clientY,
      posicaoX,
      posicaoY,
    };
  }

  function moverFoto(evento) {
    if (!arrastoRef.current) return;
    const inicio = arrastoRef.current;
    const limitar = (valor) => Math.max(0, Math.min(100, valor));
    setPosicaoX(limitar(inicio.posicaoX + (evento.clientX - inicio.x) * 0.45));
    setPosicaoY(limitar(inicio.posicaoY + (evento.clientY - inicio.y) * 0.45));
  }

  function finalizarArrasto(evento) {
    if (!arrastoRef.current) return;
    if (evento.currentTarget.hasPointerCapture?.(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId);
    }
    arrastoRef.current = null;
  }

  function ajustarZoomComRoda(evento) {
    if (!imagemParaPreview) return;
    evento.preventDefault();
    setZoom((atual) => Math.max(1, Math.min(2.5, atual - evento.deltaY * 0.001)));
  }

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  if (carregando) {
    return <main className="componente-carregando" role="status">Preparando perfil...</main>;
  }

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  async function salvarFoto(evento) {
    evento.preventDefault();
    const erroArquivo = validarArquivoAvatar(foto);
    if (erroArquivo) {
      setErro(erroArquivo);
      return;
    }
    if (!foto) {
      if (user.user_metadata?.avatar_url) {
        await supabase.auth.updateUser({
          data: {
            avatar_zoom: zoom,
            avatar_pos_x: posicaoX,
            avatar_pos_y: posicaoY,
          },
        });
      }
      navigate('/', { replace: true });
      return;
    }

    setErro('');
    setEnviando(true);

    try {
      const extensao = foto.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const caminho = `${user.id}/${gerarIdUnico()}.${extensao}`;
      const { error: erroUpload } = await supabase.storage
        .from('avatars')
        .upload(caminho, foto, { upsert: true, contentType: foto.type });

      if (erroUpload) throw erroUpload;

      const { data: urlPublica } = supabase.storage.from('avatars').getPublicUrl(caminho);
      const { error: erroPerfil } = await supabase.auth.updateUser({
        data: {
          avatar_url: urlPublica.publicUrl,
          avatar_zoom: zoom,
          avatar_pos_x: posicaoX,
          avatar_pos_y: posicaoY,
        },
      });

      if (erroPerfil) throw erroPerfil;
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Erro ao salvar foto de perfil:', error);
      setErro('Não foi possível salvar a foto agora. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="autenticacao-page configurar-perfil-page">
      <section className="autenticacao-painel" aria-labelledby="titulo-configurar-perfil">
        <span className="banner-kicker">Conta criada</span>
        <h1 id="titulo-configurar-perfil">Escolha sua foto de perfil</h1>
        <p className="autenticacao-descricao">
          Adicione uma foto para as pessoas reconhecerem você.
        </p>

        <div
          className={`autenticacao-preview-foto${imagemParaPreview ? ' autenticacao-preview-foto-arrastavel' : ''}`}
          aria-live="polite"
          onPointerDown={iniciarArrasto}
          onPointerMove={moverFoto}
          onPointerUp={finalizarArrasto}
          onPointerCancel={finalizarArrasto}
          onWheel={ajustarZoomComRoda}
          role={imagemParaPreview ? 'application' : undefined}
          aria-label={imagemParaPreview ? 'Editor da foto de perfil' : undefined}
        >
          {imagemParaPreview ? (
            <img
              src={imagemParaPreview}
              alt="Prévia da foto de perfil"
              style={{ objectPosition: `${posicaoX}% ${posicaoY}%`, transform: `scale(${zoom})` }}
            />
          ) : (
            <span aria-hidden="true">?</span>
          )}
          {imagemParaPreview && <span className="autenticacao-arraste-ajuda">Arraste para ajustar</span>}
        </div>

        {imagemParaPreview && (
          <div className="autenticacao-ajuste-foto">
            <label>
              Zoom
              <input type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={(evento) => setZoom(Number(evento.target.value))} />
            </label>
            <label>
              Horizontal
              <input type="range" min="0" max="100" value={posicaoX} onChange={(evento) => setPosicaoX(Number(evento.target.value))} />
            </label>
            <label>
              Vertical
              <input type="range" min="0" max="100" value={posicaoY} onChange={(evento) => setPosicaoY(Number(evento.target.value))} />
            </label>
          </div>
        )}

        <form className="autenticacao-form" onSubmit={salvarFoto}>
          <label>
            Foto de perfil <span className="autenticacao-opcional">(opcional)</span>
            <input
              accept="image/png,image/jpeg,image/webp"
              type="file"
              onChange={(evento) => {
                const arquivo = evento.target.files?.[0] ?? null;
                    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
                const erroArquivo = validarArquivoAvatar(arquivo);
                if (erroArquivo) {
                  setErro(erroArquivo);
                  setFoto(null);
                      setPreviewFoto('');
                  evento.target.value = '';
                  return;
                }
                setErro('');
                setFoto(arquivo);
                    const url = arquivo ? URL.createObjectURL(arquivo) : '';
                    previewUrlRef.current = url;
                    setPreviewFoto(url);
              }}
            />
          </label>
          {erro && <p className="autenticacao-erro" role="alert">{erro}</p>}
          <button className="btn-criar-post autenticacao-enviar" type="submit" disabled={enviando}>
            {enviando ? 'Salvando...' : foto ? 'Salvar foto' : 'Continuar sem foto'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default PaginaConfigurarPerfil;