# Mapa dos arquivos

Sem build e sem módulos: cada página carrega os scripts na ordem abaixo (variáveis e funções são globais).
Toda página carrega antes o supabase-js 2.45.0 (`js/vendor/supabase-2.45.0.js`, cópia do pacote do npm, conferida no teste-paginas); ele não aparece nas listas abaixo. Nenhum script vem de outro site (CDN): a CSP das páginas só aceita os do próprio site.
Para editar algo, abra só o arquivo da responsabilidade certa. O `*-init.js` é sempre o último da página.

**Pastas:** tudo que vai para o ar fica em `site/`: as páginas `.html`, o `icon.png`, `css/` e `js/`. A pasta `site/` é a raiz do site publicado, então os endereços continuam sem "site/" (ex: `agenda.html`, `js/helpers.js`). Na raiz do repositório fica só o que o Git, o GitHub e o npm exigem ali (`.github/`, `.githooks/`, `.gitignore`, `.gitattributes`, `.mcp.json`, `package.json`, `package-lock.json`), este mapa e `testes/`.

Dentro de `site/`, `js/<página>/` guarda os scripts de cada página (`js/agenda/`, `js/propostas/`, `js/transportadoras/`, `js/weg/`...). Direto em `js/` ficam só os usados por mais de uma página: `acoes`, `supabase-config`, `registro-erros`, `arquivo-faltando`, `dispositivo`, `auth-guard`, `helpers`, `atualizacao-sistema`, `presenca`, `menu` e `status`. As listas abaixo mostram só o nome do arquivo. `js/vendor/` guarda as bibliotecas de terceiros (supabase-js e SheetJS), que não entram no mapa.

**Não mude `site/js/helpers.js` de lugar:** as abas abertas leem a versão publicada nesse endereço (`js/helpers.js` no site; ver `atualizacao-sistema.js`). Se ele mudar, elas param de se atualizar sozinhas.

> Mudou ordem de scripts, funções ou criou arquivo? Rode `npm run mapa`: ele atualiza a ordem das páginas, as linhas, as funções e a lista de arquivos grandes. As descrições e as outras seções são escritas à mão; arquivo novo pega a descrição do próprio cabeçalho.

## Testes

O site continua sem build: `package.json` e `node_modules` servem só para os testes (precisa do Node 20 ou mais novo e do Chrome instalados). O banco é sempre simulado; nenhum teste acessa o Supabase de verdade.

- Primeira vez: `npm install`. Rodar tudo: `npm test` (cerca de 3 minutos; o mais lento, teste-versao, sozinho leva uns 2 e meio). Só um assunto: `npm test -- leads`. Só os que não abrem o navegador (menos de 1 s): `npm test -- --rapidos`.
- `npm test -- --mudados`: os rápidos e os ligados aos arquivos que mudaram desde o último commit (`testes/mudados.js` explica como liga arquivo e teste; arquivo usado em 5 páginas ou mais, como helpers.js e style.css, roda tudo). Bom durante o trabalho; antes de entregar, `npm test` completo.
- O `testes/rodar.js` roda vários testes ao mesmo tempo (até 4; no GitHub, 3), cada um com o próprio Chrome e servidor simulado. Os mais demorados começam primeiro, pelo tempo da última rodada (`testes/capturas/tempos.json`). Um de cada vez: `npm test -- --juntos=1` (útil se um teste só falhar junto com os outros).
- Antes de cada commit (`.githooks/pre-commit`, ligado pelo `npm install` via `testes/ligar-pre-commit.js`): atualiza este mapa, põe ele no mesmo commit e roda os testes rápidos; se um falhar, o commit não acontece. Sem Node no computador, só avisa e deixa commitar. Pular uma vez: `git commit --no-verify`.
- `testes/teste-paginas.js`: abre todas as páginas com o `auth-guard.js` real (erros, arquivos faltando, funções dos botões, menu, login e acessos). Página nova entra na lista `PAGINAS` (o teste acusa página do site fora dela) e precisa estar no ACESSOS_ADMIN e no PAGINAS_DESTINO (menos o Admin).
- `testes/teste-erros.js`: registro de erros, recarga por arquivo que não carregou e a seção do Admin, com o supabase-js de verdade e o servidor simulado.
- `testes/teste-mapa.js`: acusa este mapa desatualizado ou citando arquivo que não existe (`npm run mapa` resolve a primeira parte).
- Os outros `testes/teste-*.js` cobrem uma área cada. `testes/capturas/` guarda as imagens geradas e não vai para o Git.
- Os testes de SQL e do agente de leads não ficam aqui, porque este repositório é público.
- No GitHub: `.github/workflows/testes.yml` roda `npm test` a cada envio para a `main` (aba Actions), em Ubuntu e no fuso de São Paulo. Não bloqueia a publicação do site: se algo falhar, o commit ganha um X vermelho e o GitHub avisa por e-mail. O motivo aparece na página da rodada.
- Publicação: `.github/workflows/publicar.yml` envia só a pasta `site/` para o GitHub Pages a cada envio para a `main` (precisa de Settings → Pages → Source: GitHub Actions). Saiu do ar ou não atualizou: Re-run na rodada que falhou, ou aba Actions → "Publicar site" → Run workflow (cada tentativa envia o site com o próprio nome, `github-pages-<tentativa>`, então o Re-run funciona).

## Ordem de carregamento por página

**index.html** — Página inicial: conversor de texto e calculadora de boletos
- CSS: style
- JS: acoes → supabase-config → registro-erros → arquivo-faltando → dispositivo → auth-guard → helpers → atualizacao-sistema → presenca → status → index-ferramentas → menu

**propostas.html** — Gerador de propostas (textos ZOHO e Zap, desconto, fretes). As contas ficam todas no card Resumo da proposta. No PC (~1180px+): textos | resumo | desconto, com os fretes embaixo do desconto; a partir de 800px, textos e resumo à esquerda, desconto e fretes à direita; no celular, um embaixo do outro (textos, desconto, resumo, fretes).
- CSS: style → propostas
- JS: acoes → supabase-config → registro-erros → arquivo-faltando → dispositivo → auth-guard → helpers → atualizacao-sistema → presenca → busca-fretes → status → menu → propostas-estado → propostas-tabelas-precos → propostas-tabelas-fretes → propostas-avisos → propostas-equipamentos → propostas-valor-tabela → propostas-fretes-painel → propostas-desconto → propostas-desconto-calculo → propostas-desconto-total-seguro → propostas-resumo → propostas-resumo-frete → propostas-cache → propostas-config → propostas-pagamento → proposta-zap → propostas-registro → propostas-textos → propostas-init

**agenda.html** — Agenda de entregas, coletas, transferências e trocas
- CSS: style → agenda → agenda-tabela → agenda-modal → agenda-estoque → agenda-formulario → agenda-mapa → agenda-demanda → agenda-renovacao → agenda-celular → agenda-tema-claro
- JS: acoes → supabase-config → registro-erros → arquivo-faltando → dispositivo → auth-guard → helpers → atualizacao-sistema → presenca → menu → agendamento-comum → agenda-config → agenda-utils → agenda-carregamento → agenda-patrimonio → agenda-banco → agenda-filtros → agenda-busca → agenda-filtro-listas → agenda-filtro-datas → agenda-filtro-status → agenda-filtro-tipos → agenda-filtro-motoristas → agenda-ordem → agenda-ordem-colunas → agenda-render → agenda-celula-partes → agenda-celulas → agenda-linhas → agenda-colunas → agenda-colunas-visiveis → agenda-botoes-linha → agenda-larguras → agenda-tema → agenda-zap → agenda-transportadoras → agenda-motoristas → agenda-form-campos → agenda-unidades → agenda-plataformas → agenda-contratos → agenda-entrega-coleta → agenda-rascunho → agenda-etapas → agenda-modal → agenda-salvar → agenda-coleta → agenda-pagamento → agenda-clientes → agenda-pedido → agenda-pedido-pdf → agenda-lixeira → agenda-estoque-dados → agenda-estoque-tabela → agenda-estoque → agenda-conflitos → agenda-usar-patrimonio → agenda-mapa-links → agenda-mapa-locais → agenda-mapa-lista → agenda-mapa-rota → agenda-mapa-google → agenda-mapa → agenda-demanda-calculo → agenda-demanda-tabela → agenda-demanda → agenda-renovacao-datas → agenda-renovacao-texto → agenda-renovacao → agenda-tempo-real → agenda-init

**estoque.html** — Resumo do estoque de plataformas (por filial)
- CSS: style → estoque
- JS: acoes → [SheetJS 0.18.5] → supabase-config → registro-erros → arquivo-faltando → dispositivo → auth-guard → helpers → atualizacao-sistema → presenca → menu → estoque-config → estoque-parser → estoque-grupos → estoque-render → estoque-busca → estoque-dados → estoque-upload → estoque-init

**tabelas.html** — Consulta e edição das tabelas de preços e fretes
- CSS: style → tabelas
- JS: acoes → supabase-config → registro-erros → arquivo-faltando → dispositivo → auth-guard → helpers → atualizacao-sistema → presenca → menu → tabelas-config → tabelas-dados → tabelas-desenho → tabelas-editor → tabelas-init

**transportadoras.html** — Transportadoras: cadastro, veículos, motoristas e PDFs (ver: acesso "transportadoras"; editar: só admin)
- CSS: style → transportadoras
- JS: acoes → supabase-config → registro-erros → arquivo-faltando → dispositivo → auth-guard → helpers → atualizacao-sistema → presenca → menu → transp-config → transp-banco → transp-cad-banco → transp-docs → transp-render → transp-form → transp-form-veiculo → transp-form-motorista → transp-cad-tela → transp-init

**WEG.html** — Contrato WEG (preços fixos)
- CSS: style
- JS: acoes → supabase-config → registro-erros → arquivo-faltando → dispositivo → auth-guard → helpers → atualizacao-sistema → presenca → menu → weg-dados → weg-documento → weg-cache → weg-email → weg-titulo → weg-init

**admin.html** — Usuários e acessos, online agora e erros do sistema (só admin). Usa a largura toda da tela. As Propostas Zap copiadas ficam na própria página (propostas-copiadas.html).
- CSS: style → admin
- JS: acoes → supabase-config → registro-erros → arquivo-faltando → dispositivo → auth-guard → helpers → atualizacao-sistema → presenca → menu → admin-config → admin-dados → admin-tela → admin-online → admin-aparelhos → admin-erros → admin-erros-copiar → admin-init

**leads.html** — Lista de empresas para a equipe chamar (acesso "leads" no Admin)
- CSS: style → leads
- JS: acoes → supabase-config → registro-erros → arquivo-faltando → dispositivo → auth-guard → helpers → atualizacao-sistema → presenca → menu → leads-config → leads-contato → leads-utils → leads-dados → leads-filtros → leads-lista → leads-cards → leads-acoes → leads-busca-config → leads-init

**login.html** — Login
- CSS: style
- JS: acoes → supabase-config → login-captcha → login

**propostas-copiadas.html** — Propostas Zap copiadas (link 📊 Propostas Zap): cada "Copiar Proposta Zap" com quem fez, aparelho, cliente, equipamentos com desconto, total e a mensagem; filtros em cima (inclusive prazo de pagamento), filtro estilo Excel nos títulos da tabela (clicar no título abre as caixinhas) e desconto médio por usuário. Acesso "propostas-copiadas" no Admin (os dados vêm pela policy de SELECT com `tem_acesso('propostas-copiadas')`). Usa o admin.css (card largo e tabelas) mais o propostas-copiadas.css, e a largura toda da tela.
- CSS: style → admin → propostas-copiadas
- JS: acoes → supabase-config → registro-erros → arquivo-faltando → dispositivo → auth-guard → helpers → atualizacao-sistema → presenca → menu → copiadas-dados → copiadas-filtros → copiadas-linhas → copiadas-descontos → copiadas-filtro-colunas → copiadas-filtro-painel → copiadas-init

**analise-fretes.html** — Análise de fretes (link 📈 Análise de fretes; admin ou acesso "analise-fretes" no Admin): quanto se gasta com frete e com quem. Agendamentos com data no período (sem cancelados e sem a lixeira; atalhos este mês, mês passado, 30/90 dias, este ano), filtros de tipo, transportadora e só concluídos. 📥 Excel baixa os fretes filtrados para a prestação de contas com a transportadora (uma aba por transportadora com o total em fórmula e, com mais de uma, a aba Resumo na frente; a biblioteca SheetJS de `js/vendor/` só é baixada no clique, por isso não aparece na ordem abaixo). Resumo (fretes, valor cobrado, nosso custo pelo "Frete por conta de", frete médio, por máquina, viagens por dia), tabela por transportadora (parte dos fretes e do valor), gráfico de viagens por dia (por semana acima de 2 meses), mesma cidade feita por transportadoras diferentes (⚠️ quando a mais usada cobra mais, por máquina) e frete por modelo. Usa o admin.css mais o analise-fretes.css, o `agendamento-comum.js` (tipos, cidade do endereço e máquinas, os mesmos da agenda) e o `analise-comum.js` (busca, período e peças da tela, os mesmos da Análise de movimentações). O gráfico, no celular: tocar mostra a dica, que fica até tocar fora.
- CSS: style → admin → analise-fretes
- JS: acoes → supabase-config → registro-erros → arquivo-faltando → dispositivo → auth-guard → helpers → atualizacao-sistema → presenca → menu → agendamento-comum → analise-comum → analise-dados → analise-calculo → analise-viagens → analise-filtros → analise-grafico → analise-resumo → analise-tela → analise-excel → analise-init

