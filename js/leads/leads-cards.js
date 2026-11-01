// ======================================
// LEADS - CARDS
// ======================================
// Card de cada lead: contato, botões e observação.

function criarCardLead(lead){

    const comigo = !!lead.chamado_por && lead.chamado_por === usuarioLeads.id;

    const card =
        criar(
            "div",
            "lead" + (comigo ? " comigo" : (lead.chamado_por ? " com-outro" : ""))
        );

    card.dataset.id = lead.id;

    const topo = criar("div", "lead-topo");

    topo.appendChild(criar("span", "lead-empresa", lead.empresa));

    const tag = criar("span", "tag-lead", rotuloStatusLead(lead.status));

    tag.dataset.status = lead.status;

    topo.appendChild(tag);

    card.appendChild(topo);

    const local =
        [lead.cidade, lead.uf].filter(Boolean).join("/");

    const dados =
        [lead.segmento, rotuloPorteLead(lead.porte), local].filter(Boolean).join(" · ");

    if(dados) card.appendChild(criar("div", "lead-dados", dados));

    if(lead.motivo) card.appendChild(criar("div", "lead-motivo", lead.motivo));

    card.appendChild(criarContatoLead(lead));

    if(lead.chamado_por){

        const quem =
            comigo ? "você" : (lead.chamado_por_email || "outro usuário");

        card.appendChild(
            criar(
                "div",
                "lead-chamado",
                `Chamado por ${quem} em ${dataHoraBR(lead.chamado_em)}`
            )
        );
    }

    card.appendChild(criarAcoesLead(lead, comigo));

    card.appendChild(criarObservacaoLead(lead));

    return card;
}


function criarContatoLead(lead){

    const contato = criar("div", "lead-contato");

    const partes = [lead.telefone, lead.whatsapp, lead.email].filter(Boolean);

    contato.textContent = [...new Set(partes)].join(" · ");

    const site = linkSite(lead.site);

    if(site){

        if(contato.textContent) contato.append(" · ");

        const link = criar("a", "", lead.site);

        link.href = site;

        link.target = "_blank";

        link.rel = "noopener";

        contato.appendChild(link);
    }

    // de onde saiu o motivo do lead (o agente é obrigado a informar)
    const fonte = linkSite(lead.fonte_url);

    if(fonte){

        if(contato.textContent) contato.append(" · ");

        const link = criar("a", "", "🔗 Fonte");

        link.href = fonte;

        link.target = "_blank";

        link.rel = "noopener";

        contato.appendChild(link);
    }

    return contato;
}


function criarBotaoLead(texto, classe, aoClicar){

    const botao = criar("button", classe, texto);

    botao.type = "button";

    botao.addEventListener("click", aoClicar);

    return botao;
}


function criarLinkLead(texto, classe, href, novaAba){

    const link = criar("a", classe, texto);

    link.href = href;

    if(novaAba){

        link.target = "_blank";

        link.rel = "noopener";
    }

    return link;
}


function criarAcoesLead(lead, comigo){

    const acoes = criar("div", "lead-acoes");

    const jaCliente = lead.status === "ja_cliente";

    // lead de outra pessoa continua com ela (o admin pode mexer em qualquer um)
    const podeMudar = !lead.chamado_por || comigo || adminLeads;

    if(!lead.chamado_por && !jaCliente){

        acoes.appendChild(
            criarBotaoLead("🙋 Vou chamar", "btn-pegar", () => pegarLead(lead))
        );
    }

    const whatsapp = linkWhatsApp(lead);

    if(whatsapp){

        const linkZap =
            criarLinkLead("💬 Abrir WhatsApp", "btn-whatsapp", whatsapp, true);

        // monta na hora de usar: a saudação e o nome do vendedor podem ter mudado
        linkZap.addEventListener(
            "pointerdown",
            () => { linkZap.href = linkWhatsApp(lead); }
        );

        linkZap.addEventListener(
            "click",
            () => { linkZap.href = linkWhatsApp(lead); }
        );

        acoes.appendChild(linkZap);
    }

    const ligar = linkLigar(lead);

    if(ligar) acoes.appendChild(criarLinkLead("📞 Ligar", "btn-ligar", ligar, false));

    acoes.appendChild(
        criarBotaoLead(
            "📋 Copiar mensagem",
            "btn-copiar",
            () => copiar(montarMensagemLead(lead), "Mensagem copiada")
        )
    );

    // cliente e cidade seguem pelo endereço (propostas-init.js lê)
    acoes.appendChild(
        criarLinkLead(
            "📄 Gerar proposta",
            "btn-proposta",
            `propostas.html?cliente=${encodeURIComponent(lead.empresa || "")}&cidade=${encodeURIComponent(lead.cidade || "")}`,
            true
        )
    );

    // não precisa chamar antes: a pessoa já sabe que a empresa é cliente
    if(podeMudar && !jaCliente){

        acoes.appendChild(
            criarBotaoLead(
                "🤝 Já é cliente",
                "btn-ja-cliente",
                () => registrarResultado(lead, "ja_cliente")
            )
        );
    }

    // clicou sem querer em "Vou chamar" ou "Já é cliente": desfaz e o lead
    // volta para os novos
    if((comigo && lead.status === "chamado") || (jaCliente && podeMudar)){

        acoes.appendChild(
            criarBotaoLead(
                "↩️ Voltar para novos",
                "btn-estornar",
                () => registrarResultado(lead, "novo")
            )
        );
    }

    // resultado: só quem marcou. O admin também, pra soltar lead esquecido.
    if(lead.chamado_por && (comigo || adminLeads) && !jaCliente){

        acoes.appendChild(
            criarBotaoLead(
                "✅ Interessado",
                "btn-interessado",
                () => registrarResultado(lead, "interessado")
            )
        );

        acoes.appendChild(
            criarBotaoLead(
                "🚫 Sem interesse",
                "btn-sem-interesse",
                () => registrarResultado(lead, "sem_interesse")
            )
        );

        acoes.appendChild(
            criarBotaoLead(
                comigo ? "📵 Não atendeu" : "🔓 Liberar",
                "btn-liberar",
                () => registrarResultado(lead, "novo")
            )
        );
    }

    return acoes;
}


function criarObservacaoLead(lead){

    const area = criar("div", "lead-obs");

    const campo = criar("input");

    campo.type = "text";

    campo.maxLength = 200;

    campo.placeholder = "Observação";

    campo.value = lead.observacao || "";

    const salvo = criar("small");

    let timer = null;

    const gravar = async () => {

        clearTimeout(timer);

        timer = null;

        const { data, error } =
            await supabaseClient
                .from(TABELA_LEADS)
                .update({ observacao: lead.observacao || null })
                .eq("id", lead.id)
                .select("id");

        if(error || !data.length){

            console.error("[leads] Falha ao salvar a observação:", error);

            mostrarToast("Erro ao salvar a observação", true);

            return;
        }

        salvo.textContent = "salva";
    };

    campo.addEventListener(
        "input",
        () => {

            lead.observacao = campo.value;

            salvo.textContent = "";

            clearTimeout(timer);

            timer = setTimeout(gravar, ATRASO_SALVAR_OBS_MS);
        }
    );

    // saiu do campo antes do tempo: grava na hora
    campo.addEventListener(
        "blur",
        () => {

            if(timer) gravar();
        }
    );

    area.append(campo, salvo);

    return area;
}
