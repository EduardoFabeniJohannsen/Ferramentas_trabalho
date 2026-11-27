// ======================================
// MINHAS ENTREGAS - OS TEXTOS
// ======================================
// Só textos, sem tela, para a página do motorista (motorista.html): o título de cada dia ("Hoje · 27/11 · Sexta-feira"), o horário (CONFIRMAR vira "A confirmar"), os dois locais como no Zap (vazio = W Rental: a saída da entrega e da troca, a chegada da coleta), o link do mapa (o do agendamento ou a busca do endereço no Google Maps), os telefones do contato (para ligar e para o WhatsApp) e o carregamento em outro dia. Carregar depois de agendamento-comum.js.


const LOCAL_W_RENTAL_MOTORISTA = "W Rental";

// carregam num dia e entregam em outro (os TIPOS_EXPEDICAO da agenda, agenda-config.js)
const TIPOS_CARREGAMENTO_MOTORISTA = ["Entrega", "Troca técnica", TIPO_ENTREGA_COLETA, TIPO_TRANSFERENCIA_UNIDADES];

// o horário da agenda também pode ser CONFIRMAR ou IMEDIATO
const HORARIOS_TEXTO_MOTORISTA = { CONFIRMAR: "A confirmar", IMEDIATO: "Imediato" };


// "2026-11-27" -> "Sexta-feira"
function diaDaSemanaMotorista(iso){

    const dia =
        new Date(`${String(iso).slice(0, 10)}T00:00:00`)
            .toLocaleDateString("pt-BR", { weekday: "long" });

    return dia.charAt(0).toUpperCase() + dia.slice(1);
}


// "Hoje · 27/11 · Sexta-feira" (hoje = AAAA-MM-DD do aparelho)
function tituloDiaMotorista(iso, hoje){

    const amanha = (() => {

        const data = new Date(`${hoje}T00:00:00`);

        data.setDate(data.getDate() + 1);

        return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
    })();

    const nome = iso === hoje ? "Hoje" : iso === amanha ? "Amanhã" : "";

    return [nome, dataBR(iso).slice(0, 5), diaDaSemanaMotorista(iso)].filter(Boolean).join(" · ");
}


function horarioMotorista(horario){

    const texto = String(horario || "").trim();

    return HORARIOS_TEXTO_MOTORISTA[texto.toUpperCase()] || texto || "Sem horário";
}


function ehLocalWRentalMotorista(nome){

    const texto = String(nome || "").trim().toUpperCase();

    return texto === "WR" || texto === "W RENTAL";
}


// o local como no Zap: { nome, endereco, mapa } (mapa vazio = a W Rental)
// vazio = W Rental na saída da entrega, da troca e da entrega/coleta, e na
// chegada da coleta
function localMotorista(entrega, lado){

    const nome = String(entrega[`${lado}_nome`] || "").trim();

    const endereco = String(entrega[`${lado}_endereco`] || "").trim();

    const link = String(entrega[`link_${lado}`] || "").trim();

    const vazioEhWRental =
        lado === "origem"
            ? ["Entrega", ...TIPOS_COM_RECOLHA].includes(entrega.tipo)
            : entrega.tipo === "Coleta";

    if(ehLocalWRentalMotorista(nome) || (!nome && !endereco && !link && vazioEhWRental)){

        return { nome: LOCAL_W_RENTAL_MOTORISTA, endereco: "", mapa: "" };
    }

    return { nome, endereco, mapa: linkMapaMotorista(link, endereco) };
}


// o link do agendamento (só http/https) ou a busca do endereço no Google Maps
function linkMapaMotorista(link, endereco){

    if(/^https?:\/\//i.test(link)) return link;

    if(endereco) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;

    return "";
}


// telefones escritos no contato ("João (47) 99999-1234 / Ana 47 3333-1234"):
// [{ texto, tel: "+5547999991234", zap: "5547999991234" }]
function telefonesMotorista(contato){

    const achados =
        String(contato || "").match(/(?:\+?55[\s-]?)?\(?\d{2}\)?[\s-]?9?\s?\d{4}[\s.-]?\d{4}/g) || [];

    return achados
        .map(texto => {

            let digitos = texto.replace(/\D/g, "");

            if(digitos.length > 11 && digitos.startsWith("55")) digitos = digitos.slice(2);

            if(digitos.length < 10 || digitos.length > 11) return null;

            return { texto: texto.trim(), tel: `+55${digitos}`, zap: `55${digitos}` };
        })
        .filter(Boolean)
        .filter((telefone, indice, lista) => lista.findIndex(outro => outro.tel === telefone.tel) === indice);
}


// os contatos da entrega: [{ rotulo, texto }]. Transferência entre obras tem um
// em cada local (agenda-transferencia-obras.js)
function contatosMotorista(entrega){

    if(entrega.tipo === "Transferência"){

        return [
            { rotulo: "Contato na coleta", texto: String(entrega.contato_origem || "").trim() },
            { rotulo: "Contato na entrega", texto: String(entrega.contato || "").trim() }
        ].filter(contato => contato.texto);
    }

    const texto = String(entrega.contato || "").trim();

    return texto ? [{ rotulo: "Contato", texto }] : [];
}


// carrega na W Rental num dia e entrega em outro (agenda-carregamento.js):
// "26/11 · Quinta-feira · 14:00"; senão vazio
function textoCarregamentoMotorista(entrega){

    if(!entrega.data_carregamento || !TIPOS_CARREGAMENTO_MOTORISTA.includes(entrega.tipo)) return "";

    const horario = String(entrega.horario_carregamento || "").trim();

    return [
        dataBR(entrega.data_carregamento).slice(0, 5),
        diaDaSemanaMotorista(entrega.data_carregamento),
        horario ? horarioMotorista(horario) : ""
    ].filter(Boolean).join(" · ");
}