**analise-movimentacoes.html** — Análise de movimentações (link 🔄 Análise de movimentações; admin ou acesso "analise-movimentacoes" no Admin): quantas máquinas saíram para os clientes e quantas voltaram, para controle interno. Agendamentos com data no período (sem cancelados e sem a lixeira; os mesmos atalhos da Análise de fretes), filtro de modelo e só concluídos. Saída = entrega e a máquina que vai na troca técnica e na entrega/coleta; retorno = coleta e a máquina que volta na troca e na entrega/coleta; "2x" conta 2; agendamento sem máquina escrita conta 1 ("Sem máquina informada"). Transferências (entre obras e entre unidades) e frete frustrado ficam fora do saldo, só no resumo. Resumo (saídas, retornos, saldo, máquinas por dia, transferências e fretes frustrados), gráfico com as saídas para cima e os retornos para baixo da linha do zero (por semana acima de 2 meses; tocar mostra a dica, que fica até tocar fora), por modelo e por cliente (os 15 primeiros e "Mostrar todos"; coleta com mais de um contrato fica com o cliente principal). Usa o admin.css e o analise-fretes.css mais o analise-movimentacoes.css, o `agendamento-comum.js` e o `analise-comum.js`.
- CSS: style → admin → analise-fretes → analise-movimentacoes
- JS: acoes → supabase-config → registro-erros → arquivo-faltando → dispositivo → auth-guard → helpers → atualizacao-sistema → presenca → menu → agendamento-comum → analise-comum → movimentos-dados → movimentos-calculo → movimentos-filtros → movimentos-grafico → movimentos-tela → movimentos-init

## Arquivos (responsabilidade e funções)

- `acoes.js` (98 linhas): Em toda página, logo depois do supabase-js: no lugar de onclick/onchange/oninput (que a CSP bloqueia), os elementos dizem o nome da função: `data-clique` (com `data-arg` para um argumento, número/true/false viram valor; `data-elemento` passa o próprio botão), `data-clique-fora` (só o clique no fundo do modal), `data-mudanca` (change) e `data-entrada` (input). A função precisa ser uma `function` (fica em window); o teste-paginas confere. Clique antes de os scripts terminarem de chegar (a página aparece antes do auth-guard esconder) roda no DOMContentLoaded, em vez de se perder.
  - argumentoDaAcao, rodarAcao
- `admin-aparelhos.js` (349 linhas): Seção "Aparelhos" do admin (trava de aparelhos): lista os aparelhos de cada login (tabela `dispositivos`, só admin lê e altera pelo RLS) com aguardando primeiro, o nome que o admin deu, o e-mail, o código do aparelho (6 letras do `chave_hash`, o mesmo que aparece no topo da tela da pessoa) e o Local (cidade aproximada e IP do último acesso) (de `perfisAdmin`, por isso carrega depois dos perfis); Liberar, Desconectar, ✏️ nome e 🗑️ excluir; botão que liga e desliga a trava (`trava_dispositivos`). Atualiza sozinho a cada 30 s com a aba à vista.
  - mensagemFalhaAparelhos, carregarAparelhos, emailDoAparelho, celulaAparelho, celulaLocalAparelho, desenharBotaoTrava, botaoAparelho, linhaAparelho, desenharAparelhos, salvarAparelho, mudarSituacaoAparelho, renomearAparelho, excluirAparelho, alternarTravaAparelhos
- `admin-config.js` (59 linhas): Páginas (ACESSOS_ADMIN, chave = nome do arquivo sem .html; "fretes" libera os dados de frete; "transportadoras" é só ver), filiais e estado da tela de usuários e acessos. Toda página menos o Admin tem a caixinha aqui (o Admin vem do papel no login, app_metadata.role) e está no PAGINAS_DESTINO do auth-guard.js, senão quem só tem ela sai do sistema: o teste-paginas confere as duas listas.
- `admin-dados.js` (105 linhas): Ler e salvar os acessos de cada usuário (tabela "perfis") e criar usuário pela função `criar-usuario`. Só admin enxerga todos e altera (policies de RLS).
  - carregarPerfisAdmin, salvarPerfilAdmin, criarUsuarioAdmin
- `admin-erros-copiar.js` (51 linhas): Botões 📋 da seção "Erros do sistema": copia um erro (ou todos os da lista) com página, versão, usuário, horários, mensagem e detalhes, pronto para colar numa conversa. Carregar depois de admin-erros.js.
  - textoErroParaCopiar, copiarErroSite, copiarErrosVisiveis
- `admin-erros.js` (387 linhas): Seção "Erros do sistema": lista os erros da tabela erros_site dos últimos 30 dias, filtro por página, limpar a lista, botão que grava um erro de teste e 📋 Copiar em cada erro (admin-erros-copiar.js). Nada entra como HTML.
  - mensagemFalhaErros, carregarErrosSite, errosVisiveis, agruparErros, gruposVisiveis, valoresDoGrupo, criarCelulaVarios, criarRegistrosDoGrupo, desenharFiltroErros, criarCelulaMensagemErro, criarLinhaErro, criarLinhaAvisoErros, desenharErrosSite, limparErrosSite, testarRegistroErros
- `admin-init.js` (50 linhas): Ligações iniciais. Sempre o ÚLTIMO script da página. Quem não é admin já foi mandado embora pelo auth-guard.js.
- `admin-online.js` (127 linhas): Painel "Online agora": quem está com o sistema aberto, em qual página e se está usando, parado ou em segundo plano, e embaixo o aparelho (celular/tablet/computador, marca, navegador) e a cidade aproximada (o texto vem de textoAparelhoOnline, em presenca.js). Sem histórico.
  - nomePaginaOnline, tempoOnline, textoAbaOnline, pessoasOnline, desenharUsuariosOnline
- `admin-tela.js` (254 linhas): Tabela de usuários com uma caixinha por acesso e por filial.
  - alternarItemLista, criarCaixaAdmin, desenharCabecalhoAdmin, desenharPerfis, criarUsuario
- `agenda-banco.js` (369 linhas): Leitura/gravação dos agendamentos (só os fora da lixeira; inclui as colunas de faturamento em CAMPOS_BANCO), mensagem de erro ao salvar e recarga geral (agendamentos, motoristas, transportadoras).
  - doBanco, paraBanco, detalhesErro, mensagemErroSalvar, carregarAgenda, inserirAgendamento, atualizarAgendamento, excluirAgendamentoBanco, recarregarAgenda
- `agenda-botoes-linha.js` (165 linhas): Botão 🔘 Botões: cada usuário escolhe quais botões aparecem em cada agendamento (nos dois modos). O 🗑️ Excluir começa oculto para todo mundo (ocultoPadrao em BOTOES_LINHA), inclusive quem já tinha salvo a escolha; só aparece se o usuário ligar. Também mede a largura da coluna dos botões quando as larguras são fixas. Carregar antes de agenda-init.js.
  - botaoLigado, chaveBotoesLinha, carregarBotoesLinha, salvarBotoesLinha, ligarBotaoLinha, larguraColunaBotoes, atualizarBotaoBotoesLinha, desenharPainelBotoes, alternarPainelBotoes, fecharPainelBotoes
- `agenda-busca.js` (184 linhas): Pesquisa 🔍 da barra por endereço, cliente (ou nome do local) e patrimônio; todas as palavras precisam aparecer. Também busca no banco os agendamentos de antes dos DIAS_PASSADOS_AGENDA (até 200, marcados com `antigo`, somem ao limpar). Esc ou × limpa. Carregar antes de agenda-init.js.
  - palavrasBuscaAgenda, buscandoAgenda, itemCombinaBusca, removerAntigosBusca, buscarAntigosAgenda, digitarBuscaAgenda, limparBuscaAgenda
- `agenda-carregamento.js` (163 linhas): Carregar em outro dia: a máquina carrega num dia e é entregue em outro (colunas `data_carregamento` e `horario_carregamento`; `data` e `horario` continuam sendo os da entrega). Só nos tipos da expedição. Na expedição o agendamento aparece no dia e no horário do carregamento (grupos do dia, ordem e filtro de datas usam dataDaTela/horarioDaTela), com a entrega embaixo do horário; no transportador fica no dia da entrega, com o carregamento embaixo. O Zap sai com "Data coleta" e "Data entrega". Sem carregamento, as colunas nem vão para o banco. Carregar depois de agenda-utils.js e antes de agenda-init.js.
  - carregaEmOutroDia, usaCarregamentoNaTela, dataDaTela, horarioDaTela, textoDiaHora, textoOutroDiaDaLinha, mostrarCamposCarregamento, prepararCamposCarregamento, alternarCarregarAntes, conferirCarregamento, ligarCamposCarregamento
- `agenda-celula-partes.js` (153 linhas): Peças das células: bloco de local, seletor de status, célula com a coluna e nome da máquina.
  - criarBlocoLocal, criarSeletorStatus, criarCelula, criarMaquina
- `agenda-celulas.js` (273 linhas): Conteúdo de cada coluna de um agendamento. Coleta com mais de um contrato: os clientes juntos com quantos contratos ("Alfa + Beta (2 contratos)") e as propostas "712804 / 713000" (agenda-contratos.js).
  - origemNomeDaTela, destinoNomeDaTela, criarCelulasAgenda
- `agenda-clientes.js` (533 linhas): Ao digitar o cliente, sugere o nome completo dos clientes de agendamentos
  - chaveCliente, carregarHistoricoClientes, compararRecentes, agendamentosComCliente, clientesConhecidos, localDoCliente, locaisDoCliente, camposLocalCliente, clienteDoFormulario, preencherOpcoes, rotuloLocal, desenharSugestoesClientes, desenharLocaisCliente, marcarLocalAtivo, preencherAuto, textoPagamentoFormulario, preencherPagamentoCliente, aplicarCliente, usarLocalCliente, aplicarLocalDaLista, escolheuDaLista, prepararSugestoesClientes, ligarSugestoesClientes
- `agenda-coleta.js` (126 linhas): Cria uma coleta já preenchida a partir de uma entrega e duplica um agendamento para outro dia. Duplicar um frete frustrado abre a entrega remarcada (tipo Entrega, frete em branco: o do frustrado é ida + volta).
  - valoresColetaDaEntrega, copiarEntregaParaColeta, valoresDuplicados, duplicarAgendamento
- `agenda-colunas-visiveis.js` (167 linhas): Botão 👁️ Colunas (nos dois modos, que têm as mesmas 22 colunas): mostrar e ocultar qualquer informação da tabela; salva por usuário e por modo. Carregar depois de agenda-colunas.js.
  - colunaLigada, chaveColunasVisiveis, carregarColunasVisiveis, salvarColunasVisiveis, temColunasVisiveisPersonalizadas, restaurarColunasVisiveis, ligarColuna, atualizarBotaoColunas, desenharPainelColunas, alternarPainelColunas, encaixarPainelNaTela, fecharPainelColunas
- `agenda-colunas.js` (286 linhas): Colunas por modo e ordem das colunas (arrastar o título).
  - colunasDoModo, ordenarColunas, colunasAtuais, obterUsuarioAgenda, chaveOrdemColunas, carregarOrdemColunas, salvarOrdemColunas, moverColuna, ordemColunasPersonalizada, restaurarOrdemColunas, limparIndicadoresColunas, soltaDepois, criarTituloColuna
- `agenda-config.js` (285 linhas): Constantes (status, colunas, cores), chaves do localStorage e variáveis de estado da agenda. Os tipos (TIPOS, ROTULOS_TIPO: "Transferência" é a entre obras; TIPO_TRANSFERENCIA_UNIDADES) e STATUS_CONCLUIDO ficam em `agendamento-comum.js`; aqui, TIPOS_EXPEDICAO leva a transferência entre unidades (sem faturamento) e a entrega/coleta pra expedição, e TIPOS_CONTRATO_NOVO (entrega e entrega/coleta) diz quem tem a etapa Faturamento, o 🧾 e o ↩️ (coleta da máquina).
- `agenda-conflitos.js` (62 linhas): Ao salvar, avisa se o patrimônio já está em outra demanda (só aviso, a pessoa decide). Ao editar, só olha os patrimônios novos no agendamento. Carregar depois de agenda-estoque.js.
  - patrimoniosDoAgendamento, conflitosDoAgendamento, confirmarConflitos
- `agenda-contratos.js` (271 linhas): Coleta de mais de uma proposta no mesmo lugar: 1 cliente com 2 contratos, ou 2 clientes. O primeiro contrato são os campos de sempre (Cliente, Nº da proposta, Período); cada outro é uma linha (cliente, proposta, período), guardada no campo escondido agOutrosContratos e na coluna outros_contratos (lista). As máquinas continuam numa lista só. Na mensagem do Zap vai uma referência por contrato; na lista, os clientes juntos ("Alfa + Beta") e as propostas ("712804 / 713000"). Só na coleta: em outro tipo o bloco some e não conta. Entrega/coleta: no Zap saem as duas referências digitadas, a da coleta e a da entrega (`agenda-entrega-coleta.js`).
  - contratoLimpo, listaOutrosContratos, contratosDoAgendamento, textoClientesAgendamento, textoPropostasAgendamento, referenciasZap, criarCampoContrato, criarLinhaContrato, sincronizarOutrosContratos, desenharOutrosContratos, adicionarOutroContrato, removerLinhaContrato, atualizarBlocoOutrosContratos, conferirOutrosContratos
