// ======================================
// ESTOQUE - DESENHO DO RESUMO
// ======================================
// HTML dos cards de status e avisos.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// DESENHAR RESUMO
// ======================================

function escaparHtml(texto){

    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}


// só locados mostram a previsão de retorno nos detalhes
const STATUS_COM_PREVISAO = ["locado", "locado_manutencao"];


function htmlItemModelo(item, chaveStatus){

    const quantidade = item.lista.length;

    if(!quantidade){

        return `
            <div class="modelo-linha zero">
                <span>${escaparHtml(item.rotulo)}</span>
                <b>0</b>
            </div>
        `;
    }

    const maquinas =
        item.lista
            .slice()
            .sort((a, b) => a.p.localeCompare(b.p, "pt-BR", { numeric: true }))
            .map(maquina =>
                `<li>
                    <span class="pat">${escaparHtml(maquina.p)}</span>${
                    maquina.c
                        ? `<span class="cli">${escaparHtml(maquina.c)}</span>`
                        : ""
                }${
                    maquina.r && STATUS_COM_PREVISAO.includes(chaveStatus)
                        ? `<span class="ret">Retorno: ${escaparHtml(maquina.r)}</span>`
                        : ""
                }
                </li>`
            )
            .join("");

    return `
        <details class="modelo-linha">
            <summary>
                <span>${escaparHtml(item.rotulo)}</span>
                <b>${quantidade}</b>
            </summary>
            <ul class="lista-maquinas">${maquinas}</ul>
        </details>
    `;
}


function desenharResumo(dados){

    const area = $("resumoEstoque");

    area.innerHTML =
        STATUS_ESTOQUE.map(status => {

            const grupos =
                montarGrupos(
                    status.chave,
                    dados.status?.[status.chave] || {}
                );

            const total =
                dados.totais?.[status.chave] || 0;

            const corpo =
                grupos.length
                    ? grupos.map(grupo => `
                        <div class="grupo-titulo">${grupo.titulo}</div>
                        ${grupo.itens.map(item => htmlItemModelo(item, status.chave)).join("")}
                    `).join("")
                    : `<p class="vazio-estoque">Nenhuma máquina</p>`;

            return `
                <div class="card-status ${status.chave}">
                    <div class="card-status-topo">
                        <h3>${status.nome}</h3>
                        <span class="total">${total}</span>
                    </div>
                    ${corpo}
                </div>
            `;
        }).join("");
}


function formatarDataHora(iso){

    const data = new Date(iso);

    const dia =
        data.toLocaleDateString(
            "pt-BR",
            { timeZone: "America/Sao_Paulo" }
        );

    const hora =
        data.toLocaleTimeString(
            "pt-BR",
            {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    return `${dia} - ${hora}`;
}


function mostrarAvisosEstoque(avisos){

    const campo = $("avisosEstoque");

    if(avisos && avisos.length){

        campo.innerText = "⚠️ " + avisos.join(" | ");

        campo.classList.remove("oculto");

    }else{

        campo.innerText = "";

        campo.classList.add("oculto");
    }
}


function mostrarPublicado(){

    previaAtual = null;

    $("faixaPrevia").classList.add("oculto");

    if(!resumoPublicado){

        $("estoqueAtualizado").innerText =
            `Nenhum resumo publicado ainda para ${FILIAIS[filialAtual].nome}.`;

        $("resumoEstoque").innerHTML = "";

        mostrarAvisosEstoque([]);

        return;
    }

    const por =
        resumoPublicado.atualizado_por
            ? ` (por ${resumoPublicado.atualizado_por})`
            : "";

    $("estoqueAtualizado").innerText =
        `ATUALIZADO: ${formatarDataHora(resumoPublicado.atualizado_em)}${por}`;

    desenharResumo(resumoPublicado.dados);

    mostrarAvisosEstoque(resumoPublicado.dados.avisos);
}
