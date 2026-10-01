import { useState } from 'react';

function PainelCriarBuild({ aoCriarBuild, fecharPainelCriarBuild }) {
	const [categoria, setCategoria] = useState('');
	const [titulo, setTitulo] = useState('');
	const [descricao, setDescricao] = useState('');
	const [nivel, setNivel] = useState('');
	const [foco, setFoco] = useState('');
	const [dano, setDano] = useState('');
		const [midias, setMidias] = useState([]);
	const [publicando, setPublicando] = useState(false);
	const [statusPublicacao, setStatusPublicacao] = useState('');
	const [erroPublicacao, setErroPublicacao] = useState('');

	async function enviarFormulario(evento) {
		evento.preventDefault();
		setPublicando(true);
		setErroPublicacao('');

		try {
			const publicado = await aoCriarBuild(
				{ categoria, titulo, descricao, nivel, foco, dano, midias },
				setStatusPublicacao
			);
			if (publicado === false) {
				setErroPublicacao('Não foi possível publicar a build. Tente novamente.');
			}
		} catch (erro) {
			console.error('Erro ao preparar a build:', erro);
			setErroPublicacao(`Não foi possível preparar os anexos: ${erro.message || 'erro desconhecido'}`);
		} finally {
			setPublicando(false);
			setStatusPublicacao('');
		}
	}

	return (
		<article className="painel-criar-post">
			<header className="header-painel-criar-post">
				<h2>Criar Build</h2>
				<button
					className="btn-fechar-painel-criar-post"
					type="button"
					onClick={fecharPainelCriarBuild}
					disabled={publicando}
					aria-label="Fechar formulário de build"
				>
					X
				</button>
			</header>

			<form onSubmit={enviarFormulario}>

				<div className="area-colocar-midia-post">
					<label htmlFor="midia-build">Anexar Arquivos:</label>
					<div className="area-midia-preview-post">
						{midias.map((arquivo, indice) => (
							<div key={`${arquivo.name}-${arquivo.lastModified}-${indice}`}>
								{arquivo.type.startsWith('image/') && (
									<img src={URL.createObjectURL(arquivo)} alt={arquivo.name} />
								)}
								{arquivo.type.startsWith('video/') && (
									<video src={URL.createObjectURL(arquivo)} controls />
								)}
								<p>{arquivo.name}</p>
								<button
									type="button"
									className="btn-remover-midia-painel"
									onClick={() => setMidias((selecionadas) => selecionadas.filter((_, itemIndice) => itemIndice !== indice))}
									disabled={publicando}
									aria-label={`Remover ${arquivo.name}`}
								>
									×
								</button>
							</div>
						))}
					</div>
					<input
						id="midia-build"
						type="file"
						accept="image/*,video/*"
						disabled={publicando}
						multiple
						onChange={(evento) => {
							const arquivosNovos = Array.from(evento.target.files ?? []);
							setMidias((selecionadas) => [...selecionadas, ...arquivosNovos]);
							evento.target.value = '';
						}}
					/>
				</div>

				<div className="area-escolher-categoria">
					<label htmlFor="categoria-build">Categoria:</label>
					<select
						id="categoria-build"
						value={categoria}
						onChange={(evento) => setCategoria(evento.target.value)}
						required
					>
						<option value="">Nenhuma</option>
						<option value="Dark Souls Remastered">Dark Souls Remastered</option>
						<option value="Dark Souls II">Dark Souls II</option>
						<option value="Dark Souls III">Dark Souls III</option>
						<option value="Elden Ring">Elden Ring</option>
						<option value="Elden Ring Nightreign">Elden Ring Nightreign</option>
						<option value="Bloodborne">Bloodborne</option>
						<option value="Demon's Souls">Demon's Souls</option>
						<option value="Sekiro: Shadows Die Twice">Sekiro: Shadows Die Twice</option>
						<option value="Lies of P">Lies of P</option>
					</select>
				</div>

				<div className="area-titulo-post">
					<label htmlFor="titulo-build">Nome da build:</label>
					<input
						id="titulo-build"
						type="text"
						value={titulo}
						onChange={(evento) => setTitulo(evento.target.value)}
						required
					/>
				</div>

				<div className="area-titulo-post">
					<label htmlFor="nivel-build">Nível Do Personagem:</label>
					<input
						id="nivel-build"
						type="number"
						min="1"
						value={nivel}
						onChange={(evento) => setNivel(evento.target.value)}
					/>
				</div>

				<div className="area-titulo-post">
					<label htmlFor="foco-build">Foco da build:</label>
					<input
						id="foco-build"
						type="text"
						value={foco}
						onChange={(evento) => setFoco(evento.target.value)}
					/>
				</div>

				<div className="area-titulo-post">
					<label htmlFor="dano-build">Tipo de dano:</label>
					<input
						id="dano-build"
						type="text"
						value={dano}
						onChange={(evento) => setDano(evento.target.value)}
					/>
				</div>

				<div className="area-descricao-post">
					<label htmlFor="descricao-build">Descrição (opcional):</label>
					<textarea
						id="descricao-build"
						value={descricao}
						onChange={(evento) => setDescricao(evento.target.value)}
					/>
				</div>

				{statusPublicacao && (
					<p className="status-publicacao-post" role="status">{statusPublicacao}</p>
				)}
				{erroPublicacao && (
					<p className="erro-publicacao-post" role="alert">{erroPublicacao}</p>
				)}

				<div className="area-enviar-post">
					<button type="submit" disabled={publicando}>
						{publicando ? 'Processando...' : 'Salvar Build'}
					</button>
				</div>
			</form>
		</article>
	);
}

export default PainelCriarBuild;
