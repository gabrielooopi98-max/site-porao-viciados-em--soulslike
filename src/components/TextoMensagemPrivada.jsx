import { Link, useParams } from 'react-router-dom';
import './CompartilharPublicacao.css';

export default function TextoMensagemPrivada({ texto }) {
    const { pessoaId } = useParams();
    const linhas = (texto || '').split('\n');
    const ultima = linhas[linhas.length - 1];
    const prefixo = `${window.location.origin}/`;
    const rota = ultima.startsWith(prefixo) ? ultima.slice(window.location.origin.length) : '';
    if (linhas.length === 2 && /^(Post|Build): /.test(linhas[0]) && /^\/(post|build)\/\d+$/.test(rota)) {
        return <Link className="mensagem-publicacao-link" to={rota} state={pessoaId ? { retornoConversa: pessoaId } : null}>
            <strong>{linhas[0]}</strong>
            <span>Abrir {rota.startsWith('/build/') ? 'build' : 'post'} →</span>
        </Link>;
    }
    return <p>{texto}</p>;
}
