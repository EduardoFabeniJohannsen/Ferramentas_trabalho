# Mapa dos arquivos

Sem build e sem módulos: cada página carrega os scripts na ordem abaixo (variáveis e funções são globais).
Toda página carrega antes o supabase-js 2.45.0 (CDN jsDelivr); ele não aparece nas listas abaixo.
Para editar algo, abra só o arquivo da responsabilidade certa. O `*-init.js` é sempre o último da página.

**Pastas:** tudo que vai para o ar fica em `site/`: as páginas `.html`, o `icon.png`, `css/` e `js/`. A pasta `site/` é a raiz do site publicado, então os endereços continuam sem "site/" (ex: `agenda.html`, `js/helpers.js`). Na raiz do repositório fica só o que o Git, o GitHub e o npm exigem ali (`.github/`, `.githooks/`, `.gitignore`, `.gitattributes`, `.mcp.json`, `package.json`, `package-lock.json`), este mapa e `testes/`.

Dentro de `site/`, `js/<página>/` guarda os scripts de cada página (`js/agenda/`, `js/propostas/`, `js/transportadoras/`, `js/weg/`...). Direto em `js/` ficam só os usados por mais de uma página: `supabase-config`, `registro-erros`, `arquivo-faltando`, `auth-guard`, `helpers`, `atualizacao-sistema`, `presenca`, `menu` e `status`. As listas abaixo mostram só o nome do arquivo.

**Não mude `site/js/helpers.js` de lugar:** as abas abertas leem a versão publicada nesse endereço (`js/helpers.js` no site; ver `atualizacao-sistema.js`). Se ele mudar, elas param de se atualizar sozinhas.

> Mudou ordem de scripts, funções ou criou arquivo? Rode `npm run mapa`: ele atualiza a ordem das páginas, as linhas, as funções e a lista de arquivos grandes. As descrições e as outras seções são escritas à mão; arquivo novo pega a descrição do próprio cabeçalho.

## Testes

O site continua sem build: `package.json` e `node_modules` servem só para os testes (precisa do Node 20 ou mais novo e do Chrome instalados). O banco é sempre simulado; nenhum teste acessa o Supabase de verdade.

- Primeira vez: `npm install`. Rodar tudo: `npm test` (cerca de 9 minutos). Só um assunto: `npm test -- leads`. Só os que não abrem o navegador (menos de 1 s): `npm test -- --rapidos`.
- Antes de cada commit (`.githooks/pre-commit`, ligado pelo `npm install` via `testes/ligar-pre-commit.js`): atualiza este mapa, põe ele no mesmo commit e roda os testes rápidos; se um falhar, o commit não acontece. Sem Node no computador, só avisa e deixa commitar. Pular uma vez: `git commit --no-verify`.
- `testes/teste-paginas.js`: abre todas as páginas com o `auth-guard.js` real (erros, arquivos faltando, funções dos botões, menu, login e acessos). Página nova entra na lista `PAGINAS`.
- `testes/teste-erros.js`: registro de erros, recarga por arquivo que não carregou e a seção do Admin, com o supabase-js de verdade e o servidor simulado.
- `testes/teste-mapa.js`: acusa este mapa desatualizado ou citando arquivo que não existe (`npm run mapa` resolve a primeira parte).
- Os outros `testes/teste-*.js` cobrem uma área cada. `testes/capturas/` guarda as imagens geradas e não vai para o Git.
- Os testes de SQL e do agente de leads não ficam aqui, porque este repositório é público.
- No GitHub: `.github/workflows/testes.yml` roda `npm test` a cada envio para a `main` (aba Actions), em Ubuntu e no fuso de São Paulo. Não bloqueia a publicação do site: se algo falhar, o commit ganha um X vermelho e o GitHub avisa por e-mail. O motivo aparece na página da rodada.
- Publicação: `.github/workflows/publicar.yml` envia só a pasta `site/` para o GitHub Pages a cada envio para a `main` (precisa de Settings → Pages → Source: GitHub Actions). Saiu do ar ou não atualizou: Re-run na rodada que falhou, ou aba Actions → "Publicar site" → Run workflow (cada tentativa envia o site com o próprio nome, `github-pages-<tentativa>`, então o Re-run funciona).

## Ordem de carregamento por página

**index.html** — Página inicial: conversor de texto e calculadora de boletos
- CSS: style
- JS: supabase-config → registro-erros → arquivo-faltando → auth-guard → helpers → atualizacao-sistema → presenca → status → index-ferramentas → menu

**propostas.html** — Gerador de propostas (textos ZOHO e Zap, desconto, fretes). As contas ficam todas no card Resumo da proposta. No PC (~1180px+): textos | resumo | desconto, com os fretes embaixo do desconto; a partir de 800px, textos e resumo à esquerda, desconto e fretes à direita; no celular, um embaixo do outro (textos, desconto, resumo, fretes).
- CSS: style → propostas
- JS: supabase-config → registro-erros → arquivo-faltando → auth-guard → helpers → atualizacao-sistema → presenca → busca-fretes → status → menu → propostas-estado → propostas-tabelas-precos → propostas-tabelas-fretes → propostas-avisos → propostas-equipamentos → propostas-valor-tabela → propostas-fretes-painel → propostas-desconto → propostas-desconto-calculo → propostas-desconto-total-seguro → propostas-resumo → propostas-resumo-frete → propostas-cache → propostas-config → propostas-pagamento → proposta-zap → propostas-registro → propostas-textos → propostas-init

