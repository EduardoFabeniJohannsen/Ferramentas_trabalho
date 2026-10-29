// ======================================
// AUTH GUARD
// ======================================
// Inclui esse script em toda página que precisa de login
// (depois de supabase-config.js). Se não tiver sessão ativa,
// manda pra login.html antes da página aparecer. Depois do
// login, confere se o usuário tem acesso a esta página
// (tabela "perfis"); se não tiver, manda pra uma que tenha.

(async function protegerPagina(){

    // Esconde a página até a sessão ser confirmada, pra quem
    // não está logado não ver a tela antes do redirect.
    document.documentElement.style.visibility = "hidden";

    try{

        const { data, error } =
            await supabaseClient.auth.getSession();

        if(error || !data.session){

            // Sem internet o token pode não renovar. Se esse navegador
            // já fez login antes, deixa entrar (os dados continuam
            // protegidos pelo Supabase, não por esta tela).
            const semRede =
                !navigator.onLine ||
                error?.name === "AuthRetryableFetchError";

            if(semRede && existeLoginSalvo()){

                console.warn(
                    "[auth] Sem conexão: usando o login salvo no navegador"
                );

            }else{

                window.location.href = "login.html";

                return;
            }
        }

    }catch(erro){

        console.error("[auth] Erro ao verificar sessão:", erro);
    }

    // Admin vê os itens marcados com class="so-admin"
    // (começam escondidos com display:none no HTML)
    if(await ehAdmin()){

        document
            .querySelectorAll(".so-admin")
            .forEach(elemento => {
                elemento.style.display = "";
            });
    }

    // Sem acesso a esta página: já foi redirecionado
    // (a página continua escondida até a troca)
    if(!(await liberarPaginaAtual())) return;

    document.documentElement.style.visibility = "";

})();


// ======================================
// LOGIN SALVO NO NAVEGADOR
// ======================================
// O Supabase guarda a sessão no localStorage numa chave
// "sb-...-auth-token". O logout apaga essa chave.

function existeLoginSalvo(){

    try{

        return Object.keys(localStorage).some(
            chave =>
                chave.startsWith("sb-") &&
                chave.endsWith("-auth-token")
        );

    }catch(erro){

        return false;
    }
}


// ======================================
// ADMIN
// ======================================
// O papel vem de app_metadata.role no login (o usuário não
// consegue alterar esse campo). Isso só controla o que aparece
// na tela — quem protege os dados de verdade são as policies
// de RLS no Supabase.

async function ehAdmin(){

    try{

        const { data } =
            await supabaseClient.auth.getSession();

        return (
            data?.session?.user?.app_metadata?.role === "admin"
        );

    }catch(erro){

        return false;
    }
}


// ======================================
// PERFIL E PERMISSÕES
// ======================================
// Cada usuário tem uma linha na tabela "perfis":
// - acessos: páginas liberadas (nome do arquivo sem .html, em
//   minúsculas: index, propostas, agenda, estoque, tabelas, weg,
//   transportadoras = só ver) mais "fretes" (dados das tabelas de frete);
// - filiais: filiais do estoque que ele enxerga (ITAJAI, JOINVILLE);
// - ativo: false bloqueia o usuário.
// Admin (app_metadata.role) tem acesso a tudo. Sem linha no
// banco (ou sem conexão e sem cópia salva), só "propostas".
// Isso só controla a tela; o que protege os dados é o RLS.
// O perfil fica copiado no navegador pra funcionar sem internet.

const CHAVE_PERFIL_CACHE = "authPerfil";

let perfilUsuario = null;

let promessaPerfil = null;


// carrega o perfil uma vez só; quem precisar dele dá await aqui
function carregarPerfil(){

    if(!promessaPerfil){

        promessaPerfil = buscarPerfil();
    }

    return promessaPerfil;
}


function salvarPerfilCache(id, perfil){

    try{

        localStorage.setItem(
            CHAVE_PERFIL_CACHE,
            JSON.stringify({ id: id, perfil: perfil })
        );

    }catch(erro){

        console.error("[auth] Erro ao salvar o perfil offline:", erro);
    }
}


