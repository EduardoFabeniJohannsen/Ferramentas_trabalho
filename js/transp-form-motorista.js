// ======================================
// TRANSPORTADORAS - FORMULÁRIO DO MOTORISTA
// ======================================
// Modal do motorista (nome, CPF, nascimento, CNH), salvar e excluir.

function abrirModalMotorista(id){

    const motorista =
        id
            ? motoristasTransp.find(item => item.id === id)
            : null;

    // pediu um motorista que não existe mais: não abre
    if(id && !motorista) return;

    modalTransp = { tipo: "motorista", id: motorista ? motorista.id : null };

    const corpo = $("corpoModalTransp");

    corpo.innerHTML = "";

    const grade = criarElemento("div", "grade-transp");

    // o nome não muda aqui: os agendamentos guardam o nome como texto
    grade.appendChild(
        criarCampoForm(
            "Nome",
            "mtNome",
            motorista ? motorista.nome : "",
            { readOnly: !!motorista, placeholder: "Nome completo" },
            true
        )
    );

    if(motorista){

        grade.appendChild(
            criarElemento(
                "p",
                "nota-form",
                "O nome não é alterado aqui (os agendamentos antigos usam o nome como está)."
            )
        );
    }

    const campoCpf =
        criarCampoForm(
            "CPF",
            "mtCpf",
            motorista ? motorista.cpf : "",
            { inputMode: "numeric", placeholder: "000.000.000-00", maxLength: 14 }
        );

    campoCpf.querySelector("input").addEventListener(
        "input",
        (evento) => {

            evento.target.value = formatarCPF(evento.target.value);
        }
    );

    grade.appendChild(campoCpf);

    grade.appendChild(
        criarCampoForm(
            "Data de nascimento",
            "mtNascimento",
            motorista ? motorista.data_nascimento : "",
            { type: "date" }
        )
    );

    grade.appendChild(
        criarCampoForm(
            "Número da CNH",
            "mtCnh",
            motorista ? motorista.cnh : "",
            { inputMode: "numeric", placeholder: "11 números", maxLength: 11 },
            true
        )
    );

    corpo.appendChild(grade);

    if(motorista){

        corpo.appendChild(
            criarBlocoDocumentos({ tipo: "motorista", id: motorista.id })
        );

    }else{

        corpo.appendChild(
            criarElemento(
                "div",
                "vazio-transp",
                "Salve o motorista primeiro para poder anexar os PDFs."
            )
        );
    }

    abrirModalTransp(motorista ? "Editar motorista" : "Novo motorista");

    (motorista ? $("mtCpf") : $("mtNome")).focus();
}


async function salvarMotoristaTransp(){

    if(salvandoTransp) return;

    const nome =
        $("mtNome").value.trim().replace(/\s+/g, " ");

    const cpf = formatarCPF($("mtCpf").value);

    const cnh = $("mtCnh").value.replace(/\D/g, "");

    const nascimento = $("mtNascimento").value;

    if(!modalTransp.id){

        if(!nome) return mostrarToast("Informe o nome do motorista", true);

        const jaExiste =
            motoristasTransp.some(
                item => item.nome.toLowerCase() === nome.toLowerCase()
            );

        if(jaExiste){

            return mostrarToast("Esse motorista já está cadastrado", true);
        }
    }

    if(cpf && !cpfValido(cpf)){

        return mostrarToast("CPF inválido", true);
    }

    if(cnh && cnh.length !== 11){

        return mostrarToast("A CNH deve ter 11 números", true);
    }

    const dados = {
        cpf: cpf || null,
        data_nascimento: nascimento || null,
        cnh: cnh || null
    };

    const eraNovo = !modalTransp.id;

    salvandoTransp = true;

    $("btnSalvarTransp").disabled = true;

    let motoristaId = modalTransp.id;

    let salvo = false;

    try{

        if(!motoristaId){

            const novo = await adicionarMotoristaBanco(transpAtual, nome);

            motoristaId = novo.id;

            // se a gravação dos dados falhar, tentar de novo não duplica o motorista
            modalTransp.id = motoristaId;
        }

        await salvarDadosMotoristaBanco(motoristaId, dados);

        salvo = true;

    }catch(erro){

        console.error("[transportadoras] Falha ao salvar motorista:", detalhesErroTransp(erro));

        // 23505 = já existe (alguém cadastrou ao mesmo tempo)
        mostrarToast(
            erro.code === "23505"
                ? "Esse motorista já está cadastrado"
                : "Erro ao salvar o motorista",
            true
        );

    }finally{

        salvandoTransp = false;

        $("btnSalvarTransp").disabled = false;
    }

    if(!salvo) return;

    await recarregarTransp();

    mostrarToast("Motorista salvo");

    // motorista novo: reabre já como edição, pra anexar os PDFs
    if(eraNovo){

        abrirModalMotorista(motoristaId);

    }else{

        fecharModalTransp();
    }
}


async function excluirMotoristaTransp(id){

    const motorista = motoristasTransp.find(item => item.id === id);

    if(!motorista) return;

    if(
        !confirm(
            `Excluir ${motorista.nome} (${transpAtual})?\n\n` +
            "Os dados e os PDFs dele também serão apagados. " +
            "Os agendamentos antigos continuam com o nome."
        )
    ){
        return;
    }

    try{

        await excluirMotoristaBanco(id);

    }catch(erro){

        console.error("[transportadoras] Falha ao excluir motorista:", detalhesErroTransp(erro));

        // pode ter apagado só uma parte: mostra o que sobrou
        await recarregarTransp();

        return mostrarToast("Erro ao excluir o motorista", true);
    }

    await recarregarTransp();

    mostrarToast("Motorista excluído");
}
