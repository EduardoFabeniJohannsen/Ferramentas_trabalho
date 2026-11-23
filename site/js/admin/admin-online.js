// ======================================
// ADMIN - ONLINE AGORA
// ======================================
// Painel com quem está com o sistema aberto, em qual página e se está usando
// (presenca.js manda esses dados). Atualiza sozinho. Quem não aparece está com o
// sistema fechado: não fica histórico de acessos.

const TEXTO_ESTADO_ONLINE = {
    usando: "usando agora",
    parado: "parado",
    oculto: "em segundo plano"
};

// ordem na lista e na bolinha: quem está usando vem primeiro
const ORDEM_ESTADO_ONLINE = ["usando", "parado", "oculto"];


function nomePaginaOnline(pagina){

    if(pagina === "admin") return "Admin";

    const acesso = ACESSOS_ADMIN.find(item => item.chave === pagina);

    return acesso ? acesso.rotulo.replace(" (ver)", "") : pagina;
}


// "há 12 min", "há 2 h". Quem está usando não precisa de tempo.
function tempoOnline(desde){

    const minutos = Math.floor(Math.max(0, Date.now() - desde) / 60000);

    if(minutos < 1) return "há menos de 1 min";

    if(minutos < 60) return `há ${minutos} min`;

    return `há ${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}


function textoAbaOnline(aba){

    const estado = TEXTO_ESTADO_ONLINE[aba.estado] || aba.estado;

    return aba.estado === "usando"
        ? `${nomePaginaOnline(aba.pagina)}: ${estado}`
        : `${nomePaginaOnline(aba.pagina)}: ${estado} ${tempoOnline(aba.desde)}`;
}


// [{ id, nome, estado, abas }], uma linha por pessoa (pode ter várias abas abertas
// ou estar em mais de um computador)
function pessoasOnline(){

    const estado = canalPresenca ? canalPresenca.presenceState() : {};

    const posicao = (aba) => ORDEM_ESTADO_ONLINE.indexOf(aba.estado);

    return Object.entries(estado)
        .map(([id, abas]) => {

            const ordenadas =
                abas.slice().sort((a, b) => posicao(a) - posicao(b));

            const perfil = perfisAdmin.find(item => item.id === id);

            return {
                id,
                nome: perfil ? (perfil.email || id) : "Usuário não identificado",
                estado: ordenadas[0].estado,
                abas: ordenadas
            };
        })
        .sort((a, b) =>
            (
                ORDEM_ESTADO_ONLINE.indexOf(a.estado) -
                ORDEM_ESTADO_ONLINE.indexOf(b.estado)
            ) ||
            a.nome.localeCompare(b.nome)
        );
}


function desenharUsuariosOnline(){

    const pessoas = pessoasOnline();

    const usando =
        pessoas.filter(pessoa => pessoa.estado === "usando").length;

    $("tituloOnline").innerText =
        pessoas.length
            ? `Online agora: ${pessoas.length} (${usando} usando)`
            : "Online agora: conectando...";

    const lista = $("listaOnline");

    lista.innerHTML = "";

    pessoas.forEach(pessoa => {

        const linha = document.createElement("li");

        linha.className = `online-linha online-${pessoa.estado}`;

        const nome = document.createElement("strong");

        nome.textContent = pessoa.nome;

        const abas = document.createElement("span");

        abas.textContent = pessoa.abas.map(textoAbaOnline).join(" · ");

        linha.append(nome, abas);

        // um por aparelho (várias abas no mesmo computador aparecem uma vez)
        const aparelhos =
            [...new Set(pessoa.abas.map(textoAparelhoOnline).filter(Boolean))];

        if(aparelhos.length){

            linha.appendChild(criar("small", "online-aparelho", aparelhos.join(" | ")));
        }

        lista.appendChild(linha);
    });
}
