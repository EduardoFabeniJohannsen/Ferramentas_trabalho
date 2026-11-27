// ======================================
// MINHAS ENTREGAS - TELA
// ======================================
// Desenha as entregas do motorista por dia (de hoje em diante; os últimos 7 dias ficam em "Dias anteriores", fechado): horário, tipo e status, máquina (e a que volta, na troca e na entrega/coleta), carregamento em outro dia, cliente, saída e entrega com o botão do mapa, contato com Ligar e WhatsApp, e a observação de entrega. Cancelado fica apagado. Os avisos: carregando, falha, falta o SQL, login sem motorista ligado e nenhuma entrega. Nada entra como HTML.


// cor do status (classe status-*)
const CLASSES_STATUS_MOTORISTA = {
    "A confirmar": "status-a-confirmar",
    "Confirmado": "status-confirmado",
    "Em rota": "status-em-rota",
    "Concluído": "status-concluido",
    "Cancelado": "status-cancelado"
};


function avisoMotorista(texto, classe = ""){

    return criar("p", `aviso-motorista ${classe}`.trim(), texto);
}


// link que abre fora (mapa, telefone, WhatsApp)
function linkMotorista(texto, endereco, classe){

    const link = criar("a", `link-motorista ${classe}`, texto);

    link.href = endereco;

    if(/^https?:/i.test(endereco)){

        link.target = "_blank";

        link.rel = "noopener noreferrer";
    }

    return link;
}


// "Saída" / "Entrega": nome, endereço e o botão do mapa
function blocoLocalMotorista(rotulo, local){

    const bloco = criar("div", "local-motorista");

    bloco.appendChild(criar("span", "rotulo-motorista", rotulo));

    bloco.appendChild(criar("strong", "nome-local-motorista", local.nome || "(sem nome)"));

    if(local.endereco) bloco.appendChild(criar("span", "endereco-motorista", local.endereco));

    if(local.mapa) bloco.appendChild(linkMotorista("📍 Abrir no mapa", local.mapa, "link-mapa"));

    return bloco;
}


function linhaMotorista(rotulo, texto, classe = ""){

    const linha = criar("p", `linha-motorista ${classe}`.trim());

    linha.appendChild(criar("span", "rotulo-motorista", `${rotulo}: `));

    linha.appendChild(criar("span", "", texto));

    return linha;
}


function blocoContatoMotorista(contato){

    const bloco = criar("div", "contato-motorista");

    bloco.appendChild(linhaMotorista(contato.rotulo, contato.texto));

    const telefones = telefonesMotorista(contato.texto);

    if(telefones.length){

        const botoes = criar("div", "botoes-contato-motorista");

        telefones.forEach(telefone => {

            const sufixo = telefones.length > 1 ? ` ${telefone.texto}` : "";

            botoes.appendChild(linkMotorista(`📞 Ligar${sufixo}`, `tel:${telefone.tel}`, "link-ligar"));

            botoes.appendChild(linkMotorista(`💬 WhatsApp${sufixo}`, `https://wa.me/${telefone.zap}`, "link-zap"));
        });

        bloco.appendChild(botoes);
    }

    return bloco;
}


function cartaoEntregaMotorista(entrega){

    const status = String(entrega.status || "").trim();

    const cartao = criar("article", "entrega-motorista");

    cartao.dataset.id = entrega.id;

    cartao.classList.toggle("cancelada", status === "Cancelado");

    cartao.classList.toggle("concluida", status === STATUS_CONCLUIDO);

    // horário, tipo e status
    const topo = criar("div", "topo-entrega-motorista");

    topo.appendChild(criar("span", "horario-motorista", horarioMotorista(entrega.horario)));

    topo.appendChild(criar("span", "tipo-motorista", rotuloTipo(entrega.tipo)));

    if(status){

        topo.appendChild(criar("span", `status-motorista ${CLASSES_STATUS_MOTORISTA[status] || ""}`.trim(), status));
    }

    cartao.appendChild(topo);

    if(entrega.plataforma) cartao.appendChild(linhaMotorista("🚜 Equipamento", entrega.plataforma, "linha-equipamento"));

    // troca e entrega/coleta: leva uma e traz a outra no mesmo local
    if(TIPOS_COM_RECOLHA.includes(entrega.tipo) && entrega.plataforma_recolha){

        cartao.appendChild(linhaMotorista("🔁 Traz de volta", `${entrega.plataforma_recolha} (do mesmo local, para a W Rental)`));
    }

    const carregamento = textoCarregamentoMotorista(entrega);

    if(carregamento) cartao.appendChild(linhaMotorista("📦 Carrega na W Rental", carregamento, "linha-carregamento"));

    if(entrega.cliente) cartao.appendChild(linhaMotorista("🏢 Cliente", entrega.cliente));

    const locais = criar("div", "locais-motorista");

    locais.appendChild(blocoLocalMotorista("Saída", localMotorista(entrega, "origem")));

    locais.appendChild(blocoLocalMotorista("Entrega", localMotorista(entrega, "destino")));

    cartao.appendChild(locais);

    contatosMotorista(entrega).forEach(contato => cartao.appendChild(blocoContatoMotorista(contato)));

    const observacao = String(entrega.obs_entrega || "").trim();

    if(observacao) cartao.appendChild(linhaMotorista("📝 Observação", observacao, "linha-observacao"));

    return cartao;
}


