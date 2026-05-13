const botaoMusica = document.getElementById("botaoMusica");
const musica = document.getElementById("musica");
const nomeMusica = document.getElementById("nomeMusica");
const letraMusica = document.getElementById("letraMusica");
const listaMusicas = document.getElementById("listaMusicas");

const voltarMusica = document.getElementById("voltarMusica");
const playPauseMusica = document.getElementById("playPauseMusica");
const proximaMusica = document.getElementById("proximaMusica");

/*
    Monta o botão do header por JavaScript.
    Sem ícone de música.
*/
botaoMusica.innerHTML = `
    <span class="texto-botao-musica" id="textoHeaderMusica">Música</span>
`;

const textoHeaderMusica = document.getElementById("textoHeaderMusica");

/*
    Para adicionar mais músicas, copie este modelo:

    {
        nome: "Nome da música",
        arquivo: "musicas/nome-do-arquivo.mp3",
        letra: "letras-sincronizadas/nome-do-arquivo.txt"
    }

    Importante:
    - Use nomes sem acento.
    - Evite espaços.
    - O arquivo da letra sincronizada precisa ter linhas assim:
      [00:12.30] Texto da linha
*/

const musicas = [
    {
        nome: "VEIGH - Talvez você precise de mim",
        arquivo: "musicas/veigh-talvez-voce-precise-de-mim.mp3",
        letra: "letras-sincronizadas/veigh-talvez-voce-precise-de-mim.txt"
    },
    {
        nome: "VEIGH - Artista Genérico",
        arquivo: "musicas/veigh-artista-generico.mp3",
        letra: "letras-sincronizadas/veigh-artista-generico.txt"
    },
    {
        nome: "VEIGH - Devolve As Correntes",
        arquivo: "musicas/veigh-devolve-as-correntes.mp3",
        letra: "letras-sincronizadas/veigh-devolve-as-correntes.txt"
    },
    {
        nome: "LUAN SANTANA - Te Vivo",
        arquivo: "musicas/luan-santana-te-vivo.mp3",
        letra: "letras-sincronizadas/luan-santana-te-vivo.txt"
    },
    {
        nome: "ZÉ NETO E CRISTIANO - Sonha Comigo",
        arquivo: "musicas/ze-neto-e-cristiano-sonha-comigo.mp3",
        letra: "letras-sincronizadas/ze-neto-e-cristiano-sonha-comigo.txt"
    }
];

let musicaSelecionada = false;
let botaoSelecionado = null;
let indiceAtual = -1;

let letraSincronizada = [];
let linhaAtual = -1;

/*
    Garante que o áudio sempre toque em velocidade normal.
    playbackRate = velocidade atual
    defaultPlaybackRate = velocidade padrão
*/
function normalizarVelocidadeAudio() {
    musica.playbackRate = 1;
    musica.defaultPlaybackRate = 1;
}

/*
    CALCULA O TEMPO DO LETREIRO PELO TAMANHO DO NOME

    Importante:
    Isso mexe apenas na animação do texto.
    Não altera a velocidade da música.
*/
function calcularTempoLetreiro(nomeDaMusica) {
    const tamanho = nomeDaMusica.length;

    if (tamanho <= 15) {
        return "6s";
    }

    if (tamanho <= 25) {
        return "7s";
    }

    if (tamanho <= 40) {
        return "8s";
    }

    if (tamanho <= 60) {
        return "9s";
    }

    return "10s";
}

/* ATUALIZA O BOTÃO DO HEADER */
function atualizarBotaoHeader(estaTocando, nomeDaMusica = "Música") {
    if (estaTocando) {
        textoHeaderMusica.textContent = nomeDaMusica;

        const tempoLetreiro = calcularTempoLetreiro(nomeDaMusica);

        /*
            Envia o tempo do JavaScript para o CSS.
            O CSS usa var(--tempo-letreiro).
        */
        botaoMusica.style.setProperty("--tempo-letreiro", tempoLetreiro);

        botaoMusica.classList.add("tocando");
    } else {
        if (musicaSelecionada && indiceAtual >= 0) {
            textoHeaderMusica.textContent = musicas[indiceAtual].nome;
        } else {
            textoHeaderMusica.textContent = "Música";
        }

        botaoMusica.classList.remove("tocando");
    }
}

