// ======================================
// PROPOSTAS - TEXTOS
// ======================================
// Geração dos textos/mensagens (ZOHO, Zap, agendamento,
// status) e o init() da página de propostas.
// Depende de helpers.js e propostas-dados.js (precisam
// vir carregados antes).

// ======================================
// TEXTOS AUTOMÁTICOS
// ======================================

function gerarTextos(){

    const nome =
        $("nomeCliente")?.value
            .toUpperCase()
            .trim();


    const equipamentos =
        obterEquipamentos();


    const cidade =
        $("cidade")?.value
            .toUpperCase()
            .trim();


    const periodoInput =
        $("periodo")?.value.trim();


    let periodo = "";


    if(periodoInput){

        if(isNaN(periodoInput)){

            periodo =
                periodoInput.toUpperCase();

        }else{

            const numero =
                Number(periodoInput);


            if(numero === 1){

                periodo =
                    "DIARIA";

            }else if(
                numero > 30 &&
                numero % 30 === 0
            ){

                periodo =
                    `${numero / 30} PERIODOS`;

            }else{

                periodo =
                    `${numero} DIAS`;
            }
        }
    }


    const hoje =
        formatarData(
            new Date()
        );


    // ==================================
    // OPORTUNIDADE
    // ==================================

    if(nome){

        $("textoOportunidade").innerText =
            `OPORTUNIDADE DE LOCAÇÃO_${nome}_${hoje}`;
    }


    // ==================================
    // ORÇAMENTO
    // ==================================

    if(
        nome &&
        equipamentos.length &&
        periodo &&
        cidade
    ){

        const modelosTexto =
            equipamentos
                .map(item => {

                    return (
                        item.quantidade > 1
                            ? `${item.quantidade} ${item.modelo}`
                            : item.modelo
                    );

                })
                .join(" + ");


        $("textoOrcamento").innerText =
            `${nome}_${modelosTexto}_${periodo}`;
    }


    preencherValorTabela();
}


// ======================================
// COPIAR TEXTO
// ======================================

function copiarTexto(id){

    const texto =
        $(id)?.innerText;


    if(!texto) return;


    copiar(texto);

    mostrarToast(
        "Copiado"
    );
}

// ======================================
// PROPOSTA ZAP
// ======================================

