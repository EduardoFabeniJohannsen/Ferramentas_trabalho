// ======================================
// AGENDA - PEDIDO DE COMPRA (PDF NO STORAGE)
// ======================================
// Envio, abertura e exclusão do PDF do pedido de compra no Supabase
// Storage. O PDF fica no bucket privado BUCKET_PEDIDOS e só abre por link
// temporário. Ele só é enviado/apagado quando clica em Salvar (o caminho
// usa o id do agendamento). A tela e o estado do PDF ficam em
// agenda-pedido.js. Precisa vir carregado DEPOIS dele.

// bucket privado: os PDFs só abrem por link temporário
const BUCKET_PEDIDOS = "pedidos-compra";


async function abrirPedidoPdf(){

    if(!pedidoPdf.salvo) return;

    // abre a aba já no clique (senão o navegador bloqueia o pop-up)
    const janela = window.open("about:blank", "_blank");

    const { data, error } =
        await supabaseClient
            .storage
            .from(BUCKET_PEDIDOS)
            .createSignedUrl(pedidoPdf.salvo.caminho, 120);

    if(error || !data?.signedUrl){

        console.error("[agenda] Falha ao abrir o PDF do pedido:", detalhesErro(error));

        if(janela) janela.close();

        return mostrarToast("Não foi possível abrir o PDF", true);
    }

    if(!janela){

        return mostrarToast("Libere os pop-ups do navegador para abrir o PDF", true);
    }

    janela.location.href = data.signedUrl;
}


async function enviarPedidoPdf(idAgendamento, arquivo){

    // nome sem acento e sem símbolos (o Storage não aceita todos)
    const nomeSeguro =
        arquivo.name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9._-]/g, "_");

    const caminho =
        `agendamento-${idAgendamento}/${Date.now()}-${nomeSeguro}`;

    const { error } =
        await supabaseClient
            .storage
            .from(BUCKET_PEDIDOS)
            .upload(
                caminho,
                arquivo,
                { contentType: "application/pdf", upsert: false }
            );

    if(error) throw error;

    return { caminho: caminho, nome: arquivo.name };
}


// apaga os arquivos do bucket (se falhar só registra: o arquivo fica sem registro)
async function removerPedidoPdfStorage(caminho){

    if(!caminho) return;

    const { error } =
        await supabaseClient
            .storage
            .from(BUCKET_PEDIDOS)
            .remove([caminho]);

    if(error){

        console.error("[agenda] Falha ao apagar o PDF do pedido:", detalhesErro(error));
    }
}


// Depois de gravar o agendamento: envia o PDF novo e apaga o antigo.
// registro = agendamento já gravado (recebe o caminho do PDF novo).
// Devolve {} ou { erro }.
async function sincronizarPdfPedido(registro){

    const pendencia = pendenciaPdf;

    pendenciaPdf = { apagar: "", enviar: null };

    if(!pendencia.apagar && !pendencia.enviar) return {};

    if(pendencia.enviar){

        try{

            const enviado =
                await enviarPedidoPdf(registro.id, pendencia.enviar);

            const atualizado =
                await atualizarAgendamento(
                    registro.id,
                    {
                        pedidoPdfCaminho: enviado.caminho,
                        pedidoPdfNome: enviado.nome
                    }
                );

            Object.assign(registro, atualizado);

        }catch(erro){

            console.error("[agenda] Falha ao enviar o PDF do pedido:", detalhesErro(erro));

            return {
                erro: "Agendamento salvo, mas o PDF do pedido não foi enviado. Anexe de novo e salve"
            };
        }
    }

    // o antigo só sai depois que o novo já está gravado
    await removerPedidoPdfStorage(pendencia.apagar);

    return {};
}
