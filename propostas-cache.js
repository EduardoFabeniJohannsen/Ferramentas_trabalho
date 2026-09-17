// ======================================
// PROPOSTAS - CACHE
// ======================================
// Salva sozinho no navegador (localStorage) pra não perder
// nada se a página recarregar ou o navegador travar.
// Só cobre "Gerar Textos" e "Calcular Desconto" — o card
// de Agendamento não entra nisso.
// Depende de helpers.js, propostas-csv.js, propostas-
// equipamentos.js, propostas-desconto.js e propostas-toggles.js
// (precisam vir carregados antes).

const CHAVE_CACHE_PROPOSTA = "propostaCache";


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

    const equipamentos =
        Array.isArray(dados.equipamentos)
            ? dados.equipamentos
            : [];

    if(!equipamentos.length) return;

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

        linha.querySelector(".equipamento").value = equip.modelo || "";
        linha.querySelector(".quantidadeEquipamento").value = equip.quantidade || "1";
    });

    // dispara o fluxo normal, que cria os blocos de desconto
    // com os valores automáticos de tabela
    gerarTextos();
    mostrarFretes();

    // agora repõe o que era manual em cada bloco, na mesma ordem
    const blocos =
        document.querySelectorAll(".desconto-item");

    equipamentos.forEach((equip, index) => {

        const bloco = blocos[index];

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
