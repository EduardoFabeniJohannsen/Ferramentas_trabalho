// ======================================
// PROPOSTAS - PAINEL DE FRETES
// ======================================
// mostrarFretes(): fretes encontrados por transportadora.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// FRETES
// ======================================

function mostrarFretes(){

    const modelos =
        obterEquipamentos();


    const cidade =
        normalizarCidade(
            $("cidade")?.value
        );


    // tabela de fretes não carregou: mostra o motivo
    if(erroTabelaFretes){

        if($("resultadoFretes")){

            $("resultadoFretes").innerHTML =
                `<span style="color:#ef4444">⚠️ ${erroTabelaFretes}</span>`;
        }

        return;
    }


    if(
        !modelos.length ||
        !cidade
    ){

        if($("resultadoFretes")){

            $("resultadoFretes").innerHTML =
                "Nenhum frete consultado";
        }

        return;
    }


    let html = "";


    for(
        const equipamento
        of modelos
    ){

        html += `
            <div class="frete-item">
                <strong>
                    ${equipamento.quantidade > 1
                        ? equipamento.quantidade + " "
                        : ""
                    }${equipamento.modelo}
                </strong>
                <br>
            `;


        const resultadosFrete = [];

        for(
            const transportador
            in tabelasFrete
        ){

            const modeloTabela =
                tabelasFrete[
                    transportador
                ][
                    equipamento.modelo
                ];


            if(!modeloTabela){

                resultadosFrete.push({
                    valorNumerico: null,
                    html: `⚠️ ${transportador}: modelo não encontrado<br>`
                });

                continue;
            }


            const valor =
                modeloTabela[cidade];


            if(
                valor === undefined ||
                valor === ""
            ){

                resultadosFrete.push({
                    valorNumerico: null,
                    html: `⚠️ ${transportador}: cidade não encontrada<br>`
                });

            }else{

                resultadosFrete.push({
                    valorNumerico: brToNumber(valor),
                    html: `✅ ${transportador}: R$ ${valor}<br>`
                });
            }

        }

        // maior valor primeiro; avisos/erros ficam no final
        resultadosFrete.sort((a, b) => {

            if(a.valorNumerico === null && b.valorNumerico === null) return 0;
            if(a.valorNumerico === null) return 1;
            if(b.valorNumerico === null) return -1;

            return b.valorNumerico - a.valorNumerico;
        });

        resultadosFrete.forEach(item => {
            html += item.html;
        });


        html += `
            </div>
        `;
    }


    $("resultadoFretes").innerHTML =
        html;
}
