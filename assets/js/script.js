const botaoMusica = document.getElementById("botaoMusica");
const musica = document.getElementById("musica");
const nomeMusica = document.getElementById("nomeMusica");
const tempoMusica = document.getElementById("tempoMusica");
const letraMusica = document.getElementById("letraMusica");
const listaMusicas = document.getElementById("listaMusicas");
const musicaHeader = document.querySelector(".musica-header");
const topo = document.querySelector(".topo");
const menuMobileToggle = document.getElementById("menuMobileToggle");
const menuBotoes = document.querySelectorAll(".topo2 button");

const voltarMusica = document.getElementById("voltarMusica");
const playPauseMusica = document.getElementById("playPauseMusica");
const proximaMusica = document.getElementById("proximaMusica");
const dispositivoTouch = window.matchMedia("(hover: none), (pointer: coarse)");
const volumePadraoMusica = 1;
const duracaoFadeMusica = 280;
const antecipacaoLetraMusica = 0.25;
const multiplicadorScrollListaMusicas = 1.45;
const intervaloScrollListaMusicas = 180;
let ultimoToqueBotaoMusica = 0;
let passoScrollListaMusicas = 48;
let scrollTicking = false;
const chaveEstadoMusica = "sach_musica_estado";
const chaveTemaSite = "sach_tema_site";
let salvamentoMusicaPendente = false;
let animacaoVolumeMusica = null;
let resolverAnimacaoVolumeMusica = null;
let animacaoProgressoMusica = null;
let arrastandoProgressoMusica = false;
let tokenTrocaMusica = 0;
let tokenCarregamentoLetra = 0;
let transicaoMusicaEmAndamento = false;
let navegacaoSPAEmAndamento = false;
let temporizadorTemaSite = null;
let tooltipTempoMusica = null;
const tempoTransicaoSPA = 520;
const paginasSPA = {
    "index.html": {
        titulo: "HEHE ❤",
        mostrarJogoNoMenu: true,
        main: `
            <main class="conteudo">
                <div class="texto">
                    <h1></h1>
                    <p></p>
                </div>
            </main>
        `
    },
    "fotos.html": {
        titulo: "HEHE ❤",
        mostrarJogoNoMenu: true,
        main: `
            <main class="conteudo">
                <div class="texto">
                    <h1></h1>
                    <p></p>
                </div>
            </main>
        `
    },
    "videos.html": {
        titulo: "HEHE ❤",
        mostrarJogoNoMenu: true,
        main: `
            <main class="conteudo">
                <div class="texto">
                    <h1></h1>
                    <p></p>
                </div>
            </main>
        `
    },
    "jogo.html": {
        titulo: "HEHE ❤",
        mostrarJogoNoMenu: false,
        main: `
            <main class="conteudo jogo-conteudo">
                <section id="jogoApp" class="jogo-app" aria-live="polite"></section>
            </main>
        `
    }
};

if (tempoMusica) {
    tooltipTempoMusica = document.createElement("span");
    tooltipTempoMusica.className = "musica-tempo-tooltip";
    tooltipTempoMusica.setAttribute("aria-hidden", "true");
    tooltipTempoMusica.textContent = "00:00 / 00:00";
    tempoMusica.appendChild(tooltipTempoMusica);
}

/*
    Monta o botão do header por JavaScript.
    Sem ícone de música.
*/
botaoMusica.innerHTML = `
    <span class="texto-botao-musica" id="textoHeaderMusica">Música</span>
`;

const textoHeaderMusica = document.getElementById("textoHeaderMusica");

function obterStorage(nomeArea) {
    try {
        return window[nomeArea];
    } catch (erro) {
        console.warn("Nao foi possivel acessar armazenamento local:", erro);
        return null;
    }
}

function lerStorage(nomeArea, chave) {
    const area = obterStorage(nomeArea);

    if (!area) {
        return null;
    }

    try {
        return area.getItem(chave);
    } catch (erro) {
        console.warn("Nao foi possivel ler dados salvos:", erro);
        return null;
    }
}

function salvarStorage(nomeArea, chave, valor) {
    const area = obterStorage(nomeArea);

    if (!area) {
        return;
    }

    try {
        area.setItem(chave, valor);
    } catch (erro) {
        console.warn("Nao foi possivel salvar dados:", erro);
    }
}

function removerStorage(nomeArea, chave) {
    const area = obterStorage(nomeArea);

    if (!area) {
        return;
    }

    try {
        area.removeItem(chave);
    } catch (erro) {
        console.warn("Nao foi possivel remover dados salvos:", erro);
    }
}

function atualizarBotaoPlayPause(estaTocando) {
    playPauseMusica.textContent = estaTocando ? "\u23f8" : "\u25b6";
    playPauseMusica.setAttribute("aria-label", estaTocando ? "Pausar musica" : "Tocar musica");
}

