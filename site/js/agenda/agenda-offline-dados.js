// ======================================
// AGENDA - SEM INTERNET: O QUE FICA NO CELULAR
// ======================================
// Guarda no próprio aparelho (IndexedDB; sem ele, localStorage) a última carga boa da agenda, dos motoristas, das transportadoras e dos clientes, uma cópia por usuário. Sem internet (ou sem resposta do servidor em TEMPO_LIMITE_CARGA_MS) a agenda mostra essa cópia. Também registra o sw.js (a página abre sem internet), diz se um erro foi falta de rede (erroDeRede) e põe tempo limite nas consultas (comTempoLimite). A fila do que foi feito sem internet fica em agenda-offline-fila.js. Carregar antes de agenda-init.js.

const BANCO_LOCAL_NOME = "agendaOffline";

const BANCO_LOCAL_TABELA = "dados";

// sinal fraco: depois disso usa a cópia (a consulta continua, mas a tela não espera)
const TEMPO_LIMITE_CARGA_MS = 20000;

// gravar: depois disso vai para a fila (o id_local impede gravar duas vezes)
const TEMPO_LIMITE_GRAVAR_MS = 15000;

// hora (ms) da cópia que está na tela (0 = a lista veio do servidor)
let agendaDaCopiaEm = 0;

let promessaBancoLocal = null;


// ======================================
// GUARDAR E LER NO APARELHO
// ======================================

// null = sem IndexedDB (aí vai pelo localStorage)
function abrirBancoLocal(){

    if(!promessaBancoLocal){

        promessaBancoLocal = new Promise(resolve => {

            try{

                const pedido = indexedDB.open(BANCO_LOCAL_NOME, 1);

                pedido.onupgradeneeded = () =>
                    pedido.result.createObjectStore(BANCO_LOCAL_TABELA);

                pedido.onsuccess = () => {

                    // outra aba atualizou o banco: solta esta conexão
                    pedido.result.onversionchange = () => pedido.result.close();

                    resolve(pedido.result);
                };

                pedido.onerror = () => resolve(null);

                pedido.onblocked = () => resolve(null);

            }catch(erro){

                resolve(null);
            }
        });
    }

    return promessaBancoLocal;
}


async function lerNoAparelho(chave){

    const banco = await abrirBancoLocal();

    if(!banco){

        try{

            return JSON.parse(localStorage.getItem(`${BANCO_LOCAL_NOME}:${chave}`) || "null");

        }catch(erro){

            return null;
        }
    }

    return new Promise(resolve => {

        try{

            const pedido =
                banco
                    .transaction(BANCO_LOCAL_TABELA)
                    .objectStore(BANCO_LOCAL_TABELA)
                    .get(chave);

            pedido.onsuccess = () => resolve(pedido.result ?? null);

            pedido.onerror = () => resolve(null);

        }catch(erro){

            resolve(null);
        }
    });
}


// valor null apaga. true = ficou gravado
async function gravarNoAparelho(chave, valor){

    const banco = await abrirBancoLocal();

    if(!banco){

        try{

            if(valor === null){

                localStorage.removeItem(`${BANCO_LOCAL_NOME}:${chave}`);

            }else{

                localStorage.setItem(`${BANCO_LOCAL_NOME}:${chave}`, JSON.stringify(valor));
            }

            return true;

        }catch(erro){

            return false;
        }
    }

    return new Promise(resolve => {

        try{

            const transacao = banco.transaction(BANCO_LOCAL_TABELA, "readwrite");

            const tabela = transacao.objectStore(BANCO_LOCAL_TABELA);

            if(valor === null){

                tabela.delete(chave);

            }else{

                tabela.put(valor, chave);
            }

            transacao.oncomplete = () => resolve(true);

            transacao.onerror = () => resolve(false);

            transacao.onabort = () => resolve(false);

        }catch(erro){

            resolve(false);
        }
    });
}


