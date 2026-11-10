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

// "supabase" aqui é o objeto global que vem do CDN
// (@supabase/supabase-js). Criamos nosso client com outro
// nome pra não conflitar com ele.
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { global: { fetch: fetchSupabase } }
);
