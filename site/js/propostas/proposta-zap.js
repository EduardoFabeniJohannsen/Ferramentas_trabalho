// ======================================
// PROPOSTAS - PROPOSTA ZAP
// ======================================
// copiarPropostaZap(): mensagem completa para WhatsApp.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// PROPOSTA ZAP
// ======================================

// O texto sai do código do modelo: W + tipo + motor + altura de trabalho.
// Tipo: A articulada, T tesoura, TL telescópica, M mastro (o mesmo padrão do
// estoque-config.js; quick up não tem texto aqui). Motor: E elétrica, D diesel.
// Ex: WAE18, WTD12, WTLD41. Fora do padrão devolve null.
const TIPOS_MODELO_ZAP = {
    TL: "Telescópica",
    A: "Articulada",
    T: "Tesoura",
    M: "Mastro"
};

function partesDoModeloZap(modelo){

    // TL vem antes de T na busca: WTLD41 é telescópica, não tesoura
    const partes = String(modelo || "").match(/^.(TL|A|T|M)([ED])/);

    const altura = parseInt(String(modelo || "").replace(/[^\d]/g, ""), 10);

    if(!partes || !Number.isFinite(altura)) return null;

    return {
        tipo: TIPOS_MODELO_ZAP[partes[1]],
        energia: partes[2] === "E" ? "elétrica" : "diesel",
        altura
    };
}


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
            "Informe o modelo",
            true
        );
    }


    if(!periodo){

        return mostrarToast(
            "Informe período",
            true
        );
    }


    // período + campo Períodos (ver obterPeriodoProposta)
    const infoPeriodo =
        obterPeriodoProposta();


    if(infoPeriodo.erro){

        return mostrarToast(
            infoPeriodo.erro,
            true
        );
    }


    if(!cidade){

        return mostrarToast(
            "Informe a cidade",
            true
        );
    }


    // entrega e retirada bonificadas (status.js): não precisa do valor do frete
    const semFrete =
        fretesCobrados() === 0;


    if(!valorFreteTexto && !semFrete){

        return mostrarToast(
            "Informe o frete",
            true
        );
    }


    const valorFreteNumero =
        brToNumber(valorFreteTexto);


    if(!Number.isFinite(valorFreteNumero) && !semFrete){

        return mostrarToast(
            "Frete inválido",
            true
        );
    }


    // O texto depende do padrão do modelo (partesDoModeloZap)
    const modeloForaPadrao =
        equipamentos.find(equipamento => !partesDoModeloZap(equipamento.modelo));


    if(modeloForaPadrao){

        return mostrarToast(
            `Modelo ${modeloForaPadrao.modelo} fora do padrão`,
            true
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
            `Confira o valor de ${semValor.modelo} em Calcular Desconto`,
            true
        );
    }


    // ==================================
    // PERÍODO
    // ==================================
    // Total de dias (usado na diária): 60 = 60; 28 + 3 períodos = 84.
    // Dias exibidos e quantidade de períodos vêm do mesmo cálculo.

    const diasNumero =
        infoPeriodo.diasTotal;


    const periodoExibicao =
        infoPeriodo.diasBusca;


    const multiplicadorPeriodo =
        infoPeriodo.multiplicador;


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
    // LOCAÇÃO COMPLEMENTAR (frete)
    // ==================================
    // Frete x 2 (x 1 com a entrega ou a retirada bonificada; nada com as
    // duas), com +20% (bitributação) quando ativada.

    const valorComplementar =
        (locacaoComplementarAtiva && !semFrete)
            ? (valorFreteNumero * fretesCobrados()) * (bitributacaoAtiva ? 1.2 : 1)
            : 0;


    // sufixo dos rótulos: só aparece com a bitributação ativada
    const sufixoBitributacao =
        bitributacaoAtiva
            ? "(+20%)"
            : "";


    // ==================================
    // BLOCOS DOS EQUIPAMENTOS
    // (valor + seguro calculados por equipamento)
    // ==================================

    // Com emojis: "💰 ". Sem emojis: "* ".
    const marca = (emoji) =>
        emojisAtivo ? `${emoji} ` : "* ";

    // Frete mantém o 🚚 nos dois modos; sem emojis ganha "* " na frente.
    const prefixoFrete =
        emojisAtivo ? "" : "* ";


    let blocosEquipamentos =
        "";

    let totalGeral =
        0;

    // valores de cada item, para o registro do admin (propostas-registro.js)
    const itensRegistro = [];


    dadosComValor.forEach(
        (equipamento, index) => {


            const modelo =
                equipamento.modelo;


            const quantidade =
                equipamento.quantidade;


            const { tipo, energia, altura } =
                partesDoModeloZap(modelo);


            const alturaPlataforma =
                altura - 2;


            const valorLocacaoItem =
                equipamento.valorFinal *
                multiplicadorPeriodo;


            const seguroItem =
                valorLocacaoItem * TAXA_SEGURO;


            // Locação complementar só entra na linha de Total
            // do próprio item quando ele é o único da proposta
            // — com mais de um equipamento, ela entra uma única
            // vez lá embaixo, na linha "Valor final da proposta".
            const complementarNesteItem =
                (
                    locacaoComplementarAtiva &&
                    dadosComValor.length === 1
                )
                    ? valorComplementar
                    : 0;


            const totalItem =
                valorLocacaoItem +
                seguroItem +
                complementarNesteItem;


            totalGeral +=
                valorLocacaoItem +
                seguroItem;

            itensRegistro.push({
                id: equipamento.id,
                modelo,
                quantidade,
                valorFinal: equipamento.valorFinal,
                valorLocacao: valorLocacaoItem,
                seguro: seguroItem
            });


            if(index > 0){

                blocosEquipamentos +=
                    "\n=======\n\n";
            }


            const rotuloTotal =
                complementarNesteItem > 0
                    ? `Total máquina + seguro + Frete com locação complementar${sufixoBitributacao}`
                    : "Total máquina + seguro";


            const textoDiaria =
                (
                    valorDiariaAtivo &&
                    Number.isFinite(diasNumero) &&
                    diasNumero > 0
                )
                    ? ` ( Diária = R$ ${formatarMoedaBR(valorLocacaoItem / diasNumero)} )`
                    : "";


            blocosEquipamentos +=
`*🟡 Modelo: ${
    quantidade > 1
        ? quantidade + " "
        : ""
}${modelo} ${tipo} ${energia} – ${altura} metros de altura de trabalho*
* Altura da plataforma: ${alturaPlataforma} metros
* Altura de trabalho: ${altura} metros
* Período de locação: ${periodoExibicao} dias${
    multiplicadorPeriodo > 1
        ? ` (${multiplicadorPeriodo} períodos)`
        : ""
}

${marca("💰")}Valor da locação: R$ ${formatarMoedaBR(valorLocacaoItem)}${textoDiaria}
${marca("🛡️")}Seguro contra acidentes e furtos (opcional): R$ ${formatarMoedaBR(seguroItem)}
${marca("💵")}*${rotuloTotal}: R$ ${formatarMoedaBR(totalItem)}*
`;

        }
    );


    // Com mais de 1 equipamento, a locação complementar
    // entra uma única vez aqui, não em cada item.
    const complementarNoTotalGeral =
        (
            locacaoComplementarAtiva &&
            dadosComValor.length > 1
        )
            ? valorComplementar
            : 0;


    const rotuloValorFinal =
        complementarNoTotalGeral > 0
            ? `Valor final da proposta (tudo incluso + Frete com locação complementar${sufixoBitributacao})`
            : "Valor final da proposta (tudo incluso)";


    const linhaValorFinal =
        dadosComValor.length > 1
            ? `\n${marca("💵")}${rotuloValorFinal}: R$ ${formatarMoedaBR(totalGeral + complementarNoTotalGeral)}\n`
            : "";


    // entrega ou retirada bonificada (status.js): sai "Bonificado" no lugar do valor
    const bonificado =
        obterFreteBonificado();

    const valorFreteZap = (qual) =>
        freteEstaBonificado(qual) ? "Bonificado" : `R$ ${valorFreteTexto}`;


    // frete terceirizado: a transportadora cobra direto do cliente
    // (com um bonificado, só um boleto; com os dois, nenhuma observação)
    const notaFrete =
        semFrete
            ? ""
            : locacaoComplementarAtiva
            ? `(Frete incluso como "Locação Complementar")`
            : bonificado
                ? `(Nosso frete é terceirizado, sendo um boleto na ${bonificado === "entrega" ? "retirada" : "entrega"}, boleto com vencimento em 14 dias)`
                : `(Nosso frete é terceirizado, sendo um boleto na entrega e outro na retirada, boleto com vencimento em 14 dias)`;

    // sem observação, a linha some (não fica uma linha em branco a mais)
    const linhaNotaFrete =
        notaFrete ? `${notaFrete}\n` : "";


    // boleto ou depósito e o prazo (propostas-pagamento.js)
    const textoPagamento =
        textoFormaPagamento();

    // Linha em branco entre Cortesia e Pagamento: sem emojis sempre
    // tem; com emojis só se o toggle (⚙️ Configurações) estiver ativo
    const separadorFinal =
        (emojisAtivo && !separarPagamentoAtivo) ? "\n" : "\n\n";


    // cidade de saída do frete (⚙️ Configurações): Itajai ou Joinville
    const cidadeSaidaTexto =
        obterCidadeSaida().zap;


    let textoFinal =
`${blocosEquipamentos}${linhaValorFinal}
${prefixoFrete}🚚 Frete entrega: ${valorFreteZap("entrega")} de ${cidadeSaidaTexto} x ${cidadeFormatada}
${prefixoFrete}🚚 Frete retirada: ${valorFreteZap("retirada")} de ${cidadeFormatada} x ${cidadeSaidaTexto}
${linhaNotaFrete}
${marca("🎁")}Cortesia: Entrega técnica (mediante solicitação)${separadorFinal}${marca("📄")}Forma de pagamento: ${textoPagamento}`;


    copiar(textoFinal, "Proposta Zap copiada");

    // o admin vê quem fez e o que foi proposto
    registrarPropostaCopiada({
        texto: textoFinal,
        itens: itensRegistro,
        infoPeriodo,
        frete: valorFreteNumero,
        valorComplementar
    });
}
