// ======================================
// PRESENÇA - QUEM ESTÁ USANDO O SISTEMA
// ======================================
// Cada página aberta informa em qual página a pessoa está e se está usando,
// parada ou com a aba em segundo plano. O painel do admin (admin-online.js) lê
// isso. Não fica nada gravado: fechou a página, some. Vai o id do usuário, a
// página, o estado, o aparelho (celular/computador, marca, navegador) e a cidade
// aproximada pelo IP (o e-mail o admin busca na tabela perfis).
// Carregar depois de helpers.js e auth-guard.js.

// sem mexer na página por esse tempo conta como parado
const LIMITE_PARADO_MS = 2 * 60 * 1000;

const INTERVALO_CONFERIR_PRESENCA_MS = 20000;

// cidade pelo IP: serviço gratuito, sem chave. Guardada no navegador por um
// tempo para não consultar a cada página.
const URL_CIDADE_IP = "https://get.geojs.io/v1/ip/geo.json";

const CHAVE_CIDADE_IP = "presencaCidade";

const VALIDADE_CIDADE_IP_MS = 6 * 60 * 60 * 1000;

// marca pelo começo do modelo que o Android informa
const MARCAS_ANDROID = [
    [/^(SM-|GT-|Galaxy|samsung)/i, "Samsung"],
    [/^(Redmi|POCO|Mi |MI |Xiaomi|M\d{4}[A-Z]|2\d{3}[A-Z0-9]{4,})/i, "Xiaomi"],
    [/^(moto|motorola|XT\d)/i, "Motorola"],
    [/^Pixel/i, "Google"],
    [/^(LM-|LG)/i, "LG"],
    [/^(RMX|realme)/i, "Realme"],
    [/^(CPH|OPPO)/i, "Oppo"],
    [/^(ASUS|ZenFone)/i, "Asus"],
    [/^Nokia/i, "Nokia"]
];

let canalPresenca = null;

// { tipo, aparelho, navegador, cidade }
let aparelhoPresenca = null;

// "usando", "parado" ou "oculto"
let estadoPresenca = "";

let estadoPresencaDesde = 0;

let ultimoUsoPresenca = Date.now();


function calcularEstadoPresenca(){

    if(document.hidden) return "oculto";

    return Date.now() - ultimoUsoPresenca >= LIMITE_PARADO_MS
        ? "parado"
        : "usando";
}


// só avisa quando muda (forcar = acabou de conectar ou reconectar)
function enviarPresenca(forcar){

    const estado = calcularEstadoPresenca();

    if(estado !== estadoPresenca){

        estadoPresenca = estado;

        estadoPresencaDesde = Date.now();

    }else if(!forcar){

        return;
    }

    if(!canalPresenca) return;

    canalPresenca.track({
        pagina: recursoDaPagina(nomeArquivoAtual()) || "index",
        estado,
        desde: estadoPresencaDesde,
        ...(aparelhoPresenca || {})
    });
}


