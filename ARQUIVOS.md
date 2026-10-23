# Mapa dos arquivos

Sem build e sem módulos: cada página carrega os scripts na ordem abaixo (variáveis e funções são globais).
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
- CSS: style → agenda → agenda-modal → agenda-tema-claro
- JS: supabase-config → auth-guard → helpers → menu → agenda-config → agenda-utils → agenda-banco → agenda-filtros → agenda-filtro-datas → agenda-filtro-status → agenda-ordem → agenda-render → agenda-linhas → agenda-colunas → agenda-tema → agenda-zap → agenda-transportadoras → agenda-motoristas → agenda-form-campos → agenda-rascunho → agenda-modal → agenda-salvar → agenda-coleta → agenda-init

**estoque.html** — Resumo do estoque de plataformas (por filial)
- CSS: style → estoque
- JS: [SheetJS/CDN] → supabase-config → auth-guard → helpers → menu → estoque-config → estoque-parser → estoque-grupos → estoque-render → estoque-busca → estoque-dados → estoque-upload → estoque-init

**tabelas.html** — Consulta e edição das tabelas de preços e fretes
- CSS: style → tabelas
- JS: supabase-config → auth-guard → helpers → menu → tabelas-config → tabelas-dados → tabelas-desenho → tabelas-editor → tabelas-init

**transportadoras.html** — Transportadoras: veículos, motoristas e PDFs (só admin)
- CSS: style → transportadoras
- JS: supabase-config → auth-guard → helpers → menu → transp-config → transp-banco → transp-docs → transp-render → transp-form → transp-form-veiculo → transp-form-motorista → transp-init

**WEG.html** — Contrato WEG (preços fixos)
- CSS: style
- JS: supabase-config → auth-guard → helpers → menu → weg-dados → weg-documento → weg-cache → weg-email → weg-init

**admin.html** — Usuários e acessos (admin)
- CSS: style → admin
- JS: supabase-config → auth-guard → helpers → menu → admin-config → admin-dados → admin-tela → admin-init

**login.html** — Login
- CSS: style
- JS: supabase-config

## Arquivos (responsabilidade e funções)

- `admin-config.js` (42 linhas): Páginas, filiais e estado da tela de usuários e acessos.
- `admin-dados.js` (102 linhas): Ler e salvar os acessos de cada usuário (tabela "perfis"). Só admin enxerga todos e altera (policies de RLS).
  - carregarPerfisAdmin, salvarPerfilAdmin, criarUsuarioAdmin
- `admin-init.js` (30 linhas): Ligações iniciais. Sempre o ÚLTIMO script da página. Quem não é admin já foi mandado embora pelo auth-guard.js.
- `admin-tela.js` (229 linhas): Tabela de usuários com uma caixinha por acesso e por filial.
  - alternarItemLista, criarCaixaAdmin, desenharCabecalhoAdmin, desenharPerfis, criarUsuario
- `agenda-banco.js` (250 linhas): Leitura/gravação dos agendamentos e recarga geral (agendamentos, motoristas, transportadoras).
  - doBanco, paraBanco, detalhesErro, carregarAgenda, inserirAgendamento, atualizarAgendamento, excluirAgendamentoBanco, recarregarAgenda
- `agenda-coleta.js` (67 linhas): Cria uma coleta já preenchida a partir de uma entrega.
  - valoresColetaDaEntrega, copiarEntregaParaColeta
- `agenda-colunas.js` (283 linhas): Colunas por modo e ordem das colunas (arrastar o título).
  - colunasDoModo, ordenarColunas, colunasAtuais, obterUsuarioAgenda, chaveOrdemColunas, carregarOrdemColunas, salvarOrdemColunas, moverColuna, ordemColunasPersonalizada, restaurarOrdemColunas, limparIndicadoresColunas, soltaDepois, criarTituloColuna
- `agenda-config.js` (169 linhas): Constantes (tipos, status, colunas, cores) e variáveis de estado da agenda.
- `agenda-filtro-datas.js` (214 linhas): Painel de datas estilo Excel e atalhos (hoje / próximos dias).
  - semAcentoMinusculo, datasDoFiltro, rotuloDataFiltro, atualizarBotaoDatas, desenharPainelDatas, alternarPainelDatas, fecharPainelDatas, alternarTodasDatas, selecionarProximosDias
