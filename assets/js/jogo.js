(function () {
    const CHAVE_STORAGE = "sach_jogo_partida";
    const jogadores = {
        eu: "SASA",
        ela: "CH"
    };

    let app = null;
    let estado = null;

    // Configuracao inicial
    window.iniciarJogoCasal = iniciarJogo;

    if (!window.__sachJogoManualInit) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", iniciarJogo);
        } else {
            iniciarJogo();
        }
    }

    function lerPartidaStorage() {
        try {
            return window.localStorage.getItem(CHAVE_STORAGE);
        } catch (erro) {
            console.warn("Nao foi possivel ler a partida salva:", erro);
            return null;
        }
    }

    function salvarPartidaStorage() {
        try {
            window.localStorage.setItem(CHAVE_STORAGE, JSON.stringify(estado));
        } catch (erro) {
            console.warn("Nao foi possivel salvar a partida:", erro);
        }
    }

    function limparPartidaStorage() {
        try {
            window.localStorage.removeItem(CHAVE_STORAGE);
        } catch (erro) {
            console.warn("Nao foi possivel remover a partida salva:", erro);
        }
    }

    function iniciarJogo() {
        app = document.getElementById("jogoApp");

        if (!app) {
            return;
        }

        if (!Array.isArray(window.perguntasJogo) || window.perguntasJogo.length === 0) {
            renderizarErro("As perguntas do jogo n\u00e3o carregaram. Confira se o arquivo assets/js/perguntas-jogo.js existe.");
            return;
        }

        const partidaSalva = carregarPartidaSalva();

        if (partidaSalva) {
            renderizarPartidaEncontrada(partidaSalva);
            return;
        }

        renderizarConfiguracao();
    }

    // localStorage
    function carregarPartidaSalva() {
        const textoSalvo = lerPartidaStorage();

        if (!textoSalvo) {
            return null;
        }

        try {
            const partida = JSON.parse(textoSalvo);

            if (!partida || !Array.isArray(partida.perguntas) || !partida.respostas) {
                return null;
            }

            return partida;
        } catch (erro) {
            console.warn("N\u00e3o foi poss\u00edvel carregar a partida salva:", erro);
            return null;
        }
    }

    function salvarEstado() {
        salvarPartidaStorage();
    }

    function limparEstado() {
        limparPartidaStorage();
        estado = null;
    }

    function renderizarPartidaEncontrada(partidaSalva) {
        app.innerHTML = `
            <section class="jogo-card">
                <h2 class="jogo-titulo">Partida em andamento</h2>
                <p class="jogo-subtitulo">Existe uma partida salva neste navegador. Voc\u00ea pode continuar de onde parou ou come\u00e7ar uma nova.</p>

                <div class="jogo-botoes">
                    <button class="jogo-botao" id="continuarPartida" type="button">Continuar</button>
                    <button class="jogo-botao-secundario" id="novaPartida" type="button">Come\u00e7ar nova</button>
                </div>
            </section>
        `;

        document.getElementById("continuarPartida").addEventListener("click", function () {
            estado = partidaSalva;
            renderizarEtapaAtual();
        });

        document.getElementById("novaPartida").addEventListener("click", function () {
            limparEstado();
            renderizarConfiguracao();
        });
    }

    function renderizarEtapaAtual() {
        if (!estado) {
            renderizarConfiguracao();
            return;
        }

        if (estado.etapa === "respondendo") {
            renderizarPergunta();
            return;
        }

        if (estado.etapa === "troca") {
            mostrarTrocaDeJogador();
            return;
        }

        if (estado.etapa === "resultado") {
            renderizarResultadoFinal();
            return;
        }

        renderizarConfiguracao();
    }

    function renderizarConfiguracao(aviso) {
        app.innerHTML = `
            <section class="jogo-card">
                <h2 class="jogo-titulo">Perguntas e respostas</h2>
                <p class="jogo-subtitulo">Cada pessoa vai responder sua pr\u00f3pria resposta e tamb\u00e9m tentar adivinhar o que a outra pessoa responderia.</p>

                <form class="jogo-form" id="configuracaoJogo">
                    <div class="jogo-campo">
                        <span class="jogo-label">Quem come\u00e7a?</span>
                        <div class="jogo-jogador-opcoes">
                            <label class="jogo-jogador-opcao">
                                <input name="jogadorInicial" type="radio" value="eu">
                                <span class="jogo-nome-opcao">SASA <span class="heart jogo-heart">&#10084;</span></span>
                            </label>
                            <label class="jogo-jogador-opcao">
                                <input name="jogadorInicial" type="radio" value="ela">
                                <span class="jogo-nome-opcao">CH <span class="heart jogo-heart">&#10084;</span></span>
                            </label>
                        </div>
                    </div>

                    <div class="jogo-campo">
                        <span class="jogo-label">Quantidade de perguntas</span>
                        <div class="jogo-radio-opcoes jogo-quantidade-opcoes" role="radiogroup" aria-label="Quantidade de perguntas">
                            <label class="jogo-radio-opcao">
                                <input name="quantidadePerguntas" type="radio" value="5" checked>
                                <span class="jogo-radio-texto">5</span>
                            </label>
                            <label class="jogo-radio-opcao">
                                <input name="quantidadePerguntas" type="radio" value="10">
                                <span class="jogo-radio-texto">10</span>
                            </label>
                            <label class="jogo-radio-opcao">
                                <input name="quantidadePerguntas" type="radio" value="15">
                                <span class="jogo-radio-texto">15</span>
                            </label>
                        </div>
                    </div>

                    <div class="jogo-campo">
                        <span class="jogo-label">Categoria</span>
                        <div class="jogo-select-personalizado" id="categoriaPersonalizada">
                            <input id="categoriaPerguntas" name="categoriaPerguntas" type="hidden" value="misturado">
                            <button class="jogo-select-botao" id="abrirCategorias" type="button" aria-expanded="false" aria-controls="listaCategorias">
                                <span class="jogo-select-valor">Misturado</span>
                                <span class="jogo-select-seta" aria-hidden="true">&#8964;</span>
                            </button>
                            <div class="jogo-select-lista" id="listaCategorias" role="listbox" hidden>
                                <button class="jogo-select-opcao ativa" type="button" data-categoria="misturado">Misturado</button>
                                <button class="jogo-select-opcao" type="button" data-categoria="romanticas">Rom&acirc;nticas</button>
                                <button class="jogo-select-opcao" type="button" data-categoria="engracadas">Engra&ccedil;adas</button>
                                <button class="jogo-select-opcao" type="button" data-categoria="gostos">Gostos</button>
                                <button class="jogo-select-opcao" type="button" data-categoria="memorias">Mem&oacute;rias</button>
                                <button class="jogo-select-opcao" type="button" data-categoria="futuro">Futuro</button>
                                <button class="jogo-select-opcao" type="button" data-categoria="rotina">Rotina</button>
                            </div>
                        </div>
                    </div>

                    <p class="jogo-info">As duas pessoas responder\u00e3o as mesmas perguntas na mesma ordem. O resultado aparece s\u00f3 depois que as duas terminarem.</p>

                    <div class="jogo-botoes">
                        <button class="jogo-botao" type="submit">Come\u00e7ar partida</button>
                        <button class="jogo-botao-secundario" id="limparPartidaConfig" type="button">Limpar partida salva</button>
                    </div>

                    <p class="jogo-aviso ${aviso ? "visivel" : ""}" id="avisoConfiguracao">${aviso || ""}</p>
                </form>
            </section>
        `;

        inicializarCategoriaPersonalizada();

        document.getElementById("configuracaoJogo").addEventListener("submit", function (evento) {
            evento.preventDefault();

            const dados = new FormData(evento.currentTarget);
            const jogadorInicial = dados.get("jogadorInicial");
            const quantidade = Number(dados.get("quantidadePerguntas"));
            const categoria = dados.get("categoriaPerguntas");

            if (!jogadorInicial) {
                renderizarConfiguracao("Escolha quem come\u00e7a: SASA \u2764 ou CH \u2764.");
                return;
            }

            const sorteio = sortearPerguntas(categoria, quantidade);

            if (sorteio.perguntas.length === 0) {
                renderizarConfiguracao("Nenhuma pergunta foi encontrada para essa categoria.");
                return;
            }

            const outroJogador = jogadorInicial === "eu" ? "ela" : "eu";

            estado = {
                etapa: "respondendo",
                jogadorInicial: jogadorInicial,
                ordemJogadores: [jogadorInicial, outroJogador],
                jogadorAtual: jogadorInicial,
                perguntas: sorteio.perguntas,
                respostas: {
                    eu: [],
                    ela: []
                },
                perguntaAtual: 0,
                categoriaEscolhida: categoria,
                quantidadeEscolhida: quantidade,
                resultadoFinal: null,
                avisoQuantidade: sorteio.aviso
            };

            salvarEstado();
            renderizarPergunta();
        });

        document.getElementById("limparPartidaConfig").addEventListener("click", function () {
            limparEstado();
            renderizarConfiguracao("Partida salva removida.");
        });
    }

    function inicializarCategoriaPersonalizada() {
        const caixa = document.getElementById("categoriaPersonalizada");
        const campo = document.getElementById("categoriaPerguntas");
        const botao = document.getElementById("abrirCategorias");
        const lista = document.getElementById("listaCategorias");
        const valor = botao ? botao.querySelector(".jogo-select-valor") : null;
        const opcoes = lista ? lista.querySelectorAll(".jogo-select-opcao") : [];

        if (!caixa || !campo || !botao || !lista || !valor) {
            return;
        }

        function fecharLista() {
            lista.hidden = true;
            caixa.classList.remove("aberta");
            botao.setAttribute("aria-expanded", "false");
        }

        function alternarLista() {
            const estaAberta = lista.hidden === false;

            lista.hidden = estaAberta;
            caixa.classList.toggle("aberta", !estaAberta);
            botao.setAttribute("aria-expanded", String(!estaAberta));
        }

        botao.addEventListener("click", function () {
            alternarLista();
        });

        opcoes.forEach(function (opcao) {
            opcao.addEventListener("click", function () {
                campo.value = opcao.dataset.categoria;
                valor.textContent = opcao.textContent;

                opcoes.forEach(function (item) {
                    item.classList.remove("ativa");
                });

                opcao.classList.add("ativa");
                fecharLista();
            });
        });

        document.addEventListener("click", function fecharAoClicarFora(evento) {
            if (!caixa.isConnected) {
                document.removeEventListener("click", fecharAoClicarFora);
                return;
            }

            if (!caixa.contains(evento.target)) {
                fecharLista();
            }
        });

        document.addEventListener("keydown", function fecharComEsc(evento) {
            if (!caixa.isConnected) {
                document.removeEventListener("keydown", fecharComEsc);
                return;
            }

            if (evento.key === "Escape") {
                fecharLista();
            }
        });
    }

    // Sorteio das perguntas
    function sortearPerguntas(categoria, quantidade) {
        const fonte = categoria === "misturado"
            ? window.perguntasJogo.slice()
            : window.perguntasJogo.filter(function (pergunta) {
                return pergunta.categoria === categoria;
            });

        const embaralhadas = embaralharPerguntas(fonte);
        const total = Math.min(quantidade, embaralhadas.length);
        const perguntas = embaralhadas.slice(0, total);
        const aviso = total < quantidade
            ? `Essa categoria tem menos perguntas dispon\u00edveis. A partida foi ajustada para ${total} perguntas.`
            : "";

        return {
            perguntas: perguntas,
            aviso: aviso
        };
    }

    function embaralharPerguntas(perguntas) {
        const copia = perguntas.slice();

        for (let indice = copia.length - 1; indice > 0; indice--) {
            const novoIndice = Math.floor(Math.random() * (indice + 1));
            const temporario = copia[indice];
            copia[indice] = copia[novoIndice];
            copia[novoIndice] = temporario;
        }

        return copia;
    }

    // Renderizacao da pergunta
    function renderizarPergunta() {
        const pergunta = estado.perguntas[estado.perguntaAtual];
        const outroJogador = obterChaveOutroJogador(estado.jogadorAtual);
        const respostaSalva = estado.respostas[estado.jogadorAtual][estado.perguntaAtual] || {};
        const opcoesMinhaResposta = criarOpcoes(pergunta, "respostaReal", respostaSalva.resposta);
        const opcoesPrevisao = criarOpcoes(pergunta, "previsaoResposta", respostaSalva.previsao);

        app.innerHTML = `
            <section class="jogo-card">
                <div class="jogo-topo-pergunta">
                    <span class="jogo-jogador jogo-jogador-atual">${obterNomeJogadorHtml(estado.jogadorAtual)}</span>
                    <span class="jogo-progresso">Pergunta ${estado.perguntaAtual + 1} de ${estado.perguntas.length}</span>
                </div>

                <h2 class="jogo-pergunta">${escaparHtml(pergunta.pergunta)}</h2>

                ${estado.avisoQuantidade ? `<p class="jogo-info">${escaparHtml(estado.avisoQuantidade)}</p>` : ""}

                <form class="jogo-form" id="formPergunta">
                    <fieldset class="jogo-opcoes">
                        <legend class="jogo-legenda">Minha resposta</legend>
                        ${opcoesMinhaResposta}
                    </fieldset>

                    <fieldset class="jogo-opcoes">
                        <legend class="jogo-legenda">O que acho que ${obterNomeJogadorHtml(outroJogador)}&nbsp;&nbsp;responderia</legend>
                        ${opcoesPrevisao}
                    </fieldset>

                    <p class="jogo-aviso" id="avisoPergunta">Escolha sua resposta e tamb\u00e9m o que voc\u00ea acha que a outra pessoa responderia.</p>

                    <div class="jogo-botoes">
                        <button class="jogo-botao" type="submit">Pr\u00f3xima</button>
                        <button class="jogo-botao-secundario" id="limparPartidaPergunta" type="button">Limpar partida salva</button>
                    </div>
                </form>
            </section>
        `;

        document.getElementById("formPergunta").addEventListener("submit", function (evento) {
            evento.preventDefault();
            salvarRespostaAtual(evento.currentTarget);
        });

        document.getElementById("limparPartidaPergunta").addEventListener("click", function () {
            limparEstado();
            renderizarConfiguracao("Partida salva removida.");
        });
    }

    function criarOpcoes(pergunta, nomeCampo, valorSalvo) {
        return pergunta.opcoes.map(function (opcao, indice) {
            const id = `${nomeCampo}-${pergunta.id}-${indice}`;
            const marcado = Number(valorSalvo) === indice ? "checked" : "";

            return `
                <label class="jogo-opcao" for="${id}">
                    <input id="${id}" name="${nomeCampo}" type="radio" value="${indice}" ${marcado}>
                    <span>${escaparHtml(opcao)}</span>
                </label>
            `;
        }).join("");
    }

    // Salvamento das respostas
    function salvarRespostaAtual(formulario) {
        const dados = new FormData(formulario);
        const respostaReal = dados.get("respostaReal");
        const previsaoResposta = dados.get("previsaoResposta");
        const aviso = document.getElementById("avisoPergunta");

        if (respostaReal === null || previsaoResposta === null) {
            aviso.classList.add("visivel");
            return;
        }

        estado.respostas[estado.jogadorAtual][estado.perguntaAtual] = {
            perguntaId: estado.perguntas[estado.perguntaAtual].id,
            resposta: Number(respostaReal),
            previsao: Number(previsaoResposta)
        };

        salvarEstado();
        avancarPergunta();
    }

    function avancarPergunta() {
        if (estado.perguntaAtual < estado.perguntas.length - 1) {
            estado.perguntaAtual += 1;
            salvarEstado();
            renderizarPergunta();
            return;
        }

        if (estado.jogadorAtual === estado.ordemJogadores[0]) {
            estado.etapa = "troca";
            salvarEstado();
            mostrarTrocaDeJogador();
            return;
        }

        estado.resultadoFinal = calcularResultado();
        estado.etapa = "resultado";
        salvarEstado();
        renderizarResultadoFinal();
    }

    function mostrarTrocaDeJogador() {
        const proximoJogador = estado.ordemJogadores[1];

        app.innerHTML = `
            <section class="jogo-card">
                <h2 class="jogo-titulo">Agora \u00e9 a vez da outra pessoa responder</h2>
                <p class="jogo-subtitulo">As respostas anteriores foram salvas. Entregue o celular/computador para a outra pessoa responder sem ver o resultado.</p>
                <p class="jogo-info">Pr\u00f3xima pessoa: <strong>${obterNomeJogadorHtml(proximoJogador)}</strong></p>

                <div class="jogo-botoes">
                    <button class="jogo-botao" id="comecarOutroJogador" type="button">Come\u00e7ar respostas da outra pessoa</button>
                    <button class="jogo-botao-secundario" id="limparPartidaTroca" type="button">Limpar partida salva</button>
                </div>
            </section>
        `;

        document.getElementById("comecarOutroJogador").addEventListener("click", trocarJogador);
        document.getElementById("limparPartidaTroca").addEventListener("click", function () {
            limparEstado();
            renderizarConfiguracao("Partida salva removida.");
        });
    }

    function trocarJogador() {
        estado.jogadorAtual = estado.ordemJogadores[1];
        estado.perguntaAtual = 0;
        estado.etapa = "respondendo";
        salvarEstado();
        renderizarPergunta();
    }

    // Calculo do resultado
    function calcularResultado() {
        let pontosEu = 0;
        let pontosEla = 0;

        const detalhes = estado.perguntas.map(function (pergunta, indice) {
            const respostaEu = estado.respostas.eu[indice];
            const respostaEla = estado.respostas.ela[indice];
            const euAcertou = respostaEu && respostaEla ? respostaEu.previsao === respostaEla.resposta : false;
            const elaAcertou = respostaEu && respostaEla ? respostaEla.previsao === respostaEu.resposta : false;

            if (euAcertou) {
                pontosEu += 1;
            }

            if (elaAcertou) {
                pontosEla += 1;
            }

            return {
                pergunta: pergunta,
                respostaEu: respostaEu,
                respostaEla: respostaEla,
                euAcertou: euAcertou,
                elaAcertou: elaAcertou,
                status: obterStatusPergunta(euAcertou, elaAcertou)
            };
        });

        const total = estado.perguntas.length;

        return {
            pontos: {
                eu: pontosEu,
                ela: pontosEla
            },
            porcentagens: {
                eu: Math.round((pontosEu / total) * 100),
                ela: Math.round((pontosEla / total) * 100)
            },
            vencedor: obterVencedor(pontosEu, pontosEla),
            detalhes: detalhes
        };
    }

    function obterStatusPergunta(euAcertou, elaAcertou) {
        if (euAcertou && elaAcertou) {
            return "Os dois acertaram";
        }

        if (euAcertou) {
            return `S\u00f3 ${obterNomeJogadorCompleto("eu")} acertou`;
        }

        if (elaAcertou) {
            return `S\u00f3 ${obterNomeJogadorCompleto("ela")} acertou`;
        }

        return "Ningu\u00e9m acertou";
    }

    function obterVencedor(pontosEu, pontosEla) {
        if (pontosEu > pontosEla) {
            return "eu";
        }

        if (pontosEla > pontosEu) {
            return "ela";
        }

        return "empate";
    }

    // Renderizacao do resultado final
    function renderizarResultadoFinal() {
        if (!estado.resultadoFinal || !["eu", "ela", "empate"].includes(estado.resultadoFinal.vencedor)) {
            estado.resultadoFinal = calcularResultado();
            salvarEstado();
        }

        const resultado = estado.resultadoFinal;
        const cards = resultado.detalhes.map(criarCardResultado).join("");
        const textoVencedor = resultado.vencedor === "empate" || resultado.vencedor === "Empate"
            ? "Empate! Os dois ficaram com a mesma pontua\u00e7\u00e3o."
            : `Vencedor: ${obterNomeJogadorHtml(resultado.vencedor)}`;

        app.innerHTML = `
            <section class="jogo-card">
                <h2 class="jogo-titulo">Resultado da Partida</h2>

                <div class="resultado-resumo">
                    <div class="resultado-item">
                        <span>${obterNomeJogadorHtml("eu")}</span>
                        <strong>${resultado.pontos.eu} de ${estado.perguntas.length}</strong>
                        <span>${resultado.porcentagens.eu}%</span>
                    </div>
                    <div class="resultado-item">
                        <span>${obterNomeJogadorHtml("ela")}</span>
                        <strong>${resultado.pontos.ela} de ${estado.perguntas.length}</strong>
                        <span>${resultado.porcentagens.ela}%</span>
                    </div>
                </div>

                <p class="resultado-vencedor">${textoVencedor}</p>

                <div class="resultado-detalhes">
                    ${cards}
                </div>

                <div class="jogo-botoes">
                    <button class="jogo-botao" id="jogarNovamente" type="button">Jogar novamente</button>
                    <button class="jogo-botao-secundario" id="limparPartidaResultado" type="button">Limpar partida salva</button>
                </div>
            </section>
        `;

        document.getElementById("jogarNovamente").addEventListener("click", function () {
            limparEstado();
            renderizarConfiguracao();
        });

        document.getElementById("limparPartidaResultado").addEventListener("click", function () {
            limparEstado();
            renderizarConfiguracao("Partida salva removida.");
        });
    }

    function criarCardResultado(item, indice) {
        const opcoes = item.pergunta.opcoes;
        const respostaRealEu = obterTextoResposta(opcoes, item.respostaEu && item.respostaEu.resposta);
        const previsaoEu = obterTextoResposta(opcoes, item.respostaEu && item.respostaEu.previsao);
        const respostaRealEla = obterTextoResposta(opcoes, item.respostaEla && item.respostaEla.resposta);
        const previsaoEla = obterTextoResposta(opcoes, item.respostaEla && item.respostaEla.previsao);
        const classeEu = item.euAcertou ? "acertou" : "errou";
        const classeEla = item.elaAcertou ? "acertou" : "errou";

        return `
            <article class="resultado-card">
                <h3>Pergunta ${indice + 1}</h3>
                <p class="resultado-pergunta">"${escaparHtml(item.pergunta.pergunta)}"</p>

                <div class="resultado-colunas">
                    <div class="resultado-coluna">
                        <h4>Jogador 1 - ${obterNomeJogadorHtml("eu")}</h4>
                        <p><strong>Resposta real:</strong> ${escaparHtml(respostaRealEu)}</p>
                        <p><strong>Chute sobre ${obterNomeJogadorHtml("ela")}:</strong> ${escaparHtml(previsaoEu)}</p>
                        <p class="resultado-status ${classeEu}">Resultado do chute: ${item.euAcertou ? "Acertou" : "Errou"}</p>
                    </div>

                    <div class="resultado-coluna">
                        <h4>Jogador 2 - ${obterNomeJogadorHtml("ela")}</h4>
                        <p><strong>Resposta real:</strong> ${escaparHtml(respostaRealEla)}</p>
                        <p><strong>Chute sobre ${obterNomeJogadorHtml("eu")}:</strong> ${escaparHtml(previsaoEla)}</p>
                        <p class="resultado-status ${classeEla}">Resultado do chute: ${item.elaAcertou ? "Acertou" : "Errou"}</p>
                    </div>
                </div>

                <p class="resultado-status ${item.euAcertou || item.elaAcertou ? "acertou" : "errou"}">${obterStatusPerguntaHtml(item.euAcertou, item.elaAcertou)}</p>
            </article>
        `;
    }

    function obterTextoResposta(opcoes, indice) {
        if (typeof indice !== "number" || !opcoes[indice]) {
            return "Sem resposta";
        }

        return opcoes[indice];
    }

    function obterNomeJogador(chaveJogador) {
        return jogadores[chaveJogador] || "Jogador";
    }

    function obterNomeJogadorCompleto(chaveJogador) {
        return `${obterNomeJogador(chaveJogador)} \u2764`;
    }

    function obterNomeJogadorHtml(chaveJogador) {
        return `${escaparHtml(obterNomeJogador(chaveJogador))} <span class="heart jogo-heart">&#10084;</span>`;
    }

    function obterChaveOutroJogador(chaveJogador) {
        return chaveJogador === "eu" ? "ela" : "eu";
    }

    function obterNomeOutroJogador(chaveJogador) {
        return obterNomeJogadorCompleto(obterChaveOutroJogador(chaveJogador));
    }

    function obterStatusPerguntaHtml(euAcertou, elaAcertou) {
        if (euAcertou && elaAcertou) {
            return "Os dois acertaram";
        }

        if (euAcertou) {
            return `S\u00f3 ${obterNomeJogadorHtml("eu")} acertou`;
        }

        if (elaAcertou) {
            return `S\u00f3 ${obterNomeJogadorHtml("ela")} acertou`;
        }

        return "Ningu\u00e9m acertou";
    }

    function renderizarErro(mensagem) {
        app.innerHTML = `
            <section class="jogo-card">
                <h2 class="jogo-titulo">Ops</h2>
                <p class="jogo-subtitulo">${escaparHtml(mensagem)}</p>
            </section>
        `;
    }

    function escaparHtml(valor) {
        return String(valor)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
})();
