// ======================================
// AGENDA - PLATAFORMAS DO FORMULÁRIO
// ======================================
// Mais de um equipamento no mesmo agendamento (ex: 2 WAD16 + 1 WTE12):
// uma linha por equipamento, com quantidade, − e +, como nos equipamentos
// de propostas.html. As linhas são só a tela: o valor que vale (salvar,
// rascunho) fica no campo escondido agPlataforma, já juntado
// ("2x WAD16 + WTE12", ver agenda-patrimonio.js). Carregar antes de
// agenda-modal.js.

function criarLinhaPlataforma(item){

    const linha =
        criar("div", "equipamento-linha ag-plataforma-linha");

    const campo =
        criar("input", "equipamento ag-plataforma-item");

    campo.type = "text";

    campo.autocomplete = "off";

    campo.placeholder = "Ex: WAE16010";

    campo.value = item ? item.patrimonio : "";

    const quantidade =
        criar("input", "quantidadeEquipamento ag-plataforma-qtd");

    quantidade.type = "text";

    quantidade.inputMode = "numeric";

    quantidade.title = "Quantidade";

    quantidade.value = item ? item.quantidade : 1;

    const remover =
        criar("button", "btn-secundario", "−");

    remover.type = "button";

    remover.title = "Remover este equipamento";

    remover.addEventListener("click", () => removerLinhaPlataforma(linha));

    const adicionar =
        criar("button", "", "+");

    adicionar.type = "button";

    adicionar.title = "Adicionar outro equipamento";

    adicionar.addEventListener("click", adicionarLinhaPlataforma);

    linha.append(campo, quantidade, remover, adicionar);

    return linha;
}


// junta as linhas no campo escondido (é ele que é salvo)
function sincronizarPlataformas(){

    const lista =
        Array.from($("listaPlataformas").querySelectorAll(".ag-plataforma-linha"))
            .map(linha => ({
                patrimonio: linha.querySelector(".ag-plataforma-item").value.trim(),
                quantidade: Number(linha.querySelector(".ag-plataforma-qtd").value) || 1
            }));

    $("agPlataforma").value = juntarPlataformas(lista);

    atualizarAvisoPatrimonio();
}


// monta as linhas a partir do campo escondido (ao abrir o formulário)
function desenharPlataformas(){

    const lista = $("listaPlataformas");

    lista.innerHTML = "";

    const itens =
        separarPlataformas($("agPlataforma").value);

    // sempre sobra pelo menos uma linha
    if(!itens.length) itens.push(null);

    itens.forEach(item => lista.appendChild(criarLinhaPlataforma(item)));
}


function adicionarLinhaPlataforma(){

    const linha = criarLinhaPlataforma(null);

    $("listaPlataformas").appendChild(linha);

    linha.querySelector(".ag-plataforma-item").focus();
}


// a única linha não sai: só fica em branco
function removerLinhaPlataforma(linha){

    const lista = $("listaPlataformas");

    if(lista.querySelectorAll(".ag-plataforma-linha").length <= 1){

        linha.querySelector(".ag-plataforma-item").value = "";

        linha.querySelector(".ag-plataforma-qtd").value = 1;

    }else{

        linha.remove();
    }

    sincronizarPlataformas();

    agendarRascunho();
}


// digitação nas linhas: patrimônio em maiúsculo, quantidade só número
function digitarPlataforma(evento){

    const campo = evento.target;

    if(campo.classList.contains("ag-plataforma-item")){

        forcarMaiusculo(evento);

    }else if(campo.classList.contains("ag-plataforma-qtd")){

        campo.value = campo.value.replace(/\D/g, "").slice(0, 3);
    }

    sincronizarPlataformas();
}