// ======================================
// CÓPIA DA ÚLTIMA CARGA (por usuário)
// ======================================
// nome: "agenda", "motoristas", "transportadoras" ou "clientes"; valor = as
// linhas do jeito que o banco devolveu

function guardarCopiaOffline(nome, valor){

    if(!usuarioAgenda) return Promise.resolve(false);

    return gravarNoAparelho(
        `copia-${nome}:${usuarioAgenda}`,
        { em: Date.now(), valor: valor }
    );
}


// { em, valor } ou null
async function lerCopiaOffline(nome){

    if(!usuarioAgenda) return null;

    const copia = await lerNoAparelho(`copia-${nome}:${usuarioAgenda}`);

    return (copia && Array.isArray(copia.valor)) ? copia : null;
}


function apagarCopiasOffline(){

    return Promise.all(
        ["agenda", "motoristas", "transportadoras", "clientes"]
            .map(nome => gravarNoAparelho(`copia-${nome}:${usuarioAgenda}`, null))
    );
}


// ======================================
// REDE
// ======================================

// a falha foi falta de internet (ou servidor sem responder)? Aí vale a cópia e a
// fila; outros erros (permissão, banco desatualizado) aparecem como sempre
function erroDeRede(erro){

    if(navigator.onLine === false) return true;

    if(erro?.semResposta) return true;

    const texto = String(erro?.message || erro || "");

    // o supabase-js devolve "TypeError: Failed to fetch" (Safari: "Load failed")
    return /failed to fetch|networkerror|network request|load failed|fetch failed|^(typeerror|aborterror|fetcherror):/i.test(texto);
}


// a consulta, ou o erro "sem resposta" depois de ms. Sem internet nem tenta: o
// login vencido ficaria até 30 s tentando renovar (supabase-js) antes de falhar
function comTempoLimite(consulta, ms){

    if(navigator.onLine === false){

        return Promise.reject(Object.assign(new Error("Sem internet"), { semResposta: true }));
    }

    const original = Promise.resolve(consulta);

    // perdeu a corrida: o resultado (ou erro) tardio não vira erro solto
    original.catch(() => {});

    let timer = null;

    const limite =
        new Promise((resolve, rejeitar) => {

            timer = setTimeout(
                () => rejeitar(Object.assign(new Error("Sem resposta do servidor"), { semResposta: true })),
                ms
            );
        });

    return Promise.race([original, limite])
        .finally(() => clearTimeout(timer));
}


// código único do agendamento criado neste aparelho (vai na coluna id_local):
// mandar de novo não grava duas vezes
function novoIdLocal(){

    try{

        if(crypto.randomUUID) return crypto.randomUUID();

        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");

    }catch(erro){

        return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
    }
}


// ======================================
// LOGIN SALVO E SERVICE WORKER
// ======================================

// sem internet o login vencido não renova e o getSession volta vazio: o id
// continua no login guardado pelo Supabase ("sb-...-auth-token")
function usuarioDoLoginSalvo(){

    try{

        const chave =
            Object.keys(localStorage).find(nome =>
                nome.startsWith("sb-") && nome.endsWith("-auth-token")
            );

        if(!chave) return "";

        return JSON.parse(localStorage.getItem(chave) || "null")?.user?.id || "";

    }catch(erro){

        return "";
    }
}


// a página passa a abrir sem internet (sw.js). Só em https (ou no próprio computador)
function registrarSiteOffline(){

    try{

        if(!window.isSecureContext || !("serviceWorker" in navigator)) return;

        navigator.serviceWorker
            .register("sw.js")
            .catch(erro => console.warn("[offline] Não deu para preparar o site sem internet:", erro?.message || erro));

        // pede para o navegador não apagar a cópia quando faltar espaço
        navigator.storage?.persist?.().catch(() => {});

    }catch(erro){

        console.warn("[offline] Não deu para preparar o site sem internet:", erro?.message || erro);
    }
}
