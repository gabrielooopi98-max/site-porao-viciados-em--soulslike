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
O banner apresenta o nome da comunidade em duas linhas, com sobretitulo
laranja e texto direto sobre jogos, builds e jogar junto.
Chat e builds sao as acoes principais. A faixa inferior reune atalhos
funcionais para posts, builds, co-op (chat) e regras, sem slogan adicional.
No desktop, texto e arte ocupam lados distintos; no celular, a arte fica
acima do conteudo, com transicao gradual para o fundo. Os botoes se
empilham quando nao ha espaco para os rotulos e preservam a area de toque.
O espacamento entre o header e o banner e de 12px em todas as telas,
incluindo desktop e celular.
O header permanece preso ao topo durante a rolagem. Para usuarios logados,
os controles seguem a ordem avisos, chat privado e avatar, com botoes de
44px sem bordas. Avisos usa somente o icone, mantendo nome acessivel e contador.
Os cabecalhos com cenarios SVG de posts, builds e ranking ocupam ate
1760px no desktop, com margens responsivas. Filtros, cards e classificacao
mantem a largura de ate 1180px; o layout mobile dessas secoes e preservado.

## Ranking e desafios

A pagina `/ranking` fica no menu hamburguer da comunidade.
Na lista de desafios, os cards seguem o visual dos posts: modalidade e etapa
no topo, titulo, jogo e resumo, com recompensa e prazo no rodape.
Jogadores participam pelos botoes "Criar build" ou "Enviar prova do desafio",
durante as inscricoes e com login. O atalho da classificacao abre o formulario
da competicao escolhida. Somente o ADM pode criar competicoes.
Os cards de desafios do ADM na lista mostram quantos jogadores ja concluiram.
Na visão geral, o conteudo separa o Ranking geral (pontos acumulados), a
Classificacao de builds (votos por etapa) e Desafios e provas. A lista lateral
fica identificada como desafios e provas; esses cards abrem as regras e
participacoes, nao sao tabelas de ranking. Um indice leva a cada secao; ao
abrir um desafio, as participacoes aparecem em cards de builds ou de provas.
O envio de provas de conquista tem apenas anexos, sem titulo ou descricao
preenchidos pelo jogador. Exige ao menos uma imagem ou um video (ate oito
arquivos); o card mostra autor, status, midia, os pontos (valendo, concedidos
ou nao concedidos) e comentarios. Provas nao tem botao de voto.
As provas ficam em duas colunas no desktop e uma no celular, com avatar e
status no topo, midia em proporcao uniforme e acoes no rodape. Multiplos
anexos podem ser percorridos horizontalmente, mantendo controles de video
e ampliacao de imagens.
Builds mantem
nome e descricao. Reaplique `supabase/ranking_desafios.sql` para atualizar
tambem a validacao e os metadados automaticos no banco.
O painel lateral apresenta a marca da comunidade, atalhos com icones,
destaque discreto para a secao atual e acesso ao perfil/login no rodape.
O visual usa fundo escuro uniforme e se compacta em telas baixas.
O menu abre como painel deslizante pela esquerda, com fundo
escurecido, foco contido e rolagem da pagina bloqueada. Fecha pelo botao,
Escape ou clique fora, respeitando a preferencia de movimento reduzido.
A entrada usa deslizamento com desaceleracao, fade do fundo e links em
sequencia; todas essas animacoes sao desativadas com movimento reduzido.
O ADM pode publicar varios desafios, definir regras, jogo, pontos e datas, e editar
desafios que ainda nao comecaram. Os avisos do header mostram os desafios
somente na aba Desafios; novos desafios entram no contador laranja do sino
e no contador da aba Desafios. A aba Avisos fica reservada as interacoes.
Cada desafio nao lido mostra "Novo - Voce ainda nao viu"; abrir o sino
nao marca desafios como lidos. O estado e individual por conta e atualizado
ao abrir o desafio pela notificacao.
Para esta atualizacao, reaplique a migration de ranking no SQL Editor.
O layout separa a navegacao de desafios da classificacao e do feed.
No celular, um seletor compacto alterna entre desafios e classificacao,
sem carrossel ou lista lateral acima do conteudo. Datas usam linhas
compactas e campos de 16px evitam zoom automatico ao editar no celular.
O formulario do ADM agrupa objetivo, pontuacao e
calendario, com campos em duas colunas no desktop e uma no celular.
As regras detalhadas de cada desafio ficam em um painel expansivel;
datas, premio e a acao de participar permanecem visiveis.

