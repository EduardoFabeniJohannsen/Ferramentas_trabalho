// ======================================
// ADMIN - APARELHOS (trava de aparelhos)
// ======================================
// Lista os aparelhos de cada login (tabela "dispositivos", só admin lê e altera
// pelo RLS): liberar, desconectar, trocar o nome e excluir. Liga e desliga a
// trava (tabela "trava_dispositivos"). Quem confere o aparelho em cada página é
// o dispositivo.js; quem bloqueia os dados é o banco (tem_acesso).

const TABELA_DISPOSITIVOS = "dispositivos";

const TABELA_TRAVA_DISPOSITIVOS = "trava_dispositivos";

const ROTULOS_SITUACAO_APARELHO = {
    pendente: "⏳ Aguardando",
    liberado: "✅ Liberado",
    bloqueado: "⛔ Desconectado"
};

// aguardando primeiro, depois os liberados e por último os desconectados
const ORDEM_SITUACAO_APARELHO = ["pendente", "liberado", "bloqueado"];

let aparelhosAdmin = [];

let travaAparelhosLigada = null;

let falhaAparelhos = "";


function mensagemFalhaAparelhos(erro){

    const codigo = erro?.code || "";

    if(codigo === "42P01" || codigo === "PGRST205"){

        return "A trava de aparelhos ainda não existe no banco: rode o SQL no Supabase.";
    }

    // coluna que falta (cidade, ip): SQL antigo da trava
    if(codigo === "42703"){

        return "Rode de novo o SQL mais recente da trava de aparelhos no Supabase.";
    }

    return "Não foi possível carregar os aparelhos (verifique a conexão).";
}


async function carregarAparelhos(){

    falhaAparelhos = "";

    $("contagemAparelhos").innerText = "Carregando...";

    try{

        const [aparelhos, trava] = await Promise.all([
            supabaseClient
                .from(TABELA_DISPOSITIVOS)
                .select("id, usuario, chave_hash, situacao, aparelho, nome, cidade, ip, criado_em, liberado_em, ultimo_acesso")
                .order("ultimo_acesso", { ascending: false }),
            supabaseClient
                .from(TABELA_TRAVA_DISPOSITIVOS)
                .select("ligada")
                .eq("id", 1)
                .maybeSingle()
        ]);

        if(aparelhos.error) throw aparelhos.error;

        if(trava.error) throw trava.error;

        aparelhosAdmin = Array.isArray(aparelhos.data) ? aparelhos.data : [];

        travaAparelhosLigada = trava.data ? trava.data.ligada === true : null;

    }catch(erro){

        console.error("[admin] Falha ao carregar os aparelhos:", erro);

        aparelhosAdmin = [];

        travaAparelhosLigada = null;

        falhaAparelhos = mensagemFalhaAparelhos(erro);
    }

    desenharAparelhos();
}


function emailDoAparelho(aparelho){

    const perfil = perfisAdmin.find(item => item.id === aparelho.usuario);

    return perfil ? perfil.email : "(usuário removido)";
}


// "Computador · Windows · Chrome" e embaixo "Código A3F9C2": o mesmo código
// aparece no topo da tela da pessoa (dispositivo.js), para saber qual é qual
function celulaAparelho(aparelho){

    const celula = criar("td", "", aparelho.aparelho || "—");

    const codigo = String(aparelho.chave_hash || "").slice(0, 6).toUpperCase();

    if(codigo) celula.appendChild(criar("span", "codigo-aparelho-admin", `Código ${codigo}`));

    return celula;
}


// "Itajaí/Santa Catarina" e embaixo "IP 189.4.5.6" (de onde acessou por último).
// A cidade vem pelo IP: é aproximada (internet de celular e VPN mostram outra).
function celulaLocalAparelho(aparelho){

    const celula = criar("td", "col-local-aparelho", aparelho.cidade || "—");

    if(aparelho.ip) celula.appendChild(criar("span", "ip-aparelho", `IP ${aparelho.ip}`));

    return celula;
}


function desenharBotaoTrava(){

    const botao = $("btnTrava");

    botao.classList.toggle("ativo", travaAparelhosLigada === true);

    botao.disabled = travaAparelhosLigada === null;

    botao.innerText =
        travaAparelhosLigada === null ? "🔒 Trava: indisponível"
            : travaAparelhosLigada ? "🔒 Trava ligada (clique para desligar)"
            : "🔓 Trava desligada (clique para ligar)";
}


function botaoAparelho(texto, titulo, acao, classe){

    const botao = criar("button", classe || "", texto);

    botao.type = "button";

    botao.title = titulo;

    botao.addEventListener("click", acao);

    return botao;
}


