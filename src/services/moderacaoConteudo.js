const termosBloqueados = [
    'porn',
    'porno',
    'pornografia',
    'xxx',
    'nsfw',
    'nude',
    'nudes',
    'nudity',
    'sexo',
    'sexcam',
    'onlyfans',
    'zoofilia',
    'pedofilia',
];

function normalizarTexto(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function contemTermoBloqueado(valor) {
    const texto = normalizarTexto(valor);
    return termosBloqueados.some((termo) => texto.split(' ').includes(termo));
}

export function validarNomeExibicao(nome) {
    const nomeLimpo = String(nome ?? '').trim();
    if (nomeLimpo.length < 3) return 'O nome de exibição precisa ter pelo menos 3 caracteres.';
    if (nomeLimpo.length > 32) return 'O nome de exibição pode ter no máximo 32 caracteres.';
    if (!/^[\p{L}\p{N} _.-]+$/u.test(nomeLimpo)) return 'Use apenas letras, números, espaços, ponto, hífen ou sublinhado.';
    if (contemTermoBloqueado(nomeLimpo)) return 'Esse nome de exibição não é permitido.';
    return '';
}

export function validarArquivoAvatar(arquivo) {
    if (!arquivo) return '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type)) {
        return 'Use uma imagem JPG, PNG ou WebP.';
    }
    if (arquivo.size > 5 * 1024 * 1024) {
        return 'A foto precisa ter no máximo 5 MB.';
    }
    if (contemTermoBloqueado(arquivo.name)) {
        return 'Esse arquivo não pode ser usado como foto de perfil.';
    }
    return '';
}