- `agenda-demanda-calculo.js` (228 linhas): Só contas, sem tela, para o 📦 Demanda (agenda-demanda.js): por modelo, num período (pela data da entrega), quantas máquinas saem para os clientes (entrega, troca técnica e a máquina nova da entrega/coleta, somando as quantidades: "2x WTE12" conta 2), quantas delas ainda estão sem patrimônio, quantas voltam nas coletas (e a máquina que volta na entrega/coleta; a recolha da troca técnica não, volta com defeito) e quantas estão disponíveis no último estoque publicado. Cancelado não conta; concluído conta. Também os atalhos de período e o texto do 📋 Copiar. Carregar depois de agenda-patrimonio.js e agenda-mapa-lista.js.
  - isoDoDia, periodoDemanda, semPatrimonioDemanda, ordemDemanda, maquinasDaDemanda, demandaPorModelo, estoquePorModelo, textoDemanda
- `agenda-demanda-tabela.js` (155 linhas): A tabela do 📦 Demanda (agenda-demanda.js), uma linha por modelo: as que saem, as ainda sem patrimônio, as que voltam nas coletas e as disponíveis no último estoque publicado (com quantas em cada filial), e o total embaixo. Clicar no modelo mostra os agendamentos dele; clicar num agendamento fecha a janela e abre ele para editar. Carregar depois de agenda-demanda-calculo.js.
  - celulaDemanda, celulaEstoqueDemanda, linhaAgendamentoDemanda, linhasModeloDemanda, tabelaDemanda
- `agenda-demanda.js` (202 linhas): Janela com o total de máquinas de cada modelo que saem para os clientes num período (não é por entrega), para saber quantas comprar. Período em De/Até com atalhos (esta semana, próxima, este mês, próximo; abre na próxima semana), na agenda toda, sem os filtros da lista. Avisos (entrega sem data, período antes dos dias carregados, estoque fora do ar), a data de publicação do estoque e o 📋 Copiar para o Zap. A tabela fica em agenda-demanda-tabela.js e as contas em agenda-demanda-calculo.js. Carregar depois deles e de agenda-estoque-dados.js.
  - abrirDemandaAgenda, fecharDemandaAgenda, carregarEstoqueDemanda, escolherPeriodoDemanda, marcarAtalhoDemanda, avisosDemanda, desenharDataEstoqueDemanda, desenharDemandaAgenda, copiarDemandaAgenda
- `agenda-entrega-coleta.js` (37 linhas): Tipo Entrega/Coleta (o cliente troca de máquina): cada máquina é de uma proposta, e cada proposta tem a sua linha de referência na mensagem do Zap, digitada inteira ("ORÇAMENTO DE LOCAÇÃO DE PLATAFORMA ORBMAQ_WTE14_2 DIAS - Proposta: 713740"). A da coleta fica no campo Referência da coleta (coluna referencia_recolha) e sai primeiro; a da entrega é a Referência de sempre. Carregar depois de agenda-contratos.js.
  - conferirReferenciaColeta, erroColetaZap, referenciasEntregaColetaZap
- `agenda-estoque-dados.js` (108 linhas): Consulta ao estoque: lê pela função `estoque_disponiveis` e descobre quais máquinas já estão em alguma demanda.
  - carregarEstoqueDisponivel, modelosDoAgendamento, agendamentoReservaMaquina, reservasDaAgenda, textoReserva, descricaoDemanda
- `agenda-estoque-tabela.js` (161 linhas): Consulta ao estoque: data da publicação (destaque se antiga), máquinas de cada filial e a tabela da janela.
  - tempoDesde, criarDataEstoque, maquinasDaFilial, criarTabelaEstoque
- `agenda-estoque.js` (210 linhas): Botão 🔍 da linha: patrimônios disponíveis e em manutenção no último estoque publicado (patrimônio, marca, modelo, situação), por filial, começando pelo modelo do agendamento; destaca a máquina que já está em alguma demanda e, com mais de 12 horas sem publicar, o tempo desde a publicação do estoque. Lê pela função `estoque_disponiveis` do banco (só esses dois status, sem cliente, com `tem_acesso('agenda')`). Só consulta.
  - desenharEstoqueAgenda, abrirEstoqueAgenda, fecharEstoqueAgenda
- `agenda-etapas.js` (139 linhas): Etapas do formulário (Demanda, Local e entrega, Faturamento) que recolhem ao clicar no título; salva por usuário; avisoFormulario() abre a etapa com erro. Carregar antes de agenda-modal.js.
  - chaveEtapas, lerEtapas, salvarEtapas, mostrarEtapa, aplicarEtapasSalvas, avisoFormulario
- `agenda-filtro-datas.js` (227 linhas): Painel de datas estilo Excel e atalhos (só hoje, hoje e anteriores, próximos 7 dias).
  - semAcentoMinusculo, datasDoFiltro, rotuloDataFiltro, atualizarBotaoDatas, desenharPainelDatas, alternarPainelDatas, fecharPainelDatas, alternarTodasDatas, selecionarAteHoje, selecionarProximosDias
- `agenda-filtro-listas.js` (55 linhas): O que as listas de datas, status, tipo e motorista têm em comum: uma aberta por vez (fecharListasFiltro), o "(Selecionar tudo)" e a linha [caixinha] nome (quantidade).
  - fecharListasFiltro, marcarCaixaTodos, criarOpcaoFiltro
- `agenda-filtro-motoristas.js` (277 linhas): Filtro de motorista com caixinhas e busca, igual ao de status (nos dois modos): marca os que quiser ver (ex: João + Pedro), "(Sem motorista)" incluso. Guarda os marcados (motorista novo não entra num filtro já feito), salvo por usuário e por modo (agendaMotoristas).
  - chaveMotoristasFiltro, nomeMotoristaFiltro, rotuloMotoristaFiltro, carregarMotoristasFiltro, salvarMotoristasFiltro, filtrandoMotoristas, motoristaAparece, motoristasDoFiltro, contagemPorMotorista, nomesMotoristasMarcados, textoMotoristasFiltro, atualizarBotaoMotoristas, marcarMotoristaFiltro, desenharPainelMotoristas, alternarPainelMotoristas, fecharPainelMotoristas, alternarTodosMotoristas
- `agenda-filtro-status.js` (198 linhas): Painel de status estilo Excel. Os status desmarcados ficam salvos por usuário e por modo (agendaStatus); as datas não.
  - chaveStatusFiltro, carregarStatusFiltro, salvarStatusFiltro, statusDoFiltro, contagemPorStatus, atualizarBotaoStatus, desenharPainelStatus, alternarPainelStatus, fecharPainelStatus, alternarTodosStatus
- `agenda-filtro-tipos.js` (184 linhas): Filtro de tipo com caixinhas, igual ao de status (só no transportador): marca a combinação que quiser ver (ex: Entrega + Coleta). Os tipos desmarcados ficam salvos por usuário (agendaTipos).
  - chaveTiposFiltro, carregarTiposFiltro, salvarTiposFiltro, filtrandoTipos, tiposMarcados, nomesTiposMarcados, textoTiposFiltro, contagemPorTipo, atualizarBotaoTipos, desenharPainelTipos, alternarPainelTipos, fecharPainelTipos, alternarTodosTipos
- `agenda-filtros.js` (300 linhas): Modo expedição/transportador, botões "Só sem patrimônio" e "Só sem card" (frete por nossa conta ou dividido com o Card vazio; por conta do cliente não tem card), botão ⚙️ Filtros (painel único com filtros e opções; o botão e a linha da contagem avisam o que está filtrando) e filtrarAgendamentos() (pesquisando, o modo, as datas e os status não escondem nada; os antigos só aparecem na pesquisa).
  - definirModo, visivelNoModo, filtrandoSemPatrimonio, alternarSemPatrimonio, itemSemCard, filtrandoSemCard, alternarSemCard, filtrosAtivos, atualizarBotaoFiltros, limparFiltros, alternarPainelFiltros, fecharPainelFiltros, filtrarAgendamentos
- `agenda-form-campos.js` (381 linhas): CAMPOS_AGENDA, máscaras de horário/período e regras dos campos. Em entrega, a retirada vem recolhida ("— W Rental"); abre sozinha se tiver algo preenchido ou em outro tipo.
  - preencherSelect, forcarMaiusculo, mascararHorario, mascararCampoHorario, horarioValido, textoDias, textoPeriodos, normalizarPeriodo, atualizarSugestoesPeriodo, atualizarCamposTipo, retiradaPreenchida, mostrarRetirada, atualizarRetirada, alternarRetirada, preencherSelectComAtual, garantirOpcaoTransportadora, garantirOpcaoVendedor
- `agenda-init.js` (240 linhas): Ligações de eventos e carga inicial (modo, tema e ordem salvos). Sempre o ÚLTIMO script da página.
- `agenda-larguras.js` (349 linhas): Largura das colunas: arrastar a borda do título (como no Excel), duplo clique ajusta ao conteúdo; salva por usuário e por modo. Carregar depois de agenda-colunas.js.
  - chaveLarguras, lerLarguras, salvarLarguras, temLarguraPersonalizada, restaurarColunasPadrao, idsDaTabela, titulosDaTabela, aplicarLarguras, congelarLarguras, ajustarLarguraAoConteudo, atualizarBotaoColunasPadrao, criarAlcaLargura
- `agenda-linhas.js` (216 linhas): Cabeçalho da tabela e a linha de cada agendamento, com os botões (✅ concluir, só na expedição; 📋 Zap, 🧾 faturamento, ↩️ coleta, 📆 duplicar, 🔍 estoque, editar, excluir).
  - criarCabecalhoAgenda, criarItemAgenda
- `agenda-lixeira.js` (211 linhas): Lixeira (só admin): excluir manda o agendamento para a lixeira (`excluido_em`, pela função `mover_agendamento_lixeira` do banco; quem não é admin não vê mais). Botão 🗑️ Lixeira (`.so-admin`) lista os excluídos para restaurar ou apagar de vez (só admin pelo RLS; apaga junto o PDF do pedido). Carregar antes de agenda-init.js.
  - moverParaLixeiraBanco, carregarLixeira, dataLixeira, desenharLixeira, abrirLixeira, fecharLixeira, restaurarDaLixeira, apagarDeVez
- `agenda-mapa-google.js` (188 linhas): Carrega o Google Maps para o 🗺️ Mapa (agenda-mapa.js): a chave vem da função mapa-agenda do Supabase (segredo GOOGLE_MAPS_CHAVE; não fica no código, que é público) e o script do Google só baixa quando o mapa abre. Sem a chave, com a função fora do ar ou com a chave recusada pelo Google, o mapa avisa o que falta. Também desenha as unidades da W Rental (quadrados "W"). Carregar antes de agenda-mapa.js.
  - erroDoMapa, buscarChaveGoogleMaps, carregarGoogleMaps, prepararMapaGoogle, desenharUnidadesMapa, mostrarAvisosMapa
- `agenda-mapa-links.js` (142 linhas): Lê o link do Google Maps salvo no agendamento (sem internet): as coordenadas que vêm nele (!3d/!4d, ?q=, /maps/search/, coordenadas digitadas; @lat,lng é só o centro da tela de quem copiou), se é link curto (maps.app.goo.gl, que só a função do Supabase abre) e o nome do lugar (para a busca de endereços). Também diz quais lados do agendamento vão para o 🗺️ Mapa. Carregar antes de agenda-mapa-locais.js.
  - coordenadaValida, pontoMapa, coordenadasDoTexto, urlDoLink, ehLinkCurto, textoDoLugarNoLink, enderecoParaBusca, ladosNoMapa
- `agenda-mapa-lista.js` (273 linhas): As paradas do 🗺️ Mapa (agenda-mapa.js): os agendamentos da lista em ordem de dia e horário, numerados como os pinos. Ao lado do mapa, separadas por dia, com a situação de cada uma (procurando, aproximado, sem local e o motivo); clicar leva ao pino. A janela do pino mostra tipo, horário, cliente, máquina, transportadora, status e o local, com "Abrir no Google Maps" e "Editar". "Rota ↗" abre no Google Maps a rota do dia: sai da W Rental Itajaí e passa pelos locais na ordem do horário (o Google abre até 10 paradas). Carregar depois de agenda-mapa-locais.js.
  - chaveHorarioMapa, agendamentosDoMapa, montarParadasMapa, tituloParadaMapa, paradasPorDia, desenharListaMapa, criarItemListaMapa, atualizarItemListaMapa, atualizarRotasMapa, linkAbrirNoMaps, conteudoJanelaMapa
- `agenda-mapa-locais.js` (277 linhas): Acha as coordenadas do local do cliente de cada agendamento para o 🗺️ Mapa (agenda-mapa.js), nesta ordem: as que já vêm no link do Google Maps (link longo ou coordenadas digitadas); o link curto (maps.app.goo.gl), aberto pela função mapa-agenda do Supabase (o navegador não consegue abrir link de outro site); o nome do lugar que vem no link; o endereço escrito, pela busca de endereços do Google (Geocoder). O que achou fica guardado neste navegador (agendaMapaLocais) para não buscar de novo. Carregar antes de agenda-mapa.js.
  - locaisMapaGuardados, chaveLinkMapa, chaveEnderecoMapa, localMapaGuardado, guardarLocalMapa, recomecarBuscasMapa, abrirLinkCurto, buscarEnderecoGoogle, coordenadasDoLado, coordenadasDoLink, localizarParadas
