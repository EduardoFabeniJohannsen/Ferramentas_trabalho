// ======================================
// PROPOSTA ZAP - TEXTO
// ======================================
// Monta e copia a mensagem final de "Copiar Proposta Zap" a
// partir dos dados calculados em propostas-zap-calculo.js.
// Esse é o arquivo pra abrir quando quiser mexer só no
// TEXTO/formato da mensagem — aqui não tem nenhum cálculo.
// Depende de helpers.js e propostas-zap-calculo.js (precisam
// vir carregados antes).

function copiarPropostaZap(){

    const dados =
        calcularDadosPropostaZap();


    if(dados.erro){

        return mostrarToast(
            dados.erro
        );
    }


    // ==================================
    // BLOCOS DOS EQUIPAMENTOS
    // ==================================

    let blocosEquipamentos =
        "";


    dados.itens.forEach(
        (item, index) => {


            if(index > 0){

                blocosEquipamentos +=
                    "\n=======\n\n";
            }


            const rotuloTotal =
                item.complementarNesteItem > 0
                    ? "Total máquina + seguro + Frete com locação complementar(+20%)"
                    : "Total máquina + seguro";


            const textoDiaria =
                item.diariaItem !== null
                    ? ` ( Diária = R$ ${formatarMoedaBR(item.diariaItem)} )`
                    : "";


            blocosEquipamentos +=
`🟡 Modelo: ${
    item.quantidade > 1
        ? item.quantidade + " "
        : ""
}${item.modelo} ${item.tipo} ${item.energia} – ${item.altura} metros de altura de trabalho
* Altura da plataforma: ${item.alturaPlataforma} metros
* Altura de trabalho: ${item.altura} metros
* Período de locação: ${dados.periodoExibicao} dias${
    dados.multiplicadorPeriodo > 1
        ? ` (${dados.multiplicadorPeriodo} períodos)`
        : ""
}

💰 Valor da locação: R$ ${formatarMoedaBR(item.valorLocacaoItem)}${textoDiaria}
🛡️ Seguro contra acidentes e furtos (opcional): R$ ${formatarMoedaBR(item.seguroItem)}
💵 ${rotuloTotal}: R$ ${formatarMoedaBR(item.totalItem)}
`;

        }
    );


    // ==================================
    // VALOR FINAL / FRETE
    // ==================================

    const rotuloValorFinal =
        dados.complementarNoTotalGeral > 0
            ? "Valor final da proposta (tudo incluso + Frete com locação complementar(+20%))"
            : "Valor final da proposta (tudo incluso)";


    const linhaValorFinal =
        dados.quantidadeItens > 1
            ? `\n💵 ${rotuloValorFinal}: R$ ${formatarMoedaBR(dados.totalGeral + dados.complementarNoTotalGeral)}\n`
            : "";


    const notaFrete =
        dados.locacaoComplementarAtiva
            ? `(Frete incluso como "Locação Complementar")`
            : `(Nosso frete é terceirizado, sendo um boleto na entrega e outro na retirada.)`;


    let textoFinal =
`${blocosEquipamentos}${linhaValorFinal}
🚚 Frete entrega: R$ ${
    dados.valorFreteTexto || "0,00"
} de Itajai x ${dados.cidadeFormatada}
🚚 Frete retirada: R$ ${
    dados.valorFreteTexto || "0,00"
} de ${dados.cidadeFormatada} x Itajai
${notaFrete}

🎁 Cortesia: Entrega técnica (mediante solicitação)
📄 Forma de pagamento: Mediante aprovação cadastral.`;


    copiar(textoFinal);

    mostrarToast(
        "Proposta Zap copiada"
    );
}