**agenda.html** — Agenda de entregas, coletas, transferências e trocas
- CSS: style → agenda
- JS: supabase-config → registro-erros → arquivo-faltando → auth-guard → helpers → atualizacao-sistema → presenca → menu → agenda-config → agenda-utils → agenda-patrimonio → agenda-banco → agenda-filtros → agenda-busca → agenda-filtro-datas → agenda-filtro-status → agenda-ordem → agenda-render → agenda-celula-partes → agenda-celulas → agenda-linhas → agenda-colunas → agenda-colunas-visiveis → agenda-botoes-linha → agenda-larguras → agenda-tema → agenda-zap → agenda-transportadoras → agenda-motoristas → agenda-form-campos → agenda-unidades → agenda-plataformas → agenda-rascunho → agenda-etapas → agenda-modal → agenda-salvar → agenda-coleta → agenda-pagamento → agenda-clientes → agenda-pedido → agenda-pedido-pdf → agenda-lixeira → agenda-estoque-dados → agenda-estoque-tabela → agenda-estoque → agenda-conflitos → agenda-usar-patrimonio → agenda-tempo-real → agenda-init

**estoque.html** — Resumo do estoque de plataformas (por filial)
- CSS: style → estoque
- JS: [SheetJS 0.18.5/CDN] → supabase-config → registro-erros → arquivo-faltando → auth-guard → helpers → atualizacao-sistema → presenca → menu → estoque-config → estoque-parser → estoque-grupos → estoque-render → estoque-busca → estoque-dados → estoque-upload → estoque-init

**tabelas.html** — Consulta e edição das tabelas de preços e fretes
- CSS: style → tabelas
- JS: supabase-config → registro-erros → arquivo-faltando → auth-guard → helpers → atualizacao-sistema → presenca → menu → tabelas-config → tabelas-dados → tabelas-desenho → tabelas-editor → tabelas-init

**transportadoras.html** — Transportadoras: cadastro, veículos, motoristas e PDFs (ver: acesso "transportadoras"; editar: só admin)
- CSS: style → transportadoras
- JS: supabase-config → registro-erros → arquivo-faltando → auth-guard → helpers → atualizacao-sistema → presenca → menu → transp-config → transp-banco → transp-cad-banco → transp-docs → transp-render → transp-form → transp-form-veiculo → transp-form-motorista → transp-cad-tela → transp-init

**WEG.html** — Contrato WEG (preços fixos)
- CSS: style
- JS: supabase-config → registro-erros → arquivo-faltando → auth-guard → helpers → atualizacao-sistema → presenca → menu → weg-dados → weg-documento → weg-cache → weg-email → weg-init

**admin.html** — Usuários e acessos, online agora e erros do sistema (só admin). Usa a largura toda da tela. As Propostas Zap copiadas ficam na própria página (propostas-copiadas.html).
- CSS: style → admin
- JS: supabase-config → registro-erros → arquivo-faltando → auth-guard → helpers → atualizacao-sistema → presenca → menu → admin-config → admin-dados → admin-tela → admin-online → admin-erros → admin-erros-copiar → admin-init

**leads.html** — Lista de empresas para a equipe chamar (acesso "leads" no Admin)
- CSS: style → leads
- JS: supabase-config → registro-erros → arquivo-faltando → auth-guard → helpers → atualizacao-sistema → presenca → menu → leads-config → leads-contato → leads-utils → leads-dados → leads-filtros → leads-lista → leads-cards → leads-acoes → leads-busca-config → leads-init

**login.html** — Login
- CSS: style
- JS: supabase-config

**propostas-copiadas.html** — Propostas Zap copiadas (link 📊 Propostas Zap): cada "Copiar Proposta Zap" com quem fez, aparelho, cliente, equipamentos com desconto, total e a mensagem; filtros em cima (inclusive prazo de pagamento), filtro estilo Excel nos títulos da tabela (clicar no título abre as caixinhas) e desconto médio por usuário. Acesso "propostas-copiadas" no Admin (os dados vêm pela policy de SELECT com `tem_acesso('propostas-copiadas')`). Usa o admin.css (card largo e tabelas) mais o propostas-copiadas.css, e a largura toda da tela.
- CSS: style → admin → propostas-copiadas
- JS: supabase-config → registro-erros → arquivo-faltando → auth-guard → helpers → atualizacao-sistema → presenca → menu → copiadas-dados → copiadas-filtros → copiadas-linhas → copiadas-descontos → copiadas-filtro-colunas → copiadas-filtro-painel → copiadas-init

## Arquivos (responsabilidade e funções)

- `admin-config.js` (51 linhas): Páginas (ACESSOS_ADMIN, chave = nome do arquivo sem .html; "fretes" libera os dados de frete; "transportadoras" é só ver), filiais e estado da tela de usuários e acessos.
- `admin-dados.js` (105 linhas): Ler e salvar os acessos de cada usuário (tabela "perfis") e criar usuário pela função `criar-usuario`. Só admin enxerga todos e altera (policies de RLS).
  - carregarPerfisAdmin, salvarPerfilAdmin, criarUsuarioAdmin
- `admin-erros-copiar.js` (43 linhas): Botões 📋 da seção "Erros do sistema": copia um erro (ou todos os da lista) com página, versão, usuário, horários, mensagem e detalhes, pronto para colar numa conversa. Carregar depois de admin-erros.js.
  - textoErroParaCopiar, copiarErroSite, copiarErrosVisiveis
- `admin-erros.js` (293 linhas): Seção "Erros do sistema": lista os erros da tabela erros_site dos últimos 30 dias, filtro por página, limpar a lista, botão que grava um erro de teste e 📋 Copiar em cada erro (admin-erros-copiar.js). Nada entra como HTML.
  - mensagemFalhaErros, carregarErrosSite, errosVisiveis, desenharFiltroErros, criarCelulaMensagemErro, criarLinhaErro, criarLinhaAvisoErros, desenharErrosSite, limparErrosSite, testarRegistroErros
