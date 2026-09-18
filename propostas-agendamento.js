// ======================================
// PROPOSTAS - AGENDAMENTO
// ======================================
// Texto de "Copiar Agendamento", o select de tipo de frete
// (mostra/esconde o bloco Financeiro) e o botão de adicionar
// contato no Financeiro. Depende de helpers.js (precisa vir
// carregado antes).

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
