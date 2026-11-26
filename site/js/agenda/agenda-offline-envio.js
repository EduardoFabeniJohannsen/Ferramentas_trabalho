// ======================================
// AGENDA - SEM INTERNET: SUBIR A FILA
// ======================================
// Sobe a fila do aparelho (agenda-offline-fila.js) uma entrada de cada vez, numa aba só (navigator.locks): inserir manda o id_local (se já tinha chegado, o banco recusa o repetido e vale o que está lá) e o agendamento ganha o id do banco (trocarIdLocal); atualizar lê antes o agendamento no banco e, no campo que outra pessoa mudou nesse meio tempo, fica o dela (vai para o aviso de conflitos); lixeira chama a função do banco. Mexeram na entrada enquanto ela subia: fica só o que mudou depois. Falta de rede ou login vencido: para e tenta depois; outro erro: marca a entrada e segue. Carregar depois de agenda-offline-fila.js e antes de agenda-init.js.

const INTERVALO_ENVIO_FILA_MS = 30000;

// nomes dos campos no aviso de quem mexeu no mesmo dado
const ROTULOS_CAMPOS_OFFLINE = {
    data: "Data",
    horario: "Horário",
    dataCarregamento: "Data do carregamento",
    horarioCarregamento: "Horário do carregamento",
    tipo: "Tipo",
    status: "Status",
    plataforma: "Plataforma",
    plataformaRecolha: "Máquina que volta",
    cliente: "Cliente",
    proposta: "Proposta",
    transportadora: "Transportadora",
    motorista: "Motorista",
    periodo: "Período",
    origemNome: "Retirada",
    origemEndereco: "Endereço de retirada",
    destinoNome: "Entrega",
    destinoEndereco: "Endereço de entrega",
    frete: "Frete",
    contato: "Contato",
    contatoOrigem: "Contato no local de coleta",
    obsExpedicao: "Observação da expedição",
    obsEntrega: "Observação da entrega"
};


let enviandoFilaOffline = false;

// o login venceu e não renovou: a fila espera a pessoa entrar de novo
let faltaLoginFila = false;

let timerEnvioFila = null;

// ======================================
// SUBIR A FILA
// ======================================

function agendarEnvioFila(atraso = 300){

    if(timerEnvioFila) return;

    timerEnvioFila =
        setTimeout(() => {

            timerEnvioFila = null;

            enviarFilaOffline(false);
        }, atraso);
}


function erroDeLogin(erro){

    return ["PGRST301", "PGRST302"].includes(erro?.code) || /jwt/i.test(String(erro?.message || ""));
}


// a próxima entrada sem erro (cópia: a fila pode mudar enquanto ela sobe)
function proximaEntradaFila(){

    return comTravaFila(async () => {

        const fila = await lerFilaOffline();

        const entrada = fila.itens.find(item => !item.erro);

        return entrada ? JSON.parse(JSON.stringify(entrada)) : null;
    });
}


// { idBanco } (inserir) e { conflitos } (atualizar)
async function enviarEntradaOffline(entrada){

    if(entrada.acao === "inserir"){

        const linha = await inserirNoBanco(entrada.dados, entrada.idLocal);

        return { idBanco: linha.id, conflitos: [] };
    }

    if(entrada.acao === "lixeira"){

        await moverParaLixeiraNoBanco(entrada.id);

        return { conflitos: [] };
    }

    const { data: atual, error } =
        await comTempoLimite(
            supabaseClient
                .from(TABELA_AGENDAMENTOS)
                .select("*")
                .eq("id", entrada.id)
                .is("excluido_em", null)
                .maybeSingle(),
            TEMPO_LIMITE_GRAVAR_MS
        );

    if(error) throw error;

    if(!atual){

        return { conflitos: [{ rotulo: entrada.rotulo, texto: "outra pessoa excluiu; a sua alteração não foi feita" }] };
    }

    const doServidor = doBanco(atual);

    const enviar = {};

    const conflitos = [];

    Object.entries(entrada.dados).forEach(([campo, valor]) => {

        const noBanco = valorComparavel(campo, doServidor[campo]);

        // já está assim
        if(noBanco === valorComparavel(campo, valor)) return;

        if(campo in entrada.antes && noBanco !== valorComparavel(campo, entrada.antes[campo])){

            conflitos.push({
                rotulo: entrada.rotulo,
                texto: `${ROTULOS_CAMPOS_OFFLINE[campo] || campo} ficou ${textoValorOffline(doServidor[campo])} (o seu era ${textoValorOffline(valor)})`
            });

            return;
        }

        enviar[campo] = valor;
    });

    if(Object.keys(enviar).length) await atualizarNoBanco(entrada.id, enviar);

    return { conflitos: conflitos };
}


function textoValorOffline(valor){

    const texto = Array.isArray(valor) ? valor.join("/") : String(valor ?? "");

    return texto ? `"${texto}"` : "vazio";
}