- `agenda-mapa-rota.js` (52 linhas): "Rota ↗" de cada dia do 🗺️ Mapa: abre no Google Maps a rota que sai da W Rental Itajaí e passa pelos locais do dia na ordem do horário (o Google abre até 10 paradas pelo link; as demais ficam de fora, com aviso). Carregar depois de agenda-mapa-lista.js.
  - linkRotaMapa, abrirRotaDoDia
- `agenda-mapa.js` (218 linhas): Mostra no Google Maps os agendamentos que estão na lista (os filtros valem): um pino por local do cliente, na cor do dia, com o número da lista ao lado do mapa (agenda-mapa-lista.js). Pino apagado = local aproximado (achado pelo endereço). As unidades da W Rental aparecem como quadrados "W". A chave do Google Maps vem da função mapa-agenda do Supabase (não fica no código, que é público); sem ela, o mapa avisa o que falta. Carregar depois de agenda-mapa-locais.js e agenda-unidades.js.
  - abrirMapaAgenda, fecharMapaAgenda, latLngMapa, limparMarcadoresMapa, colocarMarcadorMapa, abrirJanelaMapa, focarParadaMapa, enquadrarMapa, atualizarResumoMapa
- `agenda-modal.js` (282 linhas): Abrir e fechar o formulário, descartar rascunho, excluir pelo modal. Card por nossa conta e no dividido; e-mails do cliente sempre aparecem (faturamento), mas só vão no agendamento por conta do cliente ou dividido. "Frete por conta de: Cliente e nossa conta" mostra a parte por nossa conta (coluna `frete_nossa`) e quanto fica para o cliente.
  - abrirModalAgenda, atualizarCamposConta, atualizarTextoFreteCliente, fecharModalAgenda, encerrarModalAgenda, descartarRascunho, excluirAgendamentoAberto
- `agenda-motoristas.js` (90 linhas): Só leitura: carrega os motoristas e monta as opções do formulário. Cadastrar/excluir motorista: só admin, em transportadoras.html.
  - carregarMotoristas, motoristasDe, atualizarOpcoesMotorista
- `agenda-ordem-colunas.js` (267 linhas): Só no transportador: clicar no título de uma coluna ordena por ela (▲), de novo inverte (▼) e na terceira volta à ordem normal (data e horário). Horário ▼ = dias mais recentes primeiro, ainda separados por dia; outra coluna ordena a lista inteira, sem a separação por dia, com a data em cima do horário. Vazio fica no fim; o empate segue a ordem normal. A linha da contagem avisa ("Ordenado por...") e tem o ↺ Ordem normal. Salva por usuário (`agendaOrdemColuna`). Carregar depois de agenda-ordem.js.
  - chaveOrdemColuna, carregarOrdemColuna, salvarOrdemColuna, ordemColunaAtiva, agrupaPorDia, sentidoDasDatas, vazioNaOrdem, compararValoresOrdem, ordenarPorColuna, alternarOrdemColuna, voltarOrdemNormal, setaOrdemColuna, textoOrdemColuna, atualizarAvisoOrdemColuna, textoDataNaLinha
- `agenda-ordem.js` (115 linhas): Ordem dentro de cada data (horário, motorista, entregas/coletas).
  - ordemEfetiva, compararHorario, ordenarAgendamentos
- `agenda-pagamento.js` (337 linhas): Faturamento no formulário (só entrega e entrega/coleta, TIPOS_CONTRATO_NOVO): forma de pagamento (Depósito/Boleto) e prazos em linhas (28 e 56 = 28/56). Botão 🧾 da linha copia "Boleto – 28/56 DD - Enviar para:" com um e-mail por linha (pega só os e-mails do campo; nomes, telefones e separadores ficam de fora). Frete frustrado: o faturamento da entrega fica como está no banco (nada vai no salvar, sem perguntar e sem apagar o PDF do pedido). Carrega depois de agenda-coleta.js e antes de agenda-init.js.
  - prazosDigitados, atualizarResumoPrazos, desenharPrazos, adicionarPrazo, validarPrazos, atualizarBlocoFaturamento, preencherFaturamento, faturamentoParaRascunho, faturamentoPreenchido, coletarFaturamento, textoFaturamento, copiarFaturamento
- `agenda-patrimonio.js` (121 linhas): Regras do patrimônio: formato (maiúsculo, com a letra O depois dos números minúscula), patrimônio ainda não definido (só o modelo, menos de 3 números, ex: WAE15; com vários equipamentos basta um) e vários equipamentos juntos na coluna plataforma ("2x WAD16 + WTE12": separarPlataformas e o modelo pelo patrimônio ficam em `agendamento-comum.js`; aqui, juntarPlataformas faz o contrário). Carregar depois de agenda-utils.js.
  - patrimonioFormatado, juntarPlataformas, plataformasFormatadas, patrimonioIncompleto, itemSemPatrimonio, atualizarAvisoPatrimonio
- `agenda-pedido-pdf.js` (132 linhas): PDF do pedido no Storage (bucket privado `pedidos-compra`, link assinado de 120 s). Só envia/apaga ao clicar em Salvar.
  - abrirPedidoPdf, enviarPedidoPdf, removerPedidoPdfStorage, sincronizarPdfPedido
- `agenda-pedido.js` (242 linhas): Pedido de compra (sim/não, número, PDF até 5 MB). Com PDF anexado o Sim/Não fica travado até apagar o PDF.
  - pedidoTemPdf, atualizarControlesPedido, preencherPedido, anexarPedidoPdf, apagarPedidoPdf, lerPedidoFormulario, limparPedidoParaSalvar
- `agenda-plataformas.js` (142 linhas): Linhas de equipamento do formulário (patrimônio, quantidade, − e +, como em propostas). As linhas são só a tela: o valor salvo fica no campo escondido agPlataforma. Carregar antes de agenda-modal.js.
  - criarLinhaPlataforma, sincronizarPlataformas, desenharPlataformas, adicionarLinhaPlataforma, removerLinhaPlataforma, digitarPlataforma
- `agenda-rascunho.js` (99 linhas): Guarda no navegador o que foi digitado e não salvo.
  - chaveRascunho, lerRascunhos, gravarRascunhos, removerRascunho, salvarRascunho, agendarRascunho, atualizarBotoesModal
- `agenda-render.js` (239 linhas): Chips de transportadora, select de ordem, controles do modo e renderizarAgenda().
  - desenharChips, atualizarSelectOrdem, definirOrdem, atualizarControlesModo, renderizarAgenda
- `agenda-renovacao-datas.js` (205 linhas): Só contas de datas, sem tela, para o ✉️ Email de renovação: o vencimento pela data da entrega e o período do agendamento (o dia da entrega conta como o 1º; depois renova por mais um período igual), feriados nacionais (os de data fixa e, pela Páscoa, Carnaval, Sexta-feira Santa e Corpus Christi), dia útil, prazo de resposta (dia útil: o próprio vencimento; fim de semana ou feriado: o dia útil anterior; já vencido: hoje; nunca antes de hoje) e o dia da semana por extenso. Os municipais ficam com a pessoa (caixinha Feriado da janela).
  - dataDoIso, isoDoDiaRenovacao, somarDiasIso, pascoa, feriadosNacionais, ehFeriadoNacional, ehDiaUtil, prazoRenovacao, diaDaSemanaRenovacao, diaMesRenovacao, duracaoDoPeriodo, somarAnosIso, proximoVencimento, textoOrigemVencimento
- `agenda-renovacao-texto.js` (277 linhas): Só textos, sem tela, para o ✉️ Email de renovação (agenda-renovacao.js): o endereço do Sisloc arrumado ("R X Numero: 740 ... Cidade: POMERODE Estado: SC" -> "R X, 740 - Bairro, Pomerode/SC"), vence/venceu, Bom dia/Boa tarde, máquinas do mesmo modelo juntas, avisos extras (o da NF de retorno com o nome da empresa), e o assunto e o corpo (texto e HTML com o amarelo e o negrito do modelo do Outlook). As datas (feriados, prazo, dia da semana) ficam em agenda-renovacao-datas.js. O que o site não tem sai como marcador para trocar no Outlook (MARCADORES_RENOVACAO).
  - empresaNfRetorno, textoAvisoExtra, nomeProprioEndereco, enderecoDoSisloc, equipamentosRenovacao, camposRenovacao, assuntoRenovacao, textoRenovacao, escaparRenovacao, htmlRenovacao
- `agenda-renovacao.js` (282 linhas): Botão ✉️ da entrega (e da entrega/coleta): abre a janela do email de renovação já preenchida. O vencimento vem da data da entrega e do período (o próximo a partir de hoje; agenda-renovacao-datas.js) e pode ser mudado; o prazo de resposta é calculado (e pode ser mudado); local e endereço vêm da entrega; o aviso da NF de retorno vem com o nome da empresa para editar (marcado nas conhecidas, como a WEG). Mostra a prévia e copia o assunto e o email (formatado, para colar no Outlook). Os textos ficam em agenda-renovacao-texto.js.
  - desenharAvisosRenovacao, abrirRenovacaoAgenda, fecharRenovacaoAgenda, mudarVencimentoRenovacao, mudarFeriadoRenovacao, mudarPrazoRenovacao, recalcularPrazoRenovacao, camposRenovacaoDaJanela, alertasRenovacao, desenharRenovacao, copiarAssuntoRenovacao, copiarEmailRenovacao
- `agenda-salvar.js` (356 linhas): salvarAgendamento() (os filtros de status e datas ficam como estavam; se o salvo ficou escondido, o aviso diz por quê), concluirAgendamento() (botão ✅: marca Concluído e sai da expedição, sem excluir) e excluirAgendamento() (manda para a lixeira; o PDF do pedido fica até apagar de vez).
  - salvarAgendamento, avisoSalvoEscondido, concluirAgendamento, excluirAgendamento
- `agenda-tema.js` (27 linhas): aplicarTema() e alternarTema() (fundo claro opcional; escuro é o padrão).
  - aplicarTema, alternarTema
- `agenda-tempo-real.js` (151 linhas): Quem grava avisa os outros navegadores pelo canal de avisos do Supabase (sem dados, sem SQL) e cada um recarrega a lista. Espera a pessoa terminar se tiver formulário ou janela aberta, coluna sendo arrastada ou status sendo trocado; aba escondida recarrega ao voltar; a cada 5 min recarrega por segurança. Carregar antes de agenda-init.js.
  - agendaOcupada, agendarRecargaViva, executarRecargaViva, avisarMudancaNaAgenda, iniciarTempoReal
- `agenda-transportadoras.js` (57 linhas): Só leitura: carrega a lista de transportadoras para os campos e filtros da agenda. Cadastrar/excluir transportadora: só admin, em transportadoras.html.
  - carregarTransportadoras, definirTransportadoras, atualizarSelectsTransportadora
- `agenda-unidades.js` (152 linhas): Tipo "Transferência entre unidades": a máquina vai de uma unidade da W Rental para outra. Aparece na expedição como uma entrega, mas não tem faturamento. No formulário, saída (Itajaí por padrão) e destino viram duas caixas com as unidades; os campos de retirada, entrega e cliente são preenchidos sozinhos com o nome e o endereço da unidade. Carregar antes de agenda-init.js.
  - nomeUnidade, unidadePorCidade, unidadePorNome, prepararSelectsUnidades, aplicarUnidades, atualizarBlocoUnidades, erroTransferenciaUnidades
- `agenda-usar-patrimonio.js` (213 linhas): Botão "Usar" em cada máquina da lupa: grava o patrimônio no agendamento com um clique. Só o modelo preenche direto; patrimônio definido pergunta antes de trocar; com vários equipamentos a pessoa escolhe qual trocar; máquina em outra demanda passa pelo alerta. Coleta, cancelado e concluído não têm o botão. Carregar depois de agenda-conflitos.js.
  - destinoDoPatrimonio, plataformaTrocando, atualizarPlataformaDoRascunho, fecharEscolhaTroca, mostrarEscolhaTroca, usarPatrimonio, gravarPatrimonio
- `agenda-utils.js` (61 linhas): corDoDia(), tituloDoDia() e partesFrete() (frete dividido: o cliente paga o frete menos a parte por nossa conta).
  - corDoDia, tituloDoDia, partesFrete, freteDivididoValido
- `agenda-zap.js` (328 linhas): Texto de agendamento copiado para o grupo da transportadora. A referência digitada à mão sem o número da proposta ganha " - Proposta: N" no fim. Frete dividido: uma linha "FRETE POR CONTA DO CLIENTE" e outra "FRETE POR NOSSA CONTA", cada uma com a sua parte, e vão o CARD e os contatos do financeiro. Coleta com mais de um contrato: uma referência por contrato (referenciasZap, em agenda-contratos.js).
  - textoDataZap, ehLocalWR, modelosDaPlataforma, textoPeriodoReferencia, referenciaZap, linhasLocalZap, linhasDataZap, montarTextoZap, copiarAgendamentoZap