- `admin-init.js` (40 linhas): Ligações iniciais. Sempre o ÚLTIMO script da página. Quem não é admin já foi mandado embora pelo auth-guard.js.
- `admin-online.js` (127 linhas): Painel "Online agora": quem está com o sistema aberto, em qual página e se está usando, parado ou em segundo plano, e embaixo o aparelho (celular/tablet/computador, marca, navegador) e a cidade aproximada (o texto vem de textoAparelhoOnline, em presenca.js). Sem histórico.
  - nomePaginaOnline, tempoOnline, textoAbaOnline, pessoasOnline, desenharUsuariosOnline
- `admin-tela.js` (254 linhas): Tabela de usuários com uma caixinha por acesso e por filial.
  - alternarItemLista, criarCaixaAdmin, desenharCabecalhoAdmin, desenharPerfis, criarUsuario
- `agenda-banco.js` (347 linhas): Leitura/gravação dos agendamentos (só os fora da lixeira; inclui as colunas de faturamento em CAMPOS_BANCO), mensagem de erro ao salvar e recarga geral (agendamentos, motoristas, transportadoras).
  - doBanco, paraBanco, detalhesErro, mensagemErroSalvar, carregarAgenda, inserirAgendamento, atualizarAgendamento, excluirAgendamentoBanco, recarregarAgenda
- `agenda-botoes-linha.js` (165 linhas): Botão 🔘 Botões: cada usuário escolhe quais botões aparecem em cada agendamento (nos dois modos). O 🗑️ Excluir começa oculto para todo mundo (ocultoPadrao em BOTOES_LINHA), inclusive quem já tinha salvo a escolha; só aparece se o usuário ligar. Também mede a largura da coluna dos botões quando as larguras são fixas. Carregar antes de agenda-init.js.
  - botaoLigado, chaveBotoesLinha, carregarBotoesLinha, salvarBotoesLinha, ligarBotaoLinha, larguraColunaBotoes, atualizarBotaoBotoesLinha, desenharPainelBotoes, alternarPainelBotoes, fecharPainelBotoes
- `agenda-busca.js` (183 linhas): Pesquisa 🔍 da barra por endereço, cliente (ou nome do local) e patrimônio; todas as palavras precisam aparecer. Também busca no banco os agendamentos de antes dos DIAS_PASSADOS_AGENDA (até 200, marcados com `antigo`, somem ao limpar). Esc ou × limpa. Carregar antes de agenda-init.js.
  - palavrasBuscaAgenda, buscandoAgenda, itemCombinaBusca, removerAntigosBusca, buscarAntigosAgenda, digitarBuscaAgenda, limparBuscaAgenda
- `agenda-celula-partes.js` (153 linhas): Peças das células: bloco de local, seletor de status, célula com a coluna e nome da máquina.
  - criarBlocoLocal, criarSeletorStatus, criarCelula, criarMaquina
- `agenda-celulas.js` (223 linhas): Conteúdo de cada coluna de um agendamento.
  - criarCelulasAgenda
- `agenda-clientes.js` (533 linhas): Ao digitar o cliente, sugere o nome completo dos clientes de agendamentos
  - chaveCliente, carregarHistoricoClientes, compararRecentes, agendamentosComCliente, clientesConhecidos, localDoCliente, locaisDoCliente, camposLocalCliente, clienteDoFormulario, preencherOpcoes, rotuloLocal, desenharSugestoesClientes, desenharLocaisCliente, marcarLocalAtivo, preencherAuto, textoPagamentoFormulario, preencherPagamentoCliente, aplicarCliente, usarLocalCliente, aplicarLocalDaLista, escolheuDaLista, prepararSugestoesClientes, ligarSugestoesClientes
- `agenda-coleta.js` (119 linhas): Cria uma coleta já preenchida a partir de uma entrega.
  - valoresColetaDaEntrega, copiarEntregaParaColeta, valoresDuplicados, duplicarAgendamento
- `agenda-colunas-visiveis.js` (169 linhas): Botão 👁️ Colunas (só na expedição): mostrar e ocultar qualquer informação da tabela; salva por usuário e por modo. Carregar depois de agenda-colunas.js.
  - colunaLigada, chaveColunasVisiveis, carregarColunasVisiveis, salvarColunasVisiveis, temColunasVisiveisPersonalizadas, restaurarColunasVisiveis, ligarColuna, atualizarBotaoColunas, desenharPainelColunas, alternarPainelColunas, encaixarPainelNaTela, fecharPainelColunas
- `agenda-colunas.js` (261 linhas): Colunas por modo e ordem das colunas (arrastar o título).
  - colunasDoModo, ordenarColunas, colunasAtuais, obterUsuarioAgenda, chaveOrdemColunas, carregarOrdemColunas, salvarOrdemColunas, moverColuna, ordemColunasPersonalizada, restaurarOrdemColunas, limparIndicadoresColunas, soltaDepois, criarTituloColuna
- `agenda-config.js` (258 linhas): Constantes (tipos, status, colunas, cores), chaves do localStorage e variáveis de estado da agenda. Tipos: "Transferência" é a entre obras (o valor salvo de sempre, que aparece como "Transferência entre obras" em ROTULOS_TIPO) e TIPO_TRANSFERENCIA_UNIDADES vai pra expedição (TIPOS_EXPEDICAO) sem faturamento.
- `agenda-conflitos.js` (62 linhas): Ao salvar, avisa se o patrimônio já está em outra demanda (só aviso, a pessoa decide). Ao editar, só olha os patrimônios novos no agendamento. Carregar depois de agenda-estoque.js.
  - patrimoniosDoAgendamento, conflitosDoAgendamento, confirmarConflitos
