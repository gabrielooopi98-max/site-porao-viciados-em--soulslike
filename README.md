# React + Vite

## Fundo e identidade visual

Poppins e a fonte do site, incluindo cards, chat, detalhes e paineis.
Cinzel fica restrita aos titulos H1 e H2 das secoes da pagina principal,
sem afetar os dialogos abertos nela.

O fundo global usa tons de carvao e gradientes suaves, sem tramas diagonais.
Posts, builds e sobre compartilham um fundo de pedra com luz discreta
em cinza (opacidade 0.018). A paleta usa preto, branco e cinza:
cinza claro (#d4d4d4) nos controles e destaques e branco suave (#f0f0f0) no hover,
mantendo o conteudo em primeiro plano no desktop e no celular.
As variaveis `--souls-destaque`, `--souls-destaque-rgb`,
`--souls-destaque-hover` e `--souls-destaque-suave` centralizam a cor,
as transparencias e os estados de interacao, incluindo o chat.
Fundos neutros, cores de erro/sucesso e artes dos jogos sao preservados.
Posts, builds, ranking e sobre usam a mesma divisoria decorativa:
Dark Sign em cinza entre linhas suaves, com largura responsiva.
Os sobretitulos Comunidade e Builds da comunidade e seus tracos laterais usam
laranja (#f07818) como detalhe pontual de identidade.

## Cards de posts

Os cards usam o mesmo componente na home, na biblioteca e no perfil, com
autor, data e categoria no cabecalho, titulo e resumo acima da previa de
midia opcional, seguidos pelas acoes e contagem de visualizacoes. Posts sem midia
priorizam o texto, sem imagem de preenchimento. O layout usa bordas neutras
e espacamento compacto. O hover acompanha os cards de build: elevacao de 2px,
sombra, cantos claros e zoom de 4% na midia, respeitando movimento reduzido.
O rodape destaca as interacoes
com borda superior e fundo neutros discretos, botoes com area de toque
de 44px e hover em cinza; o estado curtido usa destaque em cinza claro;
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
sem capa de preenchimento. Home e perfil usam o mesmo componente,
com capa 3:2 e espacamentos compactos, preservando a leitura dos atributos
e a area de toque de 44px nas interacoes.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Ranking da comunidade

A secao segue a composicao dos posts: largura limitada, titulo centralizado
e cenario da lua de Bloodborne integrado ao fundo, sem moldura externa.
Linhas cinza com extremidades graduais e o simbolo Dark Sign central em cinza
separam a area de builds do ranking, adaptando sua largura a tela.
O fundo proprio mistura preto e carvao, com luz cinza suave perto da lua
e transicoes escuras nas extremidades, sem textura ou cores saturadas.
A arte em cinza se funde ao fundo com composicao screen e mascaras graduais
amplas nas quatro bordas, evitando um recorte retangular visivel.
O podio destaca os tres primeiros, com o lider ao centro no desktop.
O titulo da classificacao fica centralizado acima do podio, com um pequeno
simbolo de posicoes entre linhas discretas e um traco laranja abaixo do titulo.
No celular, os destaques ficam em ordem de classificacao em linhas compactas;
as demais posicoes usam uma lista com nome, avatar e pontos.
A paleta e neutra, com laranja apenas no sobretitulo e tracos laterais.
O ranking ainda e uma previa visual com dados de exemplo, sem aviso visual
na interface.
Os antigos filtros sem funcionamento foram removidos; nao ha classificacao
real nem navegacao para perfis ficticios nesta etapa.

## Chat para amigos

O chat privado acompanha o visual do global: lista de amigos escura,
bolhas neutras, autoria agrupada em intervalos de cinco minutos,
separadores por dia e compositor com anexos, voz, figurinhas e envio por icone.
Enter envia, Shift + Enter quebra a linha e Escape cancela resposta/edicao.
O texto cresce ate 140px, sem sobrepor o historico, mantendo o limite de
2000 caracteres ja existente no privado.
Novas mensagens nao puxam a rolagem enquanto o usuario le o historico:
um atalho leva ao fim. Imagens, videos e figurinhas abrem uma galeria
com miniaturas, setas, Escape e restauracao do foco.
O player de audio e compartilhado com o global; o privado preserva
a conversao de codecs incompativeis, URLs assinadas, recibos de leitura,
presenca e acesso exclusivo entre amizades aceitas.

## Compartilhamento e favoritos

O atalho de mensagens do header usa um icone de conversa com contador de
mensagens recebidas ainda sem `lida_em`. O contador aparece apenas acima de
zero, limita a exibicao a 99+ e atualiza por Realtime, ao voltar a janela
e ao confirmar leituras no chat. Falhas aparecem com um indicador de erro
e descricao acessivel, sem mostrar uma contagem falsa de zero.
Usa a tabela e as politicas existentes de mensagens privadas.

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
O cinza claro aparece apenas nos subtitulos com traco, setas dos atalhos e
detalhes de botoes sociais e filtros ativos, sem tingir os paineis.
O perfil pessoal oferece
atalhos para favoritos, mensagens privadas e chat da comunidade.
Os atalhos ficam abaixo do painel do perfil e acima da pontuacao, em uma barra de botoes compactos com icone e nome em peso 700,
sem descricoes, setas ou caixas de dashboard. No celular, os atalhos ficam
em uma coluna de botoes compactos de largura igual, com area de toque de 48px;
bordas e icones ficam mais claros no hover, sem elevacao ou sombra.
Publicacoes tem grade responsiva e filtros neutros; pontuacao aparece em faixa secundaria.
Email e sair da conta ficam no rodape pessoal, separados das acoes sociais.

## Painel de criar post


O formulario usa a paleta preta/cinza do site, cinza claro nos destaques
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
