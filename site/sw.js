// ======================================
// SERVICE WORKER: O SITE ABRE SEM INTERNET
// ======================================
// Registrado pela agenda (agenda-offline-dados.js). Fica na raiz do site para
// valer em todas as páginas. Com internet, tudo vem do servidor como sempre (e a
// cópia do celular é renovada); sem internet, cada arquivo sai da última cópia.
// Ao instalar já guarda a agenda.html e os arquivos dela (lidos do próprio HTML),
// para a agenda abrir sem internet mesmo sem ter sido aberta de novo.
// Sinal fraco: a página espera ESPERA_PAGINA_MS e abre a cópia; nos
// JANELA_SEM_REDE_MS seguintes os arquivos dela vêm direto da cópia (todos da
// mesma versão). Abrir a página de novo sempre tenta a rede primeiro. Para desligar de vez: publicar um sw.js que só chama
// self.registration.unregister().

const CACHE_SITE = "site-offline-v1";

// as páginas que abrem sem internet (com os arquivos que elas carregam)
const PAGINAS_OFFLINE = ["agenda.html"];

// usados pelo CSS, que o HTML não cita
const EXTRAS_OFFLINE = ["icon.png", "fonts/inter-latin-wght-normal.woff2"];

const ESPERA_PAGINA_MS = 6000;

const JANELA_SEM_REDE_MS = 30000;

let semRedeAte = 0;


function enderecoNoSite(caminho){

    return new URL(caminho, self.registration.scope).href;
}


// o ?v= (atualizacao-sistema.js) não cria outra cópia do mesmo arquivo
function chaveDaCopia(endereco){

    const url = new URL(endereco);

    return url.origin + url.pathname;
}


async function guardarArquivo(cache, caminho){

    try{

        const resposta = await fetch(enderecoNoSite(caminho), { cache: "reload" });

        if(resposta.ok && !resposta.redirected){

            await cache.put(chaveDaCopia(resposta.url), resposta);
        }

    }catch(erro){

        // sem internet ao instalar: fica para a próxima vez que o arquivo vier
    }
}


async function guardarPagina(cache, pagina){

    const resposta = await fetch(enderecoNoSite(pagina), { cache: "reload" });

    if(!resposta.ok || resposta.redirected) return;

    const html = await resposta.clone().text();

    await cache.put(chaveDaCopia(resposta.url), resposta);

    // só os arquivos do próprio site (endereço relativo)
    const arquivos =
        [...html.matchAll(/(?:src|href)="([^"#?:]+\.(?:js|css|png|woff2))"/g)]
            .map(achou => achou[1])
            .filter(caminho => !caminho.startsWith("//"));

    await Promise.all(
        [...new Set([...arquivos, ...EXTRAS_OFFLINE])]
            .map(caminho => guardarArquivo(cache, caminho))
    );
}


self.addEventListener("install", evento => {

    evento.waitUntil((async () => {

        const cache = await caches.open(CACHE_SITE);

        for(const pagina of PAGINAS_OFFLINE){

            try{

                await guardarPagina(cache, pagina);

            }catch(erro){

                // sem internet: a cópia vai sendo feita conforme os arquivos vierem
            }
        }

        await self.skipWaiting();
    })());
});


self.addEventListener("activate", evento => {

    evento.waitUntil((async () => {

        const nomes = await caches.keys();

        await Promise.all(
            nomes
                .filter(nome => nome.startsWith("site-offline-") && nome !== CACHE_SITE)
                .map(nome => caches.delete(nome))
        );

        await self.clients.claim();
    })());
});


async function copiaGuardada(pedido){

    const cache = await caches.open(CACHE_SITE);

    return cache.match(chaveDaCopia(pedido.url));
}


function esperar(ms){

    return new Promise(resolve => setTimeout(() => resolve(null), ms));
}


async function responder(evento){

    const pedido = evento.request;

    const navegacao = pedido.mode === "navigate";

    // a página acabou de abrir pela cópia: os arquivos dela também (abrir a
    // página de novo sempre tenta a rede, e se ela responder a janela fecha)
    if(!navegacao && Date.now() < semRedeAte){

        const guardada = await copiaGuardada(pedido);

        if(guardada) return guardada;
    }

    const daRede = fetch(pedido);

    // a resposta boa renova a cópia do celular (a cópia é tirada antes de a
    // página começar a ler a resposta)
    evento.waitUntil(
        daRede
            .then(resposta => {

                if(!resposta.ok || resposta.redirected || resposta.type !== "basic") return;

                const copia = resposta.clone();

                return caches.open(CACHE_SITE)
                    .then(cache => cache.put(chaveDaCopia(pedido.url), copia));
            })
            .catch(() => {})
    );

    if(navegacao){

        const guardada = await copiaGuardada(pedido);

        if(guardada){

            const primeira =
                await Promise.race([
                    daRede.catch(() => null),
                    esperar(ESPERA_PAGINA_MS)
                ]);

            if(primeira){

                semRedeAte = 0;

                return primeira;
            }

            // sem rede ou sinal fraco demais: abre a cópia
            semRedeAte = Date.now() + JANELA_SEM_REDE_MS;

            return guardada;
        }
    }

    try{

        const resposta = await daRede;

        if(navegacao) semRedeAte = 0;

        return resposta;

    }catch(erro){

        const guardada = await copiaGuardada(pedido);

        if(guardada) return guardada;

        throw erro;
    }
}


self.addEventListener("fetch", evento => {

    const pedido = evento.request;

    if(pedido.method !== "GET") return;

    const url = new URL(pedido.url);

    // Supabase, Google e o próprio sw.js: direto, sem cópia
    if(url.origin !== self.location.origin) return;

    if(url.pathname.endsWith("/sw.js")) return;

    evento.respondWith(responder(evento));
});
