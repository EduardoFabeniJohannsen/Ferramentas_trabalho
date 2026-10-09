// ======================================
// ESTOQUE - RESUMO DIÁRIO
// ======================================
// Qualquer usuário logado sobe o Excel bruto do estoque; o
// resumo (por status e modelo) é salvo na tabela resumo_estoque
// (1 linha só, cada envio sobrescreve) e todos veem o mesmo.
// Depende de helpers.js e auth-guard.js (precisam vir antes)
// e da biblioteca XLSX (SheetJS) carregada no estoque.html.

// ======================================
// CONFIGURAÇÃO
// ======================================

// ordem dos blocos na tela
// "excel" = texto do Status no relatório bruto
const STATUS_ESTOQUE = [

    { chave: "disponivel", nome: "Disponível", excel: "Disponível" },

    { chave: "locado", nome: "Locado", excel: "Locado - Locação" },

    { chave: "locado_manutencao", nome: "Locado em manutenção", excel: "Locado - Manutenção" },

    { chave: "manutencao", nome: "Manutenção", excel: "Manutenção" },

    { chave: "fora_uso", nome: "Fora de uso", excel: "Fora de Uso" },

    { chave: "devolvido", nome: "Devolvido sublocadora", excel: "Devolvido Subl." },

    { chave: "a_vender", nome: "A vender", excel: "A Vender" }
];

// tipo do equipamento = 3 primeiras letras do patrimônio
// (a ordem aqui é a ordem dos grupos na tela)
const TIPOS_ESTOQUE = [

    { prefixo: "WTE", titulo: "TESOURAS ELÉTRICAS" },

    { prefixo: "WAE", titulo: "ARTICULADAS ELÉTRICAS" },

    { prefixo: "WME", titulo: "MASTRO ELÉTRICO" },

    { prefixo: "WAD", titulo: "ARTICULADAS A DIESEL" },

    // prefixos que NÃO são o mesmo modelo do normal (SUBWAD20 != WAD20)
    { prefixo: "SUB", titulo: "SUB" },

    { prefixo: "INUTI", titulo: "INUTI" }
];

const TITULO_OUTROS = "OUTROS";

// bloco "Disponível": lista fixa (aparece mesmo com 0), igual
// ao resumo manual. Modelo fora daqui entra em "OUTROS MODELOS".
const LISTA_FIXA_DISPONIVEL = {

    WTE: ["WTE8", "WTE10", "WTE12", "WTE14", "WTE16"],

    WAE: ["WAE12", "WAE14", "WAE15", "WAE16", "WAE18"],

    WME: ["WME10"],

    WAD: ["WAD16", "WAD20", "WAD26"]
};

// nome mostrado na tela quando difere do modelo calculado
// (vazio: mostra o modelo como foi calculado)
const ROTULO_MODELO = {};

const TITULO_OUTROS_MODELOS = "OUTROS MODELOS";

let resumoPublicado = null;

let previaAtual = null;


// ======================================
// PARSER (relatório bruto -> resumo)
// ======================================
// INICIO_PARSER

function normalizarTexto(valor){

    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}


// Modelo = 3 letras + altura (WTE14046 -> WTE14, WAE16L022 -> WAE16,
// WTE8O079 -> WTE8). Letras no fim (L = lítio, R, O...) são ignoradas,
// então WTE16L e WTE16 são o mesmo modelo. Prefixos como SUB e INUTI
// FICAM no modelo (SUBWAD2601 -> SUBWAD26, INUTIWTE16L048 -> INUTIWTE16),
// porque são diferentes do normal. A altura vem do nome do equipamento
// ("12M") quando bate com o patrimônio; senão usa o próprio patrimônio.
function modeloDoPatrimonio(patrimonio, equipamento){

    const partes =
        patrimonio.match(/^([A-Z]+?)(\d+)/);

    if(!partes) return patrimonio;

    const letras = partes[1];

    const digitos = partes[2];

    const achou =
        String(equipamento || "").match(/(\d+)\s*M\b/i);

    const alturaNome =
        achou ? achou[1] : "";

    if(
        alturaNome &&
        digitos.startsWith(alturaNome) &&
        digitos.length > alturaNome.length
    ){
        return letras + alturaNome;
    }

    return letras + (
        digitos.length > 2
            ? digitos.slice(0, 2)
            : digitos
    );
}


