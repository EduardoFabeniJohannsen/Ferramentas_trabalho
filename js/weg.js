// ======================================
// CONTRATO WEG
// ======================================

const contratoWEG = {

    // dias de cada período (1 período = 30 dias)
    periodoDias: 30,

    // a partir de quantos períodos o frete é bonificado
    periodosFreteBonificado: 4,

    // ordem dos grupos no documento (2ª e 3ª letra do modelo:
    // ME = mastro, TE = tesoura, AD = articulada diesel, AE = articulada elétrica)
    ordemGrupos: ["ME", "TE", "AD", "AE"],

    itens: [
        { modelo: "WME10", descricao: "MASTRO ELÉTRICO 10M", preco: 5820 },
        { modelo: "WAE12", descricao: "ARTICULADA ELÉTRICA 12M", preco: 8970 },
        { modelo: "WTE10", descricao: "TESOURA ELÉTRICA 10M", preco: 2900 },
        { modelo: "WTE12", descricao: "TESOURA ELÉTRICA 12M", preco: 3990 },
        { modelo: "WAD16", descricao: "ARTICULADA DIESEL 16M", preco: 11980 },
        { modelo: "WAE15", descricao: "ARTICULADA ELÉTRICA 15M", preco: 11100 }
    ]

};


// ======================================
// MONTAR LISTA DE EQUIPAMENTOS (formulário)
// ======================================

function montarListaEquipamentos() {

    const lista = $("listaEquipamentosWEG");

    let html = "";

    contratoWEG.itens.forEach((item) => {

        html += `
            <div class="agendamento-linha">
                <label>${item.modelo}</label>
                <span style="flex:1; color:#94a3b8;">
                    R$ ${formatarMoedaBR(item.preco)}
                </span>
                <input
                    type="number"
                    class="quantidadeEquipamento"
                    id="qtd-${item.modelo}"
                    value="0"
                    min="0"
                    style="width:60px; flex:none; text-align:center; margin:0;"
                >
            </div>
        `;
    });

    lista.innerHTML = html;
}


// ======================================
// QUANTIDADE POR MODELO
// ======================================

function obterQuantidade(modelo) {

    const input = $(`qtd-${modelo}`);

    return Number(input?.value || 0);
}


// ======================================
// PERÍODOS
// ======================================
// Quantidade de períodos de 30 dias (mínimo 1).

function obterPeriodos() {

    const numero = parseInt($("periodos")?.value, 10);

    if (!Number.isFinite(numero) || numero < 1) return 1;

    return numero;
}


// ======================================
// DATAS
// ======================================

function obterDatas() {

    const valor = $("dataInicio").value;

    if (!valor) return null;

    const [ano, mes, dia] = valor.split("-").map(Number);

    const inicio = new Date(ano, mes - 1, dia);

    const final = new Date(inicio);

    final.setDate(
        final.getDate() + (contratoWEG.periodoDias * obterPeriodos() - 1)
    );

    return {
        inicio: inicio,
        final: final
    };
}


// ======================================
// GRUPOS (tipo de equipamento)
// ======================================

function grupoDoModelo(modelo) {

    return modelo.slice(1, 3);
}


// modelo de grupo fora da lista vai pro final
function ordemDoGrupo(modelo) {

    const posicao =
        contratoWEG.ordemGrupos.indexOf(grupoDoModelo(modelo));

    return posicao === -1 ? 999 : posicao;
}


// ======================================
// GERAR DOCUMENTO (área pra print)
// ======================================

