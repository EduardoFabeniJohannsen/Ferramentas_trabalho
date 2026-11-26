// ======================================
// AGENDA - TRANSFERÊNCIA ENTRE OBRAS
// ======================================
// A máquina vai de uma obra do cliente para outra: local de coleta (origem) e local de entrega (destino), cada um com o seu contato. O "contato" de sempre é o do local de entrega; o do local de coleta fica na coluna contato_origem (contatoOrigem). Só vai no salvar na transferência (ou se o agendamento já teve), então a agenda funciona antes do SQL dela. Na tabela (coluna Contato) e no Zap saem os dois contatos com o nome do local. As sugestões dos locais do cliente para os dois lados ficam em agenda-clientes.js. Carregar antes de agenda-init.js.

function ehTransferenciaObras(item){

    return item?.tipo === TIPO_TRANSFERENCIA_OBRAS;
}


// salvar: fora da transferência o contato da coleta não vale (e, vazio e sem ter
// tido antes, nem vai para o banco)
function conferirContatoColeta(dados, anterior){

    if(ehTransferenciaObras(dados) && dados.contatoOrigem) return;

    if(anterior?.contatoOrigem){

        dados.contatoOrigem = "";

    }else{

        delete dados.contatoOrigem;
    }
}


// coluna Contato: "Coleta: Ana 47 9999 · Entrega: Bia 47 8888" na transferência
// (só o que tiver); nos outros tipos, o contato de sempre
function textoContatoCelula(item){

    if(!ehTransferenciaObras(item)) return item.contato;

    return [
        item.contatoOrigem ? `Coleta: ${item.contatoOrigem}` : "",
        item.contato ? `Entrega: ${item.contato}` : ""
    ]
        .filter(Boolean)
        .join(" · ");
}


// linhas de contato do Zap. vazio = o que vai quando o contato não foi
// preenchido ("abaixo ⤵️" quando o cliente paga, senão nada)
function linhasContatoZap(item, vazio){

    const texto = (valor) => `${String(valor || "").trim() || vazio}`;

    if(!ehTransferenciaObras(item)){

        return [`Contato de quem vai receber: ${texto(item.contato)}`.trimEnd()];
    }

    return [
        `Contato no local de coleta: ${texto(item.contatoOrigem)}`.trimEnd(),
        `Contato no local de entrega: ${texto(item.contato)}`.trimEnd()
    ];
}