- `agenda-filtro-status.js` (177 linhas): Painel de status estilo Excel.
  - statusDoFiltro, contagemPorStatus, atualizarBotaoStatus, desenharPainelStatus, alternarPainelStatus, fecharPainelStatus, alternarTodosStatus
- `agenda-filtros.js` (98 linhas): Modo expedição/transportador e filtrarAgendamentos().
  - definirModo, visivelNoModo, filtrarAgendamentos
- `agenda-form-campos.js` (276 linhas): CAMPOS_AGENDA, máscaras de horário/período e regras dos campos.
  - preencherSelect, forcarMaiusculo, mascararHorario, mascararCampoHorario, horarioValido, textoDias, textoPeriodos, normalizarPeriodo, atualizarSugestoesPeriodo, atualizarCamposTipo, garantirOpcaoTransportadora
- `agenda-init.js` (171 linhas): Ligações de eventos e carga inicial. Sempre o ÚLTIMO script da página.
- `agenda-linhas.js` (415 linhas): Montagem de cada linha/célula da tabela, cabeçalho e seletor de status. ⚠️ passa de ~300 linhas (sugerir divisão)
  - criarBlocoLocal, criarSeletorStatus, criarCelula, criarCelulasAgenda, criarCabecalhoAgenda, criarItemAgenda
- `agenda-modal.js` (214 linhas): Abrir e fechar o formulário, descartar rascunho, excluir pelo modal.
  - abrirModalAgenda, atualizarCamposConta, fecharModalAgenda, encerrarModalAgenda, descartarRascunho, excluirAgendamentoAberto
- `agenda-motoristas.js` (205 linhas): Carregar e adicionar motoristas; modal de cadastro. Excluir motorista: só admin, em transportadoras.html.
  - carregarMotoristas, motoristasDe, atualizarOpcoesMotorista, abrirModalMotoristas, fecharModalMotoristas, desenharMotoristas, adicionarMotorista
- `agenda-ordem.js` (106 linhas): Ordem dentro de cada data (horário, motorista, entregas/coletas).
  - ordemEfetiva, compararHorario, ordenarAgendamentos
- `agenda-rascunho.js` (117 linhas): Guarda no navegador o que foi digitado e não salvo.
  - chaveRascunho, lerRascunhos, gravarRascunhos, removerRascunho, salvarRascunho, agendarRascunho, atualizarBotoesModal
- `agenda-render.js` (224 linhas): Chips de transportadora, select de ordem, controles do modo e renderizarAgenda().
  - desenharChips, atualizarSelectOrdem, definirOrdem, atualizarControlesModo, renderizarAgenda
- `agenda-salvar.js` (185 linhas): salvarAgendamento() e excluirAgendamento().
  - salvarAgendamento, excluirAgendamento
- `agenda-tema.js` (37 linhas): aplicarTema() e alternarTema().
  - aplicarTema, alternarTema
- `agenda-transportadoras.js` (240 linhas): Carregar, adicionar e excluir transportadoras.
  - carregarTransportadoras, definirTransportadoras, atualizarSelectsTransportadora, desenharTransportadoras, adicionarTransportadora, excluirTransportadora
- `agenda-utils.js` (74 linhas): criar(), dataISO(), corDoDia(), tituloDoDia().
  - criar, dataISO, corDoDia, tituloDoDia
- `agenda-zap.js` (276 linhas): Texto de agendamento copiado para o grupo da transportadora.
  - textoDataZap, ehLocalWR, modeloDaPlataforma, textoPeriodoReferencia, referenciaZap, linhasLocalZap, montarTextoZap, copiarAgendamentoZap
- `auth-guard.js` (376 linhas): Inclui esse script em toda página que precisa de login (depois de supabase-config.js). Se não tiver sessão ativa, ⚠️ passa de ~300 linhas (sugerir divisão)
  - existeLoginSalvo, ehAdmin, carregarPerfil, salvarPerfilCache, lerPerfilCache, buscarPerfil, temAcesso, temFilial, recursoDaPagina, nomeArquivoAtual, sairDoSistema, liberarPaginaAtual, fazerLogout
- `busca-fretes.js` (74 linhas): TABELAS_FRETES e buscarLinhasFretes().
  - buscarLinhasFretes