// [[dia, [entregas]]] na ordem das datas (a função já manda em ordem)
function entregasPorDiaMotorista(entregas){

    const dias = new Map();

    entregas.forEach(entrega => {

        const dia = String(entrega.data || "").slice(0, 10);

        if(!dias.has(dia)) dias.set(dia, []);

        dias.get(dia).push(entrega);
    });

    return [...dias.entries()].sort(([a], [b]) => a.localeCompare(b));
}


function secaoDiaMotorista(dia, entregas, hoje){

    const secao = criar("section", "dia-motorista");

    secao.classList.toggle("dia-hoje", dia === hoje);

    const quantas = entregas.length === 1 ? "1 agendamento" : `${entregas.length} agendamentos`;

    const titulo = criar("h3", "titulo-dia-motorista", tituloDiaMotorista(dia, hoje));

    titulo.appendChild(criar("span", "quantos-motorista", quantas));

    secao.appendChild(titulo);

    entregas.forEach(entrega => secao.appendChild(cartaoEntregaMotorista(entrega)));

    return secao;
}


function textoQuemMotorista(){

    const motorista = dadosMotorista?.motorista;

    if(!motorista) return "";

    return [motorista.nome, motorista.transportadora].filter(Boolean).join(" · ");
}


function desenharMotorista(){

    const lista = $("listaMotorista");

    $("motoristaQuem").innerText = textoQuemMotorista();

    $("motoristaAtualizado").innerText =
        situacaoMotorista === "carregando"
            ? "Atualizando..."
            : ultimaCargaMotorista
                ? `Atualizado às ${new Date(ultimaCargaMotorista).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                : "";

    if(situacaoMotorista === "sem-sql"){

        lista.replaceChildren(avisoMotorista("Falta rodar no Supabase o SQL do login de motorista (função entregas_motorista).", "aviso-erro"));

        return;
    }

    // falhou sem nada na tela; com uma lista, ela fica (o aviso vai no toast)
    if(!dadosMotorista){

        lista.replaceChildren(
            situacaoMotorista === "erro"
                ? avisoMotorista("Não deu para carregar as entregas. Confira a internet e toque em ↻ Atualizar.", "aviso-erro")
                : avisoMotorista("Carregando...")
        );

        return;
    }

    if(!dadosMotorista.motorista){

        lista.replaceChildren(
            avisoMotorista(
                adminNaPaginaMotorista
                    ? "Escolha um motorista acima para ver as entregas dele."
                    : "Este login ainda não está ligado a um motorista. Peça ao administrador para escolher quem você é na página Admin."
            )
        );

        return;
    }

    const hoje = dataISO(0);

    const dias = entregasPorDiaMotorista(dadosMotorista.entregas);

    const proximos = dias.filter(([dia]) => dia >= hoje);

    const anteriores = dias.filter(([dia]) => dia < hoje);

    const partes = [];

    if(!proximos.length) partes.push(avisoMotorista("Nenhuma entrega sua de hoje em diante."));

    proximos.forEach(([dia, entregas]) => partes.push(secaoDiaMotorista(dia, entregas, hoje)));

    if(anteriores.length){

        const anterioresAbertos = !!lista.querySelector("details.anteriores-motorista")?.open;

        const caixa = criar("details", "anteriores-motorista");

        caixa.open = anterioresAbertos;

        const total = anteriores.reduce((soma, [, entregas]) => soma + entregas.length, 0);

        caixa.appendChild(criar("summary", "", `Dias anteriores (últimos 7 dias): ${total}`));

        anteriores.forEach(([dia, entregas]) => caixa.appendChild(secaoDiaMotorista(dia, entregas, hoje)));

        partes.push(caixa);
    }

    lista.replaceChildren(...partes);
}