function gerarDocumento() {

    const datas = obterDatas();

    const frete = brToNumber($("valorFrete").value);

    const periodos = obterPeriodos();

    const diasTotal = contratoWEG.periodoDias * periodos;

    // 4 períodos ou mais: frete bonificado (não entra no total)
    const freteBonificado =
        periodos >= contratoWEG.periodosFreteBonificado;

    // frete digitado errado (ex: letras): avisa em vez de mostrar R$ NaN
    // (bonificado ignora o frete, então não precisa validar)
    const freteInvalido =
        !freteBonificado && !Number.isFinite(frete);

    $("valorFrete").style.borderColor =
        freteInvalido ? "#ef4444" : "";

    const complementar =
        (freteBonificado || freteInvalido) ? 0 : frete * 2 * 1.2;

    let valorLocacao = 0;

    // soma de 1 período (preço x quantidade) e total de unidades escolhidas
    let valorPorPeriodo = 0;

    let totalUnidades = 0;

    let linhasTabela = "";

    // Agrupa por tipo de equipamento e numera na ordem exibida (1, 2, 3...)
    const itensOrdenados =
        [...contratoWEG.itens]
            .sort((a, b) => ordemDoGrupo(a.modelo) - ordemDoGrupo(b.modelo));

    let grupoAnterior = null;

    itensOrdenados.forEach((item, posicao) => {

        const grupo = grupoDoModelo(item.modelo);

        // linha em branco entre um grupo e outro
        if (grupoAnterior !== null && grupo !== grupoAnterior) {

            linhasTabela += `
            <tr class="separador-grupo">
                <td colspan="5"></td>
            </tr>
            `;
        }

        grupoAnterior = grupo;

        const quantidade = obterQuantidade(item.modelo);

        const selecionado = quantidade > 0;

        if (selecionado) {

            valorLocacao += item.preco * quantidade * periodos;

            valorPorPeriodo += item.preco * quantidade;

            totalUnidades += quantidade;
        }

        linhasTabela += `
            <tr class="${selecionado ? "linha-selecionada" : ""}">
                <td>${posicao + 1}</td>
                <td>${item.descricao}</td>
                <td><strong>${item.modelo}</strong></td>
                <td>${selecionado ? quantidade + "x" : ""}</td>
                <td>R$ ${formatarMoedaBR(item.preco)}</td>
            </tr>
        `;
    });

    const total = valorLocacao + complementar;

    const periodoTexto =
        periodos > 1
            ? `${periodos} períodos = ${diasTotal} dias`
            : `${diasTotal} dias`;

    const periodoHtml = datas
        ? `${formatarData(datas.inicio)} a ${formatarData(datas.final)} (${periodoTexto})`
        : "—";

    const linhaFrete = freteBonificado
        ? `
        <div class="resumo-linha bonificado">
            <span>Locação complementar (frete)</span>
            <span>BONIFICADO</span>
        </div>
        `
        : `
        <div class="resumo-linha">
            <span>Locação complementar (frete)</span>
            <span>${freteInvalido ? "Frete inválido" : "R$ " + formatarMoedaBR(complementar)}</span>
        </div>
        `;

    // 2+ equipamentos por mais de 1 período: mostra também o valor
    // de cada período, pra o total não parecer maior do que é
    const linhaValorPeriodo =
        (totalUnidades >= 2 && periodos > 1)
            ? `
        <div class="resumo-linha">
            <span>Valor por período (30 dias)</span>
            <span>R$ ${formatarMoedaBR(valorPorPeriodo)}</span>
        </div>
        `
            : "";

    $("documentoProposta").innerHTML = `

        <h3>Locação de Equipamentos</h3>
        <div class="subtitulo">Lista de Preços Unitários</div>

        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Descrição</th>
                    <th>COD</th>
                    <th>Qtd</th>
                    <th>Valor Unitário</th>
                </tr>
            </thead>
            <tbody>
                ${linhasTabela}
            </tbody>
        </table>

        <div class="resumo-linha">
            <span>Período</span>
            <span>${periodoHtml}</span>
        </div>

        ${linhaValorPeriodo}

        <div class="resumo-linha">
            <span>Valor locação</span>
            <span>R$ ${formatarMoedaBR(valorLocacao)}</span>
        </div>

        ${linhaFrete}

        <div class="resumo-linha total">
            <span>Total</span>
            <span>${freteInvalido ? "—" : "R$ " + formatarMoedaBR(total)}</span>
        </div>
    `;
}


// ======================================
// CACHE (salvo no navegador)
// ======================================
// Salva sozinho no localStorage pra não perder nada se a
// página recarregar (Ctrl+R) ou o navegador travar.

const CHAVE_CACHE_WEG = "wegCache";


