// ======================================
// PROPOSTAS ZAP COPIADAS - DESCONTO MÉDIO POR USUÁRIO
// ======================================
// Quadro acima da tabela: por usuário, quantas propostas, equipamentos com valor de tabela, desconto médio (média do % de cada equipamento, contando a quantidade), desconto sobre o total de tabela e o maior desconto, só das propostas que passam nos filtros.
// Equipamento sem valor de tabela não entra na média. Carregar depois de
// copiadas-linhas.js.

function resumoDescontosPorUsuario(propostas){

    const porUsuario = new Map();

    propostas.forEach(proposta => {

        const email = proposta.usuario_email || "";

        if(!porUsuario.has(email)){

            porUsuario.set(email, {
                email,
                propostas: 0,
                equipamentos: 0,
                somaPercentual: 0,
                valorTabela: 0,
                valorFinal: 0,
                maior: null
            });
        }

        const resumo = porUsuario.get(email);

        resumo.propostas++;

        (proposta.dados?.equipamentos || []).forEach(item => {

            const desconto = descontoEquipamentoAdmin(item);

            if(desconto === null) return;

            const quantidade = Math.max(1, Number(item.quantidade) || 1);

            resumo.equipamentos += quantidade;

            resumo.somaPercentual += desconto * quantidade;

            resumo.valorTabela += item.valorTabela * quantidade;

            resumo.valorFinal += Math.min(item.valorFinal, item.valorTabela) * quantidade;

            resumo.maior = resumo.maior === null ? desconto : Math.max(resumo.maior, desconto);
        });
    });

    return [...porUsuario.values()]
        .map(resumo => ({
            email: resumo.email,
            propostas: resumo.propostas,
            equipamentos: resumo.equipamentos,
            media:
                resumo.equipamentos
                    ? Math.round(resumo.somaPercentual / resumo.equipamentos * 10) / 10
                    : null,
            sobreTabela:
                resumo.valorTabela
                    ? Math.round((1 - resumo.valorFinal / resumo.valorTabela) * 1000) / 10
                    : null,
            descontoReais: resumo.valorTabela - resumo.valorFinal,
            maior: resumo.maior
        }))
        // maior desconto médio primeiro; quem não tem média vai pro fim
        .sort((a, b) =>
            (b.media ?? -1) - (a.media ?? -1) ||
            a.email.localeCompare(b.email, "pt-BR")
        );
}


function percentualAdmin(valor){

    return valor === null
        ? "—"
        : `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}


function desenharDescontosPorUsuario(propostas){

    const corpo = $("corpoDescontosUsuarios");

    corpo.innerHTML = "";

    const resumos = resumoDescontosPorUsuario(propostas);

    resumos.forEach(resumo => {

        const linha = criar("tr");

        linha.append(
            criar("td", "col-desconto-usuario", resumo.email || "(sem e-mail)"),
            criar("td", "", String(resumo.propostas)),
            criar("td", "", String(resumo.equipamentos)),
            criar("td", "col-desconto-media", percentualAdmin(resumo.media)),
            criar("td", "", percentualAdmin(resumo.sobreTabela)),
            criar("td", "", resumo.equipamentos ? moedaAdmin(resumo.descontoReais) : "—"),
            criar("td", "", percentualAdmin(resumo.maior))
        );

        corpo.appendChild(linha);
    });

    if(!resumos.length){

        const linha = criar("tr");

        const celula = criar("td", "erros-vazio", textoVazioPropostas());

        celula.colSpan = 7;

        linha.appendChild(celula);

        corpo.appendChild(linha);
    }
}
