// ======================================
// TABELAS - EDITOR (admin)
// ======================================
// Linhas editáveis, salvar, adicionar e excluir.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

function criarLinhaTabela(config, linha){

    const tr = document.createElement("tr");

    tr.dataset.id = linha.id;

    const tdId = document.createElement("td");

    tdId.className = "col-id";

    tdId.innerText = linha.id;

    tr.appendChild(tdId);

    config.colunas.forEach(coluna => {

        const td = document.createElement("td");

        const input =
            criarCampo(linha[coluna.campo], coluna.campo);

        input.addEventListener(
            "change",
            () => salvarCampo(linha, input)
        );

        td.appendChild(input);

        tr.appendChild(td);
    });

    const tdAcao = document.createElement("td");

    tdAcao.className = "col-acao";

    const botao = document.createElement("button");

    botao.type = "button";

    botao.className = "btn-excluir";

    botao.title = "Excluir linha";

    botao.innerText = "🗑️";

    botao.addEventListener(
        "click",
        () => excluirLinha(linha)
    );

    tdAcao.appendChild(botao);

    tr.appendChild(tdAcao);

    return tr;
}


function criarLinhaNova(config){

    const tr = document.createElement("tr");

    tr.className = "linha-nova";

    const tdId = document.createElement("td");

    tdId.className = "col-id";

    tdId.innerText = "novo";

    tr.appendChild(tdId);

    config.colunas.forEach(coluna => {

        const td = document.createElement("td");

        const input =
            criarCampo("", coluna.campo);

        input.placeholder = coluna.campo;

        td.appendChild(input);

        tr.appendChild(td);
    });

    const tdAcao = document.createElement("td");

    tdAcao.className = "col-acao";

    const botao = document.createElement("button");

    botao.type = "button";

    botao.className = "btn-adicionar";

    botao.title = "Adicionar linha";

    botao.innerText = "+";

    botao.addEventListener(
        "click",
        () => adicionarLinha(tr)
    );

    tdAcao.appendChild(botao);

    tr.appendChild(tdAcao);

    return tr;
}


// ======================================
// SALVAR CAMPO (update)
// ======================================

async function salvarCampo(linha, input){

    const campo = input.dataset.campo;

    const resultado =
        tratarValor(tabelaAtual, campo, input.value);

    if(resultado.erro){

        input.classList.add("erro");

        // volta pro valor que estava salvo
        input.value = linha[campo] ?? "";

        return mostrarToast(resultado.erro, true);
    }

    // nada mudou
    if(String(resultado.valor ?? "") === String(linha[campo] ?? "")){

        input.value = linha[campo] ?? "";

        input.classList.remove("erro");

        return;
    }

    input.classList.remove("erro");

    input.classList.add("salvando");

    // .select() devolve as linhas alteradas: se vier vazio,
    // o RLS bloqueou (sem erro explícito) — não é admin.
    const { data, error } =
        await supabaseClient
            .from(tabelaAtual)
            .update({ [campo]: resultado.valor })
            .eq("id", linha.id)
            .select();

    input.classList.remove("salvando");

    if(error || !data || !data.length){

        console.error("[tabelas] Falha ao salvar:", error);

        input.classList.add("erro");

        input.value = linha[campo] ?? "";

        return mostrarToast(
            error
                ? "Erro ao salvar"
                : "Sem permissão para alterar (entre como admin)",
            true
        );
    }

    linha[campo] = data[0][campo];

    input.value = linha[campo] ?? "";

    mostrarToast("Salvo");
}


// ======================================
// ADICIONAR LINHA (insert)
// ======================================

async function adicionarLinha(tr){

    const config =
        TABELAS[tabelaAtual];

    const novo = {};

    for(const coluna of config.colunas){

        const input =
            tr.querySelector(`input[data-campo="${coluna.campo}"]`);

        const resultado =
            tratarValor(tabelaAtual, coluna.campo, input.value);

        if(resultado.erro){

            input.classList.add("erro");

            return mostrarToast(resultado.erro, true);
        }

        input.classList.remove("erro");

        novo[coluna.campo] = resultado.valor;
    }

    const { data, error } =
        await supabaseClient
            .from(tabelaAtual)
            .insert(novo)
            .select();

    if(error || !data || !data.length){

        console.error("[tabelas] Falha ao adicionar:", error);

        return mostrarToast(
            error
                ? "Erro ao adicionar"
                : "Sem permissão para adicionar (entre como admin)",
            true
        );
    }

    // entra no topo da lista local e redesenha
    linhasAtuais.unshift(data[0]);

    // o filtro some pra a linha nova aparecer
    $("filtroTabela").value = "";

    desenharTabela();

    mostrarToast("Linha adicionada");
}


// ======================================
// EXCLUIR LINHA (delete)
// ======================================

async function excluirLinha(linha){

    const config =
        TABELAS[tabelaAtual];

    const descricao =
        config.colunas
            .map(coluna => linha[coluna.campo])
            .join(" / ");

    if(!confirm(`Excluir esta linha?\n\n${descricao}`)) return;

    const { data, error } =
        await supabaseClient
            .from(tabelaAtual)
            .delete()
            .eq("id", linha.id)
            .select();

    if(error || !data || !data.length){

        console.error("[tabelas] Falha ao excluir:", error);

        return mostrarToast(
            error
                ? "Erro ao excluir"
                : "Sem permissão para excluir (entre como admin)",
            true
        );
    }

    linhasAtuais =
        linhasAtuais.filter(item => item.id !== linha.id);

    desenharTabela();

    mostrarToast("Linha excluída");
}