// Previsão de retorno: o Excel entrega data como número (serial),
// texto ISO ou texto livre ("Sem previsão"). Devolve dd/mm/aaaa
// quando é data; senão devolve o texto como veio.
function formatarPrevisao(valor){

    if(valor === null || valor === undefined) return "";

    let data = null;

    if(valor instanceof Date){

        data = new Date(valor.getTime() + 12 * 3600 * 1000);

    }else if(typeof valor === "number" && valor > 20000){

        data = new Date(
            Date.UTC(1899, 11, 30) + Math.floor(valor) * 86400000
        );

    }else if(/^\d{4}-\d{2}-\d{2}/.test(String(valor))){

        const [ano, mes, dia] =
            String(valor).slice(0, 10).split("-");

        return `${dia}/${mes}/${ano}`;
    }

    if(data){

        const dia =
            String(data.getUTCDate()).padStart(2, "0");

        const mes =
            String(data.getUTCMonth() + 1).padStart(2, "0");

        return `${dia}/${mes}/${data.getUTCFullYear()}`;
    }

    return String(valor).trim();
}


// linhas = matriz da planilha (array de arrays)
function resumirEstoque(linhas, nomeArquivo){

    const indiceCabecalho =
        linhas.findIndex(linha =>
            linha.some(c => normalizarTexto(c) === "patrimonio") &&
            linha.some(c => normalizarTexto(c) === "status")
        );

    if(indiceCabecalho < 0){

        throw new Error(
            "Não achei as colunas Patrimônio e Status. É o relatório de estoque?"
        );
    }

    const cabecalho =
        linhas[indiceCabecalho].map(normalizarTexto);

    const colPatrimonio =
        cabecalho.indexOf("patrimonio");

    const colStatus =
        cabecalho.indexOf("status");

    const colCliente =
        cabecalho.findIndex(c => c.startsWith("localizacao"));

    const colEquipamento =
        cabecalho.indexOf("equipamento");

    const colPrevisao =
        cabecalho.indexOf("previsao retorno");

    const statusPorTexto = {};

    STATUS_ESTOQUE.forEach(item => {

        statusPorTexto[normalizarTexto(item.excel)] = item.chave;
    });

    const resultado = {

        arquivo: nomeArquivo || "",

        status: {},

        totais: {},

        ignoradas: 0,

        avisos: []
    };

    STATUS_ESTOQUE.forEach(item => {

        resultado.status[item.chave] = {};

        resultado.totais[item.chave] = 0;
    });

    const vistos = new Set();

    const desconhecidos = new Set();

    let duplicados = 0;

    for(let i = indiceCabecalho + 1; i < linhas.length; i++){

        const linha = linhas[i];

        const patrimonio =
            String(linha[colPatrimonio] ?? "")
                .trim()
                .toUpperCase();

        // pula linha vazia e linha "quebrada" (a de baixo, deslocada)
        if(!/^[A-Z]+\d/.test(patrimonio)) continue;

        let chave =
            statusPorTexto[normalizarTexto(linha[colStatus])];

        let equipamento =
            colEquipamento >= 0
                ? String(linha[colEquipamento] ?? "")
                : "";

        const cliente =
            colCliente >= 0
                ? String(linha[colCliente] ?? "").trim()
                : "";

        // (nos registros quebrados a previsão vem na 1ª linha, junto
        // com o patrimônio, então esta leitura já serve)
        const previsao =
            colPrevisao >= 0
                ? formatarPrevisao(linha[colPrevisao])
                : "";

        // Registro quebrado em 2 linhas: a primeira traz patrimônio
        // e cliente (sem status); o status vem na linha de baixo,
        // deslocado de coluna.
        if(!chave && !String(linha[colStatus] ?? "").trim()){

            const proxima = linhas[i + 1] || [];

            const achou =
                proxima
                    .map(normalizarTexto)
                    .find(texto => statusPorTexto[texto]);

            if(achou){

                chave = statusPorTexto[achou];

                const textoEquip =
                    proxima
                        .map(c => String(c ?? ""))
                        .find(c => /\d+\s*M\b/i.test(c));

                equipamento = textoEquip || equipamento;
            }
        }

        // status que não está na lista: não entra no resumo,
        // mas avisa na tela pra não sumir sem ninguém ver
        if(!chave){

            resultado.ignoradas++;

            desconhecidos.add(
                String(linha[colStatus] ?? "").trim() || "(vazio)"
            );

            continue;
        }

        if(vistos.has(patrimonio)){

            duplicados++;

            continue;
        }

        vistos.add(patrimonio);

        const modelo =
            modeloDoPatrimonio(patrimonio, equipamento);

        if(!resultado.status[chave][modelo]){

            resultado.status[chave][modelo] = [];
        }

        const item = { p: patrimonio };

        if(cliente) item.c = cliente;

        if(previsao) item.r = previsao;

        resultado.status[chave][modelo].push(item);

        resultado.totais[chave]++;
    }

    if(desconhecidos.size){

        resultado.avisos.push(
            `${resultado.ignoradas} linha(s) com status não reconhecido ficaram de fora: ${[...desconhecidos].join(", ")}`
        );
    }

    if(duplicados){

        resultado.avisos.push(
            `${duplicados} patrimônio(s) repetido(s) no arquivo (contados uma vez)`
        );
    }

    const totalGeral =
        Object.values(resultado.totais)
            .reduce((soma, n) => soma + n, 0);

    if(!totalGeral){

        throw new Error(
            "Nenhuma máquina com status reconhecido foi encontrada."
        );
    }

    return resultado;
}