- `agendamento-comum.js` (121 linhas): O que a Agenda e as Análises (fretes e movimentações) usam do agendamento: os tipos (e o nome na tela), o status Concluído, a cidade do endereço e as máquinas da plataforma (vários equipamentos e o modelo de cada um). Carregar antes de agenda-config.js. Fica direto em js/ porque duas páginas usam (cidadeDoEndereco: cidade/UF tirada do texto do endereço; modeloDaPlataforma: WAE18R001 -> WAE18). Tipo "Frete frustrado" (TIPO_FRETE_FRUSTRADO): a entrega que carregou e voltou; não reserva a máquina nem vai para a expedição. Tipo "Entrega/Coleta" (TIPO_ENTREGA_COLETA): o cliente troca de máquina; como a troca técnica (TIPOS_COM_RECOLHA: leva uma e traz a outra, plataformaRecolha), mas com dois contratos e faturamento.
  - rotuloTipo, cidadeDoEndereco, separarPlataformas, modeloDaPlataforma
- `analise-calculo.js` (178 linhas): Só contas, sem tela: totais e médias (por frete e por máquina), por transportadora, a mesma cidade feita por transportadoras diferentes (a mais usada cobra mais?) e frete por modelo. Cancelado não entra. As viagens por dia ficam em analise-viagens.js; somar e agrupar, em analise-comum.js.
  - fretesDaAnalise, somarFretes, porTransportadora, alertaDaCidade, comparacaoPorCidade, porModelo
- `analise-comum.js` (295 linhas): O que a Análise de fretes e a Análise de movimentações usam: a busca dos agendamentos do período (de 1000 em 1000, sem a lixeira), os atalhos de período, as faixas do gráfico (um dia, ou uma semana no período longo), os formatos de número e as peças da tela (cartão do resumo, célula, tabela vazia e o desenho das colunas em SVG). Fica direto em js/ porque duas páginas usam (como o agendamento-comum.js); carregar depois dele.
  - buscarAgendamentosDoPeriodo, isoDaData, periodoDoAtalho, marcarAtalhosPeriodo, diaSeguinte, diaDaSemana, diaMes, faixasDoPeriodo, tituloDaFaixa, somar, agrupar, numeroBR, plural, cartaoResumo, celula, linhaVaziaAnalise, elementoSvg, eixoDoGrafico, caminhoBarra
- `analise-dados.js` (148 linhas): Busca os agendamentos com data no período (buscarAgendamentosDoPeriodo, em analise-comum.js) e deixa cada um pronto para as contas: valor do frete e nosso custo em número, máquinas, modelos e cidade do cliente, mais o que vai no 📥 Excel (cliente, proposta, motorista, de onde sai e para onde vai). Abre para o admin e para quem tem o acesso "analise-fretes" (página Admin).
  - numeroOuNulo, nossoCustoDoFrete, localDoFrete, freteDaLinha, carregarAnaliseFretes
- `analise-excel.js` (274 linhas): Botão 📥 Excel: baixa os fretes filtrados na tela (período, tipo, transportadora e só concluídos), para a prestação de contas com a transportadora. Uma aba por transportadora (data, cliente, máquinas, de onde sai, para onde vai, motorista, valor e de quem é a conta, com o total em fórmula) e, com mais de uma, uma aba Resumo na frente. A biblioteca de planilha (SheetJS, js/vendor/) só é baixada no primeiro clique.
  - carregarSheetJS, serialExcel, textoMaquinasExcel, textoFiltrosExcel, abaExcel, nomeDeAba, ordemExcel, planilhaFretes, nomeArquivoExcel, baixarExcelFretes
- `analise-filtros.js` (93 linhas): Período (De/Até e os atalhos: este mês, mês passado, 30 e 90 dias, este ano, de analise-comum.js), tipo de agendamento, transportadora e "Só concluídos". Trocar o período busca de novo no banco; o resto só refaz as contas.
  - periodoAnalise, filtroAnalise, marcarAtalhoAnalise, escolherPeriodoAnalise, trocarPeriodoAnalise, atualizarTransportadorasAnalise, prepararFiltrosAnalise
- `analise-grafico.js` (249 linhas): Colunas de viagens por dia (ou por semana, no período longo) em SVG, sem biblioteca (a CSP só deixa script do próprio site). Passar o mouse ou tocar mostra o dia: viagens, valor e quem fez (no celular, até tocar fora). Redesenha quando a tela muda de largura. O eixo, as datas e o desenho da coluna ficam em analise-comum.js.
  - esconderDicaViagens, conteudoDicaViagens, mostrarDicaViagens, indiceNoGrafico, aoMoverNoGrafico, desenharGraficoViagens
- `analise-init.js` (12 linhas): Monta os filtros (últimos 30 dias) e faz a primeira busca. Sempre o ÚLTIMO script da página. Quem não tem o acesso já foi mandado embora pelo auth-guard.js.
- `analise-resumo.js` (64 linhas): Os números grandes do topo (fretes, valor, nosso custo, frete médio, por máquina e viagens por dia) e os formatos de dinheiro e porcentagem (número, plural e o cartão ficam em analise-comum.js).
  - dinheiro, porcento, desenharResumoFretes
- `analise-tela.js` (220 linhas): Desenha tudo a partir dos agendamentos carregados e dos filtros: o resumo (fretes, valor, nosso custo, médias e viagens por dia), a tabela por transportadora com a parte de cada uma, o gráfico de viagens (com os números em tabela), a comparação por cidade e o frete por modelo.
  - celulaParte, desenharTabelaTransportadoras, desenharViagensAnalise, textoAlertaCidade, desenharComparacaoCidades, desenharTabelaModelos, textoVazioAnalise, desenharAnaliseFretes
- `analise-viagens.js` (64 linhas): Só contas: viagens de cada dia do período (os dias sem viagem também) ou de cada semana (segunda a domingo) no período longo (faixasDoPeriodo, em analise-comum.js), com o valor e quem fez, mais a média nos dias com viagem e o dia mais cheio. Viagem = um agendamento.
  - viagensPorTransportadora, barraDeViagens, barrasDeViagens, resumoViagens
- `arquivo-faltando.js` (250 linhas): Em toda página menos o login, logo depois de registro-erros: se a página terminou de carregar com algum arquivo faltando (falha de rede; o supabase-js de `js/vendor/` também conta), envia o registro e recarrega sozinha uma vez. Faltou de novo em 5 min, o site não respondeu ou não dá para guardar a marca no sessionStorage: mostra aviso com "Recarregar". Sem internet, recarrega quando a conexão voltar. Não depende do helpers.js.
  - lerRecargaArquivo, gravarRecargaArquivo, listaArquivosFaltando, doProprioSite, esperarNoMaximo, renovarArquivosFaltando, enviarRegistroAntesDeRecarregar, recarregarPorArquivo, mostrarAvisoArquivoFaltando, recarregarSozinhaPorArquivo, conferirArquivosDaPagina
- `atualizacao-sistema.js` (293 linhas): Em toda página menos o login: a cada 2 min e ao voltar para a aba compara VERSAO_SISTEMA com a do helpers.js publicado; se mudou, renova os arquivos no navegador e recarrega. Espera se houver janela aberta, trabalho não salvo ou uso no último minuto (mostra aviso com "Atualizar agora"). Carregar depois de helpers.js.
  - lerTentativaAtualizacao, gravarTentativaAtualizacao, lerVersaoPublicada, temTrabalhoAberto, paginaOcupada, esconderAvisoNovaVersao, mostrarAvisoNovaVersao, aplicarAtualizacao, tentarAtualizar, verificarVersaoSistema
- `auth-guard.js` (389 linhas): Incluir em toda página que precisa de login (depois de supabase-config.js). Sem sessão ativa manda pra login.html antes da página aparecer; depois confere perfil (com cache), acesso à página e filial, e mostra os itens `.so-admin` para admin.
  - existeLoginSalvo, ehAdmin, carregarPerfil, salvarPerfilCache, lerPerfilCache, buscarPerfil, temAcesso, temFilial, recursoDaPagina, nomeArquivoAtual, sairDoSistema, liberarPaginaAtual, fazerLogout
- `busca-fretes.js` (74 linhas): TABELAS_FRETES (uma tabela por transportadora) e buscarLinhasFretes() (busca em páginas de 1000 linhas).
  - buscarLinhasFretes
- `copiadas-dados.js` (123 linhas): Carrega cada "Copiar Proposta Zap" dos últimos 90 dias (até 500; propostas-registro.js grava e só o admin lê, pelo RLS), a contagem ("3 de 40" filtrando) e o aviso de lista vazia.
  - carregarPropostasAdmin, textoVazioPropostas, desenharPropostasAdmin
- `copiadas-descontos.js` (122 linhas): Quadro acima da tabela: por usuário, quantas propostas, equipamentos com valor de tabela, desconto médio (média do % de cada equipamento, contando a quantidade), desconto sobre o total de tabela e o maior desconto, só das propostas que passam nos filtros.
  - resumoDescontosPorUsuario, percentualAdmin, desenharDescontosPorUsuario
- `copiadas-filtro-colunas.js` (242 linhas): Clicar no título de uma coluna da tabela abre caixinhas como no filtro do Excel: desmarcou, some. Usuário, Cliente e Configurações têm um grupo por tipo de informação; Equipamentos mostra a proposta se algum modelo dela estiver marcado; Total tem faixa de valor. Vale junto com os filtros de cima.
  - gruposFiltroColuna, valoresDoGrupo, textoValorGrupo, passaFiltrosColuna, colunaFiltrando, filtrandoColunas, limparFiltrosColuna, opcoesDoGrupo, marcarValorColuna, prepararCabecalhoFiltros, atualizarCabecalhoFiltros
- `copiadas-filtro-painel.js` (279 linhas): O painel que abre embaixo do título da coluna: pesquisa, "(Selecionar tudo)" de cada grupo, as caixinhas com quantas propostas têm cada valor e "Limpar filtro"; no Total, a faixa de valor. Marcar ou desmarcar filtra na hora. Fecha com Esc, no ✖ ou clicando fora. As regras ficam em copiadas-filtro-colunas.js.
  - painelFiltroColuna, alternarPainelFiltroColuna, fecharPainelFiltroColuna, aplicarFiltroColuna, filtrarOpcoesPainel, caixaFiltroColuna, grupoPainelFiltro, faixaPainelFiltro, desenharPainelFiltroColuna
- `copiadas-filtros.js` (244 linhas): Busca em qualquer campo (todas as palavras precisam aparecer, inclusive na mensagem), usuário, local de quem fez (cidade pelo IP), aparelho, modelo, prazo de pagamento (o que saiu na mensagem), faixa de desconto (o mesmo % da tabela; junto com o modelo vale para o mesmo equipamento) e faixa de data. As opções dos selects vêm das propostas carregadas.
  - normalizarBuscaAdmin, valoresFiltroProposta, textoBuscaProposta, numeroFiltroPropostas, diaProposta, descontoNoFiltro, propostasVisiveis, filtrandoPropostas, desenharFiltrosPropostas, limparFiltrosPropostas
- `copiadas-init.js` (27 linhas): Ligações iniciais e a primeira carga. Sempre o ÚLTIMO script da página. Quem não é admin já foi mandado embora pelo auth-guard.js.
- `copiadas-linhas.js` (248 linhas): Cada linha da tabela: usuário e aparelho, cliente (cidade, período, frete), equipamentos com tabela → valor final e % de desconto, total, configurações ativadas e a mensagem (ver e 📋 copiar). Nada entra como HTML.
  - moedaAdmin, descontoEquipamentoAdmin, textoEquipamentoAdmin, configuracoesAdmin, textoComplementarAdmin, textoBonificadoAdmin, textoPagamentoAdmin, prazoPagamentoAdmin, textoAparelhoAdmin, celulaUsuarioProposta, textoPeriodoAdmin, resumoClienteProposta, celulaClienteProposta, celulaEquipamentosProposta, celulaConfigProposta, celulaMensagemProposta, criarLinhaProposta
- `dispositivo.js` (306 linhas): Trava de aparelhos, em toda página menos o login (antes do auth-guard, que já pede a situação do aparelho junto com o perfil e chama `conferirDispositivo()` depois de liberar a página). Pergunta ao banco (`registrar_dispositivo`, com a chave do supabase-config.js, "Computador · Windows · Chrome" e a cidade pelo IP, `cidadeDoIP` do presenca.js, esperando no máximo 2 s; o IP o banco grava sozinho) se o aparelho está liberado: pendente = a página fica escondida e aparece só "Aguardando liberação", o código do aparelho e o Sair (não pede nada à pessoa), conferindo de novo a cada 15 s; bloqueado = sai do login. Página aberta confere a cada 2 min e ao voltar para a aba. Liberado: mostra "Aparelho A3F9C2" ao lado da versão (6 letras do sha256 da chave, o mesmo código da lista do admin; só em https). Sem a função no banco ou sem internet a página abre normal (quem bloqueia os dados é o banco); já na tela de espera, sem internet continua esperando.
  - esperarScriptsDaPagina, descricaoDoDispositivo, cidadeDoDispositivo, situacaoDoDispositivo, sairPorAparelhoBloqueado, codigoDoDispositivo, mostrarCodigoNaTopbar, mostrarAvisoPendente, conferirDispositivo, ligarConferenciaDispositivo