- `agenda-estoque-dados.js` (108 linhas): Consulta ao estoque: lê pela função `estoque_disponiveis` e descobre quais máquinas já estão em alguma demanda.
  - carregarEstoqueDisponivel, modelosDoAgendamento, agendamentoReservaMaquina, reservasDaAgenda, textoReserva, descricaoDemanda
- `agenda-estoque-tabela.js` (161 linhas): Consulta ao estoque: data da publicação (destaque se antiga), máquinas de cada filial e a tabela da janela.
  - tempoDesde, criarDataEstoque, maquinasDaFilial, criarTabelaEstoque
- `agenda-estoque.js` (210 linhas): Botão 🔍 da linha: patrimônios disponíveis e em manutenção no último estoque publicado (patrimônio, marca, modelo, situação), por filial, começando pelo modelo do agendamento; destaca a máquina que já está em alguma demanda e, com mais de 12 horas sem publicar, o tempo desde a publicação do estoque. Lê pela função `estoque_disponiveis` do banco (só esses dois status, sem cliente, com `tem_acesso('agenda')`). Só consulta.
  - desenharEstoqueAgenda, abrirEstoqueAgenda, fecharEstoqueAgenda
- `agenda-etapas.js` (139 linhas): Etapas do formulário (Demanda, Local e entrega, Faturamento) que recolhem ao clicar no título; salva por usuário; avisoFormulario() abre a etapa com erro. Carregar antes de agenda-modal.js.
  - chaveEtapas, lerEtapas, salvarEtapas, mostrarEtapa, aplicarEtapasSalvas, avisoFormulario
- `agenda-filtro-datas.js` (211 linhas): Painel de datas estilo Excel e atalhos (hoje / próximos dias).
  - semAcentoMinusculo, datasDoFiltro, rotuloDataFiltro, atualizarBotaoDatas, desenharPainelDatas, alternarPainelDatas, fecharPainelDatas, alternarTodasDatas, selecionarProximosDias
- `agenda-filtro-status.js` (220 linhas): Painel de status estilo Excel. Os status desmarcados ficam salvos por usuário e por modo (agendaStatus); as datas não.
  - chaveStatusFiltro, carregarStatusFiltro, salvarStatusFiltro, statusDoFiltro, contagemPorStatus, atualizarBotaoStatus, desenharPainelStatus, alternarPainelStatus, fecharPainelStatus, alternarTodosStatus
- `agenda-filtros.js` (244 linhas): Modo expedição/transportador, botão "Só sem patrimônio", botão ⚙️ Filtros (painel único com filtros e opções; o botão e a linha da contagem avisam o que está filtrando) e filtrarAgendamentos() (pesquisando, o modo, as datas e os status não escondem nada; os antigos só aparecem na pesquisa).
  - definirModo, visivelNoModo, filtrandoSemPatrimonio, alternarSemPatrimonio, filtrosAtivos, atualizarBotaoFiltros, limparFiltros, alternarPainelFiltros, fecharPainelFiltros, filtrarAgendamentos
- `agenda-form-campos.js` (353 linhas): CAMPOS_AGENDA, máscaras de horário/período e regras dos campos. Em entrega, a retirada vem recolhida ("— W Rental"); abre sozinha se tiver algo preenchido ou em outro tipo.
  - preencherSelect, forcarMaiusculo, mascararHorario, mascararCampoHorario, horarioValido, textoDias, textoPeriodos, normalizarPeriodo, atualizarSugestoesPeriodo, atualizarCamposTipo, retiradaPreenchida, mostrarRetirada, atualizarRetirada, alternarRetirada, preencherSelectComAtual, garantirOpcaoTransportadora, garantirOpcaoVendedor
- `agenda-init.js` (213 linhas): Ligações de eventos e carga inicial (modo, tema e ordem salvos). Sempre o ÚLTIMO script da página.
- `agenda-larguras.js` (349 linhas): Largura das colunas: arrastar a borda do título (como no Excel), duplo clique ajusta ao conteúdo; salva por usuário e por modo. Carregar depois de agenda-colunas.js.
  - chaveLarguras, lerLarguras, salvarLarguras, temLarguraPersonalizada, restaurarColunasPadrao, idsDaTabela, titulosDaTabela, aplicarLarguras, congelarLarguras, ajustarLarguraAoConteudo, atualizarBotaoColunasPadrao, criarAlcaLargura
- `agenda-linhas.js` (194 linhas): Cabeçalho da tabela e a linha de cada agendamento, com os botões (✅ concluir, só na expedição; 📋 Zap, 🧾 faturamento, ↩️ coleta, 📆 duplicar, 🔍 estoque, editar, excluir).
  - criarCabecalhoAgenda, criarItemAgenda
- `agenda-lixeira.js` (211 linhas): Lixeira (só admin): excluir manda o agendamento para a lixeira (`excluido_em`, pela função `mover_agendamento_lixeira` do banco; quem não é admin não vê mais). Botão 🗑️ Lixeira (`.so-admin`) lista os excluídos para restaurar ou apagar de vez (só admin pelo RLS; apaga junto o PDF do pedido). Carregar antes de agenda-init.js.
  - moverParaLixeiraBanco, carregarLixeira, dataLixeira, desenharLixeira, abrirLixeira, fecharLixeira, restaurarDaLixeira, apagarDeVez
- `agenda-modal.js` (237 linhas): Abrir e fechar o formulário, descartar rascunho, excluir pelo modal. Card só por nossa conta; e-mails do cliente sempre aparecem (faturamento), mas só vão no agendamento por conta do cliente.
  - abrirModalAgenda, atualizarCamposConta, fecharModalAgenda, encerrarModalAgenda, descartarRascunho, excluirAgendamentoAberto