function formatarTempoAudio(segundos) {
    if (!Number.isFinite(segundos) || segundos < 0) {
        segundos = 0;
    }

    const totalSegundos = Math.floor(segundos);
    const minutos = Math.floor(totalSegundos / 60);
    const segundosRestantes = totalSegundos % 60;

    return `${String(minutos).padStart(2, "0")}:${String(segundosRestantes).padStart(2, "0")}`;
}

function atualizarTempoMusica() {
    if (!tempoMusica) {
        return;
    }

    const tempoAtual = formatarTempoAudio(musica.currentTime);
    const duracao = Number.isFinite(musica.duration) ? musica.duration : 0;
    const tempoTotal = formatarTempoAudio(duracao);
    const textoTempoMusica = `${tempoAtual} / ${tempoTotal}`;
    const progresso = duracao > 0 ? Math.min(Math.max(musica.currentTime / duracao, 0), 1) : 0;
    const progressoPorcentagem = Math.round(progresso * 100);
    const deslocamentoBolinha = Math.max(0, tempoMusica.clientWidth - 6) * progresso;
    const misturaVermelho = progresso <= 0.5 ? 0 : (progresso - 0.5) / 0.5;
    const corInicio = [0, 238, 255];
    const corFim = [255, 35, 85];
    const corProgresso = corInicio.map(function (canal, indice) {
        return Math.round(canal + (corFim[indice] - canal) * misturaVermelho);
    });
    const atrasoCoracaoVermelho = 3;
    const coracaoVermelho = duracao > 0 && musica.currentTime >= (duracao * 0.5) + atrasoCoracaoVermelho;
    const corCoracao = coracaoVermelho ? corFim : corInicio;
    const opacidadeCoracao = coracaoVermelho ? 1 : 0.72;

    tempoMusica.style.setProperty("--progresso-musica", `${progresso * 100}%`);
    tempoMusica.style.setProperty("--escala-progresso-musica", String(progresso));
    tempoMusica.style.setProperty("--deslocamento-progresso-musica", `${deslocamentoBolinha}px`);
    tempoMusica.style.setProperty("--cor-progresso-musica-rgb", corProgresso.join(", "));
    tempoMusica.style.setProperty("--cor-coracao-musica-rgb", corCoracao.join(", "));
    tempoMusica.style.setProperty("--opacidade-coracao-musica", String(opacidadeCoracao));
    tempoMusica.setAttribute("aria-valuenow", String(progressoPorcentagem));
    tempoMusica.setAttribute("aria-valuetext", textoTempoMusica);
    tempoMusica.removeAttribute("title");

    if (tooltipTempoMusica) {
        tooltipTempoMusica.textContent = textoTempoMusica;
    }
}

function atualizarProgressoMusicaContinuo() {
    atualizarTempoMusica();
    atualizarLetraAtual();

    if (!musica.paused && !musica.ended) {
        animacaoProgressoMusica = requestAnimationFrame(atualizarProgressoMusicaContinuo);
        return;
    }

    animacaoProgressoMusica = null;
}

function iniciarAtualizacaoProgressoMusica() {
    if (animacaoProgressoMusica !== null) {
        return;
    }

    animacaoProgressoMusica = requestAnimationFrame(atualizarProgressoMusicaContinuo);
}

function pararAtualizacaoProgressoMusica() {
    if (animacaoProgressoMusica !== null) {
        cancelAnimationFrame(animacaoProgressoMusica);
        animacaoProgressoMusica = null;
    }

    atualizarTempoMusica();
}

function obterProgressoMusicaPeloPonteiro(evento) {
    const retangulo = tempoMusica.getBoundingClientRect();
    const larguraUtil = Math.max(1, retangulo.width - 6);
    const posicaoX = evento.clientX - retangulo.left - 3;

    return Math.min(Math.max(posicaoX / larguraUtil, 0), 1);
}

function buscarTempoMusicaPorPonteiro(evento) {
    if (!tempoMusica || !Number.isFinite(musica.duration) || musica.duration <= 0) {
        return;
    }

    const progresso = obterProgressoMusicaPeloPonteiro(evento);

    musica.currentTime = progresso * musica.duration;
    atualizarTempoMusica();
    atualizarLetraAtual();
    agendarSalvarEstadoMusica();
}

function iniciarArrasteProgressoMusica(evento) {
    if (evento.button !== undefined && evento.button !== 0) {
        return;
    }

    if (!Number.isFinite(musica.duration) || musica.duration <= 0) {
        return;
    }

    arrastandoProgressoMusica = true;
    tempoMusica.classList.add("arrastando");
    tempoMusica.setPointerCapture(evento.pointerId);
    evento.preventDefault();
    buscarTempoMusicaPorPonteiro(evento);
}

function moverArrasteProgressoMusica(evento) {
    if (!arrastandoProgressoMusica) {
        return;
    }

    evento.preventDefault();
    buscarTempoMusicaPorPonteiro(evento);
}