// FIM_PARSER


// ======================================
// MONTAR GRUPOS (por status)
// ======================================

function prefixoDoModelo(modelo){

    if(modelo.startsWith("INUTI")) return "INUTI";

    return modelo.slice(0, 3);
}


function alturaDoModelo(modelo){

    const achou = modelo.match(/\d+/);

    return achou ? Number(achou[0]) : 0;
}


function ordenarModelos(a, b){

    return (
        alturaDoModelo(a) - alturaDoModelo(b) ||
        a.localeCompare(b, "pt-BR")
    );
}


function montarGrupos(chave, mapaModelos){

    const grupos = [];

    const usados = new Set();

    const rotulo = (modelo) =>
        ROTULO_MODELO[modelo] || modelo;

    TIPOS_ESTOQUE.forEach(tipo => {

        const itens = [];

        // Disponível: lista fixa primeiro (mostra 0)
        if(chave === "disponivel"){

            (LISTA_FIXA_DISPONIVEL[tipo.prefixo] || [])
                .forEach(modelo => {

                    usados.add(modelo);

                    itens.push({
                        rotulo: rotulo(modelo),
                        lista: mapaModelos[modelo] || []
                    });
                });

        }else{

            Object.keys(mapaModelos)
                .filter(modelo => prefixoDoModelo(modelo) === tipo.prefixo)
                .sort(ordenarModelos)
                .forEach(modelo => {

                    usados.add(modelo);

                    itens.push({
                        rotulo: rotulo(modelo),
                        lista: mapaModelos[modelo]
                    });
                });
        }

        if(itens.length){

            grupos.push({ titulo: tipo.titulo, itens: itens });
        }
    });

    // o que sobrou (modelos fora dos tipos conhecidos ou fora da lista fixa)
    const restantes =
        Object.keys(mapaModelos)
            .filter(modelo => !usados.has(modelo))
            .sort(ordenarModelos)
            .map(modelo => ({
                rotulo: rotulo(modelo),
                lista: mapaModelos[modelo]
            }));

    if(restantes.length){

        grupos.push({
            titulo:
                chave === "disponivel"
                    ? TITULO_OUTROS_MODELOS
                    : TITULO_OUTROS,
            itens: restantes
        });
    }

    return grupos;
}


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
            "Nenhum resumo publicado ainda.";

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