- `agenda-motoristas.js` (90 linhas): Só leitura: carrega os motoristas e monta as opções do formulário. Cadastrar/excluir motorista: só admin, em transportadoras.html.
  - carregarMotoristas, motoristasDe, atualizarOpcoesMotorista
- `agenda-ordem.js` (106 linhas): Ordem dentro de cada data (horário, motorista, entregas/coletas).
  - ordemEfetiva, compararHorario, ordenarAgendamentos
- `agenda-pagamento.js` (326 linhas): Faturamento no formulário (só entregas): forma de pagamento (Depósito/Boleto) e prazos em linhas (28 e 56 = 28/56). Botão 🧾 da linha copia "Boleto – 28/56 DD - Enviar para:" com um e-mail por linha (pega só os e-mails do campo; nomes, telefones e separadores ficam de fora). Carrega depois de agenda-coleta.js e antes de agenda-init.js.
  - prazosDigitados, atualizarResumoPrazos, desenharPrazos, adicionarPrazo, validarPrazos, atualizarBlocoFaturamento, preencherFaturamento, faturamentoParaRascunho, faturamentoPreenchido, coletarFaturamento, textoFaturamento, copiarFaturamento
- `agenda-patrimonio.js` (141 linhas): Regras do patrimônio: formato (maiúsculo, com a letra O depois dos números minúscula), patrimônio ainda não definido (só o modelo, menos de 3 números, ex: WAE15; com vários equipamentos basta um) e vários equipamentos juntos na coluna plataforma ("2x WAD16 + WTE12"; também entende / , ; e "e" digitados à mão). Carregar depois de agenda-utils.js.
  - patrimonioFormatado, separarPlataformas, juntarPlataformas, plataformasFormatadas, patrimonioIncompleto, itemSemPatrimonio, atualizarAvisoPatrimonio
- `agenda-pedido-pdf.js` (132 linhas): PDF do pedido no Storage (bucket privado `pedidos-compra`, link assinado de 120 s). Só envia/apaga ao clicar em Salvar.
  - abrirPedidoPdf, enviarPedidoPdf, removerPedidoPdfStorage, sincronizarPdfPedido
- `agenda-pedido.js` (242 linhas): Pedido de compra (sim/não, número, PDF até 5 MB). Com PDF anexado o Sim/Não fica travado até apagar o PDF.
  - pedidoTemPdf, atualizarControlesPedido, preencherPedido, anexarPedidoPdf, apagarPedidoPdf, lerPedidoFormulario, limparPedidoParaSalvar
- `agenda-plataformas.js` (142 linhas): Linhas de equipamento do formulário (patrimônio, quantidade, − e +, como em propostas). As linhas são só a tela: o valor salvo fica no campo escondido agPlataforma. Carregar antes de agenda-modal.js.
  - criarLinhaPlataforma, sincronizarPlataformas, desenharPlataformas, adicionarLinhaPlataforma, removerLinhaPlataforma, digitarPlataforma
- `agenda-rascunho.js` (99 linhas): Guarda no navegador o que foi digitado e não salvo.
  - chaveRascunho, lerRascunhos, gravarRascunhos, removerRascunho, salvarRascunho, agendarRascunho, atualizarBotoesModal
- `agenda-render.js` (223 linhas): Chips de transportadora, select de ordem, controles do modo e renderizarAgenda().
  - desenharChips, atualizarSelectOrdem, definirOrdem, atualizarControlesModo, renderizarAgenda
- `agenda-salvar.js` (298 linhas): salvarAgendamento() (os filtros de status e datas ficam como estavam; se o salvo ficou escondido, o aviso diz por quê), concluirAgendamento() (botão ✅: marca Concluído e sai da expedição, sem excluir) e excluirAgendamento() (manda para a lixeira; o PDF do pedido fica até apagar de vez).
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
- `agenda-utils.js` (72 linhas): corDoDia(), tituloDoDia(), cidadeDoEndereco() (cidade/UF tirada do texto do endereço) e rotuloTipo() (o nome do tipo na tela).
  - rotuloTipo, corDoDia, tituloDoDia, cidadeDoEndereco
- `agenda-zap.js` (301 linhas): Texto de agendamento copiado para o grupo da transportadora. A referência digitada à mão sem o número da proposta ganha " - Proposta: N" no fim.
  - textoDataZap, ehLocalWR, modeloDaPlataforma, modelosDaPlataforma, textoPeriodoReferencia, referenciaZap, linhasLocalZap, montarTextoZap, copiarAgendamentoZap
- `arquivo-faltando.js` (250 linhas): Em toda página menos o login, logo depois de registro-erros: se a página terminou de carregar com algum arquivo faltando (falha de rede; o supabase-js da CDN também conta), envia o registro e recarrega sozinha uma vez. Faltou de novo em 5 min, o site não respondeu ou não dá para guardar a marca no sessionStorage: mostra aviso com "Recarregar". Sem internet, recarrega quando a conexão voltar. Não depende do helpers.js.
  - lerRecargaArquivo, gravarRecargaArquivo, listaArquivosFaltando, doProprioSite, esperarNoMaximo, renovarArquivosFaltando, enviarRegistroAntesDeRecarregar, recarregarPorArquivo, mostrarAvisoArquivoFaltando, recarregarSozinhaPorArquivo, conferirArquivosDaPagina
- `atualizacao-sistema.js` (293 linhas): Em toda página menos o login: a cada 2 min e ao voltar para a aba compara VERSAO_SISTEMA com a do helpers.js publicado; se mudou, renova os arquivos no navegador e recarrega. Espera se houver janela aberta, trabalho não salvo ou uso no último minuto (mostra aviso com "Atualizar agora"). Carregar depois de helpers.js.
  - lerTentativaAtualizacao, gravarTentativaAtualizacao, lerVersaoPublicada, temTrabalhoAberto, paginaOcupada, esconderAvisoNovaVersao, mostrarAvisoNovaVersao, aplicarAtualizacao, tentarAtualizar, verificarVersaoSistema
