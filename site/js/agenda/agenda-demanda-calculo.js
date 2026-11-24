// ======================================
// AGENDA - DEMANDA: AS CONTAS
// ======================================
// Só contas, sem tela, para o 📦 Demanda (agenda-demanda.js): por modelo, num período (pela data da entrega), quantas máquinas saem para os clientes (entrega e troca técnica, somando as quantidades: "2x WTE12" conta 2), quantas delas ainda estão sem patrimônio, quantas voltam nas coletas e quantas estão disponíveis no último estoque publicado. Cancelado não conta; concluído conta. Também os atalhos de período e o texto do 📋 Copiar. Carregar depois de agenda-patrimonio.js e agenda-mapa-lista.js.

// a máquina sai do pátio para o cliente. Não entram: a transferência entre obras
// (a mesma máquina muda de obra), a entre unidades (fica na W Rental) e o frete
// frustrado (a máquina voltou)
const TIPOS_SAEM_DEMANDA = ["Entrega", "Troca técnica", TIPO_ENTREGA_COLETA];

// a máquina volta para o pátio (a recolha da troca técnica volta com defeito: não
// conta; a da entrega/coleta conta, em maquinasDaDemanda)
const TIPOS_VOLTAM_DEMANDA = ["Coleta"];

// entrega sem nada na coluna plataforma
const SEM_MODELO_DEMANDA = "Sem máquina informada";


// Date -> "2026-12-01" (no dia do computador, sem fuso)
function isoDoDia(data){

    return [
        data.getFullYear(),
        String(data.getMonth() + 1).padStart(2, "0"),
        String(data.getDate()).padStart(2, "0")
    ].join("-");
}


// atalhos: "semana" e "proxima-semana" (segunda a domingo), "mes" e "proximo-mes"
function periodoDemanda(atalho, hoje = new Date()){

    if(atalho === "semana" || atalho === "proxima-semana"){

        const segunda =
            new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (hoje.getDay() + 6) % 7);

        if(atalho === "proxima-semana") segunda.setDate(segunda.getDate() + 7);

        const domingo =
            new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + 6);

        return { de: isoDoDia(segunda), ate: isoDoDia(domingo) };
    }

    const mes = hoje.getMonth() + (atalho === "proximo-mes" ? 1 : 0);

    return {
        de: isoDoDia(new Date(hoje.getFullYear(), mes, 1)),
        ate: isoDoDia(new Date(hoje.getFullYear(), mes + 1, 0))
    };
}


// "WTE12", "WTE12 - definir" ou vazio: ainda sem a máquina escolhida
function semPatrimonioDemanda(patrimonio){

    return !patrimonio || patrimonioIncompleto(patrimonio);
}


function ordemDemanda(a, b){

    if((a.modelo === SEM_MODELO_DEMANDA) !== (b.modelo === SEM_MODELO_DEMANDA)){

        return a.modelo === SEM_MODELO_DEMANDA ? 1 : -1;
    }

    return (b.saem - a.saem) ||
        (b.voltam - a.voltam) ||
        a.modelo.localeCompare(b.modelo, "pt-BR", { numeric: true });
}


// as máquinas de um agendamento na demanda: [{ texto, volta }]. Na entrega/coleta
// uma sai e a outra volta (a coleta) no mesmo agendamento
function maquinasDaDemanda(item){

    if(item.tipo === TIPO_ENTREGA_COLETA){

        return [{ texto: item.plataforma, volta: false }, { texto: item.plataformaRecolha, volta: true }];
    }

    return [{ texto: item.plataforma, volta: TIPOS_VOLTAM_DEMANDA.includes(item.tipo) }];
}