- `estoque-busca.js` (114 linhas): Barra de pesquisa: mostra só o modelo digitado, num card. (Usa compararMaquinas, escaparHtml e STATUS_COM_PREVISAO do estoque-render.js.)
  - textoBusca, modelosDaBusca, htmlCardBusca, htmlBusca
- `estoque-config.js` (95 linhas): Status, tipos, listas fixas, filiais e estado.
- `estoque-dados.js` (94 linhas): Carregar resumo publicado e trocar de filial.
  - carregarResumoPublicado, atualizarFilialNaTela, trocarFilial
- `estoque-grupos.js` (94 linhas): Agrupa modelos por tipo (letras do patrimônio) para cada status.
  - tipoDoModelo, alturaDoModelo, ordenarModelos, montarGrupos
- `estoque-init.js` (78 linhas): Ligações iniciais (restaura a filial salva). Sempre o ÚLTIMO script da página.
- `estoque-parser.js` (385 linhas): Relatório bruto -> resumo (resumirEstoque). Guarda também marca, modelo de fábrica e equipamento, usados pela lupa da agenda. O aviso de patrimônio repetido diz quais são e em que linhas do Excel.
  - normalizarTexto, modeloDoPatrimonio, formatarPrevisao, formatarAnoFabricacao, textoLinhasExcel, resumirEstoque
- `estoque-render.js` (224 linhas): HTML dos cards de status e avisos (um aviso por linha).
  - escaparHtml, chaveDataPrevisao, compararMaquinas, htmlItemModelo, desenharResumo, formatarDataHora, mostrarAvisosEstoque, mostrarPublicado
- `estoque-upload.js` (127 linhas): Ler o Excel, prévia e publicar.
  - lerArquivo, cancelarPrevia, publicarResumo
- `helpers.js` (389 linhas): Versão do sistema (VERSAO_SISTEMA), $, criar() (cria elemento com classe e texto), semAcento() (tira só o acento), dataBR(), dataHoraBR(), dataISO(), lerLocal() e gravarLocal() (preferências salvas no navegador), canal de avisos da agenda (canalAgenda, avisarAgendaMudou), formatadores, copiar() e mostrarToast().
  - $, criar, semAcento, canalAgenda, avisarAgendaMudou, formatarData, dataBR, dataHoraBR, dataISO, brToNumber, formatarMoedaBR, formatarNumeroPonto, copiar, copiarFormatado, mostrarToast, lerLocal, lerLocalJSON, gravarLocal, gravarLocalJSON, removerLocal
- `index-ferramentas.js` (259 linhas): Ferramentas da página inicial: conversor de texto (maiúsculo/minúsculo/CNPJ) e calculadora de boletos (valor dividido em N parcelas, com a sobra dos centavos ajustada, e vencimentos por dias personalizados).
  - maiusculo, minusculo, formatarCNPJ, calcularBoletos, calcularDiasPersonalizados
- `leads-acoes.js` (109 linhas): "Vou chamar" com condição no banco (só um pega) e resultado do contato (só quem marcou ou admin).
  - pegarLead, registrarResultado
- `leads-busca-config.js` (260 linhas): Janela de configuração de busca (leads_config), que o agente externo lê.
  - separarListaConfig, carregarConfigsBusca, resumoConfig, desenharConfigsBusca, desenharPortesConfig, limparFormConfig, editarConfigBusca, salvarConfigBusca, alternarConfigBusca, abrirConfigBusca, fecharConfigBusca
- `leads-cards.js` (325 linhas): Card de cada lead: contato, botões (WhatsApp, ligar, copiar mensagem, link para Propostas) e observação. Dados vêm de fora: nada entra como HTML.
  - criarCardLead, criarContatoLead, criarBotaoLead, criarLinkLead, criarAcoesLead, criarObservacaoLead
- `leads-config.js` (65 linhas): Tabelas, status, portes, limites e variáveis de estado da página.
- `leads-contato.js` (145 linhas): Mensagem por segmento e links de WhatsApp, telefone e site.
  - semAcentoLeads, saudacaoAgora, montarMensagemLead, numeroComDDI, linkWhatsApp, linkLigar, linkSite
- `leads-dados.js` (110 linhas): Busca os leads e a última busca do agente, e recarrega a tela.
  - carregarLeads, carregarUltimaBusca, desenharUltimaBusca, recarregarLeads
- `leads-filtros.js` (78 linhas): Filtros de cidade, segmento, porte e status.
  - opcoesDoCampo, preencherSelectLeads, passaNosFiltros
- `leads-init.js` (85 linhas): Descobre quem está logado, liga os eventos e carrega. Sempre o último script da página.
- `leads-lista.js` (87 linhas): Contadores e desenho da lista (em andamento e novos).
  - atualizarContadoresLeads, desenharLeads
- `leads-utils.js` (53 linhas): Rótulos de status e porte, nome a partir do e-mail e mensagem de erro.
  - rotuloStatusLead, rotuloPorteLead, nomeDoEmail, mensagemErroLeads
- `login-captcha.js` (198 linhas): Captcha do login (Cloudflare Turnstile, quase sempre invisível): carrega o script da Cloudflare, guarda o token (vale uma tentativa; renovarCaptcha pede outro) e avisa se não carregou. O Entrar espera o token (até 12 s; no celular a verificação demora); se não vier, mostra a caixinha da Cloudflare e o motivo (código do erro, navegador sem suporte). `TURNSTILE_SITE_KEY` vazia = sem captcha. Para ligar: 1) publicar com a chave do site; 2) ligar no Supabase (Authentication → Attack Protection → Captcha, com a chave secreta). Ligar no Supabase antes trava o login.
  - captchaAtivo, avisarEsperasCaptcha, desenharCaptcha, carregarCaptcha, renovarCaptcha, esperarTokenCaptcha, mostrarCaptcha, avisoCaptcha, opcoesCaptcha
- `login.js` (165 linhas): Tela de login: com sessão vai direto para as propostas; senão entra com e-mail e senha do Supabase (Enter no campo de senha também entra), com o token do captcha (login-captcha.js). Avisa quando o Supabase bloqueia por excesso de tentativas (429). Fica em arquivo, não dentro do HTML, por causa da CSP.
  - $, textoErroLogin, marcarBotaoEntrar, fazerLogin, esperarTokenCaptchaComAviso
- `menu.js` (189 linhas): Links entre as páginas, montados aqui, num lugar só (PAGINAS_MENU). Em cada página aparecem todos, menos o dela mesma; `soAdmin` esconde o link até confirmar que é admin (só o admin.html); `comAcesso` esconde até confirmar o acesso da página no perfil (transportadoras.html, leads.html, propostas-copiadas.html, analise-fretes.html, analise-movimentacoes.html). No celular, põe o botão ☰ Menu no começo da barra: os links só aparecem com ele aberto (tocar fora ou Esc fecha). Também mede a altura da topbar (fixa, quebra em mais linhas) e guarda em `--altura-topbar`, que o `.container` (style.css) usa para começar abaixo dela.
- `movimentos-calculo.js` (162 linhas): Só contas, sem tela: máquinas que saíram e que voltaram (e o saldo), quantos agendamentos de cada tipo, por modelo, por cliente e por dia (ou semana), mais a média nos dias com movimento e o dia mais cheio. Tudo em máquinas: "2x WTE12" conta 2.
  - movimentosDoFiltro, maquinasNoSentido, agendamentosDoTipo, somarMovimentos, saidasERetornos, porGrupoMovimentos, porModeloMovimentos, porClienteMovimentos, barrasDeMovimentos, resumoDiasMovimentos, textoSaldo
- `movimentos-dados.js` (117 linhas): Busca os agendamentos com data no período (buscarAgendamentosDoPeriodo, em analise-comum.js) e transforma cada um nas máquinas que ele movimenta: uma linha por modelo, com a quantidade ("2x WTE12" conta 2) e o sentido. Entrega sai, coleta volta, troca técnica e entrega/coleta saem uma e volta a outra; transferências e frete frustrado ficam à parte. Cancelado não entra. Abre para o admin e para quem tem o acesso "analise-movimentacoes" (página Admin).
  - movimentosDaLinha, carregarAnaliseMovimentos
- `movimentos-filtros.js` (81 linhas): Período (De/Até e os atalhos de analise-comum.js: este mês, mês passado, 30 e 90 dias, este ano), modelo de máquina e "Só concluídos". Trocar o período busca de novo no banco; modelo e concluídos só refazem as contas.
  - periodoMovimentos, filtroMovimentos, escolherPeriodoMovimentos, trocarPeriodoMovimentos, atualizarModelosMovimentos, prepararFiltrosMovimentos
- `movimentos-grafico.js` (267 linhas): Saídas e retornos por dia (ou por semana, no período longo) em SVG, sem biblioteca (a CSP só deixa script do próprio site): as saídas sobem da linha do zero e os retornos descem, na mesma escala. Passar o mouse ou tocar mostra o dia: saídas, retornos e saldo (no celular, até tocar fora). Redesenha quando a tela muda de largura.
  - esconderDicaMovimentos, linhaDicaMovimentos, conteudoDicaMovimentos, mostrarDicaMovimentos, aoMoverNoGraficoMovimentos, desenharEixoMovimentos, desenharGraficoMovimentos
- `movimentos-init.js` (12 linhas): Monta os filtros (últimos 30 dias) e faz a primeira busca. Sempre o ÚLTIMO script da página. Quem não tem o acesso já foi mandado embora pelo auth-guard.js.
- `movimentos-tela.js` (205 linhas): Desenha tudo a partir das máquinas carregadas e dos filtros: o resumo (saídas, retornos, saldo, média por dia, transferências e fretes frustrados), o gráfico com os números em tabela, a tabela por modelo e a por cliente (os primeiros, com "Mostrar todos").
  - textoVazioMovimentos, textoAgendamentosMovimentos, desenharResumoMovimentos, linhaMovimentos, desenharDiasMovimentos, desenharModelosMovimentos, desenharClientesMovimentos, alternarTodosClientes, movimentosDaTela, desenharAnaliseMovimentos
- `presenca.js` (327 linhas): Em toda página menos o login: informa pelo canal de presença do Supabase em qual página a pessoa está e se está usando, parada (2 min sem mexer) ou com a aba em segundo plano. Vai o id, a página, o estado, o aparelho (pelo navegador; no Android o modelo vem do Chrome) e a cidade aproximada pelo IP (get.geojs.io, guardada 6 h no navegador); não grava nada no banco. Também tem o texto do aparelho para as telas do admin (TEXTO_TIPO_APARELHO, textoAparelhoOnline). Carregar depois de helpers.js e auth-guard.js.
  - calcularEstadoPresenca, enviarPresenca, navegadorDoTexto, aparelhoAndroid, descreverAparelho, textoAparelhoOnline, modeloDoAndroid, cidadeDoIP, reenviarComAparelho, identificarAparelho, iniciarPresenca
- `proposta-zap.js` (450 linhas): copiarPropostaZap(): mensagem completa para WhatsApp. Depois de copiar, manda os dados para o registro do admin (propostas-registro.js).
  - partesDoModeloZap, copiarPropostaZap
- `propostas-avisos.js` (129 linhas): Avisos de falha/offline e datalists de equipamentos e cidades.
  - mostrarAvisoDadosSalvos, avisarFalhaCarregamento, preencherListaEquipamentos, preencherListaCidades
- `propostas-cache.js` (333 linhas): Salva/restaura o preenchimento no navegador e limpa a tela. Só salva depois de repor o que estava salvo (o init carrega as tabelas antes): digitar enquanto carrega não grava a tela vazia por cima da proposta.
  - salvarCache, restaurarCache, limparTudo
- `propostas-config.js` (322 linhas): Locação complementar (o valor pronto aparece no Resumo da proposta: frete x 2, +20% com bitributação), bitributação (o botão também aparece no Calcular Desconto com o frete no total), diária, emojis, cidade de saída, linha em branco e modal da engrenagem.
  - alternarLocacaoComplementar, atualizarBotaoLocacaoComplementar, alternarBitributacao, atualizarBotaoBitributacao, valorLocacaoComplementar, alternarValorDiaria, atualizarBotaoValorDiaria, alternarEmojis, atualizarBotaoEmojis, alternarCidadeSaida, atualizarBotaoCidadeSaida, alternarSepararPagamento, atualizarBotaoSepararPagamento, abrirConfiguracoes, fecharConfiguracoes
- `propostas-desconto-calculo.js` (195 linhas): Cálculo por %, valor desejado ou total com seguro (a conta do total fica em propostas-desconto-total-seguro.js) e eventos de input. O bloco só guarda o valor final; desconto, seguro, diária e totais aparecem no Resumo da proposta (propostas-resumo.js).
  - calcularDescontoBloco, recalcularAposDigitar, limparOutrosCamposDesconto
- `propostas-desconto-total-seguro.js` (161 linhas): Campo "Total com seguro" (o "Total máquina + seguro" da Proposta Zap: tira os 7% do seguro e divide pelos períodos) e o botão 🚚 que põe o frete de ida e volta dentro desse total (com locação complementar, +20% se tiver bitributação). O frete entra uma vez só, no primeiro equipamento com Total com seguro.
  - calcularPeloTotalComSeguro, alternarFreteNoTotal, freteDoTotalSeguro, usaTotalComSeguro, blocoComFreteDoTotal, recalcularDescontos, atualizarBotaoFreteNoTotal