function copiarPropostaZap(){

    const equipamentos =
        obterEquipamentos();


    const periodo =
        $("periodo")
            .value
            .trim();


    const cidade =
        $("cidade")
            .value
            .trim();


    const valorFreteTexto =
        $("valorFrete")
            .value
            .trim();


    if(!equipamentos.length){

        return mostrarToast(
            "Informe o modelo"
        );
    }


    if(!periodo){

        return mostrarToast(
            "Informe período"
        );
    }


    // Pega o valor final (já com desconto, se houver) de
    // cada equipamento a partir do bloco de desconto dele
    // em "Calcular Desconto".

    const dadosComValor =
        equipamentos.map(equipamento => {

            const bloco =
                document.querySelector(
                    `.desconto-item[data-equip-id="${equipamento.id}"]`
                );

            const valorFinal =
                bloco
                    ? Number(bloco.dataset.valorFinal)
                    : NaN;

            return {
                ...equipamento,
                valorFinal:
                    Number.isFinite(valorFinal) && valorFinal > 0
                        ? valorFinal
                        : null
            };
        });


    const semValor =
        dadosComValor.find(
            equipamento => equipamento.valorFinal === null
        );


    if(semValor){

        return mostrarToast(
            `Confira o valor de ${semValor.modelo} em Calcular Desconto`
        );
    }


    // ==================================
    // PERÍODO
    // ==================================

    const diasNumero =
        Number(periodo);


    let periodoExibicao =
        periodo;


    let multiplicadorPeriodo =
        1;


    if(
        diasNumero > 30 &&
        diasNumero % 30 === 0
    ){

        multiplicadorPeriodo =
            diasNumero / 30;

        periodoExibicao =
            "30";
    }


    // ==================================
    // CIDADE
    // ==================================

    const cidadeFormatada =
        cidade
            ? cidade.charAt(0)
                .toUpperCase()
                +
                cidade.slice(1)
                    .toLowerCase()
            : "Cidade";


    // ==================================
    // BLOCOS DOS EQUIPAMENTOS
    // (valor + seguro calculados por equipamento)
    // ==================================

    let blocosEquipamentos =
        "";

    let totalGeral =
        0;


    dadosComValor.forEach(
        (equipamento, index) => {


            const modelo =
                equipamento.modelo;


            const quantidade =
                equipamento.quantidade;


            const letra2 =
                modelo.charAt(1);


            const letra3 =
                modelo.charAt(2);


            const altura =
                parseInt(
                    modelo.replace(
                        /[^\d]/g,
                        ""
                    )
                );


            let tipo = "";


            if(letra2 === "A")
                tipo = "Articulada";


            if(letra2 === "T")
                tipo = "Tesoura";


            if(letra2 === "M")
                tipo = "Mastro";


            let energia = "";


            if(letra3 === "E")
                energia = "elétrica";


            if(letra3 === "D")
                energia = "diesel";


            const alturaPlataforma =
                altura - 2;


            const valorLocacaoItem =
                equipamento.valorFinal *
                multiplicadorPeriodo;


            const seguroItem =
                valorLocacaoItem * 0.07;


            const totalItem =
                valorLocacaoItem + seguroItem;


            totalGeral +=
                totalItem;


            if(index > 0){

                blocosEquipamentos +=
                    "\n=======\n\n";
            }


            blocosEquipamentos +=
`🟡 Modelo: ${
    quantidade > 1
        ? quantidade + " "
        : ""
}${modelo} ${tipo} ${energia} – ${altura} metros de altura de trabalho

* Altura da plataforma: ${alturaPlataforma} metros
* Altura de trabalho: ${altura} metros
* Período de locação: ${periodoExibicao} dias${
    multiplicadorPeriodo > 1
        ? ` (${multiplicadorPeriodo} períodos)`
        : ""
}

💰 Valor da locação: R$ ${formatarMoedaBR(valorLocacaoItem)}
🛡️ Seguro contra acidentes e furtos (opcional): R$ ${formatarMoedaBR(seguroItem)}
💵 Total máquina + seguro: R$ ${formatarMoedaBR(totalItem)}
`;

        }
    );


    const linhaValorFinal =
        dadosComValor.length > 1
            ? `\n💵 Valor final da proposta (tudo incluso): R$ ${formatarMoedaBR(totalGeral)}\n`
            : "";


    let textoFinal =
`${blocosEquipamentos}${linhaValorFinal}

🚚 Frete entrega: R$ ${
    valorFreteTexto || "0,00"
} de Itajai x ${cidadeFormatada}
🚚 Frete retirada: R$ ${
    valorFreteTexto || "0,00"
} de ${cidadeFormatada} x Itajai
(Nosso frete é terceirizado, sendo um boleto na entrega e outro na retirada.)

🎁 Cortesia: Entrega técnica (mediante solicitação)
📄 Forma de pagamento: Mediante aprovação cadastral.`;


    copiar(textoFinal);

    mostrarToast(
        "Proposta Zap copiada"
    );
}


// ======================================
// AGENDAMENTO
// ======================================

