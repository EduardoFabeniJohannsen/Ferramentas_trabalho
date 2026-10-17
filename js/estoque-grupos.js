// ======================================
// ESTOQUE - MONTAR GRUPOS
// ======================================
// Agrupa modelos por tipo para cada status.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

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
