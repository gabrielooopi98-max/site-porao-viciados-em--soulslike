# React + Vite

## Fundo e identidade visual

Poppins e a fonte do site, incluindo cards, chat, detalhes e paineis.
Cinzel fica restrita aos titulos H1 e H2 das secoes da pagina principal,
sem afetar os dialogos abertos nela.

O fundo global usa tons de carvao e gradientes suaves, sem tramas diagonais.
Posts, builds e sobre compartilham um fundo de pedra com um toque discreto
de brasa (opacidade 0.018). O laranja continua nos controles e destaques,
mantendo o conteudo em primeiro plano no desktop e no celular.

## Cards de posts

Os cards usam o mesmo componente na home, na biblioteca e no perfil, com
autor, data e categoria no cabecalho, titulo e resumo acima da previa de
midia opcional, seguidos pelas acoes e contagem de visualizacoes. Posts sem midia
priorizam o texto, sem imagem de preenchimento. O layout usa bordas neutras
e espacamento compacto. O hover acompanha os cards de build: elevacao de 2px,
sombra, cantos em brasa e zoom de 4% na midia, respeitando movimento reduzido.
O rodape destaca as interacoes
com borda superior e fundo neutros discretos, botoes com area de toque
de 44px e hover em cinza; o laranja fica reservado ao estado curtido;
no celular, a home preserva a navegacao horizontal.

A secao da home tem largura limitada e apresentacao centralizada sobre
a parte superior do cenario, com sombra discreta para leitura. O botao de
criar post fica a direita de Ultimos posts, logo acima dos cards. O cabecalho une
titulo e pixel art sem moldura, brilho adicional ou fundo separado,
com mascaras graduais nas quatro bordas para se integrar ao fundo da secao,
com uma faixa ampla para o cenario abaixo do texto. No celular, o recorte
central preserva a escala da fogueira e dos personagens, sem distorcer a
proporcao. Os filtros mantem o estilo original e rolam horizontalmente,
separados da grade.
O filtro Sekiro usa o nome completo da categoria salva nos posts.

## Area de builds

A home reutiliza a composicao da area de posts: cenario pixel art integrado
ao fundo, titulo centralizado, filtros horizontais e largura limitada.
A identidade de builds aparece no subtitulo Builds da comunidade, no simbolo
de armas cruzadas e na referencia a armas, atributos e estrategias.
Criar build fica ao lado de Ultimas builds, acima dos cards; a faixa de filtros
contem apenas a selecao por jogo, sem campo de busca. A grade nao tem moldura tracejada nem fundo separado
e preserva a rolagem horizontal no celular. Os cards e fluxos de publicacao
e navegacao mantem seu comportamento.

Os cards de build seguem uma ficha: jogo e nome no topo, midia opcional no
meio e nivel, foco e dano agrupados antes do resumo. Apenas atributos
preenchidos aparecem. O rodape separa autoria e interacoes em duas linhas,
sem disputar espaco, com botoes de 44px. Builds sem midia priorizam a ficha,
sem capa de preenchimento. Home e perfil usam o mesmo componente.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Compartilhamento e favoritos

Posts e builds oferecem compartilhar e salvar no cabecalho, em todas as
superficies que usam os cards. Compartilhar abre um dialogo com copia de link
e selecao de uma amizade aceita; o envio exige confirmacao e usa a tabela
existente de mensagens privadas, com suas politicas de acesso.
O painel separa previa, envio privado e copia de link, com acoes responsivas
e confirmacoes independentes para envio e copia, em tons neutros. No chat, o
link de publicacao do mesmo dominio aparece como um atalho clicavel.
Visitantes podem copiar links; enviar e salvar exigem login.

Para habilitar os favoritos sincronizados por conta, execute
[`supabase/favoritos_publicacoes.sql`](supabase/favoritos_publicacoes.sql)
no SQL Editor do Supabase. A tabela restringe leitura, insercao e remocao
ao dono via RLS e remove referencias quando a publicacao e excluida.
Sem essa migration, o site mostra erro explicito, sem fingir que salvou.
A pagina `/favoritos`, acessivel pelo dialogo de compartilhar e pela confirmacao de salvamento,
permite filtrar posts/builds, abrir a publicacao e remover favoritos.
Os favoritos exibem os mesmos cards completos da comunidade em uma grade
responsiva, com midias em ordem, autoria, atributos e interacoes.
Posts e builds ficam em grades separadas. Posts na mesma linha tem altura
igual e rodapes alinhados, sem serem esticados pelas builds. As builds
preservam sua altura natural; no celular, ambas as grades se adaptam.
Somente nos favoritos, builds usam capa 16:9, espacamentos menores e
atributos compactos sem icones, preservando os botoes de interacao de 44px.
O espaco pessoal usa cabecalho acolhedor, dica sobre o marcador, filtros
no mesmo estilo da area de posts com contagens e headings separados para posts e builds. A ordem
de salvamento aparece na toolbar; colecoes vazias oferecem acesso a biblioteca.
O marcador no cabecalho remove o favorito; editar ou excluir uma publicacao propria
atualiza a grade. No celular os cards ficam empilhados, sem rolagem horizontal.
Ao fechar os detalhes, o usuario retorna aos favoritos (mantendo o filtro)
ou a conversa de onde abriu a publicacao.

## Perfis da comunidade

Perfil pessoal e publico usam paineis neutros, sem textura, glow ou fundos
saturados. Avatar e estatisticas ficam juntos; seguir, amizade e conversa
mantem os fluxos existentes no perfil publico.
O laranja aparece apenas nos subtitulos com traco, setas dos atalhos e
detalhes de botoes sociais e filtros ativos, sem tingir os paineis.
O perfil pessoal oferece
atalhos para favoritos, mensagens privadas e chat da comunidade.
Os atalhos ficam abaixo do painel do perfil e acima da pontuacao, em uma barra de botoes compactos com icone e nome em peso 700,
sem descricoes, setas ou caixas de dashboard. No celular, os atalhos ficam
em uma coluna de botoes compactos de largura igual, com area de toque de 48px;
bordas e icones ganham laranja no hover, sem elevacao ou sombra.
Publicacoes tem grade responsiva e filtros neutros; pontuacao aparece em faixa secundaria.
Email e sair da conta ficam no rodape pessoal, separados das acoes sociais.

## Painel de criar post


O formulario usa a paleta preta/cinza do site, laranja brasa nos destaques
e titulo em Poppins. Agrupa titulo e jogo no desktop, com uma coluna no
celular, convite para conversar, campos opcionais e selecao de imagens/videos
com previa e remocao individual. Mantem o envio existente e mostra progresso
e erros sem apagar o conteudo. O dialogo bloqueia a rolagem de fundo, mantem
o foco dentro do painel e pode ser fechado com Escape fora da publicacao.
As URLs temporarias dos anexos sao liberadas ao remover ou fechar o painel.

O painel de criar build compartilha o mesmo visual, anexos e comportamento
de dialogo. Nome e jogo continuam obrigatorios; nivel (minimo 1), foco e
tipo de dano ficam agrupados no perfil opcional da build. No celular,
os campos passam para uma coluna. O fluxo de salvamento permanece o mesmo.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
