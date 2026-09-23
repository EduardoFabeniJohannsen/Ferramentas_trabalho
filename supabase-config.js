// ======================================
// CONFIGURAÇÃO DO SUPABASE
// ======================================
// Precisa vir DEPOIS do <script> do supabase-js (CDN) e
// ANTES de auth-guard.js / propostas-dados.js / weg.js.

const SUPABASE_URL = "https://qhneylwmrzuesaloqetr.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobmV5bHdtcnp1ZXNhbG9xZXRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMTUwNTcsImV4cCI6MjEwNTY5MTA1N30.83mB99vcxIjGKzD6yc5YrEIac7ktHn86kylkgBPXR4I";

// "supabase" aqui é o objeto global que vem do CDN
// (@supabase/supabase-js). Criamos nosso client com outro
// nome pra não conflitar com ele.
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