/* CRIA OS BOTÕES DAS MÚSICAS AUTOMATICAMENTE */
musicas.forEach(function (item, indice) {
    const botao = document.createElement("button");
    const textoBotao = document.createElement("span");

    textoBotao.textContent = item.nome;
    textoBotao.classList.add("nome-musica-texto");

    botao.appendChild(textoBotao);
    botao.classList.add("musica-opcao");
    botao.type = "button";

    botao.addEventListener("click", function () {
        tocarMusica(indice, botao);
    });

    listaMusicas.appendChild(botao);

    requestAnimationFrame(function () {
        const larguraTexto = textoBotao.scrollWidth;
        const larguraBotao = botao.clientWidth - 20;
        const distancia = larguraTexto - larguraBotao;

        if (distancia > 0) {
            textoBotao.classList.add("rolavel");
            textoBotao.style.setProperty("--distancia-marquee", distancia + "px");
        }
    });
});

/* TOCA UMA MÚSICA PELO ÍNDICE */
function tocarMusica(indice, botao) {
    const item = musicas[indice];

    indiceAtual = indice;

    /*
        Para evitar bug ao trocar de música:
        1. pausa o áudio atual
        2. troca o arquivo
        3. força velocidade normal
        4. volta para o começo
    */
    musica.pause();
    musica.src = item.arquivo;
    musica.load();

    normalizarVelocidadeAudio();

    try {
        musica.currentTime = 0;
    } catch (erro) {
        console.warn("Não foi possível zerar o tempo ainda:", erro);
    }

    nomeMusica.textContent = item.nome;

    carregarLetra(item.letra);

    musica.play()
        .then(function () {
            normalizarVelocidadeAudio();

            atualizarBotaoHeader(true, item.nome);
            playPauseMusica.textContent = "⏸";

            musicaSelecionada = true;

            if (botaoSelecionado !== null) {
                botaoSelecionado.classList.remove("ativa");
            }

            botao.classList.add("ativa");
            botaoSelecionado = botao;
        })
        .catch(function (erro) {
            console.error("Erro ao tentar tocar a música:", erro);

            atualizarBotaoHeader(false);
            playPauseMusica.textContent = "▶";
        });
}

/* CARREGA A LETRA SINCRONIZADA */
async function carregarLetra(caminhoDaLetra) {
    letraMusica.textContent = "Carregando letra...";
    letraSincronizada = [];
    linhaAtual = -1;

    try {
        const resposta = await fetch(caminhoDaLetra);

        if (!resposta.ok) {
            throw new Error("Arquivo não encontrado.");
        }

        const texto = await resposta.text();

        letraSincronizada = transformarTextoEmLetraSincronizada(texto);
        mostrarLetraNaTela();
    } catch (erro) {
        letraMusica.textContent =
            "Não foi possível carregar a letra.\n\n" +
            "Confira se o arquivo existe em:\n" +
            caminhoDaLetra;
    }
}

/* TRANSFORMA O TXT EM UMA LISTA COM TEMPO */
function transformarTextoEmLetraSincronizada(texto) {
    const linhas = texto.split("\n");
    const resultado = [];

    linhas.forEach(function (linha) {
        const linhaLimpa = linha.trim();

        if (linhaLimpa === "") {
            return;
        }

        /*
            Formatos aceitos:
            [00:12] Texto
            [00:12.30] Texto
            [01:05.80] Texto
        */
        const partes = linhaLimpa.match(/^\[(\d{2}):([0-5]\d)(?:\.(\d{1,2}))?\]\s*(.*)$/);

        if (partes) {
            const minutos = Number(partes[1]);
            const segundos = Number(partes[2]);
            const centesimos = Number("0." + (partes[3] || "0").padEnd(2, "0"));
            const textoLinha = partes[4];

            resultado.push({
                tempo: (minutos * 60) + segundos + centesimos,
                texto: textoLinha
            });
        }
    });

    return resultado;
}

/* MOSTRA TODAS AS LINHAS DA LETRA */
function mostrarLetraNaTela() {
    letraMusica.innerHTML = "";

    if (letraSincronizada.length === 0) {
        letraMusica.textContent =
            "A letra foi carregada, mas não tem tempo.\n\n" +
            "Use o formato:\n" +
            "[00:12.30] Texto da linha";
        return;
    }

    letraSincronizada.forEach(function (linha, indice) {
        const divLinha = document.createElement("div");

        divLinha.textContent = linha.texto;
        divLinha.classList.add("linha-letra");
        divLinha.dataset.indice = indice;

        letraMusica.appendChild(divLinha);
    });
}