- `propostas-desconto.js` (204 linhas): Desenha e atualiza o bloco de desconto de cada equipamento (campos 2 a 2, com o nome em cima).
  - htmlPlaceholderDesconto, renderizarDescontosPorEquipamento
- `propostas-equipamentos.js` (286 linhas): obterEquipamentos(), adicionar/remover linha e eventos.
  - obterEquipamentos, adicionarEquipamento, removerEquipamento, configurarEventosEquipamentos
- `propostas-estado.js` (65 linhas): Variáveis das tabelas carregadas, TAXA_SEGURO (7%), normalizarModelo() e normalizarCidade().
  - normalizarModelo, normalizarCidade
- `propostas-fretes-painel.js` (144 linhas): mostrarFretes(): fretes encontrados por transportadora.
  - mostrarFretes
- `propostas-init.js` (199 linhas): Carrega tabelas e liga eventos. Sempre o ÚLTIMO script da página. Lê ?cliente= e ?cidade= (vindos de leads.html) depois do cache e limpa o endereço.
- `propostas-pagamento.js` (176 linhas): Boleto, depósito ou cliente novo e o prazo em dias (⚙️ Configurações) na mensagem da Proposta Zap; sem escolher, sai o texto padrão. Cliente novo (regra do financeiro) sai como Boleto, com o prazo pelo tamanho da locação: até 7 dias = 6, até 15 = 14, até 21 = 20, até 30 ou mais = 28. Cliente novo é o padrão: aparelho novo já começa nele e a escolha salva antes da v16.52.0 passa para ele uma vez (marca `pagamentoClienteNovoPadrao` no propostaCache); depois vale a escolha de cada um. Botão "Mediante aprovação cadastral" (ativado por padrão): desativado, para cliente já cadastrado, a forma de pagamento sai sem esse trecho (o texto padrão vira "28 dias."); fica salvo com a proposta, o Limpar tudo ativa de novo e o registro guarda `aprovacaoCadastral` (tag "Sem aprovação cadastral" nas Propostas Zap).
  - prazoClienteNovo, atualizarDicaClienteNovo, atualizarCampoPrazo, trocarFormaPagamento, prazoPagamentoTexto, textoFormaPagamento, alternarAprovacaoCadastral, atualizarBotaoAprovacaoCadastral
- `propostas-registro.js` (157 linhas): Cada "Copiar Proposta Zap" grava na tabela propostas_copiadas o aparelho, a cidade aproximada, os dados da proposta (cliente, período, frete, equipamentos com desconto e valores), as configurações e o texto. Copiar de novo a mesma proposta em 10 min não repete. Falhar não atrapalha a cópia.
  - arredondarRegistro, descontoDoEquipamento, aparelhoDoRegistro, montarRegistroProposta, registrarPropostaCopiada
- `propostas-resumo-frete.js` (126 linhas): Seções de baixo do Resumo da proposta (propostas-resumo.js): o frete (locação complementar, com o 📋 do formato Zoho, ou terceirizado) e o valor final com a diária da proposta.
  - secaoFreteResumo, secaoTotalResumo
- `propostas-resumo.js` (231 linhas): Card "Resumo da proposta" (no PC na coluna do meio; no celular logo depois do Calcular Desconto): todas as contas num lugar só, iguais às da Proposta Zap. Por equipamento: tabela, desconto (em vermelho acima de 20%), locação, seguro, máquina + seguro e diária. Depois o frete (locação complementar ou terceirizado), o valor final e a diária da proposta. Os outros cards ficam só com os campos.
  - moedaResumo, botaoZohoResumo, linhaResumo, notaResumo, textoPeriodoResumo, itensDoResumo, secaoEquipamentoResumo, atualizarResumoProposta
- `propostas-tabelas-fretes.js` (151 linhas): Carregamento de tabela_fretes.
  - processarLinhasFretes, carregarFretes
- `propostas-tabelas-precos.js` (161 linhas): Cópia offline (localStorage, de preços e de fretes) e carregamento de tabela_precos.
  - salvarCopiaTabela, lerCopiaTabela, processarLinhasPrecos, carregarTabela
- `propostas-textos.js` (191 linhas): Oportunidade e proposta ZOHO, copiarTexto(), e os botões embaixo do Copiar Proposta Zap: Copiar frete (normal ou locação complementar, pela escolha do ⚙️; no lugar dos botões de frete da barra de cima) e Copiar faturamento (a forma de pagamento, igual à da Proposta Zap).
  - gerarTextos, copiarTexto, copiarFrete, copiarFaturamento
- `propostas-valor-tabela.js` (197 linhas): Período da proposta (campos Período e Períodos) e busca do valor de tabela de cada equipamento.
  - obterPeriodoProposta, preencherValorTabela
- `registro-erros.js` (328 linhas): Em toda página menos o login, logo depois de supabase-config: guarda erro de código, arquivo que não carregou e o que passa por console.error, e envia pela função `registrar_erro_site`. O mesmo erro soma em "vezes". Sem login ou sem internet não registra, e falhar aqui nunca atrapalha a página. A falha de rede que a biblioteca do Supabase anota sozinha (só o erro, sem texto nosso; ela tenta de novo) fica de fora.
  - limparTextoErro, anotarErro, anotarArquivoFaltando, cssCarregou, paginaDoErro, versaoDoErro, enviarLoteErros, enviarErrosPendentes, textoDoConsole, falhaDeRedeDaBiblioteca, pilhaDoConsole
- `status.js` (211 linhas): obterCidadeSaida(), obterFreteBonificado() (a caixa Frete bonificado, embaixo do Valor frete em propostas.html: entrega, retirada ou as duas de graça; sai "Bonificado" nas mensagens e as contas usam um frete só, ou nenhum) e gerarStatus() (Autorizado e ICMS na página inicial; FreteZOHO ou FreteZOHOLocComp pelo botão Copiar frete da proposta, conforme a locação complementar do ⚙️. Na locação complementar, entrega e retirada saem uma em cada linha, recuadas embaixo do "FRETE INCLUSO NO ITEM LOCAÇÃO COMPLEMENTAR").
  - obterCidadeSaida, obterFreteBonificado, freteEstaBonificado, fretesCobrados, gerarStatus
- `supabase-config.js` (88 linhas): Cria o supabaseClient. Sorteia e guarda a chave do aparelho (`dispositivoChave`, 64 hex) e manda em toda chamada no cabeçalho `x-dispositivo` (trava de aparelhos). Quando o banco recusa o login recém-renovado ("JWT issued at future", PGRST303), espera e repete a consulta (até 2 vezes). Precisa vir DEPOIS do <script> do supabase-js (`js/vendor/`) e ANTES de todos os outros scripts.
  - fetchSupabase, chaveDoDispositivo
- `tabelas-config.js` (109 linhas): Definição das tabelas editáveis (TABELAS: colunas, matriz de consulta e permissão de cada uma) e estado.
- `tabelas-dados.js` (115 linhas): tratarValor() e carregarLinhasTabela().
  - tratarValor, carregarLinhasTabela
- `tabelas-desenho.js` (242 linhas): desenharTabela() e matriz de consulta.
  - criarCampo, desenharTabela, desenharMatriz
- `tabelas-editor.js` (292 linhas): Linhas editáveis, salvar, adicionar e excluir (admin).
  - criarLinhaTabela, criarLinhaNova, salvarCampo, adicionarLinha, excluirLinha
- `tabelas-init.js` (101 linhas): Alternar consulta/edição e início. Sempre o ÚLTIMO script da página.
  - atualizarModo, alternarModoEdicao
- `transp-banco.js` (298 linhas): Leitura e gravação: transportadoras, veículos (de uma ou de todas as transportadoras), motoristas (renomear leva junto os agendamentos), dados dos motoristas e exclusões. Os PDFs (Storage e tabela de documentos) ficam em transp-docs.js; o cadastro de transportadora, em transp-cad-banco.js.
  - exigirDados, detalhesErroTransp, carregarListaTransportadoras, carregarDadosTransportadora, salvarVeiculoBanco, excluirVeiculoBanco, adicionarMotoristaBanco, renomearMotoristaBanco, salvarDadosMotoristaBanco, excluirMotoristaBanco
- `transp-cad-banco.js` (61 linhas): Adicionar e excluir transportadoras no Supabase e contar o que usa cada uma (motoristas, veículos, agendamentos). A tela fica em transp-cad-tela.js.
  - adicionarTransportadoraBanco, contarUsosTransportadora, excluirTransportadoraBanco
- `transp-cad-tela.js` (177 linhas): Botões "+ Nova transportadora" e "Excluir transportadora" da barra (só exclui se não tiver motorista, veículo nem agendamento). Carregar antes de transp-init.js.
  - abrirFormNovaTransp, fecharFormNovaTransp, escolherTransportadora, adicionarTransportadoraTransp, textoUsosTransportadora, excluirTransportadoraAtual
- `transp-config.js` (93 linhas): Tabelas (TRANSP_TABELAS, inclui agendamentos para checar vínculos), bucket, limite do PDF (5 MB), tipos e medidas do veículo, rótulos de documento, TRANSP_TODAS (opção "Todas as transportadoras", conferida por emTodasTransp()) e variáveis de estado (inclui `transpSoLeitura`: quem não é admin só vê). As policies de RLS no Supabase é que protegem os dados.
  - emTodasTransp
- `transp-docs.js` (312 linhas): Envio, abertura e exclusão dos PDFs de veículos e motoristas, e o bloco de documentos do formulário (só leitura: abre, sem anexar nem excluir). Os arquivos ficam no bucket privado (BUCKET_DOCS) e só abrem por link temporário.
  - docsDoDono, removerArquivosStorage, enviarDocumento, abrirDocumento, excluirDocumento, criarBlocoDocumentos, desenharBlocoDocumentos
- `transp-form-motorista.js` (263 linhas): Modal do motorista (nome, CPF, nascimento, CNH), salvar e excluir. O admin pode trocar o nome; os agendamentos com o nome antigo são atualizados junto.
  - abrirModalMotorista, salvarMotoristaTransp, excluirMotoristaTransp
- `transp-form-veiculo.js` (261 linhas): Modal do veículo (prancha ou carreta), validação de placas e medidas, salvar e excluir (editando, o veículo continua na transportadora dele).
  - atualizarCamposPlaca, abrirModalVeiculo, salvarVeiculoTransp, excluirVeiculoTransp
- `transp-form.js` (132 linhas): Campos, máscara de CPF, abrir/fechar o modal (só leitura: campos travados e sem Salvar) e salvar (veículo e motorista ficam em transp-form-veiculo.js e transp-form-motorista.js).
  - criarCampoForm, maiusculoCampoTransp, formatarCPF, cpfValido, abrirModalTransp, fecharModalTransp, salvarModalTransp
- `transp-init.js` (65 linhas): Confere se é admin (quem não é fica só vendo: some Nova/Excluir transportadora e Novo item), liga os eventos e carrega os dados. Quem não tem acesso já saiu pelo auth-guard.js. Sempre o ÚLTIMO script da página.
- `transp-render.js` (381 linhas): Seleção da transportadora (inclui "Todas as transportadoras": lista tudo com o nome da transportadora no cartão; cadastrar novo e excluir transportadora ficam desativados), abas, cartões de veículos e motoristas (admin: editar/excluir; só leitura: 👁 ver) e recarga.
  - criarBotao, numeroBR, placasDoVeiculo, adicionarNomeTransp, desenharSelectTransportadora, definirAbaTransp, abrirNovoItemTransp, desenharListaTransp, textoQuantidadeDocs, criarItemVeiculo, criarAcoesItemTransp, criarItemMotorista, recarregarTransp
- `weg-cache.js` (71 linhas): Salva/restaura o preenchimento no navegador (inclui a unidade WEG).
  - salvarCacheWEG, restaurarCacheWEG
- `weg-dados.js` (169 linhas): contratoWEG (inclui origem do frete e unidades WEG: Jaraguá do Sul, Itajaí, Blumenau, Guaramirim), lista de equipamentos, unidade da WEG, períodos, datas e grupos.
  - montarListaEquipamentos, montarSelectUnidade, textoRotaFrete, obterQuantidade, obterPeriodos, obterDatas, grupoDoModelo, ordemDoGrupo
- `weg-documento.js` (188 linhas): gerarDocumento(): área para print. Só lista os equipamentos com quantidade maior que 0; a locação complementar mostra a rota do frete (W Rental Itajaí x WEG unidade).
  - gerarDocumento
- `weg-email.js` (159 linhas): Texto para mandar junto com o print por e-mail (botão "Copiar texto do e-mail" ao lado do documento): saudação pelo horário, nome das máquinas escolhidas e dados para confirmação.
  - exemploDataEntregaEmail, escaparHtmlEmail, saudacaoEmail, nomeEquipamentoEmail, equipamentosEmail, cicloEmail, textoConfirmacaoEmail, htmlConfirmacaoEmail, copiarParaEmail
- `weg-init.js` (74 linhas): Ligações iniciais. Sempre o ÚLTIMO script da página.
- `weg-titulo.js` (82 linhas): Botão "📋 Copiar título" ao lado do documento (fora da área de print): o nome do orçamento no padrão da Proposta ZOHO, CLIENTE_MODELOS_PERÍODO, com a unidade da WEG como cliente (ex: "WEG JARAGUÁ DO SUL_WTE10 + 2 WAE12_3 PERIODOS"). O título aparece em cima dos botões e muda junto com a tela.
  - clienteTituloWEG, modelosTituloWEG, periodoTituloWEG, tituloOrcamentoWEG, desenharTituloWEG, copiarTituloWEG