// id vazio (sem sessão, offline) aceita a cópia que estiver salva
function lerPerfilCache(id){

    try{

        const salvo =
            JSON.parse(localStorage.getItem(CHAVE_PERFIL_CACHE) || "null");

        if(!salvo || !salvo.perfil) return null;

        if(id && salvo.id !== id) return null;

        return salvo.perfil;

    }catch(erro){

        return null;
    }
}


async function buscarPerfil(){

    const padrao = {
        admin: false,
        acessos: ["propostas"],
        filiais: [],
        ativo: true
    };

    let usuario = null;

    try{

        const { data } =
            await supabaseClient.auth.getSession();

        usuario = data?.session?.user || null;

        if(usuario){

            if(usuario.app_metadata?.role === "admin"){

                perfilUsuario = {
                    admin: true,
                    acessos: [],
                    filiais: [],
                    ativo: true
                };

            }else{

                const { data: linha, error } =
                    await supabaseClient
                        .from("perfis")
                        .select("acessos, filiais, ativo")
                        .eq("id", usuario.id)
                        .maybeSingle();

                if(error) throw error;

                perfilUsuario =
                    linha
                        ? {
                            admin: false,
                            acessos: linha.acessos || [],
                            filiais: linha.filiais || [],
                            ativo: linha.ativo !== false
                        }
                        : padrao;
            }

            salvarPerfilCache(usuario.id, perfilUsuario);

            return perfilUsuario;
        }

    }catch(erro){

        console.error("[auth] Falha ao ler o perfil:", erro);
    }

    // sem conexão ou sem sessão: usa a cópia salva (ou só propostas)
    perfilUsuario =
        lerPerfilCache(usuario?.id) || padrao;

    return perfilUsuario;
}


// "admin" é só pra admin; o resto vem da lista de acessos
function temAcesso(recurso){

    if(!perfilUsuario) return false;

    if(recurso === "admin") return perfilUsuario.admin;

    return (
        perfilUsuario.admin ||
        perfilUsuario.acessos.includes(recurso)
    );
}


function temFilial(filial){

    if(!perfilUsuario) return false;

    return (
        perfilUsuario.admin ||
        perfilUsuario.filiais.includes(filial)
    );
}


// WEG.html -> "weg", propostas.html -> "propostas"
function recursoDaPagina(arquivo){

    return String(arquivo || "")
        .replace(/\.html$/i, "")
        .toLowerCase();
}


// nome do arquivo desta página (endereço sem nome = index.html)
function nomeArquivoAtual(){

    let atual = "";

    try{

        atual =
            decodeURIComponent(
                window.location.pathname.split("/").pop() || ""
            );

    }catch(erro){

        atual = "";
    }

    return atual || "index.html";
}


// páginas pra onde mandar quem abriu uma página sem acesso
// (a primeira que ele tiver)
const PAGINAS_DESTINO = [
    "propostas.html",
    "index.html",
    "agenda.html",
    "estoque.html",
    "tabelas.html",
    "WEG.html"
];


async function sairDoSistema(aviso){

    alert(aviso);

    await supabaseClient.auth.signOut();

    window.location.href = "login.html";
}


// true = pode ficar nesta página; false = já foi redirecionado
async function liberarPaginaAtual(){

    const perfil = await carregarPerfil();

    if(!perfil.ativo){

        await sairDoSistema("Usuário desativado. Fale com o administrador.");

        return false;
    }

    if(temAcesso(recursoDaPagina(nomeArquivoAtual()))) return true;

    const destino =
        PAGINAS_DESTINO.find(
            arquivo => temAcesso(recursoDaPagina(arquivo))
        );

    if(destino){

        window.location.href = destino;

        return false;
    }

    await sairDoSistema("Sem acesso a nenhuma página. Fale com o administrador.");

    return false;
}


// ======================================
// LOGOUT
// ======================================
// Chamado pelo botão "Sair" na topbar.

async function fazerLogout(){

    await supabaseClient.auth.signOut();

    window.location.href = "login.html";
}