/* ATUALIZA A LETRA CONFORME O TEMPO DA MÚSICA */
function atualizarLetraAtual() {
    if (letraSincronizada.length === 0) {
        return;
    }

    const tempoAtual = musica.currentTime;
    let novaLinhaAtual = -1;

    for (let i = 0; i < letraSincronizada.length; i++) {
        if (tempoAtual >= letraSincronizada[i].tempo) {
            novaLinhaAtual = i;
        } else {
            break;
        }
    }

    if (novaLinhaAtual !== linhaAtual) {
        linhaAtual = novaLinhaAtual;

        const linhasNaTela = document.querySelectorAll(".linha-letra");

        linhasNaTela.forEach(function (linha) {
            linha.classList.remove("ativa");
        });

        if (linhaAtual >= 0 && linhasNaTela[linhaAtual]) {
            linhasNaTela[linhaAtual].classList.add("ativa");

            /*
                Faz a caixa acompanhar a linha atual.
                A barra de scroll fica invisível pelo CSS.
            */
            linhasNaTela[linhaAtual].scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    }
}

/* TOCAR OU PAUSAR */
function alternarPlayPause() {
    /*
        Se nenhuma música foi selecionada ainda,
        começa tocando a primeira música da lista.
    */
    if (musicaSelecionada === false) {
        if (musicas.length === 0) {
            alert("Nenhuma música foi encontrada.");
            return;
        }

        const primeiroBotao = listaMusicas.children[0];

        tocarMusica(0, primeiroBotao);
        return;
    }

    if (musica.paused) {
        normalizarVelocidadeAudio();

        musica.play()
            .then(function () {
                normalizarVelocidadeAudio();

                atualizarBotaoHeader(true, musicas[indiceAtual].nome);
                playPauseMusica.textContent = "⏸";
            })
            .catch(function (erro) {
                console.error("Erro ao continuar a música:", erro);
            });
    } else {
        musica.pause();

        atualizarBotaoHeader(false);
        playPauseMusica.textContent = "▶";
    }
}

/* BOTÃO PRINCIPAL DO HEADER */
botaoMusica.addEventListener("click", function () {
    alternarPlayPause();
});

/* BOTÃO DO MEIO DA CAIXA */
playPauseMusica.addEventListener("click", function () {
    alternarPlayPause();
});

/* PRÓXIMA MÚSICA */
proximaMusica.addEventListener("click", function () {
    if (musicas.length === 0) {
        return;
    }

    let proximoIndice = indiceAtual + 1;

    if (proximoIndice >= musicas.length) {
        proximoIndice = 0;
    }

    const proximoBotao = listaMusicas.children[proximoIndice];

    tocarMusica(proximoIndice, proximoBotao);
});

/* MÚSICA ANTERIOR */
voltarMusica.addEventListener("click", function () {
    if (musicas.length === 0) {
        return;
    }

    let indiceAnterior = indiceAtual - 1;

    if (indiceAnterior < 0) {
        indiceAnterior = musicas.length - 1;
    }

    const botaoAnterior = listaMusicas.children[indiceAnterior];

    tocarMusica(indiceAnterior, botaoAnterior);
});

/* ENQUANTO A MÚSICA TOCA */
musica.addEventListener("timeupdate", function () {
    atualizarLetraAtual();
});

/* GARANTE QUE A VELOCIDADE CONTINUE NORMAL QUANDO A MÚSICA CARREGAR */
musica.addEventListener("loadedmetadata", function () {
    normalizarVelocidadeAudio();

    console.log("Música carregada:", musica.src);
    console.log("Duração:", musica.duration);
    console.log("Velocidade:", musica.playbackRate);
});

/* QUANDO A MÚSICA TERMINAR, TOCA A PRÓXIMA */
musica.addEventListener("ended", function () {
    if (musicas.length === 0) {
        atualizarBotaoHeader(false);
        playPauseMusica.textContent = "▶";
        return;
    }

    let proximoIndice = indiceAtual + 1;

    /*
        Quando chegar depois da última música,
        volta para a primeira.
    */
    if (proximoIndice >= musicas.length) {
        proximoIndice = 0;
    }

    const proximoBotao = listaMusicas.children[proximoIndice];

    tocarMusica(proximoIndice, proximoBotao);
});

/* SCROLL INVISÍVEL: DESCE UMA MÚSICA POR VEZ */
let scrollTravado = false;

listaMusicas.addEventListener("wheel", function (evento) {
    evento.preventDefault();

    if (scrollTravado) {
        return;
    }

    scrollTravado = true;

    const primeiraMusica = listaMusicas.querySelector(".musica-opcao");

    if (!primeiraMusica) {
        scrollTravado = false;
        return;
    }

    const estilosLista = getComputedStyle(listaMusicas);
    const espacamento = parseFloat(estilosLista.gap) || 8;

    const alturaMusica = primeiraMusica.offsetHeight;
    const distancia = alturaMusica + espacamento;

    if (evento.deltaY > 0) {
        listaMusicas.scrollBy({
            top: distancia,
            behavior: "smooth"
        });
    } else {
        listaMusicas.scrollBy({
            top: -distancia,
            behavior: "smooth"
        });
    }

    setTimeout(function () {
        scrollTravado = false;
    }, 300);
}, { passive: false });