function salvarCacheWEG() {

    const quantidades = {};

    contratoWEG.itens.forEach((item) => {

        quantidades[item.modelo] =
            $(`qtd-${item.modelo}`)?.value || "0";
    });

    const dados = {

        quantidades: quantidades,
        valorFrete: $("valorFrete")?.value || "",
        periodos: $("periodos")?.value || "1",
        dataInicio: $("dataInicio")?.value || ""
    };

    try {

        localStorage.setItem(
            CHAVE_CACHE_WEG,
            JSON.stringify(dados)
        );

    } catch (erro) {

        console.error("Erro ao salvar cache WEG:", erro);
    }
}


function restaurarCacheWEG() {

    let dados;

    try {

        const salvo = localStorage.getItem(CHAVE_CACHE_WEG);

        if (!salvo) return;

        dados = JSON.parse(salvo);

    } catch (erro) {

        console.error("Cache WEG inválido, ignorando:", erro);

        return;
    }

    if (!dados || typeof dados !== "object") return;

    contratoWEG.itens.forEach((item) => {

        const campo = $(`qtd-${item.modelo}`);

        const quantidade =
            parseInt(dados.quantidades?.[item.modelo], 10);

        if (campo && Number.isFinite(quantidade) && quantidade > 0) {

            campo.value = quantidade;
        }
    });

    $("valorFrete").value = dados.valorFrete || "";

    $("periodos").value = dados.periodos || "1";

    $("periodos").value = obterPeriodos();

    $("dataInicio").value = dados.dataInicio || "";
}


// ======================================
// TEXTO DE CONFIRMAÇÃO (copiar pro e-mail)
// ======================================
// Fica fora da área de print (botão ao lado do documento). Copia em HTML (cola
// formatado no Outlook/Gmail) e em texto simples como reserva.

const confirmacaoLocacao = {

    titulo: "Para confirmação da locação, favor enviar:",

    campos: [
        "CNPJ de faturamento:",
        "Data da necessidade:",
        "Prédio e setor onde a máquina ficará:",
        "Responsável pelo recebimento:"
    ]
};


function htmlConfirmacaoEmail() {

    const itens =
        confirmacaoLocacao.campos
            .map((campo) => `<li><b>${campo}</b>&nbsp;</li>`)
            .join("");

    return `<div style="font-family:Calibri,Arial,sans-serif;font-size:14px;">` +
        `<p><b>${confirmacaoLocacao.titulo}</b></p>` +
        `<ul>${itens}</ul>` +
        `</div>`;
}


function textoConfirmacaoEmail() {

    const itens =
        confirmacaoLocacao.campos
            .map((campo) => `• ${campo} `)
            .join("\n");

    return `${confirmacaoLocacao.titulo}\n\n${itens}`;
}


async function copiarParaEmail() {

    try {

        if (navigator.clipboard && window.ClipboardItem) {

            await navigator.clipboard.write([
                new ClipboardItem({
                    "text/html": new Blob(
                        [htmlConfirmacaoEmail()],
                        { type: "text/html" }
                    ),
                    "text/plain": new Blob(
                        [textoConfirmacaoEmail()],
                        { type: "text/plain" }
                    )
                })
            ]);

            mostrarToast("Texto copiado");

            return;
        }

    } catch (erro) {

        console.error("Erro ao copiar em HTML:", erro);
    }

    // navegador bloqueou o HTML: copia só o texto
    copiar(textoConfirmacaoEmail(), "Texto copiado (sem formatação)");
}


// ======================================
// INIT
// ======================================

(function init() {

    montarListaEquipamentos();

    restaurarCacheWEG();

    gerarDocumento();

    // qualquer mudança regera o documento e salva no cache
    const atualizar = () => {

        gerarDocumento();

        salvarCacheWEG();
    };

    document
        .querySelectorAll(".quantidadeEquipamento")
        .forEach((input) => {

            input.addEventListener(
                "input",
                atualizar
            );
        });

    $("dataInicio").addEventListener(
        "input",
        atualizar
    );

    $("valorFrete").addEventListener(
        "input",
        atualizar
    );

    $("periodos").addEventListener(
        "input",
        atualizar
    );

    // períodos inválido (vazio, 0, negativo) volta pra 1 ao sair do campo
    $("periodos").addEventListener(
        "blur",
        () => {

            $("periodos").value = obterPeriodos();

            atualizar();
        }
    );

})();