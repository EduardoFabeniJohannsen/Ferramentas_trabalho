// ======================================
// AGENDA - ORDENAÇÃO
// ======================================
// Ordem dentro de cada data (horário, motorista, entregas/coletas).
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// Sempre por data (sem data vem primeiro). Dentro de cada data vale a
// ordem escolhida; o horário é sempre o desempate, então com
// "motorista" a rota de cada motorista fica por horário.
function ordemEfetiva(){

    const ordem =
        ORDENS.find(item => item.valor === ordemAgenda);

    if(
        !ordem ||
        (ordem.soTransportador && modoVisualizacao === "expedicao")
    ){
        return "horario";
    }

    return ordem.valor;
}


// horário vazio vai pro fim
function compararHorario(a, b){

    const horarioA = String(a.horario || "");

    const horarioB = String(b.horario || "");

    if(horarioA === horarioB) return 0;

    if(!horarioA) return 1;

    if(!horarioB) return -1;

    return horarioA.localeCompare(horarioB);
}


function ordenarAgendamentos(lista){

    const ordem = ordemEfetiva();

    const ordemTipos =
        ordem === "coletas"
            ? ["Coleta", "Entrega", "Troca técnica", "Transferência"]
            : ["Entrega", "Troca técnica", "Coleta", "Transferência"];

    return lista.sort((a, b) => {

        // 1) data
        if(a.data !== b.data){

            if(!a.data) return -1;

            if(!b.data) return 1;

            return a.data < b.data ? -1 : 1;
        }

        // 2) critério escolhido (dentro da mesma data)
        if(ordem === "motorista"){

            const motoristaA = a.motorista || "";

            const motoristaB = b.motorista || "";

            if(motoristaA !== motoristaB){

                // sem motorista vai pro fim da data
                if(!motoristaA) return 1;

                if(!motoristaB) return -1;

                const comparacao =
                    motoristaA.localeCompare(
                        motoristaB,
                        "pt-BR",
                        { sensitivity: "base" }
                    );

                if(comparacao) return comparacao;
            }
        }

        if(ordem === "entregas" || ordem === "coletas"){

            const diferenca =
                ordemTipos.indexOf(a.tipo) -
                ordemTipos.indexOf(b.tipo);

            if(diferenca) return diferenca;
        }

        // 3) horário
        const porHorario = compararHorario(a, b);

        if(porHorario) return porHorario;

        return String(a.plataforma || "")
            .localeCompare(String(b.plataforma || ""));
    });
}
