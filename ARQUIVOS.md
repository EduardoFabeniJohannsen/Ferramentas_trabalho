# Mapa dos arquivos

Sem build e sem módulos: cada página carrega os scripts na ordem abaixo (variáveis e funções são globais).
Toda página carrega antes o supabase-js 2.45.0 (CDN jsDelivr); ele não aparece nas listas abaixo.
Para editar algo, abra só o arquivo da responsabilidade certa. O `*-init.js` é sempre o último da página.

> Este mapa foi regerado a partir dos arquivos do projeto (cabeçalhos e funções de cada um). Mudou ordem de scripts, funções ou criou arquivo? Atualize aqui.

## Ordem de carregamento por página

**index.html** — Página inicial: conversor de texto e calculadora de boletos
- CSS: style
- JS: supabase-config → auth-guard → helpers → status → index-ferramentas → menu

**propostas.html** — Gerador de propostas (textos ZOHO e Zap, desconto, fretes)
- CSS: style → propostas
- JS: supabase-config → auth-guard → helpers → busca-fretes → status → menu → propostas-estado → propostas-tabelas-precos → propostas-tabelas-fretes → propostas-avisos → propostas-equipamentos → propostas-valor-tabela → propostas-fretes-painel → propostas-desconto → propostas-desconto-calculo → propostas-cache → propostas-config → proposta-zap → propostas-textos → proposta-zap → propostas-init

**agenda.html** — Agenda de entregas, coletas, transferências e trocas
- CSS: style → bloco <style> no próprio agenda.html (o grosso dos estilos da agenda)
- JS: supabase-config → auth-guard → helpers → menu → agenda-config → agenda-utils → agenda-patrimonio → agenda-banco → agenda-filtros → agenda-busca → agenda-filtro-datas → agenda-filtro-status → agenda-ordem → agenda-render → agenda-linhas → agenda-colunas → agenda-colunas-visiveis → agenda-botoes-linha → agenda-larguras → agenda-tema → agenda-zap → agenda-transportadoras → agenda-motoristas → agenda-form-campos → agenda-plataformas → agenda-rascunho → agenda-etapas → agenda-modal → agenda-salvar → agenda-coleta → agenda-pagamento → agenda-pedido → agenda-pedido-pdf → agenda-lixeira → agenda-estoque → agenda-init

**estoque.html** — Resumo do estoque de plataformas (por filial)
- CSS: style → estoque
- JS: [SheetJS 0.18.5/CDN] → supabase-config → auth-guard → helpers → menu → estoque-config → estoque-parser → estoque-grupos → estoque-render → estoque-busca → estoque-dados → estoque-upload → estoque-init

**tabelas.html** — Consulta e edição das tabelas de preços e fretes
- CSS: style → tabelas
- JS: supabase-config → auth-guard → helpers → menu → tabelas-config → tabelas-dados → tabelas-desenho → tabelas-editor → tabelas-init

**transportadoras.html** — Transportadoras: cadastro, veículos, motoristas e PDFs (ver: acesso "transportadoras"; editar: só admin)
- CSS: style → transportadoras → bloco <style> no HTML (formulário de nova transportadora)
- JS: supabase-config → auth-guard → helpers → menu → transp-config → transp-banco → transp-cad-banco → transp-docs → transp-render → transp-form → transp-form-veiculo → transp-form-motorista → transp-cad-tela → transp-init

**WEG.html** — Contrato WEG (preços fixos)
- CSS: style
- JS: supabase-config → auth-guard → helpers → menu → weg-dados → weg-documento → weg-cache → weg-email → weg-init

**admin.html** — Usuários e acessos (só admin)
- CSS: style → admin
- JS: supabase-config → auth-guard → helpers → menu → admin-config → admin-dados → admin-tela → admin-init

**login.html** — Login
- CSS: style
- JS: supabase-config

## Arquivos (responsabilidade e funções)

- `admin-config.js` (45 linhas): Páginas (ACESSOS_ADMIN, chave = nome do arquivo sem .html; "fretes" libera os dados de frete; "transportadoras" é só ver), filiais e estado da tela de usuários e acessos.
- `admin-dados.js` (102 linhas): Ler e salvar os acessos de cada usuário (tabela "perfis") e criar usuário pela função `criar-usuario`. Só admin enxerga todos e altera (policies de RLS).
  - carregarPerfisAdmin, salvarPerfilAdmin, criarUsuarioAdmin
- `admin-init.js` (30 linhas): Ligações iniciais. Sempre o ÚLTIMO script da página. Quem não é admin já foi mandado embora pelo auth-guard.js.
- `admin-tela.js` (229 linhas): Tabela de usuários com uma caixinha por acesso e por filial.
  - alternarItemLista, criarCaixaAdmin, desenharCabecalhoAdmin, desenharPerfis, criarUsuario
