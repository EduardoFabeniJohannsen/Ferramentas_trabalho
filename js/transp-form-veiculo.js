// ======================================
// TRANSPORTADORAS - FORMULÁRIO DO VEÍCULO
// ======================================
// Modal do veículo (prancha ou carreta), validação de placas e medidas, salvar e excluir.

// carreta mostra o segundo campo de placa
function atualizarCamposPlaca(){

    const carreta = $("vcTipo").value === "Carreta";

    $("bloco-vcPlaca2").style.display =
        carreta ? "" : "none";

    $("bloco-vcPlaca").querySelector("label").innerText =
        carreta ? "Placa do cavalo" : "Placa";
}


function abrirModalVeiculo(id){

    const veiculo =
        id
            ? veiculosTransp.find(item => item.id === id)
            : null;

    // pediu um veículo que não existe mais: não abre
    if(id && !veiculo) return;

    modalTransp = { tipo: "veiculo", id: veiculo ? veiculo.id : null };

    const corpo = $("corpoModalTransp");

    corpo.innerHTML = "";

    const grade = criarElemento("div", "grade-transp");

    const blocoTipo = criarElemento("div", "campo-form largo");

    const rotuloTipo = criarElemento("label", "", "Tipo");

    rotuloTipo.htmlFor = "vcTipo";

    const selectTipo = criarElemento("select");

    selectTipo.id = "vcTipo";

    TIPOS_VEICULO.forEach(tipo => {

        const opcao = criarElemento("option", "", tipo);

        opcao.value = tipo;

        selectTipo.appendChild(opcao);
    });

    selectTipo.value = veiculo ? veiculo.tipo : TIPOS_VEICULO[0];

    selectTipo.addEventListener("change", atualizarCamposPlaca);

    blocoTipo.appendChild(rotuloTipo);

    blocoTipo.appendChild(selectTipo);

    grade.appendChild(blocoTipo);

    const extrasPlaca = { maxLength: 8, placeholder: "Ex: ABC1D23" };

    const campoPlaca =
        criarCampoForm("Placa", "vcPlaca", veiculo ? veiculo.placa : "", extrasPlaca);

    const campoPlaca2 =
        criarCampoForm("Placa da carreta", "vcPlaca2", veiculo ? veiculo.placa2 : "", extrasPlaca);

    campoPlaca.querySelector("input").addEventListener("input", maiusculoCampoTransp);

    campoPlaca2.querySelector("input").addEventListener("input", maiusculoCampoTransp);

    grade.appendChild(campoPlaca);

    grade.appendChild(campoPlaca2);

    MEDIDAS_VEICULO.forEach(medida => {

        grade.appendChild(
            criarCampoForm(
                medida.rotulo,
                "vc_" + medida.campo,
                veiculo ? numeroBR(veiculo[medida.campo]) : "",
                { inputMode: "decimal", placeholder: "Ex: 2,60" }
            )
        );
    });

    corpo.appendChild(grade);

    atualizarCamposPlaca();

    if(veiculo){

        corpo.appendChild(
            criarBlocoDocumentos({ tipo: "veiculo", id: veiculo.id })
        );

    }else{

        corpo.appendChild(
            criarElemento(
                "div",
                "vazio-transp",
                "Salve o veículo primeiro para poder anexar os PDFs."
            )
        );
    }

    abrirModalTransp(veiculo ? "Editar veículo" : "Novo veículo");

    $("vcPlaca").focus();
}


async function salvarVeiculoTransp(){

    if(salvandoTransp) return;

    const tipo = $("vcTipo").value;

    const limparPlaca = (texto) =>
        String(texto || "").toUpperCase().replace(/[\s-]/g, "");

    // formato antigo (ABC1234) e Mercosul (ABC1D23)
    const padraoPlaca = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

    const placa = limparPlaca($("vcPlaca").value);

    const placa2 =
        tipo === "Carreta"
            ? limparPlaca($("vcPlaca2").value)
            : "";

    if(!padraoPlaca.test(placa)){

        return mostrarToast("Placa inválida (ex: ABC1D23)", true);
    }

    if(tipo === "Carreta"){

        if(!padraoPlaca.test(placa2)){

            return mostrarToast("Informe a placa da carreta (ex: ABC1D23)", true);
        }

        if(placa2 === placa){

            return mostrarToast("As duas placas são iguais", true);
        }
    }

    // editando: continua na transportadora dele (em "Todas" não há uma escolhida)
    const atual =
        veiculosTransp.find(item => item.id === modalTransp.id);

    const dados = {
        transportadora: atual ? atual.transportadora : transpAtual,
        tipo: tipo,
        placa: placa,
        placa2: tipo === "Carreta" ? placa2 : null
    };

    for(const medida of MEDIDAS_VEICULO){

        const texto = $("vc_" + medida.campo).value.trim();

        if(!texto){

            dados[medida.campo] = null;

            continue;
        }

        const numero = brToNumber(texto);

        if(!Number.isFinite(numero) || numero < 0){

            return mostrarToast(`${medida.rotulo}: valor inválido`, true);
        }

        dados[medida.campo] = numero;
    }

    const eraNovo = !modalTransp.id;

    salvandoTransp = true;

    $("btnSalvarTransp").disabled = true;

    let salvo = null;

    try{

        salvo = await salvarVeiculoBanco(dados, modalTransp.id);

    }catch(erro){

        console.error("[transportadoras] Falha ao salvar veículo:", detalhesErroTransp(erro));

        // 23505 = placa repetida
        mostrarToast(
            erro.code === "23505"
                ? "Essa placa já está cadastrada"
                : "Erro ao salvar o veículo",
            true
        );

    }finally{

        salvandoTransp = false;

        $("btnSalvarTransp").disabled = false;
    }

    if(!salvo) return;

    await recarregarTransp();

    mostrarToast("Veículo salvo");

    // veículo novo: reabre já como edição, pra anexar os PDFs
    if(eraNovo){

        abrirModalVeiculo(salvo.id);

    }else{

        fecharModalTransp();
    }
}


async function excluirVeiculoTransp(id){

    const veiculo = veiculosTransp.find(item => item.id === id);

    if(!veiculo) return;

    if(!confirm(`Excluir o veículo ${placasDoVeiculo(veiculo)} e os documentos dele?`)) return;

    try{

        await excluirVeiculoBanco(id);

    }catch(erro){

        console.error("[transportadoras] Falha ao excluir veículo:", detalhesErroTransp(erro));

        return mostrarToast("Erro ao excluir o veículo", true);
    }

    await recarregarTransp();

    mostrarToast("Veículo excluído");
}