- `estoque.js` (930 linhas): Qualquer usuário logado sobe o Excel bruto do estoque; o resumo (por status e modelo) é salvo na tabela resumo_estoque **(LEGADO: monolítico, nenhuma página carrega; ignorar e nunca editar)**
- `estoque-busca.js` (114 linhas): Barra de pesquisa: mostra só o modelo digitado, num card. (Usa compararMaquinas, escaparHtml e STATUS_COM_PREVISAO do estoque-render.js.)
  - textoBusca, modelosDaBusca, htmlCardBusca, htmlBusca
- `estoque-config.js` (95 linhas): Status, tipos, listas fixas, filiais e estado.
- `estoque-dados.js` (101 linhas): Carregar resumo publicado e trocar de filial.
  - carregarResumoPublicado, atualizarFilialNaTela, trocarFilial
- `estoque-grupos.js` (94 linhas): Agrupa modelos por tipo (letras do patrimônio) para cada status.
  - tipoDoModelo, alturaDoModelo, ordenarModelos, montarGrupos
- `estoque-init.js` (86 linhas): Ligações iniciais. Sempre o ÚLTIMO script da página.
- `estoque-parser.js` (296 linhas): Relatório bruto -> resumo (resumirEstoque).
  - normalizarTexto, modeloDoPatrimonio, formatarPrevisao, resumirEstoque
- `estoque-render.js` (223 linhas): HTML dos cards de status e avisos.
  - escaparHtml, chaveDataPrevisao, compararMaquinas, htmlItemModelo, desenharResumo, formatarDataHora, mostrarAvisosEstoque, mostrarPublicado
- `estoque-upload.js` (123 linhas): Ler o Excel, prévia e publicar.
  - lerArquivo, cancelarPrevia, publicarResumo
- `helpers.js` (178 linhas): Versão do sistema, $, formatadores, copiar() e mostrarToast().
  - formatarData, brToNumber, formatarMoedaBR, formatarNumeroPonto, copiar, mostrarToast
- `index-ferramentas.js` (274 linhas): Ferramentas da página inicial.
  - maiusculo, minusculo, formatarCNPJ, calcularBoletos, calcularDiasPersonalizados
- `menu.js` (100 linhas): Links entre TODAS as páginas, montados aqui, num lugar só. Em cada página aparecem todos, menos o dela mesma.
- `proposta-zap.js` (439 linhas): copiarPropostaZap(): mensagem completa para WhatsApp. ⚠️ passa de ~300 linhas (sugerir divisão)
  - copiarPropostaZap
- `propostas-avisos.js` (129 linhas): Avisos de falha/offline e datalists de equipamentos e cidades.
  - mostrarAvisoDadosSalvos, avisarFalhaCarregamento, preencherListaEquipamentos, preencherListaCidades
- `propostas-cache.js` (293 linhas): Salva/restaura o preenchimento no navegador e limpa a tela.
  - salvarCache, restaurarCache, limparTudo
- `propostas-config.js` (280 linhas): Locação complementar, bitributação, diária, emojis, cidade de saída, linha em branco e modal da engrenagem.
  - alternarLocacaoComplementar, atualizarBotaoLocacaoComplementar, alternarBitributacao, atualizarBotaoBitributacao, alternarValorDiaria, atualizarBotaoValorDiaria, alternarEmojis, atualizarBotaoEmojis, alternarCidadeSaida, atualizarBotaoCidadeSaida, alternarSepararPagamento, atualizarBotaoSepararPagamento, abrirConfiguracoes, fecharConfiguracoes
- `propostas-desconto.js` (170 linhas): Desenha e atualiza o bloco de desconto de cada equipamento.
  - htmlPlaceholderDesconto, renderizarDescontosPorEquipamento
- `propostas-desconto-calculo.js` (191 linhas): Cálculo por % ou valor desejado, valor final e eventos de input.
  - calcularDescontoBloco, atualizarValorFinalProposta
- `propostas-equipamentos.js` (286 linhas): obterEquipamentos(), adicionar/remover linha e eventos.
  - obterEquipamentos, adicionarEquipamento, removerEquipamento, configurarEventosEquipamentos
- `propostas-estado.js` (64 linhas): Variáveis das tabelas carregadas, normalizarModelo() e normalizarCidade().
  - normalizarModelo, normalizarCidade