- `auth-guard.js` (377 linhas): Incluir em toda página que precisa de login (depois de supabase-config.js). Sem sessão ativa manda pra login.html antes da página aparecer; depois confere perfil (com cache), acesso à página e filial, e mostra os itens `.so-admin` para admin.
  - existeLoginSalvo, ehAdmin, carregarPerfil, salvarPerfilCache, lerPerfilCache, buscarPerfil, temAcesso, temFilial, recursoDaPagina, nomeArquivoAtual, sairDoSistema, liberarPaginaAtual, fazerLogout
- `busca-fretes.js` (74 linhas): TABELAS_FRETES (uma tabela por transportadora) e buscarLinhasFretes() (busca em páginas de 1000 linhas).
  - buscarLinhasFretes
- `copiadas-dados.js` (123 linhas): Carrega cada "Copiar Proposta Zap" dos últimos 90 dias (até 500; propostas-registro.js grava e só o admin lê, pelo RLS), a contagem ("3 de 40" filtrando) e o aviso de lista vazia.
  - carregarPropostasAdmin, textoVazioPropostas, desenharPropostasAdmin
- `copiadas-descontos.js` (122 linhas): Quadro acima da tabela: por usuário, quantas propostas, equipamentos com valor de tabela, desconto médio (média do % de cada equipamento, contando a quantidade), desconto sobre o total de tabela e o maior desconto, só das propostas que passam nos filtros.
  - resumoDescontosPorUsuario, percentualAdmin, desenharDescontosPorUsuario
- `copiadas-filtro-colunas.js` (240 linhas): Clicar no título de uma coluna da tabela abre caixinhas como no filtro do Excel: desmarcou, some. Usuário, Cliente e Configurações têm um grupo por tipo de informação; Equipamentos mostra a proposta se algum modelo dela estiver marcado; Total tem faixa de valor. Vale junto com os filtros de cima.
  - gruposFiltroColuna, valoresDoGrupo, textoValorGrupo, passaFiltrosColuna, colunaFiltrando, filtrandoColunas, limparFiltrosColuna, opcoesDoGrupo, marcarValorColuna, prepararCabecalhoFiltros, atualizarCabecalhoFiltros
- `copiadas-filtro-painel.js` (279 linhas): O painel que abre embaixo do título da coluna: pesquisa, "(Selecionar tudo)" de cada grupo, as caixinhas com quantas propostas têm cada valor e "Limpar filtro"; no Total, a faixa de valor. Marcar ou desmarcar filtra na hora. Fecha com Esc, no ✖ ou clicando fora. As regras ficam em copiadas-filtro-colunas.js.
  - painelFiltroColuna, alternarPainelFiltroColuna, fecharPainelFiltroColuna, aplicarFiltroColuna, filtrarOpcoesPainel, caixaFiltroColuna, grupoPainelFiltro, faixaPainelFiltro, desenharPainelFiltroColuna
- `copiadas-filtros.js` (244 linhas): Busca em qualquer campo (todas as palavras precisam aparecer, inclusive na mensagem), usuário, local de quem fez (cidade pelo IP), aparelho, modelo, prazo de pagamento (o que saiu na mensagem), faixa de desconto (o mesmo % da tabela; junto com o modelo vale para o mesmo equipamento) e faixa de data. As opções dos selects vêm das propostas carregadas.
  - normalizarBuscaAdmin, valoresFiltroProposta, textoBuscaProposta, numeroFiltroPropostas, diaProposta, descontoNoFiltro, propostasVisiveis, filtrandoPropostas, desenharFiltrosPropostas, limparFiltrosPropostas
- `copiadas-init.js` (27 linhas): Ligações iniciais e a primeira carga. Sempre o ÚLTIMO script da página. Quem não é admin já foi mandado embora pelo auth-guard.js.
- `copiadas-linhas.js` (241 linhas): Cada linha da tabela: usuário e aparelho, cliente (cidade, período, frete), equipamentos com tabela → valor final e % de desconto, total, configurações ativadas e a mensagem (ver e 📋 copiar). Nada entra como HTML.
  - moedaAdmin, descontoEquipamentoAdmin, textoEquipamentoAdmin, configuracoesAdmin, textoComplementarAdmin, textoBonificadoAdmin, textoPagamentoAdmin, prazoPagamentoAdmin, textoAparelhoAdmin, celulaUsuarioProposta, textoPeriodoAdmin, resumoClienteProposta, celulaClienteProposta, celulaEquipamentosProposta, celulaConfigProposta, celulaMensagemProposta, criarLinhaProposta
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
- `helpers.js` (359 linhas): Versão do sistema (VERSAO_SISTEMA), $, criar() (cria elemento com classe e texto), semAcento() (tira só o acento), dataBR(), dataHoraBR(), dataISO(), lerLocal() e gravarLocal() (preferências salvas no navegador), canal de avisos da agenda (canalAgenda, avisarAgendaMudou), formatadores, copiar() e mostrarToast().
  - $, criar, semAcento, canalAgenda, avisarAgendaMudou, formatarData, dataBR, dataHoraBR, dataISO, brToNumber, formatarMoedaBR, formatarNumeroPonto, copiar, mostrarToast, lerLocal, lerLocalJSON, gravarLocal, gravarLocalJSON, removerLocal
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
- `menu.js` (147 linhas): Links entre as páginas, montados aqui, num lugar só (PAGINAS_MENU). Em cada página aparecem todos, menos o dela mesma; `soAdmin` esconde o link até confirmar que é admin (admin.html); `comAcesso` esconde até confirmar o acesso da página no perfil (transportadoras.html, leads.html, propostas-copiadas.html). Também mede a altura da topbar (fixa, quebra em mais linhas) e guarda em `--altura-topbar`, que o `.container` (style.css) usa para começar abaixo dela.
- `presenca.js` (327 linhas): Em toda página menos o login: informa pelo canal de presença do Supabase em qual página a pessoa está e se está usando, parada (2 min sem mexer) ou com a aba em segundo plano. Vai o id, a página, o estado, o aparelho (pelo navegador; no Android o modelo vem do Chrome) e a cidade aproximada pelo IP (get.geojs.io, guardada 6 h no navegador); não grava nada no banco. Também tem o texto do aparelho para as telas do admin (TEXTO_TIPO_APARELHO, textoAparelhoOnline). Carregar depois de helpers.js e auth-guard.js.
  - calcularEstadoPresenca, enviarPresenca, navegadorDoTexto, aparelhoAndroid, descreverAparelho, textoAparelhoOnline, modeloDoAndroid, cidadeDoIP, reenviarComAparelho, identificarAparelho, iniciarPresenca
