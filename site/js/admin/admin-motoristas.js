// ======================================
// ADMIN - LOGIN DE MOTORISTA
// ======================================
// Coluna "Motorista" da tabela de usuários: qual motorista cadastrado (página Transportadoras) é este login (perfis.motorista_id). Com o acesso "Minhas entregas (motorista)", ele vê em motorista.html só os agendamentos com o nome dele, pela função entregas_motorista. Sem a coluna no banco (SQL não aplicado), a lista fica desligada com o aviso. Carregar depois de admin-dados.js e antes de admin-tela.js.


// "column perfis.motorista_id does not exist" (o SQL ainda não rodou)
function faltaColunaMotoristaAdmin(erro){

    return (
        ["PGRST204", "42703"].includes(erro?.code) ||
        /column/i.test(String(erro?.message || ""))
    ) && /motorista_id/.test(String(erro?.message || ""));
}


async function carregarMotoristasAdmin(){

    try{

        const { data, error } =
            await supabaseClient
                .from("motoristas")
                .select("id, transportadora, nome")
                .order("nome");

        if(error) throw error;

        motoristasAdmin = data || [];

    }catch(erro){

        console.error("[admin] Falha ao carregar os motoristas:", erro);

        motoristasAdmin = [];

        mostrarToast("Falha ao carregar os motoristas", true);
    }
}


// "João Silva · Transportes Alfa"
function rotuloMotoristaAdmin(motorista){

    return [motorista.nome, motorista.transportadora].filter(Boolean).join(" · ");
}


// as opções do select: nenhum + os motoristas, separados por transportadora
function opcoesMotoristaAdmin(select, atual){

    const nenhum = criar("option", "", "—");

    nenhum.value = "";

    select.appendChild(nenhum);

    const transportadoras =
        [...new Set(motoristasAdmin.map(motorista => motorista.transportadora || ""))]
            .sort((a, b) => a.localeCompare(b, "pt-BR"));

    transportadoras.forEach(transportadora => {

        const grupo = document.createElement("optgroup");

        grupo.label = transportadora || "Sem transportadora";

        motoristasAdmin
            .filter(motorista => (motorista.transportadora || "") === transportadora)
            .forEach(motorista => {

                const opcao = criar("option", "", motorista.nome);

                opcao.value = String(motorista.id);

                grupo.appendChild(opcao);
            });

        select.appendChild(grupo);
    });

    // motorista que saiu do cadastro (ou a lista não carregou): não some da tela
    if(atual && !motoristasAdmin.some(motorista => String(motorista.id) === String(atual))){

        const extra = criar("option", "", `Motorista nº ${atual} (fora do cadastro)`);

        extra.value = String(atual);

        select.appendChild(extra);
    }

    select.value = atual ? String(atual) : "";
}


function criarCelulaMotoristaAdmin(perfil){

    const td = document.createElement("td");

    td.className = "col-motorista";

    const select = document.createElement("select");

    select.className = "select-motorista-admin";

    if(semColunaMotoristaAdmin){

        select.disabled = true;

        select.title = "Falta rodar no Supabase o SQL do login de motorista";

        opcoesMotoristaAdmin(select, null);

        td.appendChild(select);

        return td;
    }

    select.title = "Qual motorista é este login (ele vê em Minhas entregas só as entregas dele)";

    opcoesMotoristaAdmin(select, perfil.motorista_id);

    select.addEventListener("change", async () => {

        const anterior = perfil.motorista_id ?? null;

        const escolhido = select.value ? Number(select.value) : null;

        select.disabled = true;

        const salvou = await salvarPerfilAdmin(perfil, { motorista_id: escolhido });

        select.disabled = false;

        if(!salvou){

            select.value = anterior ? String(anterior) : "";

            return;
        }

        // motorista escolhido sem o acesso da página: ele não conseguiria abrir
        if(escolhido && !perfil.acessos.includes("motorista")){

            mostrarToast("Salvo. Marque também \"Minhas entregas (motorista)\" para ele abrir a página");
        }
    });

    td.appendChild(select);

    return td;
}