- `agenda-banco.js` (332 linhas): Leitura/gravação dos agendamentos (só os fora da lixeira; inclui as colunas de faturamento em CAMPOS_BANCO), mensagem de erro ao salvar e recarga geral (agendamentos, motoristas, transportadoras). ⚠️ passa de ~300 linhas (sugerir divisão)
  - doBanco, paraBanco, detalhesErro, mensagemErroSalvar, carregarAgenda, inserirAgendamento, atualizarAgendamento, excluirAgendamentoBanco, recarregarAgenda
- `agenda-busca.js` (183 linhas): Pesquisa 🔍 da barra por endereço, cliente (ou nome do local) e patrimônio; todas as palavras precisam aparecer. Também busca no banco os agendamentos de antes dos DIAS_PASSADOS_AGENDA (até 200, marcados com `antigo`, somem ao limpar). Esc ou × limpa. Carregar antes de agenda-init.js.
  - palavrasBuscaAgenda, buscandoAgenda, itemCombinaBusca, removerAntigosBusca, buscarAntigosAgenda, digitarBuscaAgenda, limparBuscaAgenda
- `agenda-coleta.js` (67 linhas): Cria uma coleta já preenchida a partir de uma entrega.
  - valoresColetaDaEntrega, copiarEntregaParaColeta
- `agenda-colunas.js` (284 linhas): Colunas por modo e ordem das colunas (arrastar o título).
  - colunasDoModo, ordenarColunas, colunasAtuais, obterUsuarioAgenda, chaveOrdemColunas, carregarOrdemColunas, salvarOrdemColunas, moverColuna, ordemColunasPersonalizada, restaurarOrdemColunas, limparIndicadoresColunas, soltaDepois, criarTituloColuna
- `agenda-colunas-visiveis.js` (190 linhas): Botão 👁️ Colunas (só na expedição): mostrar e ocultar qualquer informação da tabela; salva por usuário e por modo. Carregar depois de agenda-colunas.js.
  - colunaLigada, chaveColunasVisiveis, carregarColunasVisiveis, salvarColunasVisiveis, temColunasVisiveisPersonalizadas, restaurarColunasVisiveis, ligarColuna, atualizarBotaoColunas, desenharPainelColunas, alternarPainelColunas, encaixarPainelNaTela, fecharPainelColunas
- `agenda-botoes-linha.js` (165 linhas): Botão 🔘 Botões: cada usuário escolhe quais botões aparecem em cada agendamento (nos dois modos). Também mede a largura da coluna dos botões quando as larguras são fixas. Carregar antes de agenda-init.js.
  - botaoLigado, chaveBotoesLinha, carregarBotoesLinha, salvarBotoesLinha, ligarBotaoLinha, larguraColunaBotoes, atualizarBotaoBotoesLinha, desenharPainelBotoes, alternarPainelBotoes, fecharPainelBotoes
- `agenda-config.js` (227 linhas): Constantes (tipos, status, colunas, cores), chaves do localStorage e variáveis de estado da agenda.
- `agenda-estoque.js` (367 linhas): Botão 🔍 da linha: patrimônios disponíveis e em manutenção no último estoque publicado (patrimônio, marca, modelo, situação), por filial, começando pelo modelo do agendamento; destaca a máquina que já está em alguma demanda. Lê pela função `estoque_disponiveis` do banco (só esses dois status, sem cliente, com `tem_acesso('agenda')`). Só consulta. ⚠️ passa de ~300 linhas (sugerir divisão)
  - carregarEstoqueDisponivel, modelosDoAgendamento, reservasDaAgenda, textoReserva, maquinasDaFilial, criarTabelaEstoque, desenharEstoqueAgenda, abrirEstoqueAgenda, fecharEstoqueAgenda
- `agenda-etapas.js` (158 linhas): Etapas do formulário (Demanda, Local e entrega, Faturamento) que recolhem ao clicar no título; salva por usuário; avisoFormulario() abre a etapa com erro. Carregar antes de agenda-modal.js.
  - chaveEtapas, lerEtapas, salvarEtapas, mostrarEtapa, aplicarEtapasSalvas, avisoFormulario
- `agenda-filtro-datas.js` (214 linhas): Painel de datas estilo Excel e atalhos (hoje / próximos dias).
  - semAcentoMinusculo, datasDoFiltro, rotuloDataFiltro, atualizarBotaoDatas, desenharPainelDatas, alternarPainelDatas, fecharPainelDatas, alternarTodasDatas, selecionarProximosDias
