// ======================================
// AGENDA - SEM INTERNET: O QUE APARECE NA TELA
// ======================================
// O aviso da barra (botão #btnOffline): "📴 Sem conexão · dados de 14:30", "⏳ 2 para enviar" ou "⚠️ 1 não subiu" (tocar envia agora ou mostra o erro, com tentar de novo e descartar). A marca "⏳ só neste aparelho" no agendamento que ainda não subiu, o aviso de quando outra pessoa mudou o mesmo campo, a pergunta antes de Sair com alteração na fila (sair apaga a fila e a cópia deste aparelho) e as ligações (iniciarOffline, chamada pelo agenda-init.js). Carregar depois de agenda-offline-envio.js e antes de agenda-init.js.

const TEXTO_FILA_SEM_INTERNET =
    "Sem internet: o que você salvar fica guardado neste aparelho e sobe sozinho quando a internet voltar";


// "14:30" (hoje) ou "25/11 14:30"
function horaDaCopiaOffline(em){

    const data = new Date(em);

    const hora =
        `${String(data.getHours()).padStart(2, "0")}:${String(data.getMinutes()).padStart(2, "0")}`;

    if(data.toDateString() === new Date().toDateString()) return hora;

    return `${String(data.getDate()).padStart(2, "0")}/${String(data.getMonth() + 1).padStart(2, "0")} ${hora}`;
}


function atualizarAvisoOffline(){

    const botao = $("btnOffline");

    if(!botao) return;

    const pendentes = entradasPendentes().length;

    const comErro = filaOffline.itens.length - pendentes;

    let texto = "";

    let titulo = "";

    if(comErro){

        texto = `⚠️ ${comErro} não ${comErro === 1 ? "subiu" : "subiram"}`;

        titulo = "Alteração feita sem internet que o banco recusou: toque para ver";

    }else if(pendentes && faltaLoginFila){

        texto = `🔑 ${pendentes} esperando login`;

        titulo = "O login venceu: entre de novo no sistema para enviar o que foi feito sem internet";

    }else if(pendentes){

        texto =
            enviandoFilaOffline
                ? `⏳ Enviando ${pendentes}...`
                : `${navigator.onLine === false ? "📴" : "⏳"} ${pendentes} para enviar`;

        titulo = "Feito sem internet: está guardado neste aparelho e sobe sozinho quando a internet voltar. Toque para enviar agora";

    }else if(navigator.onLine === false || agendaDaCopiaEm){

        texto =
            "📴 Sem conexão" +
            (agendaDaCopiaEm ? ` · dados de ${horaDaCopiaOffline(agendaDaCopiaEm)}` : "");

        titulo = "Mostrando a agenda guardada neste aparelho. " + TEXTO_FILA_SEM_INTERNET;
    }

    botao.style.display = texto ? "" : "none";

    botao.textContent = texto;

    botao.title = titulo;

    botao.classList.toggle("com-erro", comErro > 0);
}


async function clicarAvisoOffline(){

    await lerFilaOffline();

    const comErro = filaOffline.itens.filter(entrada => entrada.erro);

    if(comErro.length){

        const lista =
            comErro.map(entrada => `• ${entrada.rotulo}: ${entrada.erro}`).join("\n");

        if(confirm(`Não subiram para a agenda:\n\n${lista}\n\nOK = tentar enviar de novo`)){

            await mudarErrosFila(entrada => { entrada.erro = ""; return true; });

            return enviarFilaOffline(true);
        }

        if(confirm("Descartar estas alterações? Elas saem deste aparelho e não vão para a agenda.")){

            await mudarErrosFila(() => false);

            await recarregarAgenda(false);
        }

        return atualizarAvisoOffline();
    }

    if(entradasPendentes().length) return enviarFilaOffline(true);

    if(navigator.onLine === false) return mostrarToast(TEXTO_FILA_SEM_INTERNET);

    recarregarAgenda(true);
}


// funcao(entrada com erro): true = fica, false = sai da fila
function mudarErrosFila(funcao){

    return comTravaFila(async () => {

        const fila = await lerFilaOffline();

        fila.itens = fila.itens.filter(entrada => !entrada.erro || funcao(entrada));

        await gravarFilaOffline(fila);
    });
}


function terminarEnvioFila(resultado, manual){

    atualizarAvisoOffline();

    if(resultado.enviados){

        // os outros navegadores e esta lista (ids e dados do banco)
        avisarMudancaNaAgenda();

        agendarRecargaViva();

        mostrarToast(
            resultado.enviados === 1
                ? "A alteração feita sem internet subiu para a agenda"
                : `${resultado.enviados} alterações feitas sem internet subiram para a agenda`
        );
    }

    if(resultado.conflitos.length){

        alert(
            "Enquanto você estava sem internet, outra pessoa mudou os mesmos dados. Ficou o que ela salvou:\n\n" +
            resultado.conflitos.map(conflito => `• ${conflito.rotulo}: ${conflito.texto}`).join("\n") +
            "\n\nConfira e altere de novo se precisar."
        );
    }

    if(resultado.erros){

        mostrarToast("Uma alteração feita sem internet não subiu: toque no ⚠️ para ver", true);

    }else if(resultado.parou === "login"){

        mostrarToast("Entre de novo no sistema para enviar o que foi feito sem internet", true);

    }else if(resultado.parou === "rede" && manual){

        mostrarToast(TEXTO_FILA_SEM_INTERNET);
    }
}


// fim do toast de quem salvou: diz que ficou só no aparelho
function textoSalvoOffline(item){

    return item?.pendenteOffline ? " neste aparelho: sobe quando a internet voltar" : "";
}


// agendamento que ainda não subiu (agenda-linhas.js)
function marcarLinhaOffline(linha, item){

    if(!item.pendenteOffline) return;

    linha.classList.add("ag-offline");

    const marca =
        criar("span", "ag-offline-marca", item.erroOffline ? "⚠️ não subiu" : "⏳ só neste aparelho");

    marca.title =
        item.erroOffline ||
        "Salvo sem internet: sobe sozinho quando a internet voltar";

    const titulo =
        linha.querySelector('td[data-coluna="titulo"] .ag-conteudo') ||
        linha.querySelector("td .ag-conteudo");

    if(titulo) titulo.appendChild(marca);
}


// antes de Sair (auth-guard.js): o que não subiu se perderia
async function confirmarSaidaOffline(){

    if(!usuarioAgenda) return true;

    const fila = await lerFilaOffline();

    if(
        fila.itens.length &&
        !confirm(`Tem ${fila.itens.length} alteração(ões) da agenda feita(s) sem internet que ainda não subiram. Se sair agora, elas se perdem.\n\nSair mesmo assim?`)
    ){
        return false;
    }

    // o próximo login neste aparelho não vê a agenda de quem saiu
    await gravarNoAparelho(chaveFilaOffline(), null);

    await apagarCopiasOffline();

    return true;
}


function iniciarOffline(){

    registrarSiteOffline();

    window.addEventListener("online", () => {

        atualizarAvisoOffline();

        agendarEnvioFila(500);

        // a lista pode estar vindo da cópia
        agendarRecargaViva();
    });

    window.addEventListener("offline", atualizarAvisoOffline);

    document.addEventListener("visibilitychange", () => {

        if(!document.hidden) agendarEnvioFila(500);
    });

    // o evento online nem sempre vem (sinal que volta devagar)
    setInterval(
        () => {

            if(!document.hidden && entradasPendentes().length) enviarFilaOffline(false);
        },
        INTERVALO_ENVIO_FILA_MS
    );

    agendarEnvioFila(0);
}
