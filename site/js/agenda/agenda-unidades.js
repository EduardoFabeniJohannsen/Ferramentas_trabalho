// ======================================
// AGENDA - TRANSFERÊNCIA ENTRE UNIDADES
// ======================================
// Tipo "Transferência entre unidades": a máquina vai de uma unidade da W Rental para outra. Aparece na expedição como uma entrega, mas não tem faturamento. No formulário, saída (Itajaí por padrão) e destino viram duas caixas com as unidades; os campos de retirada, entrega e cliente são preenchidos sozinhos com o nome e o endereço da unidade. Carregar antes de agenda-init.js.
// (A transferência entre obras continua com o valor "Transferência" de sempre.)

// Endereços do site https://wrental.com.br/ (rodapé, novembro de 2026). O site
// não traz bairro nem CEP.
const UNIDADES_WRENTAL = [
    { cidade: "Itajaí", uf: "SC", endereco: "Av. Vereador Abrahão João Francisco, 3455, Itajaí/SC" },
    { cidade: "Joinville", uf: "SC", endereco: "Rodovia BR-101, 47305, Km 47,5 (Pista Norte), Joinville/SC" },
    { cidade: "Içara", uf: "SC", endereco: "Rodovia BR 101 SN - Poço 8, Içara/SC" },
    { cidade: "Curitiba", uf: "PR", endereco: "Rua João Ferreira Sobrinho, 44, Curitiba/PR" },
    { cidade: "Ponta Grossa", uf: "PR", endereco: "Avenida Souza Naves, 4381, Ponta Grossa/PR" },
    { cidade: "Eldorado do Sul", uf: "RS", endereco: "Av. das Indústrias, 1600, Eldorado do Sul/RS" },
    { cidade: "Ijuí", uf: "RS", endereco: "Pavilhão Comercial, 250 Rodovia RS 522 KM 34, Ijuí/RS" },
    { cidade: "Indaiatuba", uf: "SP", endereco: "Rua Emilio Lopes Cruz, 108, Indaiatuba/SP" },
    { cidade: "Vale do Paraíba (Jacareí)", uf: "SP", endereco: "Rodovia Geraldo Scavone, 4975, Jacareí/SP" }
];

// de onde sai por padrão
const UNIDADE_SAIDA_PADRAO = "Itajaí";


// "W Rental Joinville": o nome que vai na retirada, na entrega e no cliente
function nomeUnidade(unidade){

    return `${LOCAL_PADRAO} ${unidade.cidade}`;
}


function unidadePorCidade(cidade){

    return UNIDADES_WRENTAL.find(unidade => unidade.cidade === cidade) || null;
}


// pelo nome salvo no agendamento ("W Rental Joinville", sem ligar pra acento
// e maiúsculas)
function unidadePorNome(nome){

    const chave = semAcentoMinusculo(String(nome || "").trim());

    return UNIDADES_WRENTAL.find(unidade => semAcentoMinusculo(nomeUnidade(unidade)) === chave) || null;
}


function prepararSelectsUnidades(){

    [["agUnidadeSaida", null], ["agUnidadeDestino", "Escolha a unidade"]].forEach(([id, vazio]) => {

        const select = $(id);

        select.innerHTML = "";

        if(vazio){

            const opcao = criar("option", "", vazio);

            opcao.value = "";

            select.appendChild(opcao);
        }

        UNIDADES_WRENTAL.forEach(unidade => {

            const opcao = criar("option", "", `${nomeUnidade(unidade)} (${unidade.uf})`);

            opcao.value = unidade.cidade;

            select.appendChild(opcao);
        });
    });
}


// Copia as unidades escolhidas para os campos que são salvos (retirada,
// entrega e cliente). Sem destino escolhido, entrega e cliente ficam como
// estavam (trocar de tipo e voltar não perde o que foi digitado).
function aplicarUnidades(){

    const saida = unidadePorCidade($("agUnidadeSaida").value);

    // a unidade de saída não pode ser o destino
    Array.from($("agUnidadeDestino").options).forEach(opcao => {

        opcao.disabled = !!opcao.value && opcao.value === saida?.cidade;
    });

    if($("agUnidadeDestino").value === saida?.cidade) $("agUnidadeDestino").value = "";

    const destino = unidadePorCidade($("agUnidadeDestino").value);

    if(saida){

        $("agOrigemNome").value = nomeUnidade(saida);

        $("agOrigemEndereco").value = saida.endereco;

        $("agLinkOrigem").value = "";
    }

    if(destino){

        $("agDestinoNome").value = nomeUnidade(destino);

        $("agDestinoEndereco").value = destino.endereco;

        $("agLinkDestino").value = "";

        $("agCliente").value = nomeUnidade(destino);
    }

    $("enderecosUnidades").innerText =
        [saida && `Saída: ${saida.endereco}`, destino && `Destino: ${destino.endereco}`]
            .filter(Boolean)
            .join("\n");
}


// Tipo trocado ou formulário aberto: com "entre unidades" mostra as duas
// caixas e esconde retirada, entrega, cliente e e-mails (classe no modal,
// regras em agenda.css). As caixas partem do que está nos campos.
function atualizarBlocoUnidades(){

    const entreUnidades = $("agTipo").value === TIPO_TRANSFERENCIA_UNIDADES;

    $("modalAgenda").classList.toggle("form-entre-unidades", entreUnidades);

    if(!entreUnidades) return;

    const saida =
        unidadePorNome($("agOrigemNome").value) ||
        unidadePorCidade(UNIDADE_SAIDA_PADRAO);

    const destino = unidadePorNome($("agDestinoNome").value);

    $("agUnidadeSaida").value = saida.cidade;

    $("agUnidadeDestino").value = destino ? destino.cidade : "";

    aplicarUnidades();
}


// "" = tudo certo (chamado por salvarAgendamento)
function erroTransferenciaUnidades(){

    if(!$("agUnidadeDestino").value) return "Escolha para qual unidade vai a transferência";

    return "";
}