- `agenda-filtro-status.js` (177 linhas): Painel de status estilo Excel.
  - statusDoFiltro, contagemPorStatus, atualizarBotaoStatus, desenharPainelStatus, alternarPainelStatus, fecharPainelStatus, alternarTodosStatus
- `agenda-filtros.js` (247 linhas): Modo expedição/transportador, botão "Só sem patrimônio", botão ⚙️ Filtros (painel único com filtros e opções; o botão e a linha da contagem avisam o que está filtrando) e filtrarAgendamentos() (pesquisando, o modo, as datas e os status não escondem nada; os antigos só aparecem na pesquisa).
  - definirModo, visivelNoModo, filtrandoSemPatrimonio, alternarSemPatrimonio, filtrosAtivos, atualizarBotaoFiltros, limparFiltros, alternarPainelFiltros, fecharPainelFiltros, filtrarAgendamentos
- `agenda-form-campos.js` (337 linhas): CAMPOS_AGENDA, máscaras de horário/período e regras dos campos. Em entrega, a retirada vem recolhida ("— W Rental"); abre sozinha se tiver algo preenchido ou em outro tipo. ⚠️ passa de ~300 linhas (sugerir divisão)
  - preencherSelect, forcarMaiusculo, mascararHorario, mascararCampoHorario, horarioValido, textoDias, textoPeriodos, normalizarPeriodo, atualizarSugestoesPeriodo, atualizarCamposTipo, retiradaPreenchida, mostrarRetirada, atualizarRetirada, alternarRetirada, garantirOpcaoTransportadora
- `agenda-init.js` (204 linhas): Ligações de eventos e carga inicial (modo, tema e ordem salvos). Sempre o ÚLTIMO script da página.
- `agenda-larguras.js` (367 linhas): Largura das colunas: arrastar a borda do título (como no Excel), duplo clique ajusta ao conteúdo; salva por usuário e por modo. Carregar depois de agenda-colunas.js. ⚠️ passa de ~300 linhas (sugerir divisão)
  - chaveLarguras, lerLarguras, salvarLarguras, temLarguraPersonalizada, restaurarColunasPadrao, idsDaTabela, titulosDaTabela, aplicarLarguras, congelarLarguras, ajustarLarguraAoConteudo, atualizarBotaoColunasPadrao, criarAlcaLargura
- `agenda-lixeira.js` (222 linhas): Lixeira (só admin): excluir manda o agendamento para a lixeira (`excluido_em`, pela função `mover_agendamento_lixeira` do banco; quem não é admin não vê mais). Botão 🗑️ Lixeira (`.so-admin`) lista os excluídos para restaurar ou apagar de vez (só admin pelo RLS; apaga junto o PDF do pedido). Carregar antes de agenda-init.js.
- `agenda-linhas.js` (522 linhas): Montagem de cada linha/célula da tabela, cabeçalho, seletor de status e botões da linha (📋 Zap, 🧾 faturamento, ↩️ coleta, 🔍 estoque, editar, excluir). ⚠️ passa de ~300 linhas (sugerir divisão)
  - criarBlocoLocal, criarSeletorStatus, criarCelula, criarMaquina, criarCelulasAgenda, criarCabecalhoAgenda, criarItemAgenda
- `agenda-modal.js` (232 linhas): Abrir e fechar o formulário, descartar rascunho, excluir pelo modal. Card só por nossa conta; e-mails do cliente sempre aparecem (faturamento), mas só vão no agendamento por conta do cliente.
  - abrirModalAgenda, atualizarCamposConta, fecharModalAgenda, encerrarModalAgenda, descartarRascunho, excluirAgendamentoAberto
- `agenda-motoristas.js` (90 linhas): Só leitura: carrega os motoristas e monta as opções do formulário. Cadastrar/excluir motorista: só admin, em transportadoras.html.
  - carregarMotoristas, motoristasDe, atualizarOpcoesMotorista
- `agenda-ordem.js` (106 linhas): Ordem dentro de cada data (horário, motorista, entregas/coletas).
  - ordemEfetiva, compararHorario, ordenarAgendamentos
- `agenda-pagamento.js` (326 linhas): Faturamento no formulário (só entregas): forma de pagamento (Depósito/Boleto) e prazos em linhas (28 e 56 = 28/56). Botão 🧾 da linha copia "Boleto – 28/56 DD - Enviar para:" com um e-mail por linha (pega só os e-mails do campo; nomes, telefones e separadores ficam de fora). Carrega depois de agenda-coleta.js e antes de agenda-init.js. ⚠️ passa de ~300 linhas (sugerir divisão)
  - prazosDigitados, atualizarResumoPrazos, desenharPrazos, adicionarPrazo, validarPrazos, atualizarBlocoFaturamento, preencherFaturamento, faturamentoParaRascunho, faturamentoPreenchido, coletarFaturamento, textoFaturamento, copiarFaturamento