- `proposta-zap.js` (478 linhas): copiarPropostaZap(): mensagem completa para WhatsApp. Depois de copiar, manda os dados para o registro do admin (propostas-registro.js).
  - copiarPropostaZap
- `propostas-avisos.js` (129 linhas): Avisos de falha/offline e datalists de equipamentos e cidades.
  - mostrarAvisoDadosSalvos, avisarFalhaCarregamento, preencherListaEquipamentos, preencherListaCidades
- `propostas-cache.js` (304 linhas): Salva/restaura o preenchimento no navegador e limpa a tela.
  - salvarCache, restaurarCache, limparTudo
- `propostas-config.js` (319 linhas): Locação complementar (o valor pronto aparece no Resumo da proposta: frete x 2, +20% com bitributação), bitributação (o botão também aparece no Calcular Desconto com o frete no total), diária, emojis, cidade de saída, linha em branco e modal da engrenagem.
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
- `propostas-init.js` (196 linhas): Carrega tabelas e liga eventos. Sempre o ÚLTIMO script da página. Lê ?cliente= e ?cidade= (vindos de leads.html) depois do cache e limpa o endereço.
- `propostas-pagamento.js` (56 linhas): Boleto ou depósito e o prazo em dias (⚙️ Configurações) na mensagem da Proposta Zap; sem escolher, sai o texto padrão.
  - atualizarCampoPrazo, trocarFormaPagamento, prazoPagamentoTexto, textoFormaPagamento
- `propostas-registro.js` (156 linhas): Cada "Copiar Proposta Zap" grava na tabela propostas_copiadas o aparelho, a cidade aproximada, os dados da proposta (cliente, período, frete, equipamentos com desconto e valores), as configurações e o texto. Copiar de novo a mesma proposta em 10 min não repete. Falhar não atrapalha a cópia.
  - arredondarRegistro, descontoDoEquipamento, aparelhoDoRegistro, montarRegistroProposta, registrarPropostaCopiada
- `propostas-resumo-frete.js` (126 linhas): Seções de baixo do Resumo da proposta (propostas-resumo.js): o frete (locação complementar, com o 📋 do formato Zoho, ou terceirizado) e o valor final com a diária da proposta.
  - secaoFreteResumo, secaoTotalResumo
- `propostas-resumo.js` (222 linhas): Card "Resumo da proposta" (no PC na coluna do meio; no celular logo depois do Calcular Desconto): todas as contas num lugar só, iguais às da Proposta Zap. Por equipamento: tabela, desconto (em vermelho acima de 20%), locação, seguro, máquina + seguro e diária. Depois o frete (locação complementar ou terceirizado), o valor final e a diária da proposta. Os outros cards ficam só com os campos.
  - moedaResumo, botaoZohoResumo, linhaResumo, notaResumo, textoPeriodoResumo, itensDoResumo, secaoEquipamentoResumo, atualizarResumoProposta
- `propostas-tabelas-fretes.js` (151 linhas): Carregamento de tabela_fretes.
  - processarLinhasFretes, carregarFretes
- `propostas-tabelas-precos.js` (161 linhas): Cópia offline (localStorage, de preços e de fretes) e carregamento de tabela_precos.
  - salvarCopiaTabela, lerCopiaTabela, processarLinhasPrecos, carregarTabela
- `propostas-textos.js` (172 linhas): Oportunidade e proposta ZOHO, copiarTexto().
  - gerarTextos, copiarTexto
- `propostas-valor-tabela.js` (197 linhas): Período da proposta (campos Período e Períodos) e busca do valor de tabela de cada equipamento.
  - obterPeriodoProposta, preencherValorTabela
- `registro-erros.js` (310 linhas): Em toda página menos o login, logo depois de supabase-config: guarda erro de código, arquivo que não carregou e o que passa por console.error, e envia pela função `registrar_erro_site`. O mesmo erro soma em "vezes". Sem login ou sem internet não registra, e falhar aqui nunca atrapalha a página.
  - limparTextoErro, anotarErro, anotarArquivoFaltando, cssCarregou, paginaDoErro, versaoDoErro, enviarLoteErros, enviarErrosPendentes, textoDoConsole, pilhaDoConsole
- `status.js` (200 linhas): obterCidadeSaida(), obterFreteBonificado() (a caixa Frete bonificado, embaixo do Valor frete em propostas.html: entrega, retirada ou as duas de graça; sai "Bonificado" nas mensagens e as contas usam um frete só, ou nenhum) e gerarStatus() (botões Autorizado, ICMS, Frete ZOHO).
  - obterCidadeSaida, obterFreteBonificado, freteEstaBonificado, fretesCobrados, gerarStatus
