// ======================================
// AGENDA - EMAIL DE AGENDAMENTO DA COLETA: A JANELA
// ======================================
// O ✉️ da coleta (na entrega o mesmo botão é o da renovação): abre a janela já preenchida com a data, o horário, as máquinas, o local e o endereço da retirada (o do Sisloc arrumado), tudo editável. "Cliente sem Inscrição Estadual" troca as instruções da NF de devolução pelo aviso de que a W Rental emite a NF de retorno. Mostra a prévia e copia o assunto e o email (formatado, para colar no Outlook). Os textos ficam em agenda-email-coleta-texto.js.


let itemEmailColeta = null;


function abrirEmailColetaAgenda(item){

    if(item.tipo !== "Coleta") return;

    itemEmailColeta = item;

    $("resumoEmailColeta").innerText = [item.cliente, item.plataforma].filter(Boolean).join(" · ");

    $("emailColetaData").value = item.data || "";

    $("emailColetaHorario").value = item.horario || "";

    $("emailColetaEquipamentos").value = equipamentosColeta(item.plataforma);

    $("emailColetaLocal").value = item.origemNome || "";

    // na coleta a retirada é o local do cliente (o do Sisloc vem arrumado)
    $("emailColetaEndereco").value = enderecoDoSisloc(item.origemEndereco) || item.linkOrigem || "";

    $("emailColetaSemIe").checked = false;

    $("modalEmailColeta").classList.add("aberto");

    desenharEmailColeta();
}


function fecharEmailColetaAgenda(){

    $("modalEmailColeta")?.classList.remove("aberto");

    itemEmailColeta = null;
}


// os campos do email agora; sem a data não há email
function camposEmailColetaDaJanela(){

    const data = $("emailColetaData").value;

    if(!itemEmailColeta || !data) return null;

    return camposEmailColeta({
        cliente: itemEmailColeta.cliente,
        data,
        horario: $("emailColetaHorario").value,
        equipamentos: $("emailColetaEquipamentos").value,
        local: $("emailColetaLocal").value,
        endereco: $("emailColetaEndereco").value,
        semIe: $("emailColetaSemIe").checked
    });
}


// o que vale a pena conferir antes de copiar
function alertasEmailColeta(){

    const data = $("emailColetaData").value;

    if(!data) return ["Informe a data da coleta."];

    const alertas = [];

    if(data < isoDoDiaRenovacao(new Date())) alertas.push("A data da coleta já passou.");

    const vazios = [
        ["emailColetaHorario", "Horário"],
        ["emailColetaEquipamentos", "Equipamento"],
        ["emailColetaLocal", "Local"],
        ["emailColetaEndereco", "Endereço"]
    ].filter(([id]) => !$(id).value.trim()).map(([, nome]) => nome);

    if(vazios.length) alertas.push(`Em branco: ${vazios.join(", ")}.`);

    return alertas;
}


function desenharEmailColeta(){

    const campos = camposEmailColetaDaJanela();

    $("alertasEmailColeta").replaceChildren(...alertasEmailColeta().map(texto => criar("p", "", `⚠️ ${texto}`)));

    $("btnCopiarAssuntoEmailColeta").disabled = !campos;

    $("btnCopiarEmailColeta").disabled = !campos;

    if(!campos){

        $("assuntoEmailColeta").innerText = "";

        $("previaEmailColeta").replaceChildren(criar("p", "renovacao-sem-previa", "Informe a data da coleta para ver o email."));

        return;
    }

    $("assuntoEmailColeta").innerText = assuntoEmailColeta(campos);

    // o HTML é montado aqui mesmo, com tudo o que veio de fora escapado
    $("previaEmailColeta").innerHTML = htmlEmailColeta(campos);
}


function copiarAssuntoEmailColeta(){

    const campos = camposEmailColetaDaJanela();

    if(campos) copiar(assuntoEmailColeta(campos), "Assunto copiado: troque NÚMEROCONTRATO e NÚMERO no Outlook");
}


function copiarEmailColeta(){

    const campos = camposEmailColetaDaJanela();

    if(!campos) return;

    copiarFormatado(
        htmlEmailColeta(campos),
        textoEmailColeta(campos),
        $("emailColetaSemIe").checked ? "Email copiado" : "Email copiado: anexe a NF de remessa no Outlook"
    );
}
