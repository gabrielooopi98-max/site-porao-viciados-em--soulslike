import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { useFavoritos } from '../contexts/favoritosContextStore';
import { supabase } from '../services/supabase';
import { consultarAmizadesAceitas, obterAmigos } from '../services/amizades';
import { useDialogoPublicacao } from './useDialogoPublicacao';
import './CompartilharPublicacao.css';

function DialogoCompartilhar({ publicacao, tipo, fechar }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [amigos, setAmigos] = useState([]);
    const [carregando, setCarregando] = useState(Boolean(user));
    const [destinatario, setDestinatario] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState(false);
    const [erro, setErro] = useState('');
    const [status, setStatus] = useState('');
    const [tentativa, setTentativa] = useState(0);
    const envioRef = useRef(false);
    const { painelRef, tituloRef } = useDialogoPublicacao(fechar, enviando);
    const caminho = `/${tipo}/${publicacao.id}`;
    const link = `${window.location.origin}${caminho}`;

    useEffect(() => {
        if (!user) return undefined;
        let ativo = true;
        async function carregar() {
            try {
                const { data, error } = await consultarAmizadesAceitas(user.id);
                if (error) throw error;
                if (ativo) setAmigos(obterAmigos(data ?? [], user.id));
            } catch (error) {
                console.error('Erro ao carregar amigos para compartilhar:', error);
                if (ativo) setErro('Não foi possível carregar seus amigos. Tente novamente.');
            } finally {
                if (ativo) setCarregando(false);
            }
        }
        carregar();
        return () => { ativo = false; };
    }, [user, tentativa]);

    async function copiar() {
        setStatus('');
        try {
            await navigator.clipboard.writeText(link);
            setStatus('Link copiado!');
        } catch (error) {
            console.error('Erro ao copiar link:', error);
            setStatus('Não foi possível copiar automaticamente. Selecione o link abaixo e copie.');
        }
    }

    async function enviar(evento) {
        evento.preventDefault();
        if (envioRef.current || enviado) return;
        if (!user || !amigos.some(amigo => amigo.id === destinatario)) {
            setErro('Selecione um amigo para enviar.');
            return;
        }
        envioRef.current = true;
        setEnviando(true);
        setErro('');
        try {
            const texto = `${tipo === 'build' ? 'Build' : 'Post'}: ${(publicacao.titulo || 'Publicação da comunidade').slice(0, 160)}\n${link}`;
            const { error } = await supabase.from('mensagens_privadas')
                .insert({ remetente_id: user.id, destinatario_id: destinatario, texto })
                .select('id').single();
            if (error) throw error;
            setEnviado(true);
        } catch (error) {
            console.error('Erro ao compartilhar publicação:', error);
            setErro('Não foi possível enviar. Confira a conexão e se a amizade continua ativa.');
        } finally {
            envioRef.current = false;
            setEnviando(false);
        }
    }

    return createPortal(
        <div className="compartilhar-overlay" onClick={evento => evento.stopPropagation()}>
            <section className="compartilhar-painel" role="dialog" aria-modal="true" aria-labelledby="compartilhar-titulo" aria-describedby="compartilhar-descricao" ref={painelRef} tabIndex={-1}>
                <header>
                    <div>
                        <span className="compartilhar-sobretitulo">Da comunidade para seus amigos</span>
                        <h2 id="compartilhar-titulo" ref={tituloRef} tabIndex={-1}>Compartilhar {tipo}</h2>
                    </div>
                    <button className="compartilhar-fechar" type="button" onClick={fechar} disabled={enviando} aria-label="Fechar compartilhamento">×</button>
                </header>
                <p id="compartilhar-descricao" className="compartilhar-descricao">Leve essa {tipo === 'build' ? 'build' : 'publicação'} para a conversa.</p>
                <div className="compartilhar-previa">
                    <span>{tipo === 'build' ? 'Build' : 'Post'} · {publicacao.categoria || 'Comunidade'}</span>
                    <strong>{publicacao.titulo || 'Publicação da comunidade'}</strong>
                </div>
                <form className="compartilhar-envio" onSubmit={enviar}>
                    <div className="compartilhar-secao-heading">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 2v-4.2A7.5 7.5 0 1 1 20 11.5Z" /></svg>
                        <div><h3>No chat privado</h3><p>Só o amigo escolhido recebe a publicação.</p></div>
                    </div>
                    {user ? <>
                        <label htmlFor="compartilhar-amigo">Escolha um amigo</label>
                        <select id="compartilhar-amigo" value={destinatario} disabled={carregando || enviando || enviado} onChange={evento => setDestinatario(evento.target.value)}>
                            <option value="">{carregando ? 'Carregando amigos...' : 'Selecione um amigo'}</option>
                            {amigos.map(amigo => <option key={amigo.id} value={amigo.id}>{amigo.nome || 'Amigo'}</option>)}
                        </select>
                        {!carregando && !amigos.length && !erro && <p>Você precisa de uma amizade aceita para enviar no chat privado.</p>}
                        <div className="compartilhar-envio-acoes">
                            <button className="compartilhar-primario" type="submit" disabled={!destinatario || enviando || enviado}>{enviando ? 'Enviando...' : enviado ? 'Enviado' : 'Enviar no chat'}</button>
                            {enviado && <button type="button" onClick={() => navigate(`/mensagens/${destinatario}`)}>Abrir conversa</button>}
                        </div>
                        {enviado && <p className="compartilhar-feedback" role="status">Enviado no chat privado!</p>}
                    </> : <>
                        <p>Entre na sua conta para escolher um amigo. Você também pode copiar o link abaixo.</p>
                        <button className="compartilhar-primario" type="button" onClick={() => navigate('/login')}>Entrar para enviar no chat</button>
                    </>}
                    {erro && <p role="alert">{erro}</p>}
                    {erro && !amigos.length && <button type="button" disabled={carregando} onClick={() => { setErro(''); setCarregando(true); setTentativa(atual => atual + 1); }}>Tentar novamente</button>}
                </form>
                <div className="compartilhar-link">
                    <div className="compartilhar-secao-heading">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" /></svg>
                        <div><h3>Compartilhar por link</h3><p>Copie e envie onde preferir.</p></div>
                    </div>
                    <label htmlFor="compartilhar-link">Link da publicação</label>
                    <div className="compartilhar-link-controles">
                        <input id="compartilhar-link" value={link} readOnly onFocus={evento => evento.target.select()} />
                        <button type="button" onClick={copiar}>Copiar link</button>
                    </div>
                    <p className="compartilhar-feedback" role="status">{status}</p>
                </div>
                {user && <footer className="compartilhar-footer"><button type="button" disabled={enviando} onClick={() => navigate('/favoritos')}>Ver meus favoritos</button></footer>}
            </section>
        </div>, document.body
    );
}