- `agenda-patrimonio.js` (140 linhas): Regras do patrimônio: formato (maiúsculo, com a letra O depois dos números minúscula), patrimônio ainda não definido (só o modelo, menos de 3 números, ex: WAE15; com vários equipamentos basta um) e vários equipamentos juntos na coluna plataforma ("2x WAD16 + WTE12"). Carregar depois de agenda-utils.js.
  - patrimonioFormatado, separarPlataformas, juntarPlataformas, plataformasFormatadas, patrimonioIncompleto, itemSemPatrimonio, atualizarAvisoPatrimonio
- `agenda-plataformas.js` (142 linhas): Linhas de equipamento do formulário (patrimônio, quantidade, − e +, como em propostas). As linhas são só a tela: o valor salvo fica no campo escondido agPlataforma. Carregar antes de agenda-modal.js.
  - criarLinhaPlataforma, sincronizarPlataformas, desenharPlataformas, adicionarLinhaPlataforma, removerLinhaPlataforma, digitarPlataforma
- `agenda-pedido.js` (242 linhas): Pedido de compra (sim/não, número, PDF até 5 MB). Com PDF anexado o Sim/Não fica travado até apagar o PDF.
  - pedidoTemPdf, atualizarControlesPedido, preencherPedido, anexarPedidoPdf, apagarPedidoPdf, lerPedidoFormulario, limparPedidoParaSalvar
- `agenda-pedido-pdf.js` (134 linhas): PDF do pedido no Storage (bucket privado `pedidos-compra`, link assinado de 120 s). Só envia/apaga ao clicar em Salvar.
  - abrirPedidoPdf, enviarPedidoPdf, removerPedidoPdfStorage, sincronizarPdfPedido
- `agenda-rascunho.js` (122 linhas): Guarda no navegador o que foi digitado e não salvo.
  - chaveRascunho, lerRascunhos, gravarRascunhos, removerRascunho, salvarRascunho, agendarRascunho, atualizarBotoesModal
- `agenda-render.js` (233 linhas): Chips de transportadora, select de ordem, controles do modo e renderizarAgenda().
  - desenharChips, atualizarSelectOrdem, definirOrdem, atualizarControlesModo, renderizarAgenda
- `agenda-salvar.js` (230 linhas): salvarAgendamento() e excluirAgendamento() (manda para a lixeira; o PDF do pedido fica até apagar de vez).
  - salvarAgendamento, excluirAgendamento
- `agenda-tema.js` (37 linhas): aplicarTema() e alternarTema() (fundo claro opcional; escuro é o padrão).
  - aplicarTema, alternarTema
- `agenda-transportadoras.js` (57 linhas): Só leitura: carrega a lista de transportadoras para os campos e filtros da agenda. Cadastrar/excluir transportadora: só admin, em transportadoras.html.
  - carregarTransportadoras, definirTransportadoras, atualizarSelectsTransportadora
- `agenda-utils.js` (100 linhas): criar(), dataISO(), corDoDia(), tituloDoDia(), cidadeDoEndereco() (cidade/UF tirada do texto do endereço).
  - criar, dataISO, corDoDia, tituloDoDia
- `agenda-zap.js` (307 linhas): Texto de agendamento copiado para o grupo da transportadora. A referência digitada à mão sem o número da proposta ganha " - Proposta: N" no fim. ⚠️ passa de ~300 linhas (sugerir divisão)
  - textoDataZap, ehLocalWR, modeloDaPlataforma, modelosDaPlataforma, textoPeriodoReferencia, referenciaZap, linhasLocalZap, montarTextoZap, copiarAgendamentoZap
- `auth-guard.js` (376 linhas): Incluir em toda página que precisa de login (depois de supabase-config.js). Sem sessão ativa manda pra login.html antes da página aparecer; depois confere perfil (com cache), acesso à página e filial, e mostra os itens `.so-admin` para admin. ⚠️ passa de ~300 linhas (sugerir divisão)
  - existeLoginSalvo, ehAdmin, carregarPerfil, salvarPerfilCache, lerPerfilCache, buscarPerfil, temAcesso, temFilial, recursoDaPagina, nomeArquivoAtual, sairDoSistema, liberarPaginaAtual, fazerLogout
- `busca-fretes.js` (74 linhas): TABELAS_FRETES (uma tabela por transportadora) e buscarLinhasFretes() (busca em páginas de 1000 linhas).
  - buscarLinhasFretes
