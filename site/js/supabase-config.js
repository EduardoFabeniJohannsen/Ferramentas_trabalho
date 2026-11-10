// ======================================
// CONFIGURAÇÃO DO SUPABASE
// ======================================
// Precisa vir DEPOIS do <script> do supabase-js (js/vendor/) e
// ANTES de auth-guard.js / propostas-dados.js / weg.js.

const SUPABASE_URL = "https://qhneylwmrzuesaloqetr.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobmV5bHdtcnp1ZXNhbG9xZXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMTUwNTcsImV4cCI6MjEwNTY5MTA1N30.83mB99vcxIjGKzD6yc5YrEIac7ktHn86kylkgBPXR4I";

// "JWT issued at future" (PGRST303): o login acabou de ser renovado e o relógio
// do banco está uns segundos atrás do relógio do login, então o banco recusa o
// token novo. Esperar um pouco e repetir resolve, sem a pessoa ver erro.
const ESPERAS_JWT_FUTURO_MS = [1500, 3000];

async function fetchSupabase(endereco, opcoes){

    for(let tentativa = 0; ; tentativa++){

        const resposta = await fetch(endereco, opcoes);

        if(resposta.status !== 401 || tentativa >= ESPERAS_JWT_FUTURO_MS.length){

            return resposta;
        }

        let codigo = "";

        try{

            codigo = (await resposta.clone().json())?.code || "";

        }catch(erro){}

        if(codigo !== "PGRST303") return resposta;

        await new Promise(pronto => setTimeout(pronto, ESPERAS_JWT_FUTURO_MS[tentativa]));
    }
}

// ======================================
// CHAVE DO APARELHO (trava de aparelhos)
// ======================================
// Cada navegador sorteia uma chave e guarda no localStorage. Ela vai em toda
// chamada ao Supabase (cabeçalho x-dispositivo): com a trava ligada, o banco só
// entrega dados a aparelho liberado pelo admin (dispositivo.js, admin-aparelhos.js).
// Sair do login não apaga a chave: o aparelho continua o mesmo.
// Sem localStorage (janela anônima bloqueada), a chave vale só nesta aba.

const CHAVE_LOCAL_DISPOSITIVO = "dispositivoChave";

function chaveDoDispositivo(){

    let chave = "";

    try{

        chave = localStorage.getItem(CHAVE_LOCAL_DISPOSITIVO) || "";

    }catch(erro){}

    if(/^[0-9a-f]{64}$/.test(chave)) return chave;

    const bytes = new Uint8Array(32);

    crypto.getRandomValues(bytes);

    chave = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");

    try{

        localStorage.setItem(CHAVE_LOCAL_DISPOSITIVO, chave);

    }catch(erro){}

    return chave;
}

const CHAVE_DISPOSITIVO = chaveDoDispositivo();

// "supabase" aqui é o objeto global da biblioteca (js/vendor/supabase-*.js).
// Criamos nosso client com outro nome pra não conflitar com ele.
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { global: { fetch: fetchSupabase, headers: { "x-dispositivo": CHAVE_DISPOSITIVO } } }
);
