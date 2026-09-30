// ======================================
// PROPOSTAS - DADOS
// ======================================
// Carregamento de tabela/frete, gestão de equipamentos
// e cálculo de desconto por equipamento.
// Depende de helpers.js (precisa vir carregado antes).

// ======================================
// TABELAS
// ======================================

let tabelaPrecos = {};

let tabelasFrete = {};

// nome "bonito" de cada cidade (chave normalizada -> nome pra datalist)
let nomesCidades = {};

// Avisos de falha no carregamento (vazio = tudo certo).
// Aparecem na tela pra não parecer que o modelo/cidade não existe.
let erroTabelaPrecos = "";

let erroTabelaFretes = "";

// A linha fixa do HTML já nasce com data-equip-id="1"
let proximoEquipId = 2;


// ======================================
// NORMALIZAR MODELO
// ======================================

function normalizarModelo(valor){

    return String(valor || "")
        .replace(/\uFEFF/g, "")
        .trim()
        .toUpperCase();
}


// ======================================
// NORMALIZAR CIDADE
// ======================================
// Maiúsculas, sem acento e sem espaço sobrando:
// "Itajaí " e "ITAJAI" viram a mesma chave.

function normalizarCidade(valor){

    return String(valor || "")
        .replace(/\uFEFF/g, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}


// ======================================
// CÓPIA OFFLINE DAS TABELAS
// ======================================
// Depois que as tabelas carregam 1x do Supabase, uma cópia
// fica salva no navegador (localStorage). Se a internet cair
// (ou o Supabase não responder), o sistema usa essa cópia.

const CHAVE_CACHE_TABELA_PRECOS = "cacheTabelaPrecos";

const CHAVE_CACHE_TABELA_FRETES = "cacheTabelaFretes";

// Data/hora (ISO) da cópia que está sendo usada.
// Vazio = dados atuais, direto do Supabase.
let tabelaPrecosSalvaEm = "";

let tabelaFretesSalvaEm = "";


function salvarCopiaTabela(chave, linhas){

    try{

        localStorage.setItem(
            chave,
            JSON.stringify({
                salvoEm: new Date().toISOString(),
                linhas: linhas
            })
        );

    }catch(erro){

        console.error(
            `[${chave}] Erro ao salvar cópia offline:`,
            erro
        );
    }
}


function lerCopiaTabela(chave){

    try{

        const salvo =
            localStorage.getItem(chave);

        if(!salvo) return null;

        const copia =
            JSON.parse(salvo);

        if(
            !copia ||
            !Array.isArray(copia.linhas) ||
            !copia.linhas.length
        ){
            return null;
        }

        return copia;

    }catch(erro){

        console.error(
            `[${chave}] Cópia offline inválida, ignorando:`,
            erro
        );

        return null;
    }
}


// ======================================
// CARREGAR TABELA DE PREÇOS
// ======================================

function processarLinhasPrecos(linhas){

    tabelaPrecos = {};

    linhas.forEach(linha => {

        const modelo =
            normalizarModelo(linha.modelo);

        if (!modelo) return;

        if (!tabelaPrecos[modelo]) {
            tabelaPrecos[modelo] = {};
        }

        const valor = Number(linha.valor);

        if (!isNaN(valor)) {
            tabelaPrecos[modelo][linha.dias] = valor;
        }
    });
}


async function carregarTabela() {

    erroTabelaPrecos = "";

    tabelaPrecosSalvaEm = "";

    try {

        const { data, error } =
            await supabaseClient
                .from("tabela_precos")
                .select("modelo, dias, valor");

        if (error) {
            throw error;
        }

        processarLinhasPrecos(data);

        const totalModelos =
            Object.keys(tabelaPrecos).length;

        // Sem erro mas sem nenhuma linha: quase sempre é
        // login/permissão (RLS) bloqueando, ou tabela vazia.
        if (!totalModelos) {

            erroTabelaPrecos =
                "Tabela de preços vazia (verifique login/permissões)";

            console.warn(
                "[tabela_precos] Nenhuma linha retornada"
            );

        }else{

            // deu certo: atualiza a cópia offline
            salvarCopiaTabela(
                CHAVE_CACHE_TABELA_PRECOS,
                data
            );

            console.log(
                `[tabela_precos] ${data.length} linhas, ${totalModelos} modelos carregados`
            );
        }

    } catch (erro) {

        console.error(
            "[tabela_precos] Falha ao carregar:",
            {
                mensagem: erro?.message,
                codigo: erro?.code,
                detalhes: erro?.details,
                dica: erro?.hint
            }
        );

        // sem internet/servidor: tenta a cópia salva no navegador
        const copia =
            lerCopiaTabela(CHAVE_CACHE_TABELA_PRECOS);

        if (copia) {

            processarLinhasPrecos(copia.linhas);

            tabelaPrecosSalvaEm = copia.salvoEm;

            console.warn(
                `[tabela_precos] Usando cópia salva em ${copia.salvoEm}`
            );

        }else{

            tabelaPrecos = {};

            erroTabelaPrecos =
                "Tabela de preços não carregada (verifique conexão/login)";
        }
    }

    preencherListaEquipamentos();
}


// ======================================
// CARREGAR FRETES
// ======================================

function processarLinhasFretes(linhas){

    tabelasFrete = {};

    nomesCidades = {};

    linhas.forEach(linha => {

        const transportador =
            linha.transportadora;

        const modelo =
            normalizarModelo(linha.modelo);

        const cidade =
            normalizarCidade(linha.cidade);

        if(!modelo || !cidade) return;

        if(!tabelasFrete[transportador]){
            tabelasFrete[transportador] = {};
        }

        if(!tabelasFrete[transportador][modelo]){
            tabelasFrete[transportador][modelo] = {};
        }

        tabelasFrete[transportador][modelo][cidade] =
            linha.valor;

        nomesCidades[cidade] =
            String(linha.cidade)
                .trim()
                .replace(/\s+/g, " ")
                .toUpperCase();
    });
}


async function carregarFretes(){

    erroTabelaFretes = "";

    tabelaFretesSalvaEm = "";

    try{

        const { data, error } =
            await supabaseClient
                .from("tabela_fretes")
                .select("transportadora, modelo, cidade, valor");

        if(error){
            throw error;
        }

        processarLinhasFretes(data);

        // Sem erro mas sem nenhuma linha: quase sempre é
        // login/permissão (RLS) bloqueando, ou tabela vazia.
        if(!Object.keys(tabelasFrete).length){

            erroTabelaFretes =
                "Tabela de fretes vazia (verifique login/permissões)";

            console.warn(
                "[tabela_fretes] Nenhuma linha retornada"
            );

        }else{

            // deu certo: atualiza a cópia offline
            salvarCopiaTabela(
                CHAVE_CACHE_TABELA_FRETES,
                data
            );

            console.log(
                `[tabela_fretes] ${data.length} linhas, ${Object.keys(tabelasFrete).length} transportadoras, ${Object.keys(nomesCidades).length} cidades carregadas`
            );
        }

    }catch(erro){

        console.error(
            "[tabela_fretes] Falha ao carregar:",
            {
                mensagem: erro?.message,
                codigo: erro?.code,
                detalhes: erro?.details,
                dica: erro?.hint
            }
        );

        // sem internet/servidor: tenta a cópia salva no navegador
        const copia =
            lerCopiaTabela(CHAVE_CACHE_TABELA_FRETES);

        if(copia){

            processarLinhasFretes(copia.linhas);

            tabelaFretesSalvaEm = copia.salvoEm;

            console.warn(
                `[tabela_fretes] Usando cópia salva em ${copia.salvoEm}`
            );

        }else{

            tabelasFrete = {};

            nomesCidades = {};

            erroTabelaFretes =
                "Tabela de fretes não carregada (verifique conexão/login)";
        }
    }

    preencherListaCidades();
}


// ======================================
// AVISOS DO CARREGAMENTO
// ======================================
// Chamado pelo init depois de carregar as duas tabelas.
// Deixa o motivo visível na tela (faixa + toast + painéis)
// em vez de só no console.

function mostrarAvisoDadosSalvos(){

    const formatar = (iso) =>
        new Date(iso).toLocaleString(
            "pt-BR",
            { dateStyle: "short", timeStyle: "short" }
        );

    const partes = [];

    if(tabelaPrecosSalvaEm){
        partes.push(`preços (${formatar(tabelaPrecosSalvaEm)})`);
    }

    if(tabelaFretesSalvaEm){
        partes.push(`fretes (${formatar(tabelaFretesSalvaEm)})`);
    }

    let aviso =
        $("avisoDadosSalvos");

    if(!partes.length){

        if(aviso) aviso.remove();

        return;
    }

    if(!aviso){

        const container =
            document.querySelector(".container");

        if(!container) return;

        aviso =
            document.createElement("div");

        aviso.id = "avisoDadosSalvos";

        aviso.style.cssText =
            "width:100%;max-width:1100px;box-sizing:border-box;" +
            "text-align:center;padding:10px 14px;border-radius:8px;" +
            "background:#78350f;color:#fde68a;font-size:14px;";

        container.prepend(aviso);
    }

    aviso.innerText =
        `⚠️ Sem conexão com o servidor. Usando tabelas salvas no navegador: ${partes.join(" e ")}. Os valores podem estar desatualizados.`;
}


function avisarFalhaCarregamento(){

    mostrarAvisoDadosSalvos();

    if(
        !erroTabelaPrecos &&
        !erroTabelaFretes
    ){
        return;
    }

    mostrarToast(
        "Falha ao carregar dados — veja o aviso na tela",
        true
    );

    mostrarFretes();

    renderizarDescontosPorEquipamento([]);
}


// ======================================
// LISTAS DE SUGESTÃO (datalists)
// ======================================
// Geradas automaticamente a partir dos dados carregados,
// em vez de ficarem digitadas fixas no HTML.

function preencherListaEquipamentos(){

    const lista =
        $("listaEquipamentos");

    if(!lista) return;

    const modelos =
        Object.keys(tabelaPrecos).sort();

    lista.innerHTML =
        modelos
            .map(modelo => `<option value="${modelo}">`)
            .join("");
}


function preencherListaCidades(){

    const lista =
        $("listaCidades");

    if(!lista) return;

    // cidades de TODAS as transportadoras (nomesCidades é montado
    // em carregarFretes), com o nome original (com acento)
    const cidadesOrdenadas =
        Object.values(nomesCidades)
            .sort((a, b) => a.localeCompare(b, "pt-BR"));

    lista.innerHTML =
        cidadesOrdenadas
            .map(cidade => `<option value="${cidade}">`)
            .join("");
}


// ======================================
// PEGAR EQUIPAMENTOS
// ======================================

function obterEquipamentos(){

    const linhas =
        document.querySelectorAll(
            ".equipamento-linha"
        );


    const equipamentos = [];


    linhas.forEach(linha => {

        const campoModelo =
            linha.querySelector(
                ".equipamento"
            );


        const campoQuantidade =
            linha.querySelector(
                ".quantidadeEquipamento"
            );


        const modelo =
            normalizarModelo(
                campoModelo?.value
            );


        let quantidade =
            parseInt(
                campoQuantidade?.value,
                10
            );


        if(
            !Number.isFinite(quantidade) ||
            quantidade < 1
        ){
            quantidade = 1;
        }


        if(modelo){

            equipamentos.push({

                id: linha.dataset.equipId,

                modelo: modelo,

                quantidade: quantidade

            });
        }

    });


    return equipamentos;
}


// ======================================
// ADICIONAR EQUIPAMENTO
// ======================================

function adicionarEquipamento(){

    const lista =
        $("listaEquipamentosProposta");


    const div =
        document.createElement("div");


    div.className =
        "equipamento-linha";


    div.dataset.equipId =
        proximoEquipId++;


    div.innerHTML = `

        <input
            type="text"
            class="equipamento"
            placeholder="Equipamento"
            list="listaEquipamentos"
        >

        <input
            type="text"
            class="quantidadeEquipamento"
            value="1"
            inputmode="numeric"
            title="Quantidade"
        >

        <button
            type="button"
            class="btn-remover-equipamento"
            onclick="removerEquipamento(this)"
            title="Remover"
        >
            −
        </button>

        <button
            type="button"
            class="btn-add-equipamento"
            onclick="adicionarEquipamento()"
        >
            +
        </button>

    `;


    lista.appendChild(div);


    configurarEventosEquipamentos();


    // foco no novo equipamento
    div.querySelector(
        ".equipamento"
    ).focus();
}


// ======================================
// REMOVER EQUIPAMENTO
// ======================================

function removerEquipamento(botao){

    const linha =
        botao.closest(".equipamento-linha");

    if(!linha) return;

    const equipId =
        linha.dataset.equipId;

    const lista =
        $("listaEquipamentosProposta");

    const totalLinhas =
        lista.querySelectorAll(
            ".equipamento-linha"
        ).length;

    // Se for a única linha, só limpa os campos
    // em vez de remover (sempre precisa sobrar
    // pelo menos uma linha com o botão "+").
    if(totalLinhas <= 1){

        const campoModelo =
            linha.querySelector(".equipamento");

        const campoQuantidade =
            linha.querySelector(".quantidadeEquipamento");

        if(campoModelo) campoModelo.value = "";
        if(campoQuantidade) campoQuantidade.value = "1";

    }else{

        linha.remove();
    }

    // remove o bloco de desconto correspondente,
    // se existir
    const bloco =
        document.querySelector(
            `.desconto-item[data-equip-id="${equipId}"]`
        );

    if(bloco) bloco.remove();

    gerarTextos();

    mostrarFretes();

    salvarCache();
}


// ======================================
// CONFIGURAR EVENTOS DOS EQUIPAMENTOS
// ======================================

function configurarEventosEquipamentos(){

    const campos =
        document.querySelectorAll(
            ".equipamento, .quantidadeEquipamento"
        );


    campos.forEach(campo => {

        if(campo.dataset.evento === "1"){
            return;
        }


        campo.dataset.evento = "1";


        campo.addEventListener(
            "input",
            () => {

                gerarTextos();

                mostrarFretes();

            }
        );

    });


    // Valida quantidade ao sair do campo: se não for
    // um número inteiro >= 1, corrige pra 1 na tela
    // (evita total travado em NaN sem o usuário notar).

    const camposQuantidade =
        document.querySelectorAll(
            ".quantidadeEquipamento"
        );


    camposQuantidade.forEach(campo => {

        if(campo.dataset.eventoBlur === "1"){
            return;
        }


        campo.dataset.eventoBlur = "1";


        campo.addEventListener(
            "blur",
            () => {

                const numero =
                    parseInt(campo.value, 10);

                if(
                    !Number.isFinite(numero) ||
                    numero < 1
                ){

                    campo.value = "1";

                    gerarTextos();

                    mostrarFretes();
                }

            }
        );

    });
}


// ======================================
// PREENCHER VALOR TABELA
// ======================================

function preencherValorTabela() {

    const periodo =
        $("periodo")?.value.trim();

    const diasNumero = Number(periodo);

    let diasBusca = periodo;

    if (
        diasNumero > 30 &&
        diasNumero % 30 === 0
    ) {
        diasBusca = "30";
    }

    const diasValidos = [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "10",
        "14",
        "15",
        "21",
        "28",
        "30"
    ];

    const periodoValido =
        periodo &&
        diasValidos.includes(diasBusca);

    // Usa obterEquipamentos(), a mesma fonte usada por
    // gerarTextos() e mostrarFretes(), pra que TODA linha
    // de equipamento (fixa ou adicionada com "+") entre
    // no cálculo aqui também.

    const equipamentos =
        obterEquipamentos();

    const dadosPorEquipamento =
        equipamentos.map((equipamento) => {

            // tabela não carregou: mostra o motivo real
            if (erroTabelaPrecos) {

                return {
                    ...equipamento,
                    valorTabela: null,
                    erro: erroTabelaPrecos
                };
            }

            if (!periodoValido) {

                return {
                    ...equipamento,
                    valorTabela: null,
                    erro: "Informe um período válido"
                };
            }

            const tabelaModelo =
                tabelaPrecos[equipamento.modelo];

            if (!tabelaModelo) {

                return {
                    ...equipamento,
                    valorTabela: null,
                    erro: `Modelo ${equipamento.modelo} não encontrado`
                };
            }

            const valorUnitario =
                tabelaModelo[diasBusca];

            if (
                valorUnitario === undefined ||
                valorUnitario === null ||
                isNaN(valorUnitario)
            ) {

                return {
                    ...equipamento,
                    valorTabela: null,
                    erro: `Período ${diasBusca} dias não encontrado para ${equipamento.modelo}`
                };
            }

            return {
                ...equipamento,
                valorTabela: valorUnitario * equipamento.quantidade,
                erro: null
            };
        });

    renderizarDescontosPorEquipamento(
        dadosPorEquipamento
    );
}


// ======================================
// FRETES
// ======================================

function mostrarFretes(){

    const modelos =
        obterEquipamentos();


    const cidade =
        normalizarCidade(
            $("cidade")?.value
        );


    // tabela de fretes não carregou: mostra o motivo
    if(erroTabelaFretes){

        if($("resultadoFretes")){

            $("resultadoFretes").innerHTML =
                `<span style="color:#ef4444">⚠️ ${erroTabelaFretes}</span>`;
        }

        return;
    }


    if(
        !modelos.length ||
        !cidade
    ){

        if($("resultadoFretes")){

            $("resultadoFretes").innerHTML =
                "Nenhum frete consultado";
        }

        return;
    }


    let html = "";


    for(
        const equipamento
        of modelos
    ){

        html += `
            <div class="frete-item">
                <strong>
                    ${equipamento.quantidade > 1
                        ? equipamento.quantidade + " "
                        : ""
                    }${equipamento.modelo}
                </strong>
                <br>
            `;


        const resultadosFrete = [];

        for(
            const transportador
            in tabelasFrete
        ){

            const modeloTabela =
                tabelasFrete[
                    transportador
                ][
                    equipamento.modelo
                ];


            if(!modeloTabela){

                resultadosFrete.push({
                    valorNumerico: null,
                    html: `⚠️ ${transportador}: modelo não encontrado<br>`
                });

                continue;
            }


            const valor =
                modeloTabela[cidade];


            if(
                valor === undefined ||
                valor === ""
            ){

                resultadosFrete.push({
                    valorNumerico: null,
                    html: `⚠️ ${transportador}: cidade não encontrada<br>`
                });

            }else{

                resultadosFrete.push({
                    valorNumerico: brToNumber(valor),
                    html: `✅ ${transportador}: R$ ${valor}<br>`
                });
            }

        }

        // maior valor primeiro; avisos/erros ficam no final
        resultadosFrete.sort((a, b) => {

            if(a.valorNumerico === null && b.valorNumerico === null) return 0;
            if(a.valorNumerico === null) return 1;
            if(b.valorNumerico === null) return -1;

            return b.valorNumerico - a.valorNumerico;
        });

        resultadosFrete.forEach(item => {
            html += item.html;
        });


        html += `
            </div>
        `;
    }


    $("resultadoFretes").innerHTML =
        html;
}


// ======================================
// DESCONTO POR EQUIPAMENTO
// ======================================

function htmlPlaceholderDesconto(){

    if(erroTabelaPrecos){

        return `
            <p class="desconto-placeholder" style="color:#ef4444">
                ⚠️ ${erroTabelaPrecos}
            </p>
        `;
    }

    return `
        <p class="desconto-placeholder" style="color:#94a3b8">
            Adicione um equipamento e o período pra calcular.
        </p>
    `;
}


function renderizarDescontosPorEquipamento(dadosPorEquipamento){

    const lista =
        $("listaDescontosEquipamentos");

    if(!lista) return;

    if(!dadosPorEquipamento.length){

        lista.innerHTML =
            htmlPlaceholderDesconto();

        $("valorFinalProposta").innerText = "";

        return;
    }

    // remove bloco de qualquer equipamento que já não existe mais
    lista.querySelectorAll(".desconto-item").forEach(bloco => {

        const aindaExiste =
            dadosPorEquipamento.some(
                equip => String(equip.id) === bloco.dataset.equipId
            );

        if(!aindaExiste) bloco.remove();
    });

    // remove a mensagem inicial de placeholder, se ainda estiver lá
    const placeholder =
        lista.querySelector(".desconto-placeholder");

    if(placeholder) placeholder.remove();

    dadosPorEquipamento.forEach(equipamento => {

        let bloco =
            lista.querySelector(
                `.desconto-item[data-equip-id="${equipamento.id}"]`
            );

        // cria o bloco na primeira vez que esse equipamento aparece;
        // se já existe, só atualiza (preserva o desconto já digitado)
        if(!bloco){

            bloco =
                document.createElement("div");

            bloco.className = "desconto-item";
            bloco.dataset.equipId = equipamento.id;

            bloco.innerHTML = `
                <p class="desconto-item-titulo"></p>
                <input type="text" class="descValorTabela" placeholder="Valor tabela">
                <input type="text" class="descValorDesejado" placeholder="Valor desejado">
                <input type="text" class="descPercentual" placeholder="% desconto">
                <p class="desconto-item-erro"></p>
                <p class="desconto-item-resultado"></p>
            `;

            lista.appendChild(bloco);
        }

        const titulo =
            (equipamento.quantidade > 1
                ? equipamento.quantidade + "x "
                : ""
            ) + equipamento.modelo;

        bloco.querySelector(".desconto-item-titulo").innerText =
            titulo;

        const campoValorTabela =
            bloco.querySelector(".descValorTabela");

        // Se o modelo dessa linha mudou (virou outro equipamento),
        // qualquer edição manual anterior perde o sentido — reseta.
        if(bloco.dataset.modeloRastreado !== equipamento.modelo){

            bloco.dataset.modeloRastreado = equipamento.modelo;
            bloco.dataset.editadoManual = "";
        }

        if(equipamento.erro){

            bloco.querySelector(".desconto-item-erro").innerHTML =
                `<span style="color:#ef4444">${equipamento.erro}</span>`;

            bloco.querySelector(".desconto-item-resultado").innerHTML = "";

            campoValorTabela.value = "";
            bloco.dataset.valorTabela = "";
            bloco.dataset.valorFinal = "";

        }else{

            bloco.querySelector(".desconto-item-erro").innerHTML = "";

            // Só sobrescreve o campo se o usuário NÃO tiver editado
            // manualmente — assim uma edição digitada nunca é apagada
            // sozinha quando outra coisa na tela muda.
            if(bloco.dataset.editadoManual !== "1"){

                campoValorTabela.value =
                    formatarMoedaBR(equipamento.valorTabela);
            }

            bloco.dataset.valorTabela =
                brToNumber(campoValorTabela.value);

            calcularDescontoBloco(bloco);
        }
    });

    // mantém os blocos na mesma ordem das linhas de equipamento
    // (uma linha que ganhou modelo depois não fica no fim da lista)
    const ordemAtual =
        Array.from(lista.querySelectorAll(".desconto-item"))
            .map(bloco => bloco.dataset.equipId)
            .join(",");

    const ordemDesejada =
        dadosPorEquipamento
            .map(equip => String(equip.id))
            .join(",");

    if(ordemAtual !== ordemDesejada){

        dadosPorEquipamento.forEach(equip => {

            const bloco =
                lista.querySelector(
                    `.desconto-item[data-equip-id="${equip.id}"]`
                );

            if(bloco) lista.appendChild(bloco);
        });
    }

    atualizarValorFinalProposta();
}


function calcularDescontoBloco(bloco){

    const valorTabela =
        Number(bloco.dataset.valorTabela);

    const resultado =
        bloco.querySelector(".desconto-item-resultado");

    if(
        !Number.isFinite(valorTabela) ||
        valorTabela <= 0
    ){
        resultado.innerHTML = "";
        bloco.dataset.valorFinal = "";
        atualizarValorFinalProposta();
        return;
    }

    const campoDesejado =
        bloco.querySelector(".descValorDesejado");

    const campoPercentual =
        bloco.querySelector(".descPercentual");

    const desejadoTexto =
        campoDesejado.value.trim();

    const percentualTexto =
        campoPercentual.value.trim();


    // ==================================
    // OPÇÃO 1 — USUÁRIO DIGITOU %
    // ==================================

    if(percentualTexto){

        const percentual =
            brToNumber(percentualTexto);

        if(
            Number.isFinite(percentual) &&
            percentual >= 0 &&
            percentual <= 100
        ){

            const valorDesconto =
                valorTabela * (percentual / 100);

            const valorFinal =
                valorTabela - valorDesconto;

            campoDesejado.value =
                formatarMoedaBR(valorFinal);

            resultado.innerHTML = `
                Desconto: <strong>R$ ${formatarNumeroPonto(valorDesconto)}</strong>
                <br>
                <span style="color:#94a3b8">
                    ${percentual.toFixed(2)}% → R$ ${formatarMoedaBR(valorFinal)}
                </span>
            `;

            bloco.dataset.valorFinal = valorFinal;
            atualizarValorFinalProposta();
            return;
        }
    }


    // ==================================
    // OPÇÃO 2 — USUÁRIO DIGITOU VALOR FINAL
    // ==================================

    if(desejadoTexto){

        const valorDesejado =
            brToNumber(desejadoTexto);

        if(
            Number.isFinite(valorDesejado) &&
            valorDesejado > 0
        ){

            const valorDesconto =
                valorTabela - valorDesejado;

            const percentual =
                (valorDesconto / valorTabela) * 100;

            resultado.innerHTML = `
                Desconto: <strong>R$ ${formatarNumeroPonto(valorDesconto)}</strong>
                <br>
                <span style="color:#94a3b8">
                    Desconto de ${percentual.toFixed(2)}%
                </span>
            `;

            bloco.dataset.valorFinal = valorDesejado;
            atualizarValorFinalProposta();
            return;
        }
    }


    // sem desconto informado: valor final = valor de tabela
    resultado.innerHTML = "";
    bloco.dataset.valorFinal = valorTabela;
    atualizarValorFinalProposta();
}


function atualizarValorFinalProposta(){

    const blocos =
        document.querySelectorAll(".desconto-item");

    let total = 0;
    let algumValido = false;

    blocos.forEach(bloco => {

        const valorFinal =
            Number(bloco.dataset.valorFinal);

        if(
            Number.isFinite(valorFinal) &&
            valorFinal > 0
        ){
            total += valorFinal;
            algumValido = true;
        }
    });

    const campo = $("valorFinalProposta");

    if(campo){

        campo.innerText =
            algumValido
                ? "R$ " + formatarMoedaBR(total)
                : "";
    }
}


// Delegação de evento: digitar % ou valor desejado em
// QUALQUER bloco de desconto recalcula só aquele bloco,
// sem mexer nos outros.

document.addEventListener("input", (evento) => {

    if(evento.target.classList.contains("descValorTabela")){

        const bloco =
            evento.target.closest(".desconto-item");

        // marca como editado manualmente, pra não ser
        // sobrescrito na próxima recontagem automática
        bloco.dataset.editadoManual = "1";

        bloco.dataset.valorTabela =
            brToNumber(evento.target.value);

        calcularDescontoBloco(bloco);

    }else if(evento.target.classList.contains("descPercentual")){

        const bloco =
            evento.target.closest(".desconto-item");

        bloco.querySelector(".descValorDesejado").value = "";

        calcularDescontoBloco(bloco);

    }else if(evento.target.classList.contains("descValorDesejado")){

        const bloco =
            evento.target.closest(".desconto-item");

        bloco.querySelector(".descPercentual").value = "";

        calcularDescontoBloco(bloco);
    }
});


// ======================================
// CACHE (Gerar Textos + Calcular Desconto)
// ======================================
// Salva sozinho no navegador (localStorage) pra não perder
// nada se a página recarregar ou o navegador travar.
// Só cobre "Gerar Textos" e "Calcular Desconto".

const CHAVE_CACHE_PROPOSTA = "propostaCache";


// ======================================
// LOCAÇÃO COMPLEMENTAR (toggle)
// ======================================
// Desativado por padrão. Quando ativado, muda o cálculo
// da mensagem "Copiar Proposta Zap" (ver copiarPropostaZap
// em propostas-textos.js).

let locacaoComplementarAtiva = false;


function alternarLocacaoComplementar(){

    locacaoComplementarAtiva = !locacaoComplementarAtiva;

    atualizarBotaoLocacaoComplementar();

    salvarCache();
}


function atualizarBotaoLocacaoComplementar(){

    const botao = $("btnLocacaoComplementar");

    if(!botao) return;

    botao.classList.toggle(
        "ativo",
        locacaoComplementarAtiva
    );

    botao.innerText =
        `Locação complementar: ${
            locacaoComplementarAtiva ? "Ativada" : "Desativada"
        }`;
}


// ======================================
// VALOR DA DIÁRIA (toggle)
// ======================================
// Desativado por padrão. Quando ativado, mostra a diária
// (valor da locação ÷ dias do período) ao lado do valor
// da locação na mensagem "Copiar Proposta Zap".

let valorDiariaAtivo = false;


function alternarValorDiaria(){

    valorDiariaAtivo = !valorDiariaAtivo;

    atualizarBotaoValorDiaria();

    salvarCache();
}


function atualizarBotaoValorDiaria(){

    const botao = $("btnValorDiaria");

    if(!botao) return;

    botao.classList.toggle(
        "ativo",
        valorDiariaAtivo
    );

    botao.innerText =
        `Valor da diária: ${
            valorDiariaAtivo ? "Ativada" : "Desativada"
        }`;
}


// ======================================
// EMOJIS (toggle)
// ======================================
// Ativado por padrão (mensagem original). Desativado,
// a mensagem "Copiar Proposta Zap" sai sem emojis
// (mantém só 🟡 e 🚚).

let emojisAtivo = true;


function alternarEmojis(){

    emojisAtivo = !emojisAtivo;

    atualizarBotaoEmojis();

    salvarCache();
}


function atualizarBotaoEmojis(){

    const botao = $("btnEmojis");

    if(!botao) return;

    botao.classList.toggle(
        "ativo",
        emojisAtivo
    );

    botao.innerText =
        `Emojis: ${
            emojisAtivo ? "Ativado" : "Desativado"
        }`;
}


// ======================================
// MODAL DE CONFIGURAÇÕES (engrenagem)
// ======================================
// Abre/fecha o modal que guarda os toggles
// (locação complementar, valor da diária, emojis).

function abrirConfiguracoes(){

    const modal = $("modalConfig");

    if(modal) modal.classList.add("aberto");
}


function fecharConfiguracoes(){

    const modal = $("modalConfig");

    if(modal) modal.classList.remove("aberto");
}


document.addEventListener("keydown", (evento) => {

    if(evento.key === "Escape"){
        fecharConfiguracoes();
    }
});


function salvarCache(){

    const equipamentos = [];

    document.querySelectorAll(".equipamento-linha").forEach(linha => {

        const bloco =
            document.querySelector(
                `.desconto-item[data-equip-id="${linha.dataset.equipId}"]`
            );

        equipamentos.push({

            modelo:
                linha.querySelector(".equipamento")?.value || "",

            quantidade:
                linha.querySelector(".quantidadeEquipamento")?.value || "1",

            valorTabelaManual:
                bloco?.dataset.editadoManual === "1"
                    ? bloco.querySelector(".descValorTabela")?.value || ""
                    : "",

            percentual:
                bloco?.querySelector(".descPercentual")?.value || "",

            valorDesejado:
                bloco?.querySelector(".descValorDesejado")?.value || ""
        });
    });

    const dados = {

        nomeCliente: $("nomeCliente")?.value || "",
        periodo: $("periodo")?.value || "",
        cidade: $("cidade")?.value || "",
        valorFrete: $("valorFrete")?.value || "",
        locacaoComplementarAtiva: locacaoComplementarAtiva,
        valorDiariaAtivo: valorDiariaAtivo,
        emojisAtivo: emojisAtivo,
        equipamentos: equipamentos
    };

    try{

        localStorage.setItem(
            CHAVE_CACHE_PROPOSTA,
            JSON.stringify(dados)
        );

    }catch(erro){

        console.error("Erro ao salvar cache:", erro);
    }
}


function restaurarCache(){

    const salvo =
        localStorage.getItem(CHAVE_CACHE_PROPOSTA);

    if(!salvo) return;

    let dados;

    try{

        dados = JSON.parse(salvo);

    }catch(erro){

        console.error("Cache inválido, ignorando:", erro);
        return;
    }

    if($("nomeCliente")) $("nomeCliente").value = dados.nomeCliente || "";
    if($("periodo")) $("periodo").value = dados.periodo || "";
    if($("cidade")) $("cidade").value = dados.cidade || "";
    if($("valorFrete")) $("valorFrete").value = dados.valorFrete || "";

    locacaoComplementarAtiva = dados.locacaoComplementarAtiva === true;

    atualizarBotaoLocacaoComplementar();

    valorDiariaAtivo = dados.valorDiariaAtivo === true;

    atualizarBotaoValorDiaria();

    emojisAtivo = dados.emojisAtivo !== false;

    atualizarBotaoEmojis();

    const equipamentos =
        Array.isArray(dados.equipamentos)
            ? dados.equipamentos
            : [];

    if(!equipamentos.length) return;

    // guarda a linha de cada equipamento restaurado (pelo índice salvo)
    const linhasRestauradas = [];

    equipamentos.forEach((equip, index) => {

        let linha;

        if(index === 0){

            linha =
                document.querySelector(
                    '.equipamento-linha[data-equip-id="1"]'
                );

        }else{

            adicionarEquipamento();

            const todasLinhas =
                document.querySelectorAll(".equipamento-linha");

            linha = todasLinhas[todasLinhas.length - 1];
        }

        if(!linha) return;

        linhasRestauradas[index] = linha;

        linha.querySelector(".equipamento").value = equip.modelo || "";
        linha.querySelector(".quantidadeEquipamento").value = equip.quantidade || "1";
    });

    // dispara o fluxo normal, que cria os blocos de desconto
    // com os valores automáticos de tabela
    gerarTextos();
    mostrarFretes();

    // agora repõe o que era manual em cada bloco, achando o bloco
    // pelo id da linha (linha sem modelo não gera bloco, então
    // o índice sozinho não serve)
    equipamentos.forEach((equip, index) => {

        const linha = linhasRestauradas[index];

        if(!linha) return;

        const bloco =
            document.querySelector(
                `.desconto-item[data-equip-id="${linha.dataset.equipId}"]`
            );

        if(!bloco) return;

        if(equip.valorTabelaManual){

            bloco.dataset.editadoManual = "1";

            bloco.querySelector(".descValorTabela").value =
                equip.valorTabelaManual;

            bloco.dataset.valorTabela =
                brToNumber(equip.valorTabelaManual);
        }

        if(equip.percentual){

            bloco.querySelector(".descPercentual").value =
                equip.percentual;

        }else if(equip.valorDesejado){

            bloco.querySelector(".descValorDesejado").value =
                equip.valorDesejado;
        }

        calcularDescontoBloco(bloco);
    });

    atualizarValorFinalProposta();
}


// salva sozinho sempre que algo mudar dentro de
// "Gerar Textos" ou "Calcular Desconto"
document.addEventListener("input", (evento) => {

    const card =
        evento.target.closest(".card");

    if(!card) return;

    const ehGerarTextos =
        card.querySelector("#listaEquipamentosProposta");

    const ehDesconto =
        card.classList.contains("desconto-card");

    if(ehGerarTextos || ehDesconto){

        salvarCache();
    }
});


// ======================================
// LIMPAR TUDO
// ======================================

function limparTudo(){

    const confirmar =
        confirm(
            "Tem certeza que quer limpar tudo? Essa ação não pode ser desfeita."
        );

    if(!confirmar) return;

    if($("nomeCliente")) $("nomeCliente").value = "";
    if($("periodo")) $("periodo").value = "";
    if($("cidade")) $("cidade").value = "";
    if($("valorFrete")) $("valorFrete").value = "";

    // remove as linhas extras de equipamento, deixa só a primeira,
    // limpa ela
    document.querySelectorAll(".equipamento-linha").forEach((linha, index) => {

        if(index === 0){

            linha.querySelector(".equipamento").value = "";
            linha.querySelector(".quantidadeEquipamento").value = "1";

        }else{

            linha.remove();
        }
    });

    proximoEquipId = 2;

    if($("textoOportunidade")) $("textoOportunidade").innerText = "";
    if($("textoOrcamento")) $("textoOrcamento").innerText = "";

    if($("resultadoFretes")){

        $("resultadoFretes").innerHTML =
            "Nenhum frete consultado";
    }

    // reseta o card de desconto pro estado inicial
    renderizarDescontosPorEquipamento([]);

    localStorage.removeItem(CHAVE_CACHE_PROPOSTA);

    mostrarToast("Tudo limpo");
}