- `estoque.js` (930 linhas): **LEGADO: monolítico, nenhuma página carrega; ignorar e nunca editar.** (Versão antiga de toda a página de estoque, já dividida nos `estoque-*.js`.)
- `estoque-busca.js` (114 linhas): Barra de pesquisa: mostra só o modelo digitado, num card. (Usa compararMaquinas, escaparHtml e STATUS_COM_PREVISAO do estoque-render.js.)
  - textoBusca, modelosDaBusca, htmlCardBusca, htmlBusca
- `estoque-config.js` (95 linhas): Status, tipos, listas fixas, filiais e estado.
- `estoque-dados.js` (101 linhas): Carregar resumo publicado e trocar de filial.
  - carregarResumoPublicado, atualizarFilialNaTela, trocarFilial
- `estoque-grupos.js` (94 linhas): Agrupa modelos por tipo (letras do patrimônio) para cada status.
  - tipoDoModelo, alturaDoModelo, ordenarModelos, montarGrupos
- `estoque-init.js` (86 linhas): Ligações iniciais (restaura a filial salva). Sempre o ÚLTIMO script da página.
- `estoque-parser.js` (322 linhas): Relatório bruto -> resumo (resumirEstoque). Guarda também marca, modelo de fábrica e equipamento, usados pela lupa da agenda. ⚠️ passa de ~300 linhas (sugerir divisão)
  - normalizarTexto, modeloDoPatrimonio, formatarPrevisao, resumirEstoque
- `estoque-render.js` (223 linhas): HTML dos cards de status e avisos.
  - escaparHtml, chaveDataPrevisao, compararMaquinas, htmlItemModelo, desenharResumo, formatarDataHora, mostrarAvisosEstoque, mostrarPublicado
- `estoque-upload.js` (123 linhas): Ler o Excel, prévia e publicar.
  - lerArquivo, cancelarPrevia, publicarResumo
- `helpers.js` (178 linhas): Versão do sistema (VERSAO_SISTEMA), $, formatadores, copiar() e mostrarToast().
  - formatarData, brToNumber, formatarMoedaBR, formatarNumeroPonto, copiar, mostrarToast
- `index-ferramentas.js` (313 linhas): Ferramentas da página inicial: conversor de texto (maiúsculo/minúsculo/CNPJ) e calculadora de boletos (valor dividido em N parcelas, com a sobra dos centavos ajustada, e vencimentos por dias personalizados). ⚠️ passa de ~300 linhas (sugerir divisão)
  - maiusculo, minusculo, formatarCNPJ, calcularBoletos, calcularDiasPersonalizados
- `menu.js` (119 linhas): Links entre as páginas, montados aqui, num lugar só (PAGINAS_MENU). Em cada página aparecem todos, menos o dela mesma; `soAdmin` esconde o link até confirmar que é admin (admin.html); `comAcesso` esconde até confirmar o acesso da página no perfil (transportadoras.html).
- `proposta-zap.js` (439 linhas): copiarPropostaZap(): mensagem completa para WhatsApp. ⚠️ passa de ~300 linhas (sugerir divisão)
  - copiarPropostaZap
- `propostas-avisos.js` (129 linhas): Avisos de falha/offline e datalists de equipamentos e cidades.
  - mostrarAvisoDadosSalvos, avisarFalhaCarregamento, preencherListaEquipamentos, preencherListaCidades
- `propostas-cache.js` (295 linhas): Salva/restaura o preenchimento no navegador e limpa a tela.
  - salvarCache, restaurarCache, limparTudo
- `propostas-config.js` (331 linhas): Locação complementar (com o valor pronto embaixo do frete: frete x 2, +20% com bitributação), bitributação, diária, emojis, cidade de saída, linha em branco e modal da engrenagem.
  - alternarLocacaoComplementar, atualizarBotaoLocacaoComplementar, alternarBitributacao, atualizarBotaoBitributacao, valorLocacaoComplementar, atualizarResumoComplementar, alternarValorDiaria, atualizarBotaoValorDiaria, alternarEmojis, atualizarBotaoEmojis, alternarCidadeSaida, atualizarBotaoCidadeSaida, alternarSepararPagamento, atualizarBotaoSepararPagamento, abrirConfiguracoes, fecharConfiguracoes
- `propostas-desconto.js` (173 linhas): Desenha e atualiza o bloco de desconto de cada equipamento.
  - htmlPlaceholderDesconto, renderizarDescontosPorEquipamento
- `propostas-desconto-calculo.js` (216 linhas): Cálculo por % ou valor desejado, valor final e eventos de input. Com 2+ máquinas, mostra o desconto por máquina (desconto total ÷ quantidade).
  - textoDescontoBloco, calcularDescontoBloco, atualizarValorFinalProposta
