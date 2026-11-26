// ======================================
// AGENDA - SEM INTERNET: A FILA DO QUE AINDA NÃO SUBIU
// ======================================
// Salvar, trocar status, concluir e excluir sem internet (ou sem resposta do servidor) entram numa fila guardada no aparelho (agenda-offline-dados.js), uma entrada por agendamento: "inserir" (id da tela "local-<id_local>"; mexer de novo junta na mesma entrada, excluir tira da fila), "atualizar" (só os campos que mudaram, com o valor de antes da 1ª mudança) ou "lixeira". A tela já mostra a mudança, também depois de recarregar (aplicarFilaNaLista, chamada pelo carregarAgenda). Uma mudança na fila de cada vez, também entre abas (comTravaFila). Quem sobe a fila é o agenda-offline-envio.js. Carregar antes de agenda-init.js.

// { itens: [entradas], ids: { "local-...": id do banco } } (cópia do que está no aparelho)
let filaOffline = { itens: [], ids: {} };

let travaFilaLocal = Promise.resolve();


// ======================================
// A FILA NO APARELHO
// ======================================

function chaveFilaOffline(){

    return `fila:${usuarioAgenda}`;
}


async function lerFilaOffline(){

    const salva = await lerNoAparelho(chaveFilaOffline());

    filaOffline = {
        itens: Array.isArray(salva?.itens) ? salva.itens : [],
        ids: (salva?.ids && typeof salva.ids === "object") ? salva.ids : {}
    };

    return filaOffline;
}


async function gravarFilaOffline(fila){

    if(!(await gravarNoAparelho(chaveFilaOffline(), fila))){

        throw new Error("Não deu para guardar neste aparelho (memória cheia ou navegador bloqueando)");
    }

    filaOffline = fila;
}


// uma mudança na fila de cada vez, também entre abas (navigator.locks)
function comTravaFila(funcao){

    if(navigator.locks?.request) return navigator.locks.request("agendaFilaOffline", funcao);

    const resultado = travaFilaLocal.then(funcao, funcao);

    travaFilaLocal = resultado.catch(() => {});

    return resultado;
}


function idSoDoAparelho(id){

    return typeof id === "string" && id.startsWith("local-");
}


function entradasPendentes(){

    return filaOffline.itens.filter(entrada => !entrada.erro);
}


// tem mudança deste agendamento esperando: a próxima vai atrás dela, na fila
function temPendenciaOffline(id){

    return filaOffline.itens.some(entrada => !entrada.erro && entrada.id === id);
}


function rotuloOffline(item){

    return [item?.plataforma, item?.cliente].filter(Boolean).join(" — ") || "agendamento";
}


function soCamposDoBanco(dados){

    return Object.fromEntries(
        Object.entries(dados || {}).filter(([campo]) => campo in CAMPOS_BANCO)
    );
}


// o valor do jeito que vai para o banco: compara sem diferença de formato
function valorComparavel(campo, valor){

    return JSON.stringify(paraBanco({ [campo]: valor })[CAMPOS_BANCO[campo]] ?? null);
}


// o agendamento da tela com a mudança (mesmo formato do que vem do banco)
function itemComMudanca(base, dados, id){

    return {
        ...doBanco({ ...paraBanco({ ...base, ...dados }), id: id }),
        pendenteOffline: true
    };
}


// ======================================
// GUARDAR UMA MUDANÇA
// ======================================
// acao: "inserir" (id null), "atualizar" ou "lixeira". idLocal: o do agendamento
// novo que já tentou subir. Devolve o item da tela (lixeira: true).

async function gravarOffline(acao, id, dados, idLocal){

    if(!usuarioAgenda){

        throw new Error("Sem internet e sem o login deste aparelho: entre de novo no sistema");
    }

    const resultado =
        await comTravaFila(async () => {

            const fila = await lerFilaOffline();

            const idTela = fila.ids[id] ?? id;

            const daTela = agendamentos.find(ag => ag.id === idTela) || null;

            const entrada = fila.itens.find(item => item.id === idTela);

            const campos = soCamposDoBanco(dados);

            let devolver = null;

            if(acao === "inserir"){

                const novo = idLocal || novoIdLocal();

                const idNovo = `local-${novo}`;

                fila.itens.push({
                    acao: "inserir", id: idNovo, idLocal: novo, dados: campos, antes: {},
                    rotulo: rotuloOffline(campos), em: Date.now(), versao: 1, erro: ""
                });

                devolver = itemComMudanca({}, campos, idNovo);

            }else if(acao === "atualizar"){

                if(entrada?.acao === "inserir"){

                    Object.assign(entrada.dados, campos);

                    entrada.rotulo = rotuloOffline(entrada.dados);

                }else if(idSoDoAparelho(idTela)){

                    throw new Error("Este agendamento já subiu ou saiu da fila: atualize a agenda");

                }else{

                    const alvo =
                        entrada ||
                        { acao: "atualizar", id: idTela, dados: {}, antes: {}, em: Date.now(), versao: 0, erro: "" };

                    Object.entries(campos).forEach(([campo, valor]) => {

                        const mudou =
                            valorComparavel(campo, valor) !== valorComparavel(campo, daTela?.[campo]);

                        if(!mudou && !(campo in alvo.dados)) return;

                        // o valor de antes da 1ª mudança: se no banco estiver outro, alguém mexeu
                        if(daTela && !(campo in alvo.antes)) alvo.antes[campo] = daTela[campo];

                        alvo.dados[campo] = valor;
                    });

                    alvo.rotulo = rotuloOffline({ ...daTela, ...alvo.dados });

                    if(!entrada && Object.keys(alvo.dados).length) fila.itens.push(alvo);
                }

                devolver = itemComMudanca(daTela || {}, campos, idTela);

            }else{

                fila.itens = fila.itens.filter(item => item !== entrada);

                // criado sem internet e excluído antes de subir: é só esquecer
                if(entrada?.acao !== "inserir" && !idSoDoAparelho(idTela)){

                    fila.itens.push({
                        acao: "lixeira", id: idTela, dados: {}, antes: {},
                        rotulo: rotuloOffline(daTela), em: Date.now(), versao: 1, erro: ""
                    });
                }

                devolver = true;
            }

            // a versão muda a cada mexida (a que está subindo sabe que mudou) e,
            // se tinha dado erro, tenta de novo
            const mexida =
                fila.itens.find(item => item.id === (acao === "inserir" ? devolver.id : idTela));

            if(mexida){

                mexida.versao = (mexida.versao || 0) + 1;

                mexida.erro = "";
            }

            await gravarFilaOffline(fila);

            return devolver;
        });

    atualizarAvisoOffline();

    agendarEnvioFila();

    return resultado;
}


// depois de cada carga (do banco ou da cópia): a lista mostra o que está na fila
async function aplicarFilaNaLista(){

    if(!usuarioAgenda) return;

    const fila = await lerFilaOffline();

    fila.itens.forEach(entrada => {

        if(entrada.acao === "lixeira"){

            agendamentos = agendamentos.filter(ag => ag.id !== entrada.id);

            return;
        }

        const item = agendamentos.find(ag => ag.id === entrada.id);

        const novo = {
            ...itemComMudanca(entrada.acao === "inserir" ? {} : (item || {}), entrada.dados, entrada.id),
            erroOffline: entrada.erro || ""
        };

        if(item){

            Object.assign(item, novo);

        }else if(entrada.acao === "inserir"){

            agendamentos.push(novo);
        }
    });

    atualizarAvisoOffline();
}