### Ativacao no Supabase

1. Execute [ranking_desafios.sql](./supabase/ranking_desafios.sql) no SQL
   Editor do projeto. A migration e transacional e pode ser reaplicada.
   O upload reutiliza o bucket `midias` e suas policies existentes
   ([storage_midias_autenticados.sql](./supabase/storage_midias_autenticados.sql)).
2. Cadastre a conta ADM pelo SQL Editor, substituindo o email abaixo:

```sql
do $$
declare conta uuid;
begin
    select id into conta from auth.users where email = 'SEU_EMAIL_DE_LOGIN';
    if conta is null then
        raise exception 'Conta nao encontrada. Confira o email de login.';
    end if;
    insert into public.ranking_administradores(usuario_id)
        values (conta) on conflict do nothing;
end;
$$;
```

3. Entre nessa conta e abra `/ranking`: o botao **Lancar desafio** aparecera.
   A lista de ADMs nao e editavel por usuarios pelo site. Nunca coloque
   `service_role` ou credenciais administrativas no frontend.

Sem a migration, o site exibe um aviso de ativacao pendente. O ranking geral
de jogadores (posicao, desafios concluidos, builds vencidas e pontos) mostra
os 10 primeiros na home e ate 50 em `/ranking`, com podio, destaque da linha
do usuario conectado e a posicao dele quando estiver fora da lista. O perfil usa pontos do banco, nao
metadata editavel pelo usuario.

### Regras da disputa

Competicoes de builds exibem automaticamente um quadro com quatro regras:
nome, nivel, atributos completos e equipamentos/recursos utilizados.
O mesmo quadro aparece na configuracao do ADM, no desafio e no envio da
participacao, sem precisar copiar essas regras para a descricao.
O ADM verifica o cumprimento na prova; os atributos podem ser mostrados
por texto ou imagem. A descricao do desafio continua destinada ao objetivo
e as restricoes especificas, sem alterar desafios de conquista.

- Uma participacao por pessoa por desafio, com titulo, descricao, imagens
  e videos (ate oito anexos). Builds incluem nivel, foco e equipamentos.
  A prova fica imutavel depois de publicada, para nao mudar apos receber votos.
- Conquistas: sem votacao. A comunidade comenta as provas; so o ADM aprova
  e todos os aprovados recebem o premio.
  O ADM pode analisar depois do prazo. Recusar uma aprovacao anterior
  revoga os pontos daquela prova. Aprovar novamente nao duplica pontos.
- Builds: precisam ser aprovadas antes do fim da classificatoria. Os
  votos selecionam ate quatro semifinalistas, depois dois finalistas
  e um vencedor. Cada etapa tem prazo proprio definido pelo ADM.
- Cada pessoa pode manter um voto por competicao em cada etapa; pode trocar
  a build escolhida ou retirar o voto, e nao pode votar em si. Uma nova etapa
  permite votar novamente e os votos se somam ao total da competicao. O
  historico por etapa fica preservado. Uma tentativa feita com etapa
  desatualizada e recusada.
- O valor por voto serve para a pontuacao da competicao. So o vencedor
  recebe o premio no ranking geral. Sem votos na final, nao ha vencedor
  nem premio. Empates sao resolvidos pela participacao enviada primeiro
  (e pelo ID caso o horario seja exatamente igual).
- Se houver menos inscritos validados, avancam os disponiveis. Um ADM
  nao pode validar a propria participacao; outro ADM precisa analisar.
- Permissoes, prazos, votos e premios sao validados no PostgreSQL. As
  transicoes e os premios usam locks e registros unicos para evitar
  concorrencia e pontuacao duplicada.