function copiarAgendamento(){

    const data =
        $("agData").value ||
        '"hora"';


    const horario =
        $("agHorario").value ||
        '"hora"';


    const equipamento =
        $("agEquipamento").value ||
        '"PEMT"';


    const saida =
        $("agSaida").value ||
        "WR";


    const entrega =
        $("agEntrega").value ||
        '"Nome_do_Local"';


    const endereco =
        $("agEndereco").value ||
        '"Endereço"';


    const contato =
        $("agContato")
            .value
            .trim();


    const numero =
        $("agNumero")
            .value
            .trim();


    const frete =
        $("agendamentoValorFrete")
            .value ||
        '"Valor"';


    const tipoFrete =
        $("tipoFrete").value;


    const nomeProposta =
        $("agNomeProposta")
            .value ||
        '"Nome_Proposta"';


    // ==================================
    // CONTATO
    // ==================================

    let blocoContato = "";


    if(
        contato &&
        numero
    ){

        blocoContato =
`Contato de quem vai receber: ${contato} - ${numero}`;

    }else{

        blocoContato =
`Contato de quem vai receber: abaixo ⤵️`;
    }


    // ==================================
    // FINANCEIRO
    // ==================================

    let financeiroTexto = "";


    if(
        tipoFrete !== "NOSSA"
    ){

        const financeiros =
            document.querySelectorAll(
                ".financeiro-item"
            );


        let listaFinanceiros = "";


        financeiros.forEach(
            (item) => {

                const nome =
                    item.querySelector(
                        ".financeiroNome"
                    )
                    ?.value
                    .trim();


                const telefone =
                    item.querySelector(
                        ".financeiroTelefone"
                    )
                    ?.value
                    .trim();


                const email =
                    item.querySelector(
                        ".financeiroEmail"
                    )
                    ?.value
                    .trim();


                let bloco = "";


                if(nome){

                    bloco +=
                        `Nome: ${nome}\n`;
                }


                if(telefone){

                    bloco +=
                        `Telefone: ${telefone}\n`;
                }


                if(email){

                    bloco +=
                        `Email: ${email}\n`;
                }


                if(bloco.trim()){

                    listaFinanceiros +=
`
${bloco}`;
                }

            }
        );


        if(
            listaFinanceiros.trim()
        ){

            financeiroTexto =
`
* Contatos: ⤵️
📍Financeiro:
${listaFinanceiros}`;
        }
    }


    // ==================================
    // TEXTO
    // ==================================

    const texto =
`🚚 AGENDAMENTO DE ENTREGA

Data: ${data}
Horário: ${horario}
Equipamento: ${equipamento}

Local de Saída: ${saida}
Local de entrega: ${entrega}
Endereço: ${endereco}

${blocoContato}
* FRETE POR ${
    tipoFrete === "NOSSA"
        ? "NOSSA CONTA"
        : "CONTA DO CLIENTE"
} - R$ ${frete}
* ${nomeProposta}${financeiroTexto}`;


    copiar(texto);

    mostrarToast(
        "Agendamento copiado"
    );
}


// ======================================
// TIPO FRETE
// ======================================

function configurarTipoFrete(){

    const tipoFreteSelect =
        $("tipoFrete");


    if(!tipoFreteSelect) return;


    tipoFreteSelect.addEventListener(
        "change",
        () => {

            const bloco =
                $("blocoFinanceiro");


            if(
                tipoFreteSelect.value ===
                "NOSSA"
            ){

                bloco.style.display =
                    "none";

            }else{

                bloco.style.display =
                    "block";
            }

        }
    );
}


// ======================================
// ADICIONAR FINANCEIRO
// ======================================

function adicionarFinanceiro(){

    const lista =
        $("listaFinanceiros");


    lista.insertAdjacentHTML(
        "beforeend",
        `

        <div class="financeiro-item">

            <div class="agendamento-linha">

                <label>Nome:</label>

                <input
                    type="text"
                    class="financeiroNome"
                >

            </div>


            <div class="agendamento-linha">

                <label>Telefone:</label>

                <input
                    type="text"
                    class="financeiroTelefone"
                >

            </div>


            <div class="agendamento-linha">

                <label>Email:</label>

                <input
                    type="text"
                    class="financeiroEmail"
                >

            </div>


            <hr>

        </div>

        `
    );
}


// ======================================
// INIT
// ======================================

(async function init(){

    // ==================================
    // CARREGAR CSVs
    // ==================================

    await carregarTabela();

    await carregarFretes();


    // ==================================
    // EQUIPAMENTOS
    // ==================================

    configurarEventosEquipamentos();


    // ==================================
    // NOME CLIENTE
    // ==================================

    if($("nomeCliente")){

        $("nomeCliente")
            .addEventListener(
                "input",
                gerarTextos
            );
    }


    // ==================================
    // PERÍODO
    // ==================================

    if($("periodo")){

        $("periodo")
            .addEventListener(
                "input",
                () => {

                    gerarTextos();

                    mostrarFretes();

                }
            );
    }


    // ==================================
    // CIDADE
    // ==================================

    if($("cidade")){

        $("cidade")
            .addEventListener(
                "input",
                () => {

                    gerarTextos();

                    mostrarFretes();

                }
            );
    }


    // ==================================
    // FRETE
    // ==================================

    if($("valorFrete")){

        $("valorFrete")
            .addEventListener(
                "input",
                gerarTextos
            );
    }


    // ==================================
    // TIPO FRETE
    // ==================================

    configurarTipoFrete();

})();
