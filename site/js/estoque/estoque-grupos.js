// ======================================
// ESTOQUE - MONTAR GRUPOS
// ======================================
// Agrupa modelos por tipo (letras do patrimônio) para cada status.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// MONTAR GRUPOS (por status)
// ======================================

// tipo = letras depois do W (WAE18 -> AE, WTLD25 -> TLD, WQ12 -> Q).
// SUB e INUTI são tipos à parte. Vazio = tipo desconhecido.
function tipoDoModelo(modelo){

    if(modelo.startsWith("INUTI")) return "INUTI";

    if(modelo.startsWith("SUB")) return "SUB";

    const partes = modelo.match(/^W(TL|A|T|Q|M)([ED]?)\d/);

    return partes ? partes[1] + partes[2] : "";
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

        // só entram modelos com máquina (quantidade 0 não aparece)
        Object.keys(mapaModelos)
            .filter(modelo => tipoDoModelo(modelo) === tipo.codigo)
            .sort(ordenarModelos)
            .forEach(modelo => {

                usados.add(modelo);

                itens.push({
                    rotulo: rotulo(modelo),
                    lista: mapaModelos[modelo]
                });
            });

        if(itens.length){

            grupos.push({ titulo: tipo.titulo, itens: itens });
        }
    });

    // o que sobrou (tipos desconhecidos)
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
            titulo: TITULO_OUTROS,
            itens: restantes
        });
    }

    return grupos;
}