function navegadorDoTexto(ua){

    if(/Edg(A|iOS)?\//.test(ua)) return "Edge";

    if(/OPR\/|Opera/.test(ua)) return "Opera";

    if(/SamsungBrowser\//.test(ua)) return "Samsung Internet";

    if(/FxiOS|Firefox\//.test(ua)) return "Firefox";

    if(/CriOS|Chrome\//.test(ua)) return "Chrome";

    if(/Safari\//.test(ua)) return "Safari";

    return "";
}


// "Samsung SM-S918B", "Xiaomi Redmi Note 12", "Android"
function aparelhoAndroid(modelo){

    const nome = String(modelo || "").trim();

    // o Chrome novo esconde o modelo no texto ("K")
    if(!nome || nome === "K") return "Android";

    const marca = MARCAS_ANDROID.find(([padrao]) => padrao.test(nome));

    if(!marca) return nome;

    return nome.toLowerCase().startsWith(marca[1].toLowerCase())
        ? nome
        : `${marca[1]} ${nome}`;
}


// ua = navigator.userAgent; modelo = o que o Chrome do Android informa à parte;
// toques = navigator.maxTouchPoints (iPad se apresenta como Mac)
function descreverAparelho(ua, modelo, toques){

    const navegador = navegadorDoTexto(ua);

    if(/iPhone|iPod/.test(ua)) return { tipo: "celular", aparelho: "iPhone", navegador };

    if(/iPad/.test(ua) || (/Macintosh/.test(ua) && toques > 1)){

        return { tipo: "tablet", aparelho: "iPad", navegador };
    }

    if(/Android/.test(ua)){

        const doTexto = (ua.match(/Android[^;)]*;\s*([^;)]+)/) || [])[1];

        return {
            tipo: /Mobile/.test(ua) ? "celular" : "tablet",
            aparelho: aparelhoAndroid(modelo || String(doTexto || "").replace(/\s*Build\/.*$/, "")),
            navegador
        };
    }

    const sistema =
        /Windows/.test(ua) ? "Windows"
            : /Macintosh|Mac OS X/.test(ua) ? "Mac"
            : /CrOS/.test(ua) ? "Chromebook"
            : /Linux/.test(ua) ? "Linux"
            : "";

    return { tipo: "computador", aparelho: sistema, navegador };
}


async function modeloDoAndroid(){

    try{

        const dados =
            await navigator.userAgentData?.getHighEntropyValues?.(["model"]);

        return dados?.model || "";

    }catch(erro){

        return "";
    }
}


// "Itajaí/Santa Catarina". Falhou (sem internet, bloqueador): fica sem cidade.
async function cidadeDoIP(){

    const guardada = lerLocalJSON(CHAVE_CIDADE_IP);

    if(guardada && Date.now() - guardada.quando < VALIDADE_CIDADE_IP_MS){

        return guardada.cidade;
    }

    try{

        const resposta = await fetch(URL_CIDADE_IP);

        if(!resposta.ok) return "";

        const dados = await resposta.json();

        const cidade =
            [dados.city, dados.region]
                .filter(Boolean)
                .join("/");

        gravarLocalJSON(CHAVE_CIDADE_IP, { cidade, quando: Date.now() });

        return cidade;

    }catch(erro){

        return "";
    }
}


// antes de conectar não reenvia: ao conectar já vai com o aparelho
function reenviarComAparelho(){

    if(canalPresenca?.state === "joined") enviarPresenca(true);
}


// o aparelho sai na hora; a cidade chega depois e reenvia a presença
async function identificarAparelho(){

    aparelhoPresenca =
        descreverAparelho(
            navigator.userAgent,
            await modeloDoAndroid(),
            navigator.maxTouchPoints || 0
        );

    reenviarComAparelho();

    const cidade = await cidadeDoIP();

    if(!cidade) return;

    aparelhoPresenca = { ...aparelhoPresenca, cidade };

    reenviarComAparelho();
}


async function iniciarPresenca(){

    const { data } = await supabaseClient.auth.getSession();

    const usuario = data?.session?.user?.id;

    if(!usuario) return;

    canalPresenca =
        supabaseClient.channel(
            "usuarios-online",
            { config: { presence: { key: usuario } } }
        );

    canalPresenca
        .on(
            "presence",
            { event: "sync" },
            () => {

                // só existe na página do admin
                if(typeof desenharUsuariosOnline === "function"){

                    desenharUsuariosOnline();
                }
            }
        )
        .subscribe(estado => {

            if(estado === "SUBSCRIBED") enviarPresenca(true);
        });

    ["keydown", "pointerdown", "pointermove", "input", "wheel"].forEach(evento => {

        document.addEventListener(
            evento,
            () => {

                ultimoUsoPresenca = Date.now();

                if(estadoPresenca === "parado") enviarPresenca();
            },
            { capture: true, passive: true }
        );
    });

    document.addEventListener("visibilitychange", () => {

        if(!document.hidden) ultimoUsoPresenca = Date.now();

        enviarPresenca();
    });

    setInterval(() => enviarPresenca(), INTERVALO_CONFERIR_PRESENCA_MS);

    identificarAparelho();
}


iniciarPresenca().catch(erro => {

    console.error("[presença] Falha ao iniciar:", erro);
});