- `propostas-fretes-painel.js` (144 linhas): mostrarFretes(): fretes encontrados por transportadora.
  - mostrarFretes
- `propostas-init.js` (153 linhas): Carrega tabelas e liga eventos. Sempre o ÚLTIMO script da página.
- `propostas-tabelas-fretes.js` (151 linhas): Carregamento de tabela_fretes.
  - processarLinhasFretes, carregarFretes
- `propostas-tabelas-precos.js` (191 linhas): Cópia offline (localStorage) e carregamento de tabela_precos.
  - salvarCopiaTabela, lerCopiaTabela, processarLinhasPrecos, carregarTabela
- `propostas-textos.js` (172 linhas): Oportunidade e proposta ZOHO, copiarTexto().
  - gerarTextos, copiarTexto
- `propostas-valor-tabela.js` (197 linhas): Período da proposta (campos Período e Períodos) e busca do valor de tabela de cada equipamento.
  - obterPeriodoProposta, preencherValorTabela
- `status.js` (115 linhas): obterCidadeSaida() e gerarStatus() (botões Autorizado, ICMS, Frete ZOHO).
  - obterCidadeSaida, gerarStatus
- `supabase-config.js` (18 linhas): Precisa vir DEPOIS do <script> do supabase-js (CDN) e ANTES de auth-guard.js / propostas-dados.js / weg.js.
- `tabelas-config.js` (109 linhas): Definição das tabelas editáveis e estado.
- `tabelas-dados.js` (115 linhas): tratarValor() e carregarLinhasTabela().
  - tratarValor, carregarLinhasTabela
- `tabelas-desenho.js` (242 linhas): desenharTabela() e matriz de consulta.
  - criarCampo, desenharTabela, desenharMatriz
- `tabelas-editor.js` (292 linhas): Linhas editáveis, salvar, adicionar e excluir.
  - criarLinhaTabela, criarLinhaNova, salvarCampo, adicionarLinha, excluirLinha
- `tabelas-init.js` (101 linhas): Alternar consulta/edição e início. Sempre o ÚLTIMO script da página.
  - atualizarModo, alternarModoEdicao
- `transp-banco.js` (259 linhas): Leitura e gravação: transportadoras, veículos, dados dos motoristas e exclusões. Os PDFs (Storage e tabela de documentos) ficam em transp-docs.js.
  - exigirDados, detalhesErroTransp, carregarListaTransportadoras, carregarDadosTransportadora, salvarVeiculoBanco, excluirVeiculoBanco, adicionarMotoristaBanco, salvarDadosMotoristaBanco, excluirMotoristaBanco
- `transp-config.js` (78 linhas): Tabelas, bucket, medidas do veículo, rótulos de documento e variáveis de estado. Página só para admin (as policies de RLS no Supabase é que protegem os dados).
- `transp-docs.js` (308 linhas): Envio, abertura e exclusão dos PDFs de veículos e motoristas, e o bloco de documentos do formulário. Os arquivos ficam no bucket privado (BUCKET_DOCS); ⚠️ passa de ~300 linhas (sugerir divisão)
  - docsDoDono, removerArquivosStorage, enviarDocumento, abrirDocumento, excluirDocumento, criarBlocoDocumentos, desenharBlocoDocumentos
- `transp-form.js` (117 linhas): Campos, máscara de CPF, abrir/fechar o modal e salvar (veículo e motorista ficam em transp-form-veiculo.js e transp-form-motorista.js).
  - criarCampoForm, maiusculoCampoTransp, formatarCPF, cpfValido, abrirModalTransp, fecharModalTransp, salvarModalTransp
- `transp-form-motorista.js` (248 linhas): Modal do motorista (nome, CPF, nascimento, CNH), salvar e excluir.
  - abrirModalMotorista, salvarMotoristaTransp, excluirMotoristaTransp
- `transp-form-veiculo.js` (257 linhas): Modal do veículo (prancha ou carreta), validação de placas e medidas, salvar e excluir.
  - atualizarCamposPlaca, abrirModalVeiculo, salvarVeiculoTransp, excluirVeiculoTransp
