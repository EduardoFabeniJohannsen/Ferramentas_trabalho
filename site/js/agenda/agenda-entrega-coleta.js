// ======================================
// AGENDA - ENTREGA/COLETA: O CONTRATO DA COLETA
// ======================================
// Tipo Entrega/Coleta (o cliente troca de máquina): a que volta é de outro contrato, com proposta e período próprios (colunas proposta_recolha e periodo_recolha; o cliente é o mesmo). Conferência ao salvar e a linha da coleta na mensagem do Zap, logo abaixo da da entrega e no mesmo jeito dela: referência digitada à mão ("ORÇAMENTO DE LOCAÇÃO DE PLATAFORMA ORBMAQ_WTE14_2 DIAS") vira a mesma com o modelo (e o período) da máquina que volta. Carregar depois de agenda-contratos.js.

function contratoDaColeta(item){

    return contratoLimpo({ cliente: item.cliente, proposta: item.propostaRecolha, periodo: item.periodoRecolha });
}


// ao salvar: devolve o erro, ou "". Período no formato da agenda (valor antigo,
// sem mexer, passa). Em outro tipo fica vazio e, se nunca teve, nem vai para o
// banco: salvar continua funcionando antes do SQL das duas colunas
function conferirContratoColeta(dados, anterior){

    if(dados.tipo === TIPO_ENTREGA_COLETA){

        const periodo = normalizarPeriodo(dados.periodoRecolha);

        if(periodo.erro){

            if(dados.periodoRecolha !== (anterior?.periodoRecolha || "")) return `Período da coleta: ${periodo.erro}`;

        }else{

            dados.periodoRecolha = periodo.valor;
        }

        return "";
    }

    if(anterior?.propostaRecolha || anterior?.periodoRecolha){

        dados.propostaRecolha = "";

        dados.periodoRecolha = "";

    }else{

        delete dados.propostaRecolha;

        delete dados.periodoRecolha;
    }

    return "";
}


// ======================================
// MENSAGEM DO ZAP
// ======================================

// sem a proposta da coleta a mensagem sairia com uma referência só
function erroColetaZap(item){

    if(item.tipo !== TIPO_ENTREGA_COLETA) return "";

    return String(item.propostaRecolha || "").trim() ? "" : "Informe o nº da proposta da coleta";
}


// A linha da coleta, no mesmo jeito da linha da entrega. Período da coleta em
// branco: o mesmo da entrega.
//   - referência digitada à mão com o modelo da entrega: o mesmo texto com o
//     modelo da máquina que volta (e o período dela, se for outro), sem a
//     proposta da entrega, se foi digitada junto;
//   - senão, montada como sempre: CLIENTE_MODELO_PERÍODO - Proposta: N
function referenciaColetaZap(item){

    const proposta = String(item.propostaRecolha || "").trim();

    const periodo = item.periodoRecolha || item.periodo;

    const manual = String(item.referencia || "").trim();

    const modeloEntrega = modelosDaPlataforma(item.plataforma);

    const achouModelo =
        modeloEntrega
            ? manual.toUpperCase().indexOf(modeloEntrega.toUpperCase())
            : -1;

    if(manual && achouModelo >= 0){

        let texto =
            manual.slice(0, achouModelo) +
            modelosDaPlataforma(item.plataformaRecolha) +
            manual.slice(achouModelo + modeloEntrega.length);

        const periodoEntrega = textoPeriodoReferencia(item.periodo);

        const periodoColeta = textoPeriodoReferencia(periodo);

        const achouPeriodo = periodoEntrega ? texto.toUpperCase().lastIndexOf(periodoEntrega) : -1;

        if(achouPeriodo >= 0 && periodoColeta !== periodoEntrega){

            texto = texto.slice(0, achouPeriodo) + periodoColeta + texto.slice(achouPeriodo + periodoEntrega.length);
        }

        // a proposta da entrega digitada junto ("... - Proposta: 713740") sai
        texto = texto.replace(/\s*-?\s*Proposta:?\s*\d[\d\s./-]*$/i, "").trim();

        return `${texto} - Proposta: ${proposta}`.trimEnd();
    }

    return referenciaZap({
        cliente: item.cliente,
        proposta,
        periodo,
        tipo: "Coleta",
        plataforma: item.plataformaRecolha,
        referencia: ""
    });
}
