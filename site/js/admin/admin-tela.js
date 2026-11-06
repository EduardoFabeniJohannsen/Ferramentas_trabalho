// ======================================
// ADMIN - TELA
// ======================================
// Tabela de usuários com uma caixinha por acesso e por filial.

// liga ou desliga um item de uma lista, sem repetir
function alternarItemLista(lista, item, ligado){

    const sem = lista.filter(existente => existente !== item);

    return ligado ? [...sem, item] : sem;
}


// célula com uma caixinha; aoMudar(marcada) devolve true se salvou
// (se falhar, a caixinha volta pro que estava)
function criarCaixaAdmin(marcada, rotulo, aoMudar, classe){

    const td = document.createElement("td");

    if(classe) td.className = classe;

    const caixa = document.createElement("input");

    caixa.type = "checkbox";

    caixa.checked = marcada;

    caixa.title = rotulo;

    caixa.addEventListener(
        "change",
        async () => {

            caixa.disabled = true;

            const salvou = await aoMudar(caixa.checked);

            caixa.disabled = false;

            if(!salvou) caixa.checked = !caixa.checked;
        }
    );

    td.appendChild(caixa);

    return td;
}


function desenharCabecalhoAdmin(){

    const cabecalho = $("cabecalhoAdmin");

    cabecalho.innerHTML = "";

    const linha = document.createElement("tr");

    const titulos = [
        { texto: "Usuário", classe: "col-usuario" },
        { texto: "Ativo", classe: "" },
        ...ACESSOS_ADMIN.map(acesso => ({ texto: acesso.rotulo, classe: "" })),
        ...FILIAIS_ADMIN.map((filial, indice) => ({
            texto: `Estoque ${filial.rotulo}`,
            classe: indice === 0 ? "inicio-grupo" : ""
        }))
    ];

    titulos.forEach(titulo => {

        const th = document.createElement("th");

        th.innerText = titulo.texto;

        if(titulo.classe) th.className = titulo.classe;

        linha.appendChild(th);
    });

    cabecalho.appendChild(linha);
}


function desenharPerfis(){

    desenharCabecalhoAdmin();

    const corpo = $("corpoAdmin");

    corpo.innerHTML = "";

    const filtro =
        $("filtroUsuarios").value.trim().toLowerCase();

    const visiveis =
        perfisAdmin.filter(perfil =>
            !filtro ||
            String(perfil.email || "").toLowerCase().includes(filtro)
        );

    visiveis.forEach(perfil => {

        const tr = document.createElement("tr");

        tr.classList.toggle("inativo", !perfil.ativo);

        const tdUsuario = document.createElement("td");

        tdUsuario.className = "col-usuario";

        tdUsuario.innerText = perfil.email || perfil.id;

        tr.appendChild(tdUsuario);

        tr.appendChild(
            criarCaixaAdmin(
                perfil.ativo,
                "Usuário ativo",
                async (marcada) => {

                    const salvou =
                        await salvarPerfilAdmin(perfil, { ativo: marcada });

                    if(salvou) tr.classList.toggle("inativo", !perfil.ativo);

                    return salvou;
                }
            )
        );

        ACESSOS_ADMIN.forEach(acesso => {

            tr.appendChild(
                criarCaixaAdmin(
                    perfil.acessos.includes(acesso.chave),
                    acesso.rotulo,
                    async (marcada) => {

                        const salvou =
                            await salvarPerfilAdmin(
                                perfil,
                                {
                                    acessos: alternarItemLista(
                                        perfil.acessos,
                                        acesso.chave,
                                        marcada
                                    )
                                }
                            );

                        if(!salvou) return false;

                        // confere o que o banco gravou de verdade (uma regra
                        // no Supabase pode descartar um acesso que não conhece)
                        if(perfil.acessos.includes(acesso.chave) !== marcada){

                            console.error(
                                "[admin] O banco não gravou o acesso:",
                                acesso.chave,
                                perfil.acessos
                            );

                            mostrarToast(
                                `O banco não aceitou "${acesso.rotulo}" (ver regras da tabela perfis no Supabase)`,
                                true
                            );

                            return false;
                        }

                        return true;
                    }
                )
            );
        });

        FILIAIS_ADMIN.forEach((filial, indice) => {

            tr.appendChild(
                criarCaixaAdmin(
                    perfil.filiais.includes(filial.chave),
                    `Estoque ${filial.rotulo}`,
                    (marcada) =>
                        salvarPerfilAdmin(
                            perfil,
                            {
                                filiais: alternarItemLista(
                                    perfil.filiais,
                                    filial.chave,
                                    marcada
                                )
                            }
                        ),
                    indice === 0 ? "inicio-grupo" : ""
                )
            );
        });

        corpo.appendChild(tr);
    });

    $("contagemUsuarios").innerText =
        `${visiveis.length} usuário(s)`;
}


// ======================================
// NOVO USUÁRIO
// ======================================

async function criarUsuario(){

    const campoEmail = $("novoEmail");

    const campoSenha = $("novaSenha");

    const botao = $("btnCriarUsuario");

    const email = campoEmail.value.trim().toLowerCase();

    const senha = campoSenha.value;

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){

        return mostrarToast("Informe um e-mail válido", true);
    }

    if(senha.length < 8){

        return mostrarToast("A senha precisa ter pelo menos 8 caracteres", true);
    }

    botao.disabled = true;

    const resultado = await criarUsuarioAdmin(email, senha);

    botao.disabled = false;

    if(resultado.erro){

        return mostrarToast(resultado.erro, true);
    }

    campoEmail.value = "";

    campoSenha.value = "";

    // o filtro some pra o usuário novo aparecer
    $("filtroUsuarios").value = "";

    mostrarToast("Usuário criado (só Propostas liberada)");

    await carregarPerfisAdmin();
}
