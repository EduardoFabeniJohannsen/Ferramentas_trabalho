# Mapa dos arquivos

Sem build e sem módulos: cada página carrega os scripts na ordem abaixo (variáveis e funções são globais).
Para editar algo, abra só o arquivo da responsabilidade certa. O `*-init.js` é sempre o último da página.

## Ordem de carregamento por página

**index.html**: supabase-config → auth-guard → helpers → status → index-ferramentas → menu

**propostas.html**: supabase-config → auth-guard → helpers → busca-fretes → status → menu → propostas-estado → propostas-tabelas-precos → propostas-tabelas-fretes → propostas-avisos → propostas-equipamentos → propostas-valor-tabela → propostas-fretes-painel → propostas-desconto → propostas-desconto-calculo → propostas-cache → propostas-config → proposta-zap → propostas-textos → proposta-zap → propostas-init

**agenda.html**: supabase-config → auth-guard → helpers → menu → agenda-config → agenda-utils → agenda-banco → agenda-filtros → agenda-filtro-datas → agenda-filtro-status → agenda-ordem → agenda-render → agenda-linhas → agenda-colunas → agenda-tema → agenda-zap → agenda-transportadoras → agenda-motoristas → agenda-form-campos → agenda-rascunho → agenda-modal → agenda-salvar → agenda-coleta → agenda-init

**estoque.html**: supabase-config → auth-guard → helpers → menu → estoque-config → estoque-parser → estoque-grupos → estoque-render → estoque-dados → estoque-upload → estoque-init

**tabelas.html**: supabase-config → auth-guard → helpers → menu → tabelas-config → tabelas-dados → tabelas-desenho → tabelas-editor → tabelas-init

**WEG.html**: supabase-config → auth-guard → helpers → menu → weg-dados → weg-documento → weg-cache → weg-email → weg-init

**admin.html**: supabase-config → auth-guard → helpers → menu → admin-config → admin-dados → admin-tela → admin-init

## Arquivos (responsabilidade e funções)

- `admin-config.js` (42 linhas): Acessos e filiais que o admin pode liberar; estado da tela.
- `admin-dados.js` (102 linhas): Ler e salvar os perfis (tabela perfis) e criar usuário (Edge Function criar-usuario).
  - carregarPerfisAdmin, salvarPerfilAdmin, criarUsuarioAdmin
- `admin-init.js` (30 linhas): Ligações iniciais. Sempre o ÚLTIMO script da página.
- `admin-tela.js` (229 linhas): Tabela de usuários com caixinhas de acesso e filial e o formulário de novo usuário.
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
- `agenda-linhas.js` (415 linhas): Montagem de cada linha/célula da tabela, cabeçalho e seletor de status.
  - criarBlocoLocal, criarSeletorStatus, criarCelula, criarCelulasAgenda, criarCabecalhoAgenda, criarItemAgenda
- `agenda-modal.js` (214 linhas): Abrir e fechar o formulário, descartar rascunho, excluir pelo modal.
  - abrirModalAgenda, atualizarCamposConta, fecharModalAgenda, encerrarModalAgenda, descartarRascunho, excluirAgendamentoAberto
- `agenda-motoristas.js` (255 linhas): Carregar, adicionar e excluir motoristas; modal de cadastro.
  - carregarMotoristas, motoristasDe, atualizarOpcoesMotorista, abrirModalMotoristas, fecharModalMotoristas, desenharMotoristas, adicionarMotorista, excluirMotorista
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
- `auth-guard.js` (376 linhas): Login obrigatório, perfil/permissões do usuário e bloqueio de página sem acesso. Carregado logo depois do supabase-config.
  - existeLoginSalvo, ehAdmin, carregarPerfil, buscarPerfil, salvarPerfilCache, lerPerfilCache, temAcesso, temFilial, recursoDaPagina, nomeArquivoAtual, sairDoSistema, liberarPaginaAtual, fazerLogout
- `busca-fretes.js` (74 linhas): TABELAS_FRETES e buscarLinhasFretes().
  - buscarLinhasFretes
- `estoque-config.js` (94 linhas): Status, tipos, listas fixas, filiais e estado.
- `estoque-dados.js` (101 linhas): Carregar resumo publicado e trocar de filial.
  - carregarResumoPublicado, atualizarFilialNaTela, trocarFilial
- `estoque-grupos.js` (107 linhas): Agrupa modelos por tipo para cada status.
  - prefixoDoModelo, alturaDoModelo, ordenarModelos, montarGrupos
- `estoque-init.js` (86 linhas): Ligações iniciais e filiais liberadas pro usuário. Sempre o ÚLTIMO script da página.
- `estoque-parser.js` (296 linhas): Relatório bruto -> resumo (resumirEstoque).
  - normalizarTexto, modeloDoPatrimonio, formatarPrevisao, resumirEstoque
- `estoque-render.js` (179 linhas): HTML dos cards de status e avisos.
  - escaparHtml, htmlItemModelo, desenharResumo, formatarDataHora, mostrarAvisosEstoque, mostrarPublicado
