// ======================================
// AGENDA - MENSAGEM DO ZAP
// ======================================
// Texto de agendamento copiado para o grupo da transportadora.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// COPIAR PARA O ZAP
// ======================================
// Monta a mensagem de agendamento que vai pro grupo da transportadora.
// Dois modelos: frete por nossa conta (termina com CARD) e por conta
// do cliente (termina com os e-mails do financeiro). A troca técnica
// tem o seu texto (máquina que vai + máquina recolhida no mesmo local).

const DIAS_SEMANA = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado"
];


// 09/10 - Sexta-feira
function textoDataZap(iso){

    const data = new Date(iso + "T00:00:00");

    const dia =
        String(data.getDate()).padStart(2, "0");

    const mes =
        String(data.getMonth() + 1).padStart(2, "0");

    return `${dia}/${mes} - ${DIAS_SEMANA[data.getDay()]}`;
}


function ehLocalWR(nome){

    const texto =
        String(nome || "").trim().toUpperCase();

    return texto === "WR" || texto === "W RENTAL";
}


// Modelo a partir do patrimônio: 3 letras + altura (WAE18R001 -> WAE18,
// WTE14L076 -> WTE14, WAD16060 -> WAD16). Mesma regra do estoque.
function modeloDaPlataforma(plataforma){

    const texto =
        String(plataforma || "").trim().toUpperCase();

    const partes =
        texto.match(/^([A-Z]+?)(\d+)/);

    if(!partes) return texto;

    const digitos = partes[2];

    return partes[1] + (
        digitos.length > 2
            ? digitos.slice(0, 2)
            : digitos
    );
}


// vários equipamentos: modelo de cada um, com a quantidade
// (2x WAD16010 + WTE12046 -> 2x WAD16 + WTE12)
function modelosDaPlataforma(plataforma){

    return juntarPlataformas(
        separarPlataformas(plataforma).map(item => ({
            quantidade: item.quantidade,
            patrimonio: modeloDaPlataforma(item.patrimonio)
        }))
    );
}


// período na linha de referência: maiúsculo e sem acento
// (3 períodos -> 3 PERIODOS). Um dia só vira DIÁRIA.
function textoPeriodoReferencia(periodo){

    const texto =
        String(periodo || "").trim();

    if(/^1 dias?$/i.test(texto)) return "DIÁRIA";

    return texto
        .toUpperCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
}


// Linha de referência da mensagem. Se a referência (ficha) foi digitada
// à mão, vale ela. Senão monta o nome da proposta:
// CLIENTE_MODELO_PERÍODO - Proposta: 712804
// (troca técnica não monta sozinha: tem a ficha própria, digitada à mão)
// Referência digitada sem o número da proposta ganha o " - Proposta: N".
function referenciaZap(item){

    const manual =
        String(item.referencia || "").trim();

    const proposta =
        String(item.proposta || "").trim();

    if(item.tipo === "Troca técnica") return manual;

    if(manual){

        if(!proposta || manual.includes(proposta)) return manual;

        return `${manual} - Proposta: ${proposta}`;
    }

    const nome =
        [
            String(item.cliente || "").trim().toUpperCase(),
            modelosDaPlataforma(item.plataforma),
            textoPeriodoReferencia(item.periodo)
        ]
            .filter(Boolean)
            .join("_");

    return `${nome} - Proposta: ${proposta}`.trimEnd();
}