As telas atualizam em tempo real: gatilhos marcam a tabela publica
`ranking_atualizacoes` (sem dados, so um horario) a cada voto, envio,
aprovacao, comentario ou troca de etapa, e o site recarrega o painel pelas
RPCs ao receber o aviso do Supabase Realtime. O site tambem consulta de novo
no horario de cada prazo e, como reserva, a cada 60 segundos. As etapas vencidas sao
processadas no servidor na proxima consulta/votacao, com os cortes por
data preservados, mesmo se ninguem estava online. Para processar tambem
sem visitantes, opcionalmente habilite `pg_cron` no Supabase e agende,
pelo SQL Editor:

```sql
select cron.schedule(
    'ranking-avancar-etapas',
    '* * * * *',
    $$select public.ranking_avancar();$$
);
```

Nao crie agendamentos duplicados. O job deve executar como o dono da
funcao (normalmente `postgres`), nao como usuario anonimo.

### Validacao

`npm run test:ranking` executa a migration e os fluxos em PostgreSQL
embutido (PGlite), sem acessar o Supabase real. Cobre permissoes, datas,
aprovacao, retirada de votos, etapas 4/2/1, historico, empate, poucos
inscritos, avisos por conta e premios sem duplicacao.
Depois, execute `npm run lint` e `npm run build`.

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
Os skeletons seguem a estrutura dos cards atuais: posts com autor no topo,
titulo e resumo antes da midia 16:9; builds com contexto e titulo no topo,
capa 3:2, atributos e autoria no rodape. O carregamento compartilha esse
layout na home e nas bibliotecas, sem alturas minimas artificiais,
com brilho suave desativado quando ha preferencia por movimento reduzido.

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
Os cards de builds do ranking seguem a ficha visual das builds normais,
com autor e avatar, jogo e seletor de imagem/video com controles.
Na pagina de ranking, a galeria usa duas colunas no desktop e uma no celular,
com cabecalho de autor/status, titulo separado, controles de midia agrupados
e rodape com contagem de votos e acao. Nivel e foco nao aparecem nos cards;
os campos de envio continuam preservados.
Os cards resumidos mostram a descricao escrita pelo autor em ate tres linhas,
com opcao de expandir ou recolher o texto. Na participacao completa, o texto
continua visivel integralmente.
Novas participacoes de builds exigem pelo menos uma imagem e um video,
com ate oito anexos. A exigencia vale no formulario e no RPC; reaplique
`supabase/ranking_desafios.sql` no Supabase para ativar a validacao no banco.
Participacoes antigas continuam visiveis, mesmo sem ambos os formatos.