- `propostas-equipamentos.js` (286 linhas): obterEquipamentos(), adicionar/remover linha e eventos.
  - obterEquipamentos, adicionarEquipamento, removerEquipamento, configurarEventosEquipamentos
- `propostas-estado.js` (64 linhas): Variáveis das tabelas carregadas, normalizarModelo() e normalizarCidade().
  - normalizarModelo, normalizarCidade
- `propostas-fretes-painel.js` (144 linhas): mostrarFretes(): fretes encontrados por transportadora.
  - mostrarFretes
- `propostas-init.js` (159 linhas): Carrega tabelas e liga eventos. Sempre o ÚLTIMO script da página.
- `propostas-tabelas-fretes.js` (151 linhas): Carregamento de tabela_fretes.
  - processarLinhasFretes, carregarFretes
- `propostas-tabelas-precos.js` (191 linhas): Cópia offline (localStorage, de preços e de fretes) e carregamento de tabela_precos.
  - salvarCopiaTabela, lerCopiaTabela, processarLinhasPrecos, carregarTabela
- `propostas-textos.js` (172 linhas): Oportunidade e proposta ZOHO, copiarTexto().
  - gerarTextos, copiarTexto
- `propostas-valor-tabela.js` (197 linhas): Período da proposta (campos Período e Períodos) e busca do valor de tabela de cada equipamento.
  - obterPeriodoProposta, preencherValorTabela
- `status.js` (115 linhas): obterCidadeSaida() e gerarStatus() (botões Autorizado, ICMS, Frete ZOHO).
  - obterCidadeSaida, gerarStatus
- `supabase-config.js` (18 linhas): Cria o supabaseClient. Precisa vir DEPOIS do <script> do supabase-js (CDN) e ANTES de todos os outros scripts.
- `tabelas-config.js` (109 linhas): Definição das tabelas editáveis (TABELAS: colunas, matriz de consulta e permissão de cada uma) e estado.
- `tabelas-dados.js` (115 linhas): tratarValor() e carregarLinhasTabela().
  - tratarValor, carregarLinhasTabela
- `tabelas-desenho.js` (242 linhas): desenharTabela() e matriz de consulta.
  - criarCampo, desenharTabela, desenharMatriz
- `tabelas-editor.js` (292 linhas): Linhas editáveis, salvar, adicionar e excluir (admin).
  - criarLinhaTabela, criarLinhaNova, salvarCampo, adicionarLinha, excluirLinha
- `tabelas-init.js` (101 linhas): Alternar consulta/edição e início. Sempre o ÚLTIMO script da página.
  - atualizarModo, alternarModoEdicao
- `transp-banco.js` (295 linhas): Leitura e gravação: transportadoras, veículos (de uma ou de todas as transportadoras), motoristas (renomear leva junto os agendamentos), dados dos motoristas e exclusões. Os PDFs (Storage e tabela de documentos) ficam em transp-docs.js; o cadastro de transportadora, em transp-cad-banco.js.
  - exigirDados, detalhesErroTransp, carregarListaTransportadoras, carregarDadosTransportadora, salvarVeiculoBanco, excluirVeiculoBanco, adicionarMotoristaBanco, renomearMotoristaBanco, salvarDadosMotoristaBanco, excluirMotoristaBanco
- `transp-cad-banco.js` (61 linhas): Adicionar e excluir transportadoras no Supabase e contar o que usa cada uma (motoristas, veículos, agendamentos). A tela fica em transp-cad-tela.js.
  - adicionarTransportadoraBanco, contarUsosTransportadora, excluirTransportadoraBanco
- `transp-cad-tela.js` (184 linhas): Botões "+ Nova transportadora" e "Excluir transportadora" da barra (só exclui se não tiver motorista, veículo nem agendamento). Carregar antes de transp-init.js.
  - abrirFormNovaTransp, fecharFormNovaTransp, escolherTransportadora, adicionarTransportadoraTransp, textoUsosTransportadora, excluirTransportadoraAtual
- `transp-config.js` (93 linhas): Tabelas (TRANSP_TABELAS, inclui agendamentos para checar vínculos), bucket, limite do PDF (5 MB), tipos e medidas do veículo, rótulos de documento, TRANSP_TODAS (opção "Todas as transportadoras", conferida por emTodasTransp()) e variáveis de estado (inclui `transpSoLeitura`: quem não é admin só vê). As policies de RLS no Supabase é que protegem os dados.
- `transp-docs.js` (314 linhas): Envio, abertura e exclusão dos PDFs de veículos e motoristas, e o bloco de documentos do formulário (só leitura: abre, sem anexar nem excluir). Os arquivos ficam no bucket privado (BUCKET_DOCS) e só abrem por link temporário. ⚠️ passa de ~300 linhas (sugerir divisão)
  - docsDoDono, removerArquivosStorage, enviarDocumento, abrirDocumento, excluirDocumento, criarBlocoDocumentos, desenharBlocoDocumentos