## CSS

- `style.css`: base comum (letra Inter, topbar com o ☰ Menu do celular (até 700px os links das páginas ficam atrás dele; no celular todo campo tem 16px, senão o iPhone dá zoom ao tocar), layout, cards, inputs, botões, toast, documento da proposta, avisos de versão nova e de arquivo que não carregou). A letra fica em `site/fonts/` (`inter-latin-wght-normal.woff2`, todos os pesos num arquivo só; licença OFL ao lado): a CSP não deixa baixar letra de fora.
- `propostas.css`, `estoque.css`, `tabelas.css`, `admin.css`, `leads.css`, `propostas-copiadas.css`, `analise-fretes.css`, `analise-movimentacoes.css`: estilos de cada página (a propostas-copiadas.html e as duas análises carregam também o admin.css; a analise-movimentacoes.html usa o analise-fretes.css para filtros, resumo, tabelas e a caixa do gráfico, e o dela só para as cores de saída e retorno)
- Agenda, em dez arquivos carregados nesta ordem (a ordem conta: uma regra posterior vence a anterior):
  - `agenda.css`: card, barra, ⚙️ Filtros, pesquisa e filtro de datas.
  - `agenda-tabela.css`: a lista (tabela, dias, linhas, status, botões da linha), a largura das colunas e o patrimônio ainda não definido.
  - `agenda-modal.css`: o modal (cabeçalho fixo com o Salvar) e a lixeira.
  - `agenda-estoque.css`: consulta ao estoque (botão 🔍 da linha). No celular (até 600px) cada máquina vira um bloco: patrimônio, situação e Usar em cima; marca · modelo · ano embaixo e a demanda em que ela já está.
  - `agenda-formulario.css`: formulário do agendamento (locais do cliente, faturamento, plataformas, etapas e retirada).
  - `agenda-mapa.css`: o 🗺️ Mapa (modal grande com o Google Maps, a lista numerada por dia ao lado e a janela do pino; no celular, a lista vai para baixo do mapa).
  - `agenda-demanda.css`: o 📦 Demanda (período com atalhos, tabela por modelo com os agendamentos de cada um; no celular, a tabela cabe na tela).
  - `agenda-renovacao.css`: o ✉️ Email de renovação (vencimento, prazo, local, endereço, avisos extras, a prévia em fundo branco como no Outlook e os botões de copiar).
  - `agenda-celular.css`: a agenda no celular (até 700px): cada agendamento vira um cartão (horário, tipo e status no alto, cada informação com o nome da coluna, que vem no `data-rotulo` da célula, de `agenda-celulas.js`; botões numa linha). Com o celular deitado volta a tabela.
  - `agenda-tema-claro.css`: fundo claro. Sempre o último.
- `transportadoras.css`: lista, modal, documentos e formulário de nova transportadora

## Supabase (tabelas, bucket e função)

| Nome | Usado em |
|---|---|
| `agendamentos` | `agenda-banco.js`, `agenda-lixeira.js` (lixeira; função `mover_agendamento_lixeira`), `transp-config.js` (`transp-cad-banco.js` conta vínculos), `analise-comum.js` (só lê, de 1000 em 1000, para a Análise de fretes e a de movimentações). Leitura: quem tem a Agenda (policy "agendamentos: leitura") e, sem os da lixeira, quem tem uma das análises (policy "agendamentos: leitura das analises", só SELECT; o SQL não fica neste repositório). Coluna `outros_contratos` (jsonb, lista; coleta com mais de um contrato): só vai no salvar quando tem contrato (ou tinha), então a agenda funciona antes do SQL dela. Coluna `referencia_recolha` (texto): a referência da coleta na mensagem do Zap da entrega/coleta; só vai no salvar nesse tipo (ou se o agendamento já teve), então a agenda funciona antes do SQL dela. As colunas `proposta_recolha` e `periodo_recolha` ficaram de uma versão anterior e não são usadas. A coluna `tipo` só aceita os tipos da regra `agendamentos_tipo_check`: tipo novo em TIPOS (`agendamento-comum.js`) precisa de SQL trocando a regra, senão salvar dá "O banco ainda não aceita este tipo" |
| `bucket:pedidos-compra` | `agenda-pedido-pdf.js` |
| `bucket:docs-transportadoras` | `transp-config.js` |
| `dispositivos` | `admin-aparelhos.js` (só o admin lê e altera); o site registra e confere pela função `registrar_dispositivo` (`dispositivo.js`). O SQL não fica neste repositório. |
| `erros_site` | `admin-erros.js` (só o admin lê e apaga; a gravação é pela função `registrar_erro_site`, em `registro-erros.js`). O SQL não fica neste repositório. |
| `frete_dionizio` | `busca-fretes.js`, `tabelas-config.js` |
| `frete_magnus` | `busca-fretes.js`, `tabelas-config.js` |
| `função:criar-usuario` | `admin-dados.js` |
| `função:mapa-agenda` | `agenda-mapa-google.js` (`acao: "chave"`: a chave do Google Maps, do segredo `GOOGLE_MAPS_CHAVE`) e `agenda-mapa-locais.js` (`acao: "link"`: abre o link curto do Google Maps e devolve o longo; só segue links do Google). Com "Verify JWT" ligado. O código não fica neste repositório. A agenda.html é a única página com o Google Maps na CSP. |
| `leads` | `leads-dados.js`, `leads-acoes.js`, `leads-cards.js` (grava só status, chamado e observação; quem cria é o agente externo, com service_role no servidor dele) |
| `leads_buscas` | `leads-dados.js` (só lê: resultado de cada busca do agente) |
| `leads_config` | `leads-busca-config.js` (o agente externo lê as ativas) |
| `motoristas` | `agenda-banco.js` (leitura em `agenda-motoristas.js`), `transp-config.js` |
| `motoristas_dados` | `transp-config.js` |
| `perfis` | `admin-config.js`, `auth-guard.js` |
| `propostas_copiadas` | `propostas-registro.js` (grava; usuário, e-mail e horário quem preenche é o banco), `copiadas-dados.js` (propostas-copiadas.html; lê o admin e quem tem o acesso "propostas-copiadas", pela policy com `tem_acesso`; só o admin apaga). O SQL não fica neste repositório. |
| `resumo_estoque` | `estoque-dados.js`, `estoque-upload.js`, `agenda-estoque-dados.js` (função `estoque_disponiveis`) |
| `tabela_fretes` | `propostas-tabelas-fretes.js`, `tabelas-config.js` |
| `tabela_precos` | `propostas-tabelas-precos.js`, `tabelas-config.js` |
| `trava_dispositivos` | `admin-aparelhos.js` (uma linha: `ligada`; só o admin altera) |
| `transportadora_docs` | `transp-config.js` |
| `transportadoras` | `agenda-banco.js` (leitura em `agenda-transportadoras.js`), `transp-config.js` |
| `veiculos` | `transp-config.js` |

Os nomes ficam em constantes (`TABELA_*`, `TRANSP_TABELAS`, `BUCKET_*`, `TABELAS`, `TABELAS_FRETES`) nos arquivos acima.

## Preferências locais (localStorage)

Cada chave tem o prefixo da página. As de `...:<usuário>` são separadas por usuário logado. Ler e gravar sempre por `lerLocal`/`gravarLocal` (e as versões JSON) do `helpers.js`, que já tratam navegador bloqueado e valor corrompido; só o `auth-guard.js`, que carrega antes, tem tratamento próprio.

| Chave | Definida em |
|---|---|
| `dispositivoChave` | `supabase-config.js` (chave do aparelho; sair do login não apaga) |
| `agendaModo` | `agenda-config.js` |
| `agendaOrdem` | `agenda-config.js` |
| `agendaTema` | `agenda-config.js` |
| `agendaColunas` | `agenda-config.js` |
| `agendaColunasVisiveis` | `agenda-config.js` |
| `agendaBotoes` | `agenda-config.js` |
| `agendaLarguras` | `agenda-config.js` |
| `agendaStatus` | `agenda-config.js` |
| `agendaEtapas` | `agenda-config.js` |
| `agendaRascunhos` | `agenda-config.js` |
| `agendaMapaLocais` | `agenda-config.js` (onde fica cada local do 🗺️ Mapa, pelo link ou endereço; até 600, os mais antigos saem) |
| `leadsVendedor:<usuário>` | `leads-config.js` |
| `authPerfil` | `auth-guard.js` |
| `estoqueFilial` | `estoque-config.js` |
| `presencaCidade` | `presenca.js` |
| `propostaCache` | `propostas-cache.js` |
| `cacheTabelaPrecos` | `propostas-tabelas-precos.js` |
| `cacheTabelaFretes` | `propostas-tabelas-precos.js` |
| `transportadorasUltima` | `transp-config.js` |
| `wegCache` | `weg-cache.js` |

## Atenções

- **Trava de aparelhos:** com `trava_dispositivos.ligada`, quem não é admin só acessa os dados de aparelho liberado no admin. Quem confere é o banco: `dispositivo_liberado()` (cabeçalho `x-dispositivo`, guardado só como sha256) dentro de `tem_acesso()` e `tem_acesso_filial()`, e na policy de leitura da `tabela_precos`. O admin fica de fora. Aparelho de sessão aberta antes da criação da trava entra liberado. Policy nova que não use `tem_acesso` precisa chamar `dispositivo_liberado()` também.

- **Segurança (CSP):** toda página tem a mesma `<meta http-equiv="Content-Security-Policy">` logo depois do charset: scripts só do próprio site (sem `<script>` com código dentro, sem onclick: use `data-clique`, ver `acoes.js`), dados só para o Supabase do projeto (https e wss) e o get.geojs.io (cidade da presença). Só o login.html libera também a Cloudflare (https://challenges.cloudflare.com, script e frame do captcha). Serviço novo de fora (API, imagem, fonte): incluir na CSP de todas as páginas, senão o navegador bloqueia. O teste-paginas confere a CSP e que ela barra código injetado; nos testes com `waitForFunction` o contexto usa `bypassCSP`.

- Arquivos acima de ~300 linhas (sugerir divisão antes de crescerem): `agenda-clientes.js` (533), `proposta-zap.js` (450), `auth-guard.js` (389), `helpers.js` (389), `admin-erros.js` (387), `estoque-parser.js` (385), `agenda-form-campos.js` (381), `transp-render.js` (381), `agenda-banco.js` (369), `agenda-salvar.js` (356), `admin-aparelhos.js` (349), `agenda-larguras.js` (349), `agenda-pagamento.js` (337), `propostas-cache.js` (333), `agenda-zap.js` (328), `registro-erros.js` (328), `presenca.js` (327), `leads-cards.js` (325), `propostas-config.js` (322), `transp-docs.js` (312), `dispositivo.js` (306).
- Cadastro de transportadoras e motoristas saiu da agenda (v16.6.0): agora é só em `transportadoras.html` (admin). A agenda só lê.
- `transportadoras.html` para quem não é admin (acesso "transportadoras", v16.8.0): só ver. A tela esconde os botões, mas os dados só aparecem com policies de SELECT com `tem_acesso('transportadoras')` em `transportadoras`, `veiculos`, `motoristas`, `motoristas_dados`, `transportadora_docs` e no bucket `docs-transportadoras`. Gravar continua só com as policies de admin.
- `propostas-copiadas.html` para quem não é admin (acesso "propostas-copiadas", v16.41.0): os dados só aparecem com a policy de SELECT com `tem_acesso('propostas-copiadas')` em `propostas_copiadas`. Apagar continua só com o admin.
- Acesso à agenda no Supabase: policies com `tem_acesso('agenda')` (admin ou perfil ativo com 'agenda'), não "qualquer logado".
- Vários equipamentos no mesmo agendamento vão juntos na coluna `plataforma` (texto), ex: `2x WAD16 + WTE12`. Card, Zap, ordem e filtro leem esse texto; sem mudança no Supabase. A máquina de recolha da troca continua uma só.
- Faturamento (forma, prazos, pedido) só em entregas; a coleta gerada de uma entrega não copia esses campos e o Zap não leva essas informações (só o card).
- `menu.js` é a lista única dos links da topbar: página nova entra lá (nada de links digitados à mão). Página nova com acesso controlado entra também em `ACESSOS_ADMIN` (`admin-config.js`).
- Toda página tem `<meta name="viewport" content="width=device-width, initial-scale=1">` logo depois da CSP (o teste-paginas confere): sem ela o celular desenha a página com 980px e diminui, e nenhum estilo de celular (`max-width`) vale.
- Leads: as tabelas e permissões foram criadas à mão no SQL Editor e o SQL não fica neste repositório. Policies com `tem_acesso('leads')`. A regra "só quem marcou registra o resultado" é da tela, não do banco.
- Agente de leads: tarefa agendada do Claude Code (conta individual, todo dia às 07:00). Lê e entrega pela Edge Function `agente-leads`, que valida tudo e grava com service_role; o token fica nos segredos do Supabase e no segredo de rede do ambiente da tarefa. O código da função e o SQL não ficam neste repositório, que é público.
- Mudou VERSAO_SISTEMA? Fica em `helpers.js`.