export default function CompartilharPublicacao({ publicacao, tipo }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { favoritos, carregando, erro, alternar } = useFavoritos();
    const [aberto, setAberto] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [status, setStatus] = useState('');
    const [erroSalvar, setErroSalvar] = useState('');
    const salvo = favoritos.some(item => String(item[tipo === 'build' ? 'build_id' : 'post_id']) === String(publicacao.id));

    async function salvar() {
        if (!user) { navigate('/login'); return; }
        if (salvando) return;
        setSalvando(true);
        setStatus('');
        setErroSalvar('');
        try {
            const resultado = await alternar(publicacao, tipo);
            setStatus(resultado ? 'Salvo nos favoritos.' : 'Removido dos favoritos.');
        } catch (error) {
            console.error('Erro ao alterar favorito:', error);
            setErroSalvar(error.message || 'Não foi possível atualizar seus favoritos.');
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="publicacao-social" onClick={evento => evento.stopPropagation()}>
            <button type="button" title={`Compartilhar ${tipo}`} aria-label={`Compartilhar ${tipo}`} onClick={() => setAberto(true)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-7 18-4-7-7-4Z M10 14 21 3" /></svg>
            </button>
            <button type="button" title={salvo ? 'Remover dos favoritos' : 'Salvar nos favoritos'} aria-label={salvo ? 'Remover dos favoritos' : 'Salvar nos favoritos'} aria-pressed={salvo} disabled={salvando || Boolean(user && carregando)} onClick={salvar}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4Z" /></svg>
            </button>
            {status && <div className="publicacao-social-feedback" role="status">{status}<button type="button" onClick={() => navigate('/favoritos')}>Ver favoritos</button><button type="button" aria-label="Fechar aviso" onClick={() => setStatus('')}>×</button></div>}
            {erroSalvar && <div className="publicacao-social-feedback" role="alert">{erro || erroSalvar}<button type="button" onClick={() => setErroSalvar('')}>Fechar</button></div>}
            {aberto && <DialogoCompartilhar key={user?.id || 'visitante'} publicacao={publicacao} tipo={tipo} fechar={() => setAberto(false)} />}
        </div>
    );
}