- `transp-form.js` (132 linhas): Campos, máscara de CPF, abrir/fechar o modal (só leitura: campos travados e sem Salvar) e salvar (veículo e motorista ficam em transp-form-veiculo.js e transp-form-motorista.js).
  - criarCampoForm, maiusculoCampoTransp, formatarCPF, cpfValido, abrirModalTransp, fecharModalTransp, salvarModalTransp
- `transp-form-motorista.js` (263 linhas): Modal do motorista (nome, CPF, nascimento, CNH), salvar e excluir. O admin pode trocar o nome; os agendamentos com o nome antigo são atualizados junto.
  - abrirModalMotorista, salvarMotoristaTransp, excluirMotoristaTransp
- `transp-form-veiculo.js` (261 linhas): Modal do veículo (prancha ou carreta), validação de placas e medidas, salvar e excluir (editando, o veículo continua na transportadora dele).
  - atualizarCamposPlaca, abrirModalVeiculo, salvarVeiculoTransp, excluirVeiculoTransp
- `transp-init.js` (81 linhas): Confere se é admin (quem não é fica só vendo: some Nova/Excluir transportadora e Novo item), liga os eventos e carrega os dados. Quem não tem acesso já saiu pelo auth-guard.js. Sempre o ÚLTIMO script da página.
- `transp-render.js` (408 linhas): Seleção da transportadora (inclui "Todas as transportadoras": lista tudo com o nome da transportadora no cartão; cadastrar novo e excluir transportadora ficam desativados), abas, cartões de veículos e motoristas (admin: editar/excluir; só leitura: 👁 ver) e recarga. ⚠️ passa de ~300 linhas (sugerir divisão)
  - criarElemento, criarBotao, numeroBR, dataBR, placasDoVeiculo, adicionarNomeTransp, desenharSelectTransportadora, definirAbaTransp, abrirNovoItemTransp, desenharListaTransp, textoQuantidadeDocs, criarItemVeiculo, criarAcoesItemTransp, criarItemMotorista, recarregarTransp
- `weg-cache.js` (96 linhas): Salva/restaura o preenchimento no navegador (inclui a unidade WEG).
  - salvarCacheWEG, restaurarCacheWEG
- `weg-dados.js` (169 linhas): contratoWEG (inclui origem do frete e unidades WEG: Jaraguá do Sul, Itajaí, Blumenau, Guaramirim), lista de equipamentos, unidade da WEG, períodos, datas e grupos.
  - montarListaEquipamentos, montarSelectUnidade, textoRotaFrete, obterQuantidade, obterPeriodos, obterDatas, grupoDoModelo, ordemDoGrupo
- `weg-documento.js` (188 linhas): gerarDocumento(): área para print. Só lista os equipamentos com quantidade maior que 0; a locação complementar mostra a rota do frete (W Rental Itajaí x WEG unidade).
  - gerarDocumento
- `weg-email.js` (95 linhas): Texto para mandar junto com o print por e-mail (botão "Copiar texto do e-mail" ao lado do documento): saudação pelo horário, nome das máquinas escolhidas e dados para confirmação.
  - saudacaoEmail, nomeEquipamentoEmail, equipamentosEmail, textoConfirmacaoEmail, copiarParaEmail
- `weg-init.js` (70 linhas): Ligações iniciais. Sempre o ÚLTIMO script da página.

## CSS

- `style.css`: base comum (topbar, layout, cards, inputs, botões, toast, documento da proposta)
- `propostas.css`, `estoque.css`, `tabelas.css`, `admin.css`: estilos de cada página
- `transportadoras.css`: lista, modal e documentos da página de transportadoras (o formulário de nova transportadora está no <style> do transportadoras.html)
- `agenda.css`, `agenda-modal.css`, `agenda-tema-claro.css`: **nenhuma página carrega**. A agenda usa o bloco <style> do próprio agenda.html (lista, modais e tema claro `body.tema-claro`). Mexer no estilo da agenda = editar o agenda.html.

## Supabase (tabelas, bucket e função)