function linhaAparelho(aparelho){

    const linha = criar("tr", `aparelho-${aparelho.situacao}`);

    linha.appendChild(criar("td", "col-usuario", emailDoAparelho(aparelho)));

    linha.appendChild(criar("td", "col-nome-aparelho", aparelho.nome || "—"));

    linha.appendChild(celulaAparelho(aparelho));

    linha.appendChild(celulaLocalAparelho(aparelho));

    linha.appendChild(criar("td", "", ROTULOS_SITUACAO_APARELHO[aparelho.situacao] || aparelho.situacao));

    linha.appendChild(criar("td", "", dataHoraBR(aparelho.criado_em)));

    linha.appendChild(criar("td", "", dataHoraBR(aparelho.ultimo_acesso)));

    const acoes = criar("td", "acoes-aparelho");

    if(aparelho.situacao !== "liberado"){

        acoes.appendChild(botaoAparelho("Liberar", "Liberar este aparelho", () => mudarSituacaoAparelho(aparelho, "liberado"), "btn-liberar-aparelho"));
    }

    if(aparelho.situacao !== "bloqueado"){

        acoes.appendChild(botaoAparelho("Desconectar", "Tirar este aparelho do sistema agora", () => mudarSituacaoAparelho(aparelho, "bloqueado"), "btn-desconectar-aparelho"));
    }

    acoes.appendChild(botaoAparelho("✏️", "Dar um nome (só o admin vê)", () => renomearAparelho(aparelho)));

    acoes.appendChild(botaoAparelho("🗑️", "Excluir da lista (se voltar, vira um pedido novo)", () => excluirAparelho(aparelho)));

    linha.appendChild(acoes);

    return linha;
}


function desenharAparelhos(){

    desenharBotaoTrava();

    const corpo = $("corpoAparelhos");

    corpo.replaceChildren();

    const pendentes =
        aparelhosAdmin.filter(item => item.situacao === "pendente").length;

    $("tituloAparelhos").innerText =
        pendentes ? `Aparelhos (${pendentes} aguardando)` : "Aparelhos";

    if(falhaAparelhos){

        $("contagemAparelhos").innerText = "";

        const linha = criar("tr");

        const celula = criar("td", "", falhaAparelhos);

        celula.colSpan = 8;

        linha.appendChild(celula);

        corpo.appendChild(linha);

        return;
    }

    $("contagemAparelhos").innerText =
        `${aparelhosAdmin.length} aparelho${aparelhosAdmin.length === 1 ? "" : "s"}`;

    [...aparelhosAdmin]
        .sort((a, b) =>
            ORDEM_SITUACAO_APARELHO.indexOf(a.situacao) - ORDEM_SITUACAO_APARELHO.indexOf(b.situacao) ||
            emailDoAparelho(a).localeCompare(emailDoAparelho(b), "pt-BR")
        )
        .forEach(aparelho => corpo.appendChild(linhaAparelho(aparelho)));
}


// .select() volta vazio quando o RLS barrou (sem erro): conta como falha
async function salvarAparelho(aparelho, dados, mensagem){

    const { data, error } =
        await supabaseClient
            .from(TABELA_DISPOSITIVOS)
            .update(dados)
            .eq("id", aparelho.id)
            .select("id");

    if(error || !data?.length){

        console.error("[admin] Falha ao salvar o aparelho:", error);

        mostrarToast("Não foi possível salvar o aparelho", true);

        return;
    }

    mostrarToast(mensagem);

    await carregarAparelhos();
}


async function mudarSituacaoAparelho(aparelho, situacao){

    const dados = { situacao };

    if(situacao === "liberado") dados.liberado_em = new Date().toISOString();

    await salvarAparelho(
        aparelho,
        dados,
        situacao === "liberado"
            ? "Aparelho liberado"
            : "Aparelho desconectado (sai em até 2 minutos, ou ao abrir outra página)"
    );
}


async function renomearAparelho(aparelho){

    const nome = window.prompt("Nome deste aparelho (só você vê):", aparelho.nome || "");

    if(nome === null) return;

    await salvarAparelho(aparelho, { nome: nome.trim().slice(0, 80) || null }, "Nome salvo");
}


async function excluirAparelho(aparelho){

    if(!window.confirm(`Excluir este aparelho de ${emailDoAparelho(aparelho)}? Se ele voltar, aparece como pedido novo.`)) return;

    const { error } =
        await supabaseClient
            .from(TABELA_DISPOSITIVOS)
            .delete()
            .eq("id", aparelho.id);

    if(error){

        console.error("[admin] Falha ao excluir o aparelho:", error);

        mostrarToast("Não foi possível excluir o aparelho", true);

        return;
    }

    mostrarToast("Aparelho excluído");

    await carregarAparelhos();
}


async function alternarTravaAparelhos(){

    if(travaAparelhosLigada === null) return;

    const ligar = !travaAparelhosLigada;

    const pendentes =
        aparelhosAdmin.filter(item => item.situacao === "pendente").length;

    const pergunta =
        ligar
            ? "Ligar a trava? A partir de agora, quem não é admin só acessa os dados de aparelho liberado aqui." +
              (pendentes ? ` Há ${pendentes} aparelho(s) aguardando.` : "")
            : "Desligar a trava? Qualquer aparelho volta a acessar com o login e a senha.";

    if(!window.confirm(pergunta)) return;

    const { data, error } =
        await supabaseClient
            .from(TABELA_TRAVA_DISPOSITIVOS)
            .update({ ligada: ligar })
            .eq("id", 1)
            .select("ligada");

    if(error || !data?.length){

        console.error("[admin] Falha ao mudar a trava:", error);

        mostrarToast("Não foi possível mudar a trava", true);

        return;
    }

    mostrarToast(ligar ? "Trava ligada" : "Trava desligada");

    await carregarAparelhos();
}