- `transp-init.js` (76 linhas): Confere se é admin, liga os eventos e carrega os dados. Sempre o ÚLTIMO script da página.
- `transp-render.js` (374 linhas): Seleção da transportadora, abas, cartões de veículos e motoristas e recarga. ⚠️ passa de ~300 linhas (sugerir divisão)
  - criarElemento, criarBotao, numeroBR, dataBR, placasDoVeiculo, desenharSelectTransportadora, definirAbaTransp, abrirNovoItemTransp, desenharListaTransp, textoQuantidadeDocs, criarItemVeiculo, criarItemMotorista, recarregarTransp
- `weg-cache.js` (89 linhas): Salva/restaura o preenchimento no navegador.
  - salvarCacheWEG, restaurarCacheWEG
- `weg-dados.js` (140 linhas): contratoWEG, lista de equipamentos, períodos, datas e grupos.
  - montarListaEquipamentos, obterQuantidade, obterPeriodos, obterDatas, grupoDoModelo, ordemDoGrupo
- `weg-documento.js` (168 linhas): gerarDocumento(): área para print.
  - gerarDocumento
- `weg-email.js` (82 linhas): Texto copiado para o e-mail.
  - htmlConfirmacaoEmail, textoConfirmacaoEmail, copiarParaEmail
- `weg-init.js` (63 linhas): Ligações iniciais. Sempre o ÚLTIMO script da página.

## CSS

- `style.css`: base comum (topbar, layout, cards, inputs, botões, toast, documento da proposta)
- `propostas.css`, `estoque.css`, `tabelas.css`, `admin.css`: estilos de cada página
- `transportadoras.css`: lista, modal e documentos da página de transportadoras
- `agenda.css`, `agenda-modal.css`, `agenda-tema-claro.css`: agenda (lista / formulários e modais / fundo claro)

## Supabase (tabelas, bucket e função)

| Nome | Usado em |
|---|---|
| `agendamentos` | `agenda-banco.js` |
| `bucket:docs-transportadoras` | `transp-config.js` |
| `frete_dionizio` | `busca-fretes.js`, `tabelas-config.js` |
| `frete_magnus` | `busca-fretes.js`, `tabelas-config.js` |
| `função:criar-usuario` | `admin-dados.js` |
| `motoristas` | `agenda-banco.js`, `transp-config.js` |
| `motoristas_dados` | `transp-config.js` |
| `perfis` | `admin-config.js`, `auth-guard.js` |
| `resumo_estoque` | `estoque-dados.js`, `estoque-upload.js`, `estoque.js` |
| `tabela_fretes` | `propostas-tabelas-fretes.js`, `tabelas-config.js` |
| `tabela_precos` | `propostas-tabelas-precos.js`, `tabelas-config.js` |
| `transportadora_docs` | `transp-config.js` |
| `transportadoras` | `agenda-banco.js`, `transp-config.js` |
| `veiculos` | `transp-config.js` |

## Preferências locais (localStorage)

Cada chave tem o prefixo da página. As de `...:<usuário>` são separadas por usuário logado.

| Chave | Definida em |
|---|---|
| `agendaModo` | `agenda-config.js` |
| `agendaOrdem` | `agenda-config.js` |
| `agendaTema` | `agenda-config.js` |
| `agendaColunas` | `agenda-config.js` |
| `agendaRascunhos` | `agenda-config.js` |
| `authPerfil` | `auth-guard.js` |
| `estoqueFilial` | `estoque-config.js` |
| `estoqueFilial` | `estoque.js` |
| `propostaCache` | `propostas-cache.js` |
| `cacheTabelaPrecos` | `propostas-tabelas-precos.js` |
| `cacheTabelaFretes` | `propostas-tabelas-precos.js` |
| `transportadorasUltima` | `transp-config.js` |
| `wegCache` | `weg-cache.js` |

## Atenções

- `propostas.html` carrega `proposta-zap.js` duas vezes (antes e depois de `propostas-textos`). Não quebra, mas é carga repetida.
- Arquivos acima de ~300 linhas (sugerir divisão antes de crescerem): `agenda-linhas.js` (415), `auth-guard.js` (376), `proposta-zap.js` (439), `transp-docs.js` (308), `transp-render.js` (374).
- `menu.js` é a lista única dos links da topbar: página nova entra lá (nada de links digitados à mão).
- Mudou VERSAO_SISTEMA? Fica em `helpers.js`.