function finalizarArrasteProgressoMusica(evento) {
    if (!arrastandoProgressoMusica) {
        return;
    }

    arrastandoProgressoMusica = false;
    tempoMusica.classList.remove("arrastando");

    if (tempoMusica.hasPointerCapture(evento.pointerId)) {
        tempoMusica.releasePointerCapture(evento.pointerId);
    }

    buscarTempoMusicaPorPonteiro(evento);
    salvarEstadoMusica();
}

function cancelarArrasteProgressoMusica() {
    arrastandoProgressoMusica = false;
    tempoMusica.classList.remove("arrastando");
}

function buscarTempoMusicaPorTecla(evento) {
    if (!Number.isFinite(musica.duration) || musica.duration <= 0) {
        return;
    }

    const passoCurto = 5;
    const passoLongo = 15;
    let proximoTempo = musica.currentTime;

    if (evento.key === "ArrowLeft") {
        proximoTempo -= passoCurto;
    } else if (evento.key === "ArrowRight") {
        proximoTempo += passoCurto;
    } else if (evento.key === "PageDown") {
        proximoTempo -= passoLongo;
    } else if (evento.key === "PageUp") {
        proximoTempo += passoLongo;
    } else if (evento.key === "Home") {
        proximoTempo = 0;
    } else if (evento.key === "End") {
        proximoTempo = musica.duration;
    } else {
        return;
    }

    evento.preventDefault();
    musica.currentTime = Math.min(Math.max(proximoTempo, 0), musica.duration);
    atualizarTempoMusica();
    atualizarLetraAtual();
    salvarEstadoMusica();
}

function atualizarEstadoMenuMobile() {
    if (!menuMobileToggle || !topo) {
        return;
    }

    const menuAberto = topo.classList.contains("menu-aberto");
    menuMobileToggle.setAttribute("aria-expanded", String(menuAberto));
    menuMobileToggle.setAttribute("aria-label", menuAberto ? "Fechar menu" : "Abrir menu");
}

function fecharMenuMobile() {
    if (!topo) {
        return;
    }

    topo.classList.remove("menu-aberto");
    atualizarEstadoMenuMobile();
}

function atualizarEstadoPainelMusica() {
    if (!botaoMusica || !musicaHeader) {
        return;
    }

    botaoMusica.setAttribute("aria-expanded", String(musicaHeader.classList.contains("aberta")));
}

function aplicarTemaSite(tema) {
    const temaEscuro = tema === "escuro";

    document.body.classList.add("tema-trocando");
    clearTimeout(temporizadorTemaSite);
    document.body.classList.toggle("tema-escuro", temaEscuro);
    document.body.classList.toggle("tema-claro", !temaEscuro);

    const botaoTema = document.getElementById("botaoTemaSite");

    if (botaoTema) {
        botaoTema.textContent = temaEscuro ? "☾" : "☀";
        botaoTema.setAttribute("aria-label", temaEscuro ? "Modo escuro" : "Modo claro");
        botaoTema.title = temaEscuro ? "Modo escuro" : "Modo claro";
    }

    temporizadorTemaSite = setTimeout(function () {
        document.body.classList.remove("tema-trocando");
    }, 320);
}

function alternarTemaSite() {
    const proximoTema = document.body.classList.contains("tema-escuro") ? "claro" : "escuro";

    salvarStorage("localStorage", chaveTemaSite, proximoTema);
    aplicarTemaSite(proximoTema);
}

function criarBotaoTemaSite() {
    if (document.getElementById("botaoTemaSite")) {
        return;
    }

    const botaoTema = document.createElement("button");
    botaoTema.className = "botao-tema-site";
    botaoTema.id = "botaoTemaSite";
    botaoTema.type = "button";
    botaoTema.addEventListener("click", alternarTemaSite);
    document.body.appendChild(botaoTema);
    aplicarTemaSite(lerStorage("localStorage", chaveTemaSite) || "claro");
}

aplicarTemaSite(lerStorage("localStorage", chaveTemaSite) || "claro");

/*
    Lista gerada automaticamente por ferramentas/atualizar_musicas_script.py.
    Para converter videos, sincronizar letras e atualizar a lista, rode:
    ./comandos/sincronizar-todas.bat
*/