// ======================================
// CARREGAR RESUMO PUBLICADO (Supabase)
// ======================================

async function carregarResumoPublicado(silencioso){

    const { data, error } =
        await supabaseClient
            .from("resumo_estoque")
            .select("dados, atualizado_em, atualizado_por")
            .eq("id", 1)
            .maybeSingle();

    if(error){

        console.error("[estoque] Falha ao carregar:", error);

        if(!silencioso){

            $("estoqueAtualizado").innerText =
                "Não foi possível carregar o resumo (verifique conexão/login).";

            mostrarToast("Falha ao carregar o resumo", true);
        }

        return;
    }

    resumoPublicado = data;

    // não troca a tela se tem uma prévia aberta
    if(!previaAtual) mostrarPublicado();
}


// ======================================
// UPLOAD (lê o Excel e mostra a prévia)
// ======================================

async function lerArquivo(evento){

    const arquivo = evento.target.files[0];

    // permite escolher o mesmo arquivo de novo depois
    evento.target.value = "";

    if(!arquivo) return;

    try{

        const buffer = await arquivo.arrayBuffer();

        const planilha =
            XLSX.read(buffer, { type: "array" });

        const aba =
            planilha.Sheets[planilha.SheetNames[0]];

        const linhas =
            XLSX.utils.sheet_to_json(
                aba,
                { header: 1, raw: true, defval: "" }
            );

        previaAtual =
            resumirEstoque(linhas, arquivo.name);

    }catch(erro){

        console.error("[estoque] Falha ao ler arquivo:", erro);

        return mostrarToast(
            erro.message || "Não foi possível ler o arquivo",
            true
        );
    }

    $("estoqueAtualizado").innerText =
        "PRÉVIA, ainda não publicada";

    $("textoPrevia").innerText =
        `Arquivo: ${previaAtual.arquivo}. Confira os números e clique em Publicar para todos verem (substitui o resumo atual).`;

    $("faixaPrevia").classList.remove("oculto");

    desenharResumo(previaAtual);

    mostrarAvisosEstoque(previaAtual.avisos);
}


function cancelarPrevia(){

    mostrarPublicado();
}


// ======================================
// PUBLICAR (sobrescreve o resumo)
// ======================================

async function publicarResumo(){

    if(!previaAtual) return;

    const botao = $("btnPublicar");

    botao.disabled = true;

    try{

        const { data: sessao } =
            await supabaseClient.auth.getSession();

        const email =
            sessao?.session?.user?.email || "";

        const { data, error } =
            await supabaseClient
                .from("resumo_estoque")
                .upsert(
                    {
                        id: 1,
                        dados: previaAtual,
                        atualizado_por: email
                    },
                    { onConflict: "id" }
                )
                .select("dados, atualizado_em, atualizado_por")
                .single();

        if(error) throw error;

        resumoPublicado = data;

        mostrarPublicado();

        mostrarToast("Resumo publicado");

    }catch(erro){

        console.error("[estoque] Falha ao publicar:", erro);

        mostrarToast("Erro ao publicar o resumo", true);

    }finally{

        botao.disabled = false;
    }
}


// ======================================
// INIT
// ======================================

(async function init(){

    $("btnEnviarEstoque").addEventListener(
        "click",
        () => $("arquivoEstoque").click()
    );

    $("arquivoEstoque").addEventListener(
        "change",
        lerArquivo
    );

    await carregarResumoPublicado(false);

    // ao voltar pra aba, puxa o resumo mais novo de quem publicou
    document.addEventListener(
        "visibilitychange",
        () => {

            if(!document.hidden && !previaAtual){

                carregarResumoPublicado(true);
            }
        }
    );

})();