- `estoque-upload.js` (123 linhas): Ler o Excel, prévia e publicar.
  - lerArquivo, cancelarPrevia, publicarResumo
- `helpers.js` (178 linhas): Versão do sistema, $, formatadores, copiar() e mostrarToast().
- `index-ferramentas.js` (274 linhas): Ferramentas da página inicial.
  - maiusculo, minusculo, formatarCNPJ, calcularBoletos, calcularDiasPersonalizados
- `menu.js` (94 linhas): Links da topbar (lista única de páginas), só as liberadas pro usuário; Admin só pra admin.
- `proposta-zap.js` (428 linhas): copiarPropostaZap(): mensagem completa para WhatsApp.
  - copiarPropostaZap
- `propostas-avisos.js` (129 linhas): Avisos de falha/offline e datalists de equipamentos e cidades.
  - mostrarAvisoDadosSalvos, avisarFalhaCarregamento, preencherListaEquipamentos, preencherListaCidades
- `propostas-cache.js` (285 linhas): Salva/restaura o preenchimento no navegador e limpa a tela.
  - salvarCache, restaurarCache, limparTudo
- `propostas-config.js` (230 linhas): Locação complementar, diária, emojis, cidade de saída, linha em branco e modal da engrenagem.
  - alternarLocacaoComplementar, atualizarBotaoLocacaoComplementar, alternarValorDiaria, atualizarBotaoValorDiaria, alternarEmojis, atualizarBotaoEmojis, alternarCidadeSaida, atualizarBotaoCidadeSaida, alternarSepararPagamento, atualizarBotaoSepararPagamento, abrirConfiguracoes, fecharConfiguracoes
- `propostas-desconto-calculo.js` (191 linhas): Cálculo por % ou valor desejado, valor final e eventos de input.
  - calcularDescontoBloco, atualizarValorFinalProposta
- `propostas-desconto.js` (170 linhas): Desenha e atualiza o bloco de desconto de cada equipamento.
  - htmlPlaceholderDesconto, renderizarDescontosPorEquipamento
- `propostas-equipamentos.js` (286 linhas): obterEquipamentos(), adicionar/remover linha e eventos.
  - obterEquipamentos, adicionarEquipamento, removerEquipamento, configurarEventosEquipamentos
- `propostas-estado.js` (64 linhas): Variáveis das tabelas carregadas, normalizarModelo() e normalizarCidade().
  - normalizarModelo, normalizarCidade
- `propostas-fretes-painel.js` (144 linhas): mostrarFretes(): fretes encontrados por transportadora.
  - mostrarFretes
- `propostas-init.js` (105 linhas): Carrega tabelas e liga eventos. Sempre o ÚLTIMO script da página.
- `propostas-tabelas-fretes.js` (151 linhas): Carregamento de tabela_fretes (só com a permissão "fretes").
  - processarLinhasFretes, carregarFretes
- `propostas-tabelas-precos.js` (191 linhas): Cópia offline (localStorage) e carregamento de tabela_precos.
  - salvarCopiaTabela, lerCopiaTabela, processarLinhasPrecos, carregarTabela
- `propostas-textos.js` (161 linhas): Oportunidade e proposta ZOHO, copiarTexto().
  - gerarTextos, copiarTexto
- `propostas-valor-tabela.js` (115 linhas): Busca o valor de tabela de cada equipamento para o período.
  - preencherValorTabela
- `status.js` (115 linhas): obterCidadeSaida() e gerarStatus() (botões Autorizado, ICMS, Frete ZOHO).
  - obterCidadeSaida, gerarStatus
- `tabelas-config.js` (109 linhas): Definição das tabelas editáveis (recurso = permissão necessária) e estado.
- `tabelas-dados.js` (115 linhas): tratarValor() e carregarLinhasTabela().
  - tratarValor, carregarLinhasTabela
- `tabelas-desenho.js` (242 linhas): desenharTabela() e matriz de consulta.
  - criarCampo, desenharTabela, desenharMatriz
- `tabelas-editor.js` (292 linhas): Linhas editáveis, salvar, adicionar e excluir.
  - criarLinhaTabela, criarLinhaNova, salvarCampo, adicionarLinha, excluirLinha
- `tabelas-init.js` (101 linhas): Alternar consulta/edição e início. Sempre o ÚLTIMO script da página.
  - atualizarModo, alternarModoEdicao
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

- `style.css`: base comum (inalterado)
- `admin.css`: estilos da página de usuários e acessos
- `propostas.css`, `estoque.css`, `tabelas.css`: estilos que ficavam dentro do HTML de cada página
- `agenda.css`, `agenda-modal.css`, `agenda-tema-claro.css`: estilos da agenda (lista / formulários e modais / fundo claro)

## Supabase (Edge Functions)

- `supabase/functions/criar-usuario/index.ts`: cria usuário (e-mail + senha, já confirmado). Só admin chama; a service_role fica nos segredos do Supabase, nunca no frontend. O trigger `ao_criar_usuario` cria o perfil só com "propostas". Cópia do código publicado no Supabase; não é carregada pelo site.