/* INICIO_LISTA_MUSICAS_AUTO */
const musicas = [
    {
        nome: "VEIGH - Talvez Você Precise De Mim",
        arquivo: "midia/musicas/veigh-talvez-voce-precise-de-mim.mp3",
        letra: "midia/letras-sincronizadas/veigh-talvez-voce-precise-de-mim.txt"
    },
    {
        nome: "VEIGH - Artista Genérico",
        arquivo: "midia/musicas/veigh-artista-generico.mp3",
        letra: "midia/letras-sincronizadas/veigh-artista-generico.txt"
    },
    {
        nome: "VEIGH - Devolve As Correntes",
        arquivo: "midia/musicas/veigh-devolve-as-correntes.mp3",
        letra: "midia/letras-sincronizadas/veigh-devolve-as-correntes.txt"
    },
    {
        nome: "LUAN SANTANA - Te Vivo",
        arquivo: "midia/musicas/luan-santana-te-vivo.mp3",
        letra: "midia/letras-sincronizadas/luan-santana-te-vivo.txt"
    },
    {
        nome: "ZÉ NETO E CRISTIANO - Sonha Comigo",
        arquivo: "midia/musicas/ze-neto-e-cristiano-sonha-comigo.mp3",
        letra: "midia/letras-sincronizadas/ze-neto-e-cristiano-sonha-comigo.txt"
    },
    {
        nome: "JUSTIN BIEBER - 2 Much",
        arquivo: "midia/musicas/justin-bieber-2-much.mp3",
        letra: "midia/letras-sincronizadas/justin-bieber-2-much.txt"
    },
    {
        nome: "DAMIANO DAVID - The First Time Lyrics",
        arquivo: "midia/musicas/damiano-david-the-first-time-lyrics.mp3",
        letra: "midia/letras-sincronizadas/damiano-david-the-first-time-lyrics.txt"
    },
    {
        nome: "GOO GOO DOLLS - Iris",
        arquivo: "midia/musicas/Goo Goo Dolls – Iris [Official Music Video] [4K Remaster].mp3",
        letra: "midia/letras-sincronizadas/Goo Goo Dolls – Iris [Official Music Video] [4K Remaster].txt"
    }
];
/* FIM_LISTA_MUSICAS_AUTO */

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

function limitarVolumeMusica(volume) {
    return Math.max(0, Math.min(volumePadraoMusica, volume));
}

function cancelarAnimacaoVolumeMusica() {
    if (animacaoVolumeMusica !== null) {
        cancelAnimationFrame(animacaoVolumeMusica);
        animacaoVolumeMusica = null;
    }

    if (resolverAnimacaoVolumeMusica !== null) {
        const resolver = resolverAnimacaoVolumeMusica;

        resolverAnimacaoVolumeMusica = null;
        resolver();
    }
}