// subiu: sai da fila. Se mexeram nele enquanto subia, fica só o que mudou depois
async function concluirEntradaFila(enviada, resposta){

    await comTravaFila(async () => {

        const fila = await lerFilaOffline();

        const atual = fila.itens.find(item => item.id === enviada.id);

        if(enviada.acao === "inserir"){

            fila.ids[enviada.id] = resposta.idBanco;

            // guarda só os últimos (servem para formulário aberto ou outra aba)
            const ids = Object.entries(fila.ids);

            if(ids.length > 100) fila.ids = Object.fromEntries(ids.slice(-100));
        }

        if(!atual || atual.versao === enviada.versao){

            fila.itens = fila.itens.filter(item => item !== atual);

        }else if(enviada.acao === "inserir"){

            Object.assign(atual, { acao: "atualizar", id: resposta.idBanco, antes: {} });

            delete atual.idLocal;

        }else if(enviada.acao === "atualizar"){

            Object.entries(enviada.dados).forEach(([campo, valor]) => {

                if(valorComparavel(campo, atual.dados[campo]) === valorComparavel(campo, valor)){

                    delete atual.dados[campo];

                }else{

                    atual.antes[campo] = valor;
                }
            });

            if(!Object.keys(atual.dados).length) fila.itens = fila.itens.filter(item => item !== atual);
        }

        await gravarFilaOffline(fila);
    });

    if(enviada.acao === "inserir") trocarIdLocal(enviada.id, resposta.idBanco);

    const idFinal = enviada.acao === "inserir" ? resposta.idBanco : enviada.id;

    const item = agendamentos.find(ag => ag.id === idFinal);

    if(item && !temPendenciaOffline(idFinal)) item.pendenteOffline = false;
}


async function marcarErroFila(enviada, erro){

    await comTravaFila(async () => {

        const fila = await lerFilaOffline();

        const atual = fila.itens.find(item => item.id === enviada.id);

        if(!atual) return;

        atual.erro = mensagemErroSalvar(erro);

        await gravarFilaOffline(fila);
    });
}


// o agendamento criado sem internet ganhou o id do banco
function trocarIdLocal(idTela, idBanco){

    agendamentos.forEach(ag => {

        if(ag.id === idTela) ag.id = idBanco;
    });

    if(idEmEdicao === idTela) idEmEdicao = idBanco;

    const rascunhos = lerRascunhos();

    if(`edit:${idTela}` in rascunhos){

        rascunhos[`edit:${idBanco}`] = rascunhos[`edit:${idTela}`];

        delete rascunhos[`edit:${idTela}`];

        gravarRascunhos(rascunhos);
    }
}


async function rodarFilaOffline(resultado){

    while(true){

        const entrada = await proximaEntradaFila();

        if(!entrada) return;

        try{

            const resposta = await enviarEntradaOffline(entrada);

            await concluirEntradaFila(entrada, resposta);

            resultado.enviados++;

            resultado.conflitos.push(...resposta.conflitos);

        }catch(erro){

            if(erroDeRede(erro)){

                resultado.parou = "rede";

                return;
            }

            if(erroDeLogin(erro)){

                resultado.parou = "login";

                return;
            }

            console.warn("[offline] Alteração recusada pelo banco:", detalhesErro(erro));

            await marcarErroFila(entrada, erro);

            resultado.erros++;
        }
    }
}


// manual = clicou no aviso (diz por que não subiu)
async function enviarFilaOffline(manual){

    clearTimeout(timerEnvioFila);

    timerEnvioFila = null;

    if(enviandoFilaOffline || !usuarioAgenda) return;

    await lerFilaOffline();

    if(!entradasPendentes().length) return atualizarAvisoOffline();

    if(navigator.onLine === false){

        if(manual) mostrarToast(TEXTO_FILA_SEM_INTERNET);

        return atualizarAvisoOffline();
    }

    enviandoFilaOffline = true;

    atualizarAvisoOffline();

    const resultado = { enviados: 0, erros: 0, conflitos: [], parou: "" };

    try{

        // login vencido: o getSession renova (precisa de internet)
        const { data, error } = await supabaseClient.auth.getSession();

        if(!data?.session){

            // sem rede o login vencido não renova; sem erro nenhum = saiu do sistema
            resultado.parou =
                (error && (erroDeRede(error) || error.name === "AuthRetryableFetchError")) ? "rede" : "login";

        }else if(navigator.locks?.request){

            // outra aba já está subindo: ela cuida
            await navigator.locks.request(
                "agendaEnvioOffline",
                { ifAvailable: true },
                trava => trava ? rodarFilaOffline(resultado) : null
            );

        }else{

            await rodarFilaOffline(resultado);
        }

    }catch(erro){

        console.warn("[offline] Falha ao subir a fila:", erro?.message || erro);

        resultado.parou = "rede";

    }finally{

        enviandoFilaOffline = false;
    }

    faltaLoginFila = resultado.parou === "login";

    terminarEnvioFila(resultado, manual);
}