- `supabase-config.js` (49 linhas): Cria o supabaseClient. Quando o banco recusa o login recém-renovado ("JWT issued at future", PGRST303), espera e repete a consulta (até 2 vezes). Precisa vir DEPOIS do <script> do supabase-js (CDN) e ANTES de todos os outros scripts.
  - fetchSupabase
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
- `weg-email.js` (95 linhas): Texto para mandar junto com o print por e-mail (botão "Copiar texto do e-mail" ao lado do documento): saudação pelo horário, nome das máquinas escolhidas e dados para confirmação.
  - saudacaoEmail, nomeEquipamentoEmail, equipamentosEmail, textoConfirmacaoEmail, copiarParaEmail
- `weg-init.js` (70 linhas): Ligações iniciais. Sempre o ÚLTIMO script da página.

## CSS

- `style.css`: base comum (topbar, layout, cards, inputs, botões, toast, documento da proposta, avisos de versão nova e de arquivo que não carregou)
- `propostas.css`, `estoque.css`, `tabelas.css`, `admin.css`, `agenda.css`, `leads.css`, `propostas-copiadas.css`: estilos de cada página (a propostas-copiadas.html carrega também o admin.css)
- `transportadoras.css`: lista, modal, documentos e formulário de nova transportadora

## Supabase (tabelas, bucket e função)

| Nome | Usado em |
|---|---|
| `agendamentos` | `agenda-banco.js`, `agenda-lixeira.js` (lixeira; função `mover_agendamento_lixeira`), `transp-config.js` (`transp-cad-banco.js` conta vínculos) |
| `bucket:pedidos-compra` | `agenda-pedido-pdf.js` |
| `bucket:docs-transportadoras` | `transp-config.js` |
| `erros_site` | `admin-erros.js` (só o admin lê e apaga; a gravação é pela função `registrar_erro_site`, em `registro-erros.js`). O SQL não fica neste repositório. |
| `frete_dionizio` | `busca-fretes.js`, `tabelas-config.js` |
| `frete_magnus` | `busca-fretes.js`, `tabelas-config.js` |
| `função:criar-usuario` | `admin-dados.js` |
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
| `transportadora_docs` | `transp-config.js` |
| `transportadoras` | `agenda-banco.js` (leitura em `agenda-transportadoras.js`), `transp-config.js` |
| `veiculos` | `transp-config.js` |

Os nomes ficam em constantes (`TABELA_*`, `TRANSP_TABELAS`, `BUCKET_*`, `TABELAS`, `TABELAS_FRETES`) nos arquivos acima.

## Preferências locais (localStorage)

Cada chave tem o prefixo da página. As de `...:<usuário>` são separadas por usuário logado. Ler e gravar sempre por `lerLocal`/`gravarLocal` (e as versões JSON) do `helpers.js`, que já tratam navegador bloqueado e valor corrompido; só o `auth-guard.js`, que carrega antes, tem tratamento próprio.

| Chave | Definida em |
|---|---|
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

- Arquivos acima de ~300 linhas (sugerir divisão antes de crescerem): `agenda-clientes.js` (533), `proposta-zap.js` (478), `estoque-parser.js` (385), `transp-render.js` (381), `auth-guard.js` (377), `helpers.js` (359), `agenda-form-campos.js` (353), `agenda-larguras.js` (349), `agenda-banco.js` (347), `presenca.js` (327), `agenda-pagamento.js` (326), `leads-cards.js` (325), `propostas-config.js` (319), `transp-docs.js` (312), `registro-erros.js` (310), `propostas-cache.js` (304), `agenda-zap.js` (301).
- Cadastro de transportadoras e motoristas saiu da agenda (v16.6.0): agora é só em `transportadoras.html` (admin). A agenda só lê.
- `transportadoras.html` para quem não é admin (acesso "transportadoras", v16.8.0): só ver. A tela esconde os botões, mas os dados só aparecem com policies de SELECT com `tem_acesso('transportadoras')` em `transportadoras`, `veiculos`, `motoristas`, `motoristas_dados`, `transportadora_docs` e no bucket `docs-transportadoras`. Gravar continua só com as policies de admin.
- `propostas-copiadas.html` para quem não é admin (acesso "propostas-copiadas", v16.41.0): os dados só aparecem com a policy de SELECT com `tem_acesso('propostas-copiadas')` em `propostas_copiadas`. Apagar continua só com o admin.
- Acesso à agenda no Supabase: policies com `tem_acesso('agenda')` (admin ou perfil ativo com 'agenda'), não "qualquer logado".
- Vários equipamentos no mesmo agendamento vão juntos na coluna `plataforma` (texto), ex: `2x WAD16 + WTE12`. Card, Zap, ordem e filtro leem esse texto; sem mudança no Supabase. A máquina de recolha da troca continua uma só.
- Faturamento (forma, prazos, pedido) só em entregas; a coleta gerada de uma entrega não copia esses campos e o Zap não leva essas informações (só o card).
- `menu.js` é a lista única dos links da topbar: página nova entra lá (nada de links digitados à mão). Página nova com acesso controlado entra também em `ACESSOS_ADMIN` (`admin-config.js`).
- Leads: as tabelas e permissões foram criadas à mão no SQL Editor e o SQL não fica neste repositório. Policies com `tem_acesso('leads')`. A regra "só quem marcou registra o resultado" é da tela, não do banco.
- Agente de leads: tarefa agendada do Claude Code (conta individual, todo dia às 07:00). Lê e entrega pela Edge Function `agente-leads`, que valida tudo e grava com service_role; o token fica nos segredos do Supabase e no segredo de rede do ambiente da tarefa. O código da função e o SQL não ficam neste repositório, que é público.
- Mudou VERSAO_SISTEMA? Fica em `helpers.js`.