function animarVolumeMusica(volumeFinal, duracao = duracaoFadeMusica) {
    cancelarAnimacaoVolumeMusica();

    const volumeInicial = musica.volume;
    const volumeDestino = limitarVolumeMusica(volumeFinal);

    if (duracao <= 0 || Math.abs(volumeInicial - volumeDestino) < 0.01) {
        musica.volume = volumeDestino;
        return Promise.resolve();
    }

    return new Promise(function (resolve) {
        const inicio = performance.now();

        resolverAnimacaoVolumeMusica = resolve;

        function atualizarVolume(agora) {
            const progresso = Math.min((agora - inicio) / duracao, 1);
            const progressoSuave = progresso < 0.5
                ? 2 * progresso * progresso
                : 1 - Math.pow(-2 * progresso + 2, 2) / 2;

            musica.volume = volumeInicial + (volumeDestino - volumeInicial) * progressoSuave;

            if (progresso < 1) {
                animacaoVolumeMusica = requestAnimationFrame(atualizarVolume);
                return;
            }

            musica.volume = volumeDestino;
            animacaoVolumeMusica = null;
            resolverAnimacaoVolumeMusica = null;
            resolve();
        }

        animacaoVolumeMusica = requestAnimationFrame(atualizarVolume);
    });
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

function salvarEstadoMusica() {
    if (transicaoMusicaEmAndamento) {
        return;
    }

    if (indiceAtual < 0 || !musicas[indiceAtual]) {
        return;
    }

    const estadoMusica = {
        indice: indiceAtual,
        tempo: musica.currentTime || 0,
        tocando: !musica.paused && !musica.ended,
        momento: Date.now()
    };

    salvarStorage("sessionStorage", chaveEstadoMusica, JSON.stringify(estadoMusica));
}

function agendarSalvarEstadoMusica() {
    if (salvamentoMusicaPendente) {
        return;
    }

    salvamentoMusicaPendente = true;

    requestAnimationFrame(function () {
        salvamentoMusicaPendente = false;
        salvarEstadoMusica();
    });
}

function marcarBotaoMusicaAtual(indice) {
    const botao = listaMusicas.children[indice];

    if (!botao) {
        return;
    }

    if (botaoSelecionado !== null) {
        botaoSelecionado.classList.remove("ativa");
        botaoSelecionado.removeAttribute("aria-current");
    }

    botao.classList.add("ativa");
    botao.setAttribute("aria-current", "true");
    botaoSelecionado = botao;
    musicaSelecionada = true;
}

function restaurarMusicaSalva() {
    const textoSalvo = lerStorage("sessionStorage", chaveEstadoMusica);

    if (!textoSalvo) {
        return;
    }

    let estadoMusica;

    try {
        estadoMusica = JSON.parse(textoSalvo);
    } catch (erro) {
        removerStorage("sessionStorage", chaveEstadoMusica);
        return;
    }

    if (!estadoMusica || !musicas[estadoMusica.indice]) {
        removerStorage("sessionStorage", chaveEstadoMusica);
        return;
    }

    const item = musicas[estadoMusica.indice];

    indiceAtual = estadoMusica.indice;
    musicaSelecionada = true;
    musica.src = item.arquivo;
    musica.load();
    normalizarVelocidadeAudio();
    nomeMusica.textContent = item.nome;
    carregarLetra(item.letra);
    marcarBotaoMusicaAtual(indiceAtual);

    function aplicarEstadoSalvo() {
        const segundosDesdeSaida = estadoMusica.tocando
            ? Math.max(0, (Date.now() - Number(estadoMusica.momento || Date.now())) / 1000)
            : 0;
        const tempoSalvo = Number(estadoMusica.tempo || 0) + segundosDesdeSaida;
        const duracao = Number.isFinite(musica.duration) ? musica.duration : tempoSalvo;

        try {
            musica.currentTime = Math.min(tempoSalvo, Math.max(0, duracao - 0.25));
        } catch (erro) {
            console.warn("Não foi possível restaurar o tempo da música:", erro);
        }

        atualizarLetraAtual();
        atualizarTempoMusica();

        if (!estadoMusica.tocando) {
            atualizarBotaoHeader(false);
            atualizarBotaoPlayPause(false);
            salvarEstadoMusica();
            return;
        }

        musica.play()
            .then(function () {
                normalizarVelocidadeAudio();
                atualizarBotaoHeader(true, item.nome);
                atualizarBotaoPlayPause(true);
                salvarEstadoMusica();
            })
            .catch(function () {
                atualizarBotaoHeader(false);
                atualizarBotaoPlayPause(false);
                salvarEstadoMusica();
            });
    }

    if (musica.readyState >= 1) {
        aplicarEstadoSalvo();
    } else {
        musica.addEventListener("loadedmetadata", aplicarEstadoSalvo, { once: true });
    }
}

function normalizarPaginaSPA(pagina) {
    const nomeArquivo = (pagina || "index.html").split("?")[0].split("#")[0].split("/").pop();

    return paginasSPA[nomeArquivo] ? nomeArquivo : "index.html";
}

function obterPaginaAtualSPA() {
    return normalizarPaginaSPA(window.location.pathname || "index.html");
}

function obterPaginaDoElementoSPA(elemento) {
    if (!elemento) {
        return "";
    }

    if (elemento.dataset && elemento.dataset.pagina) {
        return normalizarPaginaSPA(elemento.dataset.pagina);
    }

    const href = elemento.getAttribute("href");

    if (href) {
        return normalizarPaginaSPA(href);
    }

    const clique = elemento.getAttribute("onclick") || "";
    const partes = clique.match(/location\.href\s*=\s*['"]([^'"]+)['"]/);

    return partes ? normalizarPaginaSPA(partes[1]) : "";
}

function garantirCssSPA(caminho) {
    if (document.querySelector(`link[href="${caminho}"]`)) {
        return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = caminho;
    document.head.appendChild(link);
}

function carregarScriptSPA(caminho) {
    if (document.querySelector(`script[src="${caminho}"]`)) {
        return Promise.resolve();
    }

    return new Promise(function (resolve, reject) {
        const script = document.createElement("script");
        script.src = caminho;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function atualizarMenuSPA(pagina) {
    const menu = document.querySelector(".topo2");

    if (!menu) {
        return;
    }

    let botaoJogo = menu.querySelector('[data-pagina="jogo.html"], button[onclick*="jogo.html"]');

    if (!botaoJogo) {
        botaoJogo = document.createElement("button");
        botaoJogo.type = "button";
        botaoJogo.textContent = "Jogo";
        botaoJogo.dataset.pagina = "jogo.html";
        menu.appendChild(botaoJogo);
    }

    botaoJogo.hidden = !paginasSPA[pagina].mostrarJogoNoMenu;
}

function prepararJogoSPA() {
    garantirCssSPA("assets/css/jogo.css");

    if (window.iniciarJogoCasal) {
        window.iniciarJogoCasal();
        return Promise.resolve();
    }

    window.__sachJogoManualInit = true;

    return carregarScriptSPA("assets/js/perguntas-jogo.js")
        .then(function () {
            return carregarScriptSPA("assets/js/jogo.js");
        })
        .then(function () {
            if (window.iniciarJogoCasal) {
                window.iniciarJogoCasal();
            }
        });
}

function navegarSPA(pagina, atualizarHistorico = true) {
    const paginaNormalizada = normalizarPaginaSPA(pagina);
    const configuracao = paginasSPA[paginaNormalizada];
    const mainAtual = document.querySelector("main");

    if (!mainAtual || !configuracao) {
        window.location.href = paginaNormalizada;
        return;
    }

    if (navegacaoSPAEmAndamento) {
        return;
    }

    navegacaoSPAEmAndamento = true;
    salvarEstadoMusica();
    document.body.classList.add("spa-trocando");
    mainAtual.classList.add("conteudo-saindo");

    fecharMenuMobile();

    setTimeout(function () {
        mainAtual.outerHTML = configuracao.main;
        document.title = configuracao.titulo;
        atualizarMenuSPA(paginaNormalizada);

        if (atualizarHistorico && normalizarPaginaSPA(window.location.pathname) !== paginaNormalizada) {
            try {
                history.pushState({ pagina: paginaNormalizada }, configuracao.titulo, paginaNormalizada);
            } catch (erro) {
                console.warn("Não foi possível atualizar a URL sem recarregar:", erro);
            }
        }

        window.scrollTo({ top: 0, behavior: "auto" });

        const novoMain = document.querySelector("main");

        if (novoMain) {
            novoMain.classList.add("conteudo-entrando");

            requestAnimationFrame(function () {
                novoMain.classList.remove("conteudo-entrando");
            });
        }

        if (paginaNormalizada === "jogo.html") {
            prepararJogoSPA();
        }

        setTimeout(function () {
            navegacaoSPAEmAndamento = false;
            document.body.classList.remove("spa-trocando");
        }, tempoTransicaoSPA);
    }, tempoTransicaoSPA);
}

window.navegarSPA = navegarSPA;

/* CRIA OS BOTÕES DAS MÚSICAS AUTOMATICAMENTE */
musicas.forEach(function (item, indice) {
    const botao = document.createElement("button");
    const textoBotao = document.createElement("span");

    textoBotao.textContent = item.nome;
    textoBotao.classList.add("nome-musica-texto");

    botao.appendChild(textoBotao);
    botao.classList.add("musica-opcao");
    botao.type = "button";
    botao.setAttribute("aria-label", "Tocar " + item.nome);

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
async function tocarMusica(indice, botao) {
    const item = musicas[indice];

    if (!item || !botao) {
        return;
    }

    const tokenAtual = ++tokenTrocaMusica;
    const trocarComFade = musicaSelecionada && !musica.paused && !musica.ended && musica.currentSrc !== "";

    transicaoMusicaEmAndamento = true;
    indiceAtual = indice;

    if (trocarComFade) {
        await animarVolumeMusica(0);

        if (tokenAtual !== tokenTrocaMusica) {
            return;
        }
    }

    musica.pause();
    musica.volume = 0;
    musica.src = item.arquivo;
    musica.load();

    normalizarVelocidadeAudio();

    try {
        musica.currentTime = 0;
    } catch (erro) {
        console.warn("Não foi possível zerar o tempo ainda:", erro);
    }

    atualizarTempoMusica();
    nomeMusica.textContent = item.nome;

    carregarLetra(item.letra);

    try {
        await musica.play();

        if (tokenAtual !== tokenTrocaMusica) {
            return;
        }

        normalizarVelocidadeAudio();
        iniciarAtualizacaoProgressoMusica();

        atualizarBotaoHeader(true, item.nome);
        atualizarBotaoPlayPause(true);

        musicaSelecionada = true;

        if (botaoSelecionado !== null) {
            botaoSelecionado.classList.remove("ativa");
            botaoSelecionado.removeAttribute("aria-current");
        }

        botao.classList.add("ativa");
        botao.setAttribute("aria-current", "true");
        botaoSelecionado = botao;
        transicaoMusicaEmAndamento = false;
        salvarEstadoMusica();

        await animarVolumeMusica(volumePadraoMusica);
    } catch (erro) {
        if (tokenAtual !== tokenTrocaMusica) {
            return;
        }

        console.error("Erro ao tentar tocar a música:", erro);

        musica.volume = volumePadraoMusica;
        transicaoMusicaEmAndamento = false;
        atualizarBotaoHeader(false);
        atualizarBotaoPlayPause(false);
        salvarEstadoMusica();
    }
}

/* CARREGA A LETRA SINCRONIZADA */
async function carregarLetra(caminhoDaLetra) {
    const tokenLetraAtual = ++tokenCarregamentoLetra;

    letraMusica.textContent = "....";
    letraSincronizada = [];
    linhaAtual = -1;

    try {
        const resposta = await fetch(caminhoDaLetra);

        if (!resposta.ok) {
            throw new Error("Arquivo não encontrado.");
        }

        const texto = await resposta.text();

        if (tokenLetraAtual !== tokenCarregamentoLetra) {
            return;
        }

        letraSincronizada = transformarTextoEmLetraSincronizada(texto);
        mostrarLetraNaTela();
        atualizarLetraAtual();
    } catch (erro) {
        if (tokenLetraAtual !== tokenCarregamentoLetra) {
            return;
        }

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
    letraMusica.textContent = "";

    if (letraSincronizada.length === 0) {
        letraMusica.textContent =
            "A letra foi carregada, mas não tem tempo.\n\n" +
            "Use o formato:\n" +
            "[00:12.30] Texto da linha";
        return;
    }

    letraMusica.textContent = "....";
}

function atualizarTextoLetraSuave(novoTexto) {
    letraMusica.textContent = novoTexto;
    letraMusica.classList.remove("aparecendo");
    requestAnimationFrame(function () {
        letraMusica.classList.add("aparecendo");
    });
}

/* ATUALIZA A LETRA CONFORME O TEMPO DA MÚSICA */
function atualizarLetraAtual() {
    if (letraSincronizada.length === 0) {
        return;
    }

    const tempoAtual = musica.currentTime + antecipacaoLetraMusica;
    const linhaSeguinte = letraSincronizada[linhaAtual + 1];

    if (
        linhaAtual >= 0 &&
        tempoAtual >= letraSincronizada[linhaAtual].tempo &&
        (!linhaSeguinte || tempoAtual < linhaSeguinte.tempo)
    ) {
        return;
    }

    let novaLinhaAtual = -1;
    const inicioBusca = linhaAtual >= 0 && tempoAtual < letraSincronizada[linhaAtual].tempo
        ? 0
        : Math.max(0, linhaAtual);

    for (let i = inicioBusca; i < letraSincronizada.length; i++) {
        if (tempoAtual < letraSincronizada[i].tempo) {
            break;
        }

        novaLinhaAtual = i;
    }

    if (novaLinhaAtual !== linhaAtual) {
        linhaAtual = novaLinhaAtual;
        if (linhaAtual >= 0 && letraSincronizada[linhaAtual]) {
            atualizarTextoLetraSuave(letraSincronizada[linhaAtual].texto);
        } else {
            atualizarTextoLetraSuave("...");
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
                atualizarBotaoPlayPause(true);
                salvarEstadoMusica();
            })
            .catch(function (erro) {
                console.error("Erro ao continuar a música:", erro);
                salvarEstadoMusica();
            });
    } else {
        musica.pause();

        atualizarBotaoHeader(false);
        atualizarBotaoPlayPause(false);
        salvarEstadoMusica();
    }
}

/* BOTÃO PRINCIPAL DO HEADER */
botaoMusica.addEventListener("click", function () {
    if (dispositivoTouch.matches && musicaHeader) {
        const agora = Date.now();
        const intervaloToque = agora - ultimoToqueBotaoMusica;

        if (intervaloToque > 0 && intervaloToque <= 300) {
            alternarPlayPause();
            ultimoToqueBotaoMusica = 0;
            return;
        }

        musicaHeader.classList.toggle("aberta");
        atualizarEstadoPainelMusica();
        ultimoToqueBotaoMusica = agora;
        return;
    }

    alternarPlayPause();
});

document.addEventListener("click", function (evento) {
    if (!dispositivoTouch.matches) {
        return;
    }

    if (musicaHeader && !musicaHeader.contains(evento.target)) {
        musicaHeader.classList.remove("aberta");
        atualizarEstadoPainelMusica();
    }

    if (
        topo &&
        menuMobileToggle &&
        !menuMobileToggle.contains(evento.target) &&
        !evento.target.closest(".topo2")
    ) {
        fecharMenuMobile();
    }
});

document.addEventListener("keydown", function (evento) {
    if (evento.key !== "Escape") {
        return;
    }

    if (musicaHeader) {
        musicaHeader.classList.remove("aberta");
        atualizarEstadoPainelMusica();
    }

    fecharMenuMobile();
});

if (menuMobileToggle && topo) {
    menuMobileToggle.addEventListener("click", function (evento) {
        evento.stopPropagation();
        topo.classList.toggle("menu-aberto");
        atualizarEstadoMenuMobile();
    });
}

menuBotoes.forEach(function (botao) {
    botao.addEventListener("click", function () {
        salvarEstadoMusica();

        fecharMenuMobile();
    });
});

document.addEventListener("click", function (evento) {
    const alvoNavegacao = evento.target.closest(".topo2 button, .logo-link");

    if (!alvoNavegacao) {
        return;
    }

    const pagina = obterPaginaDoElementoSPA(alvoNavegacao);

    if (!paginasSPA[pagina]) {
        return;
    }

    evento.preventDefault();
    evento.stopPropagation();
    evento.stopImmediatePropagation();
    navegarSPA(pagina);
}, true);

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

    if (musicaSelecionada && indiceAtual >= 0 && musica.currentTime > 5) {
        musica.currentTime = 0;
        atualizarTempoMusica();
        atualizarLetraAtual();
        salvarEstadoMusica();
        return;
    }

    if (indiceAtual <= 0) {
        return;
    }

    let indiceAnterior = indiceAtual - 1;

    const botaoAnterior = listaMusicas.children[indiceAnterior];

    tocarMusica(indiceAnterior, botaoAnterior);
});

if (tempoMusica) {
    tempoMusica.addEventListener("pointerdown", iniciarArrasteProgressoMusica);
    tempoMusica.addEventListener("pointermove", moverArrasteProgressoMusica);
    tempoMusica.addEventListener("pointerup", finalizarArrasteProgressoMusica);
    tempoMusica.addEventListener("pointercancel", cancelarArrasteProgressoMusica);
    tempoMusica.addEventListener("lostpointercapture", cancelarArrasteProgressoMusica);
    tempoMusica.addEventListener("keydown", buscarTempoMusicaPorTecla);
}

/* ENQUANTO A MÚSICA TOCA */
musica.addEventListener("timeupdate", function () {
    atualizarTempoMusica();
    atualizarLetraAtual();
    agendarSalvarEstadoMusica();
});

musica.addEventListener("play", function () {
    atualizarTempoMusica();
    iniciarAtualizacaoProgressoMusica();
    salvarEstadoMusica();
});

musica.addEventListener("pause", function () {
    pararAtualizacaoProgressoMusica();
    salvarEstadoMusica();
});

musica.addEventListener("seeked", function () {
    atualizarTempoMusica();
    atualizarLetraAtual();
    salvarEstadoMusica();
});
musica.addEventListener("durationchange", atualizarTempoMusica);
musica.addEventListener("emptied", pararAtualizacaoProgressoMusica);

/* GARANTE QUE A VELOCIDADE CONTINUE NORMAL QUANDO A MÚSICA CARREGAR */
musica.addEventListener("loadedmetadata", function () {
    normalizarVelocidadeAudio();
    atualizarTempoMusica();
});

/* QUANDO A MÚSICA TERMINAR, TOCA A PRÓXIMA */
musica.addEventListener("ended", function () {
    if (musicas.length === 0) {
        atualizarBotaoHeader(false);
        atualizarBotaoPlayPause(false);
        salvarEstadoMusica();
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

/* MODO COMPACTO DO TOPO QUANDO DESCE A PÁGINA */
function atualizarTopoNoScroll() {
    if (!topo) {
        return;
    }

    if (window.scrollY > 30) {
        topo.classList.add("compact");
    } else {
        topo.classList.remove("compact");
    }
}

window.addEventListener("scroll", function () {
    if (scrollTicking) {
        return;
    }

    scrollTicking = true;
    requestAnimationFrame(function () {
        atualizarTopoNoScroll();
        scrollTicking = false;
    });
}, { passive: true });
window.addEventListener("load", atualizarTopoNoScroll);
window.addEventListener("load", atualizarTempoMusica);
window.addEventListener("load", restaurarMusicaSalva);
window.addEventListener("load", criarBotaoTemaSite);
window.addEventListener("load", function () {
    const paginaAtual = obterPaginaAtualSPA();
    atualizarMenuSPA(paginaAtual);
    atualizarEstadoMenuMobile();
    atualizarEstadoPainelMusica();

    try {
        history.replaceState({ pagina: paginaAtual }, document.title, window.location.href);
    } catch (erro) {
        console.warn("Não foi possível preparar o histórico da navegação interna:", erro);
    }
});
window.addEventListener("beforeunload", salvarEstadoMusica);
window.addEventListener("popstate", function (evento) {
    const pagina = evento.state && evento.state.pagina ? evento.state.pagina : obterPaginaAtualSPA();
    navegarSPA(pagina, false);
});

function atualizarPassoScrollListaMusicas() {
    const primeiraMusica = listaMusicas.querySelector(".musica-opcao");

    if (!primeiraMusica) {
        passoScrollListaMusicas = 48;
        return;
    }

    const estilosLista = getComputedStyle(listaMusicas);
    const espacamento = parseFloat(estilosLista.gap) || 8;
    const alturaMusica = primeiraMusica.offsetHeight || 40;

    passoScrollListaMusicas = alturaMusica + espacamento;
}

window.addEventListener("load", atualizarPassoScrollListaMusicas);
window.addEventListener("resize", atualizarPassoScrollListaMusicas);

listaMusicas.addEventListener("wheel", function (evento) {
    evento.preventDefault();

    if (scrollTravado) {
        return;
    }

    scrollTravado = true;

    if (evento.deltaY > 0) {
        listaMusicas.scrollBy({
            top: passoScrollListaMusicas * multiplicadorScrollListaMusicas,
            behavior: "smooth"
        });
    } else {
        listaMusicas.scrollBy({
            top: -passoScrollListaMusicas * multiplicadorScrollListaMusicas,
            behavior: "smooth"
        });
    }

    setTimeout(function () {
        scrollTravado = false;
    }, intervaloScrollListaMusicas);
}, { passive: false });