A classificacao das builds aparece na home e em `/ranking`, com seletor
de competicao. Em `/ranking`, os cards da competicao escolhida aparecem
abaixo da tabela, com imagem, video e acesso a participacao para votar.
Inicialmente, a tabela exibe ate seis posicoes. Havendo mais participantes,
o primeiro lugar aparece em um card centralizado acima das demais posicoes,
com autor, avatar e votos. Ele conta no limite inicial de seis participantes.
"Mostrar todas as posicoes" expande a lista e permite recolher novamente.
Os cards abaixo mostram todas as builds aprovadas da etapa, independentemente
da expansao da tabela. Trocar de competicao ou etapa restaura o limite de seis.
Os titulos acompanham a etapa: "Builds em classificacao", "Builds em Semifinais"
e "Builds em final".
Na home, os cards permanecem na secao separada de disputas. A tabela tem seletor
de competicao e tabela de posicao, build, autor com avatar e votos da etapa.
Somente builds aprovadas que participam da etapa atual entram na tabela.
Empates seguem a ordem de envio, como no banco; os votos reabrem em cada
etapa e cada nova escolha acrescenta um voto ao total acumulado. Os links
abrem a participacao completa. Os pontos dos jogadores nao
interferem nesta classificacao; eles aparecem no ranking geral.
`node --test tests/classificacaoBuilds.test.mjs` valida a ordenacao e os filtros.
Na classificacao da home e da pagina Ranking e desafios, o botao de previa
da Chama Frenetica tambem aparece no site publicado. A previa e local a cada
pagina e nao e mantida ao navegar. Ele alterna apenas o banner do primeiro lugar, sem salvar
um final, conceder titulos ou alterar votos. A escolha real continua exclusiva
do vencedor.
No proprio perfil, clicar na Chama Frenetica ou Era do Fogo conquistada na "Colecao de finais"
aplica seu banner; clicar novamente remove a arte. A escolha fica salva
no banco e aparece tambem no perfil publico, com preenchimento responsivo.
O card de perfil integra o banner na proporcao 1760x575, com avatar e nome
dentro da capa e estatisticas e acoes abaixo. A largura acompanha o container,
com capa de altura minima de 200px no celular, avatar de 64px ao lado do nome
e estatisticas e botoes compactos, sem margens extras dentro da capa. O mesmo componente
estrutura o perfil proprio e o publico, com ajustes para celular.
Quando o final ainda esta bloqueado, os dois banners oferecem uma previa
local ao clicar na colecao: nao salva, nao concede titulo e nao aparece no
perfil publico. Clicar novamente fecha a previa; recarregar tambem a remove.
A opcao de previa mostra a arte SVG clicavel com um cadeado aberto no topo
e o nome do final discretamente sobre o canto inferior direito da imagem.
Isso nao altera a contagem de finais
conquistados.
O status "Equipado" identifica apenas o banner visivel; trocar a previa
substitui a anterior. Era do Fogo (Dark Souls Remastered, `ds1_chama`) usa
`banner-caverna-fogo-1760x575.svg` e o titulo Herdeiro da Chama. A arte tambem
aparece no primeiro lugar do ranking quando o vencedor escolhe esse final.
Outros finais continuam na colecao, mas ainda nao possuem arte de banner.
Reaplique `supabase/ranking_desafios.sql` no Supabase para ativar a tabela e
as RPCs de banners. O banco valida a conquista antes de salvar, e a previa
do ranking nao desbloqueia banners no perfil.
As competicoes ficam separadas em "Builds em disputa", com jogo, etapa,
progresso classificatoria/semifinal/final, premio, valor por voto e prazo.
Cada card mostra uma previa de midia, informa quando ha mais anexos e
mantem os rodapes alinhados. A participacao completa preserva todos os
anexos, votos e avaliacoes. Competicoes encerradas oferecem "Ver build",
sem convidar a votar depois do prazo.
Sem semifinalistas, a secao explica quando as disputas aparecerao e oferece
acesso aos desafios, sem inventar jogadores ou competicoes.
A paleta e neutra, com laranja pontual na etapa atual e pequenos destaques.
No celular, paineis, datas e cards se organizam em uma coluna.

## Chat para amigos

O chat privado acompanha o visual do global: lista de amigos escura,
bolhas neutras, autoria agrupada em intervalos de cinco minutos,
separadores por dia e compositor com anexos, voz, figurinhas e envio por icone.
A lista tem busca local por nome, contador de amigos e destaque da conversa
ativa. O historico e o compositor limitam a largura em telas grandes.
A busca usa uma unica borda no contenedor, inclusive no foco. Os baloes
separam o conteudo do rodape compacto com horario e recibo. Clicar ou tocar
no balao (ou pressionar Enter/Espaco com foco nele) abre as acoes em um menu;
Escape, clique fora e rolagem fecham o menu. Links e controles de midia
preservam suas acoes. Editar e excluir continuam restritos ao autor,
com controles de 44px e o agrupamento por autor preservados.
No celular, lista e conversa ocupam telas separadas; a seta do cabecalho
retorna aos amigos, e o campo de texto fica acima das ferramentas para
preservar a area de escrita e os controles de toque de 44px.
Enter envia, Shift + Enter quebra a linha e Escape cancela resposta/edicao.
O texto cresce ate 140px, sem sobrepor o historico, mantendo o limite de
2000 caracteres ja existente no privado.
Novas mensagens nao puxam a rolagem enquanto o usuario le o historico:
um atalho leva ao fim. Imagens, videos e figurinhas abrem uma galeria
com miniaturas, setas, Escape e restauracao do foco.
Fotos e videos abrem ao tocar na previa; videos mostram um icone de play
no balao e os controles de reproducao na galeria ampliada. O carrossel
reune as fotos e videos carregados na conversa enviados pelo mesmo autor
da midia aberta, sem misturar figurinhas. A miniatura ativa fica visivel
ao navegar. Figurinhas mantem uma galeria separada por autor.
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