// { modelos: [{ modelo, saem, semPatrimonio, voltam, agendamentos }], total, semData }
// agendamentos de cada modelo: [{ item, quantidade, patrimonio, volta }] por dia e horário
function demandaPorModelo(itens, de, ate){

    const modelos = new Map();

    const doModelo = (modelo) => {

        if(!modelos.has(modelo)){

            modelos.set(modelo, { modelo, saem: 0, semPatrimonio: 0, voltam: 0, agendamentos: [] });
        }

        return modelos.get(modelo);
    };

    const total = { saem: 0, semPatrimonio: 0, voltam: 0, entregas: 0 };

    // entregas sem data: não dá pra saber se caem no período
    let semData = 0;

    const doPeriodo = itens
        .filter(item => !item.antigo && item.status !== "Cancelado")
        .filter(item => TIPOS_SAEM_DEMANDA.includes(item.tipo) || TIPOS_VOLTAM_DEMANDA.includes(item.tipo))
        .filter(item => {

            if(item.data) return item.data >= de && item.data <= ate;

            if(TIPOS_SAEM_DEMANDA.includes(item.tipo)) semData++;

            return false;
        })
        .sort((a, b) =>
            a.data.localeCompare(b.data) ||
            chaveHorarioMapa(a.horario).localeCompare(chaveHorarioMapa(b.horario)) ||
            (Number(a.id) || 0) - (Number(b.id) || 0)
        );

    doPeriodo.forEach(item => maquinasDaDemanda(item).forEach(({ texto, volta }) => {

        let partes = separarPlataformas(texto);

        // coleta sem máquina não acrescenta nada; entrega sem máquina ainda precisa de uma
        if(!partes.length && volta) return;

        if(!partes.length) partes = [{ quantidade: 1, patrimonio: "" }];

        if(!volta) total.entregas++;

        partes.forEach(({ quantidade, patrimonio }) => {

            const conta =
                doModelo(patrimonio ? modeloDaPlataforma(patrimonio) : SEM_MODELO_DEMANDA);

            conta.agendamentos.push({ item, quantidade, patrimonio, volta });

            if(volta){

                conta.voltam += quantidade;

                total.voltam += quantidade;

                return;
            }

            conta.saem += quantidade;

            total.saem += quantidade;

            if(semPatrimonioDemanda(patrimonio)){

                conta.semPatrimonio += quantidade;

                total.semPatrimonio += quantidade;
            }
        });
    }));

    return { modelos: [...modelos.values()].sort(ordemDemanda), total, semData };
}


// { "WTE12": { total: 4, filiais: [{ nome: "Itajaí", quantidade: 3 }, ...] } }
// com as máquinas "Disponível" de cada filial (as em manutenção não entram)
function estoquePorModelo(filiais){

    const porModelo = {};

    filiais.forEach(filial => {

        const nome = NOMES_FILIAIS_ESTOQUE[filial.filial_id] || `Filial ${filial.filial_id}`;

        Object.entries(filial.disponiveis || {}).forEach(([modelo, maquinas]) => {

            const quantidade = (maquinas || []).length;

            if(!quantidade) return;

            porModelo[modelo] ??= { total: 0, filiais: [] };

            porModelo[modelo].total += quantidade;

            porModelo[modelo].filiais.push({ nome, quantidade });
        });
    });

    return porModelo;
}


// texto do 📋 Copiar (para mandar no Zap)
function textoDemanda(demanda, de, ate){

    const plural = (numero, um, varios) => `${numero} ${numero === 1 ? um : varios}`;

    const linhas = [`📦 Demanda de máquinas — ${dataBR(de)} a ${dataBR(ate)}`, ""];

    const saem = demanda.modelos.filter(conta => conta.saem);

    if(!saem.length) linhas.push("Nenhuma máquina sai para cliente no período.");

    saem.forEach(conta => {

        const extras = [
            conta.semPatrimonio ? `${conta.semPatrimonio} sem patrimônio` : "",
            conta.voltam ? `${plural(conta.voltam, "volta", "voltam")} em coleta` : ""
        ].filter(Boolean);

        linhas.push(`• ${conta.modelo}: ${conta.saem}` + (extras.length ? ` (${extras.join("; ")})` : ""));
    });

    if(saem.length){

        linhas.push(
            "",
            `Total: ${plural(demanda.total.saem, "máquina", "máquinas")} em ${plural(demanda.total.entregas, "entrega", "entregas")}`
        );
    }

    return linhas.join("\n");
}