// linhas de um local (saída ou entrega). Local da W Rental sai só
// como "WR", sem endereço. usarWRSeVazio = entrega e troca (saída) e
// coleta (entrega) saem da/para a W Rental quando o local fica vazio.
// linkComRotulo = modelo da troca: "Endereço:" e "Link:" em linhas separadas.
// Os rótulos saem em negrito do WhatsApp (entre asteriscos).
function linhasLocalZap(rotulo, nome, endereco, link, usarWRSeVazio, linkComRotulo){

    const nomeFinal =
        String(nome || "").trim();

    const vazio =
        !nomeFinal && !endereco && !link;

    if(ehLocalWR(nomeFinal) || (vazio && usarWRSeVazio)){

        return [`*${rotulo}:* WR`];
    }

    const linhas = [`*${rotulo}:* ${nomeFinal}`.trimEnd()];

    if(linkComRotulo){

        if(endereco) linhas.push(`*Endereço:* ${endereco}`);

        if(link) linhas.push(`*Link:* ${link}`);

        return linhas;
    }

    if(endereco){

        linhas.push(`*Endereço:* ${endereco}`);

        if(link) linhas.push(link);

    }else if(link){

        linhas.push(`*Endereço:* ${link}`);
    }

    return linhas;
}


function montarTextoZap(item){

    if(!item.data){

        return { erro: "Informe a data do agendamento" };
    }

    const frete = brToNumber(item.frete);

    if(!Number.isFinite(frete) || frete <= 0){

        return { erro: "Informe o frete do agendamento" };
    }

    const troca =
        item.tipo === "Troca técnica";

    if(troca && !item.plataformaRecolha){

        return { erro: "Informe a máquina de recolha da troca" };
    }

    const porCliente =
        item.freteConta === "cliente";

    const horario =
        String(item.horario || "").trim();

    // horário vazio fica vazio; "IMEDIATO" sai como "imediato"
    const linhaHorario =
        `*Horário:* ${horario.toUpperCase() === "IMEDIATO" ? "imediato" : horario}`.trimEnd();

    // por conta do cliente, sem contato, aponta pros contatos lá embaixo
    const contato =
        String(item.contato || "").trim() ||
        (porCliente ? "abaixo ⤵️" : "");

    // observação para a entrega (a do transportador): só sai se foi preenchida
    const observacao =
        String(item.obsEntrega || "").trim();

    const linhas = [

        `🚚 AGENDAMENTO DE ${troca ? "TROCA" : String(item.tipo).toUpperCase()}`,

        "",

        `*Data:* ${textoDataZap(item.data)}`,

        linhaHorario,

        `*Equipamento:* ${item.plataforma}`,

        ...linhasLocalZap(
            "Local de Saída",
            item.origemNome,
            item.origemEndereco,
            item.linkOrigem,
            item.tipo === "Entrega" || troca,
            troca
        ),

        ...linhasLocalZap(
            "Local de Entrega",
            item.destinoNome,
            item.destinoEndereco,
            item.linkDestino,
            item.tipo === "Coleta",
            troca
        )
    ];

    if(observacao){

        linhas.push(`*Observação:* ${observacao}`);
    }

    // troca: a máquina que volta é recolhida no mesmo local da entrega
    if(troca){

        linhas.push("");

        linhas.push(
            `🔁 Coleta no mesmo local ${item.plataformaRecolha} e retorna para WR.`
        );
    }

    linhas.push("");

    linhas.push(`Contato de quem vai receber: ${contato}`.trimEnd());

    linhas.push("");

    linhas.push(
        `* FRETE POR ${porCliente ? "CONTA DO CLIENTE" : "NOSSA CONTA"} - R$ ${formatarMoedaBR(frete)}`
    );

    // ficha digitada à mão, ou o nome da proposta montado sozinho
    linhas.push(`* ${referenciaZap(item)}`.trimEnd());

    if(porCliente){

        linhas.push("* Contatos: ⤵️");

        linhas.push("📍Financeiro:");

        if(item.emails) linhas.push(item.emails);

    }else{

        linhas.push(`* CARD:${item.card || ""}`.trimEnd());
    }

    return { texto: linhas.join("\n") };
}


function copiarAgendamentoZap(item){

    const resultado = montarTextoZap(item);

    if(resultado.erro){

        return mostrarToast(resultado.erro, true);
    }

    copiar(resultado.texto, "Agendamento copiado");
}