| Nome | Usado em |
|---|---|
| `agendamentos` | `agenda-banco.js`, `agenda-lixeira.js` (lixeira; função `mover_agendamento_lixeira`), `transp-config.js` (`transp-cad-banco.js` conta vínculos) |
| `bucket:pedidos-compra` | `agenda-pedido-pdf.js` |
| `bucket:docs-transportadoras` | `transp-config.js` |
| `frete_dionizio` | `busca-fretes.js`, `tabelas-config.js` |
| `frete_magnus` | `busca-fretes.js`, `tabelas-config.js` |
| `função:criar-usuario` | `admin-dados.js` |
| `motoristas` | `agenda-banco.js` (leitura em `agenda-motoristas.js`), `transp-config.js` |
| `motoristas_dados` | `transp-config.js` |
| `perfis` | `admin-config.js`, `auth-guard.js` |
| `resumo_estoque` | `estoque-dados.js`, `estoque-upload.js`, `agenda-estoque.js` (função `estoque_disponiveis`), `estoque.js` (legado) |
| `tabela_fretes` | `propostas-tabelas-fretes.js`, `tabelas-config.js` |
| `tabela_precos` | `propostas-tabelas-precos.js`, `tabelas-config.js` |
| `transportadora_docs` | `transp-config.js` |
| `transportadoras` | `agenda-banco.js` (leitura em `agenda-transportadoras.js`), `transp-config.js` |
| `veiculos` | `transp-config.js` |

Os nomes ficam em constantes (`TABELA_*`, `TRANSP_TABELAS`, `BUCKET_*`, `TABELAS`, `TABELAS_FRETES`) nos arquivos acima.

## Preferências locais (localStorage)

Cada chave tem o prefixo da página. As de `...:<usuário>` são separadas por usuário logado.

| Chave | Definida em |
|---|---|
| `agendaModo` | `agenda-config.js` |
| `agendaOrdem` | `agenda-config.js` |
| `agendaTema` | `agenda-config.js` |
| `agendaColunas` | `agenda-config.js` |
| `agendaColunasVisiveis` | `agenda-config.js` |
| `agendaBotoes` | `agenda-config.js` |
| `agendaLarguras` | `agenda-config.js` |
| `agendaEtapas` | `agenda-config.js` |
| `agendaRascunhos` | `agenda-config.js` |
| `authPerfil` | `auth-guard.js` |
| `estoqueFilial` | `estoque-config.js` (e no legado `estoque.js`) |
| `propostaCache` | `propostas-cache.js` |
| `cacheTabelaPrecos` | `propostas-tabelas-precos.js` |
| `cacheTabelaFretes` | `propostas-tabelas-precos.js` |
| `transportadorasUltima` | `transp-config.js` |
| `wegCache` | `weg-cache.js` |

## Atenções

- `propostas.html` carrega `proposta-zap.js` duas vezes (antes e depois de `propostas-textos`). Não quebra, mas é carga repetida.
- Arquivos acima de ~300 linhas (sugerir divisão antes de crescerem): `agenda-linhas.js` (522), `proposta-zap.js` (439), `transp-render.js` (408), `auth-guard.js` (376), `agenda-larguras.js` (367), `agenda-form-campos.js` (337), `propostas-config.js` (331), `agenda-banco.js` (332), `agenda-pagamento.js` (326), `transp-docs.js` (314), `index-ferramentas.js` (313), `agenda-zap.js` (307).
- `estoque.js` (930) é o legado monolítico: nenhuma página carrega. Não editar.
- `css/agenda*.css` não são carregados por nenhuma página (ver seção CSS).
- Cadastro de transportadoras e motoristas saiu da agenda (v16.6.0): agora é só em `transportadoras.html` (admin). A agenda só lê.
- `transportadoras.html` para quem não é admin (acesso "transportadoras", v16.8.0): só ver. A tela esconde os botões, mas os dados só aparecem com policies de SELECT com `tem_acesso('transportadoras')` em `transportadoras`, `veiculos`, `motoristas`, `motoristas_dados`, `transportadora_docs` e no bucket `docs-transportadoras`. Gravar continua só com as policies de admin.
- Acesso à agenda no Supabase: policies com `tem_acesso('agenda')` (admin ou perfil ativo com 'agenda'), não "qualquer logado".
- Vários equipamentos no mesmo agendamento vão juntos na coluna `plataforma` (texto), ex: `2x WAD16 + WTE12`. Card, Zap, ordem e filtro leem esse texto; sem mudança no Supabase. A máquina de recolha da troca continua uma só.
- Faturamento (forma, prazos, pedido) só em entregas; a coleta gerada de uma entrega não copia esses campos e o Zap não leva essas informações (só o card).
- `menu.js` é a lista única dos links da topbar: página nova entra lá (nada de links digitados à mão). Página nova com acesso controlado entra também em `ACESSOS_ADMIN` (`admin-config.js`).
- Mudou VERSAO_SISTEMA? Fica em `helpers.js`.
