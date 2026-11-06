// ======================================
// PROPOSTAS - REGISTRO DA PROPOSTA ZAP
// ======================================
// Cada "Copiar Proposta Zap" grava na tabela propostas_copiadas o aparelho, a
// cidade aproximada, os dados da proposta, as configurações ativadas e o texto
// copiado. Quem fez e o horário o próprio banco preenche. Lê o admin e quem tem o
// acesso "propostas-copiadas" (RLS), na página propostas-copiadas.html. Falhar ao gravar nunca atrapalha a cópia.

const TABELA_PROPOSTAS_COPIADAS = "propostas_copiadas";

// copiar de novo a mesma proposta (mesmo cliente e texto) logo em seguida não
// vira outro registro
const INTERVALO_REPETIDA_MS = 10 * 60 * 1000;

let ultimaPropostaRegistrada = { chave: "", quando: 0 };


function arredondarRegistro(valor){

    return Number.isFinite(valor)
        ? Math.round(valor * 100) / 100
        : null;
}


// o que está no bloco de Calcular Desconto do equipamento
function descontoDoEquipamento(id){

    const bloco =
        document.querySelector(`.desconto-item[data-equip-id="${id}"]`);

    if(!bloco) return {};

    const valorTabela = Number(bloco.dataset.valorTabela);

    return {
        valorTabela:
            Number.isFinite(valorTabela) && valorTabela > 0
                ? arredondarRegistro(valorTabela)
                : null,
        tabelaEditada: bloco.dataset.editadoManual === "1",
        percentual: bloco.querySelector(".descPercentual")?.value.trim() || "",
        valorDesejado: bloco.querySelector(".descValorDesejado")?.value.trim() || ""
    };
}


// aparelho e cidade de presenca.js (a cidade pode ainda não ter chegado)
function aparelhoDoRegistro(){

    const aparelho =
        (typeof aparelhoPresenca !== "undefined" && aparelhoPresenca) ||
        (typeof descreverAparelho === "function"
            ? descreverAparelho(navigator.userAgent, "", navigator.maxTouchPoints || 0)
            : {});

    const cidade =
        aparelho.cidade ||
        (typeof CHAVE_CIDADE_IP !== "undefined" ? lerLocalJSON(CHAVE_CIDADE_IP)?.cidade : "") ||
        "";

    return { ...aparelho, cidade };
}


// itens = [{ id, modelo, quantidade, valorFinal, valorLocacao, seguro }], já
// calculados em copiarPropostaZap()
function montarRegistroProposta({ texto, itens, infoPeriodo, frete, valorComplementar }){

    const equipamentos =
        itens.map(item => ({
            modelo: item.modelo,
            quantidade: item.quantidade,
            ...descontoDoEquipamento(item.id),
            valorFinal: arredondarRegistro(item.valorFinal),
            valorLocacao: arredondarRegistro(item.valorLocacao),
            seguro: arredondarRegistro(item.seguro),
            total: arredondarRegistro(item.valorLocacao + item.seguro)
        }));

    const valorTotal =
        itens.reduce((soma, item) => soma + item.valorLocacao + item.seguro, 0) +
        valorComplementar;

    const cliente = $("nomeCliente")?.value.trim() || "";

    const cidade = $("cidade")?.value.trim() || "";

    return {
        cliente,
        cidade,
        valor_total: arredondarRegistro(valorTotal),
        aparelho: aparelhoDoRegistro(),
        texto,
        dados: {
            periodo: infoPeriodo.periodo,
            periodos: $("periodos")?.value.trim() || "",
            dias: infoPeriodo.diasBusca,
            diasTotal: infoPeriodo.diasTotal,
            multiplicador: infoPeriodo.multiplicador,
            frete: arredondarRegistro(frete),
            // "", "entrega" ou "retirada" (status.js)
            freteBonificado: obterFreteBonificado(),
            cidadeSaida: cidadeSaidaAtual === "JOINVILLE" ? "Joinville" : "Itajaí",
            pagamento: {
                forma: $("formaPagamento")?.value || "",
                prazo: prazoPagamentoTexto()
            },
            configuracoes: {
                locacaoComplementar: locacaoComplementarAtiva,
                bitributacao: bitributacaoAtiva,
                diaria: valorDiariaAtivo,
                emojis: emojisAtivo,
                separarPagamento: separarPagamentoAtivo
            },
            equipamentos,
            valorComplementar: arredondarRegistro(valorComplementar)
        }
    };
}


async function registrarPropostaCopiada(dados){

    try{

        const linha = montarRegistroProposta(dados);

        const chave = `${linha.cliente}\n${linha.texto}`;

        const agora = Date.now();

        if(
            chave === ultimaPropostaRegistrada.chave &&
            agora - ultimaPropostaRegistrada.quando < INTERVALO_REPETIDA_MS
        ){
            return;
        }

        ultimaPropostaRegistrada = { chave, quando: agora };

        const { error } =
            await supabaseClient
                .from(TABELA_PROPOSTAS_COPIADAS)
                .insert(linha);

        if(error) throw error;

    }catch(erro){

        // deixa tentar de novo no próximo clique
        ultimaPropostaRegistrada = { chave: "", quando: 0 };

        console.error("[propostas] Falha ao registrar a Proposta Zap:", erro?.message || erro);
    }
}
