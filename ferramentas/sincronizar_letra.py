import argparse
import difflib
import re
import unicodedata
from pathlib import Path

import whisper


def normalizar_texto(texto: str) -> str:
    texto = texto.lower().strip()

    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(char for char in texto if unicodedata.category(char) != "Mn")

    texto = re.sub(r"[^a-z0-9\s]", " ", texto)
    texto = re.sub(r"\s+", " ", texto)

    return texto.strip()


def separar_palavras(texto: str) -> list[str]:
    texto_normalizado = normalizar_texto(texto)

    if texto_normalizado == "":
        return []

    return texto_normalizado.split()


def detectar_idioma_pela_letra(linhas_letra: list[str]) -> str | None:
    palavras = []

    for linha in linhas_letra:
        palavras.extend(separar_palavras(linha))

    if not palavras:
        return None

    palavras_ingles = {
        "i", "you", "the", "and", "to", "that", "dont", "don", "wanna",
        "want", "know", "cause", "your", "me", "my", "am", "be", "is",
        "are", "will", "would", "cant", "can", "ain", "everything",
    }
    palavras_portugues = {
        "eu", "voce", "vc", "que", "nao", "pra", "para", "com", "meu",
        "minha", "seu", "sua", "amor", "te", "me", "de", "da", "do",
        "em", "um", "uma", "vou", "ser", "estar", "quando", "porque",
    }

    score_ingles = sum(1 for palavra in palavras if palavra in palavras_ingles)
    score_portugues = sum(1 for palavra in palavras if palavra in palavras_portugues)

    if score_ingles > score_portugues:
        return "en"

    if score_portugues > score_ingles:
        return "pt"

    return None


def formatar_tempo(segundos: float) -> str:
    if segundos < 0:
        segundos = 0

    minutos = int(segundos // 60)
    resto = segundos % 60

    return f"[{minutos:02d}:{resto:05.2f}]"


def ler_linhas_letra(caminho_letra: Path) -> list[str]:
    texto = caminho_letra.read_text(encoding="utf-8")

    linhas = []

    for linha in texto.splitlines():
        linha_limpa = linha.strip()

        if linha_limpa != "":
            linhas.append(linha_limpa)

    return linhas


def extrair_palavras_do_whisper(resultado) -> list[dict]:
    palavras = []

    for segmento in resultado.get("segments", []):
        for palavra in segmento.get("words", []):
            texto_original = palavra.get("word", "").strip()
            texto_normalizado = normalizar_texto(texto_original)

            if texto_normalizado == "":
                continue

            palavras.append({
                "texto_original": texto_original,
                "texto_normalizado": texto_normalizado,
                "start": float(palavra.get("start", segmento.get("start", 0))),
                "end": float(palavra.get("end", segmento.get("end", 0))),
            })

    return palavras


def expandir_palavras_audio(palavras_audio_com_tempo: list[dict]) -> list[dict]:
    palavras_expandidas = []

    for palavra in palavras_audio_com_tempo:
        for texto in separar_palavras(palavra["texto_normalizado"]):
            palavras_expandidas.append({
                "texto_normalizado": texto,
                "start": palavra["start"],
                "end": palavra["end"],
            })

    return palavras_expandidas


def pontuar_janela(palavras_linha: list[str], janela_audio: list[str]) -> tuple[float, int, int]:
    if not palavras_linha or not janela_audio:
        return 0, 0, 0

    matcher = difflib.SequenceMatcher(None, palavras_linha, janela_audio)
    blocos = matcher.get_matching_blocks()
    acertos = sum(bloco.size for bloco in blocos)
    pontuacao = acertos / len(palavras_linha)
    primeiro_audio = 0

    for bloco in blocos:
        if bloco.size > 0:
            primeiro_audio = bloco.b
            break

    return pontuacao, acertos, primeiro_audio


def encontrar_inicio_linha(
    palavras_linha: list[str],
    palavras_audio: list[str],
    inicio_busca: int,
) -> int | None:
    if not palavras_linha or not palavras_audio:
        return None

    tamanho_linha = len(palavras_linha)
    tamanho_minimo = max(1, tamanho_linha - 2)
    tamanho_maximo = min(len(palavras_audio), tamanho_linha + 4)
    limite_inicio = len(palavras_audio) - tamanho_minimo + 1
    melhor: tuple[float, int, int] | None = None
    minimo_acertos = 1 if tamanho_linha <= 2 else 2
    minimo_pontuacao = 0.45 if tamanho_linha >= 5 else 0.5
    pontuacao_forte = 0.7 if tamanho_linha >= 5 else 0.8

    for inicio in range(inicio_busca, limite_inicio):
        for tamanho_janela in range(tamanho_minimo, tamanho_maximo + 1):
            fim = min(len(palavras_audio), inicio + tamanho_janela)

            if fim <= inicio:
                continue

            pontuacao, acertos, primeiro_audio = pontuar_janela(palavras_linha, palavras_audio[inicio:fim])
            indice_audio = inicio + primeiro_audio

            if acertos >= minimo_acertos and pontuacao >= pontuacao_forte:
                return indice_audio

            if melhor is None or (pontuacao, acertos, -indice_audio) > (melhor[0], melhor[1], -melhor[2]):
                melhor = (pontuacao, acertos, indice_audio)

    if melhor is None:
        return None

    pontuacao, acertos, indice_audio = melhor

    if acertos < minimo_acertos or pontuacao < minimo_pontuacao:
        return None

    return indice_audio


def estimar_tempos_das_linhas(linhas_letra: list[str], palavras_audio_com_tempo: list[dict]) -> list[tuple[float, str]]:
    palavras_linhas = [separar_palavras(linha) for linha in linhas_letra]
    palavras_audio_com_tempo_expandido = expandir_palavras_audio(palavras_audio_com_tempo)
    palavras_audio = [
        palavra["texto_normalizado"]
        for palavra in palavras_audio_com_tempo_expandido
    ]

    tempos = []
    cursor_audio = 0

    for linha, palavras_linha in zip(linhas_letra, palavras_linhas):
        indice_audio = encontrar_inicio_linha(palavras_linha, palavras_audio, cursor_audio)

        if indice_audio is not None and indice_audio < len(palavras_audio_com_tempo_expandido):
            tempo = palavras_audio_com_tempo_expandido[indice_audio]["start"]
            cursor_audio = min(
                len(palavras_audio),
                indice_audio + max(1, len(palavras_linha)),
            )
        else:
            tempo = None

        tempos.append([tempo, linha])

    preencher_tempos_faltando(tempos, palavras_audio_com_tempo_expandido)

    return [(float(tempo), linha) for tempo, linha in tempos]


def preencher_tempos_faltando(tempos: list[list], palavras_audio_com_tempo: list[dict]) -> None:
    if not palavras_audio_com_tempo:
        for i in range(len(tempos)):
            tempos[i][0] = i * 4
        return

    duracao_aproximada = palavras_audio_com_tempo[-1]["end"]

    indices_com_tempo = [i for i, item in enumerate(tempos) if item[0] is not None]

    if not indices_com_tempo:
        intervalo = duracao_aproximada / max(len(tempos), 1)

        for i in range(len(tempos)):
            tempos[i][0] = i * intervalo

        return

    primeiro = indices_com_tempo[0]

    for i in range(0, primeiro):
        tempos[i][0] = max(0, tempos[primeiro][0] - (primeiro - i) * 4)

    for posicao in range(len(indices_com_tempo) - 1):
        inicio = indices_com_tempo[posicao]
        fim = indices_com_tempo[posicao + 1]

        tempo_inicio = tempos[inicio][0]
        tempo_fim = tempos[fim][0]

        quantidade_espacos = fim - inicio

        for i in range(inicio + 1, fim):
            proporcao = (i - inicio) / quantidade_espacos
            tempos[i][0] = tempo_inicio + (tempo_fim - tempo_inicio) * proporcao

    ultimo = indices_com_tempo[-1]

    for i in range(ultimo + 1, len(tempos)):
        tempos[i][0] = tempos[ultimo][0] + (i - ultimo) * 4


def salvar_letra_sincronizada(tempos_linhas: list[tuple[float, str]], caminho_saida: Path) -> None:
    caminho_saida.parent.mkdir(parents=True, exist_ok=True)

    linhas_saida = []

    for tempo, linha in tempos_linhas:
        linhas_saida.append(f"{formatar_tempo(tempo)} {linha}")

    caminho_saida.write_text("\n".join(linhas_saida), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(
        description="Gera uma letra sincronizada no formato [mm:ss.xx] usando Whisper."
    )

    parser.add_argument("--audio", required=True, help="Caminho do arquivo de música .mp3")
    parser.add_argument("--letra", required=True, help="Caminho da letra normal .txt")
    parser.add_argument("--saida", required=True, help="Caminho do arquivo sincronizado de saída")
    parser.add_argument("--modelo", default="small", help="Modelo: tiny, base, small, medium, large")
    parser.add_argument("--idioma", default="auto", help="Idioma do audio: auto, pt, en, es...")
    parser.add_argument("--depurar-palavras", action="store_true", help=argparse.SUPPRESS)

    args = parser.parse_args()

    caminho_audio = Path(args.audio)
    caminho_letra = Path(args.letra)
    caminho_saida = Path(args.saida)

    if not caminho_audio.exists():
        raise FileNotFoundError(f"Áudio não encontrado: {caminho_audio}")

    if not caminho_letra.exists():
        raise FileNotFoundError(f"Letra não encontrada: {caminho_letra}")

    print("Lendo letra...")
    linhas_letra = ler_linhas_letra(caminho_letra)

    idioma = args.idioma.strip().lower()

    if idioma in ("", "auto"):
        idioma = detectar_idioma_pela_letra(linhas_letra)

    opcoes_transcricao = {
        "word_timestamps": True,
        "verbose": False,
    }

    if idioma:
        opcoes_transcricao["language"] = idioma

    if idioma:
        print(f"Idioma usado na transcricao: {idioma}")
    else:
        print("Idioma usado na transcricao: auto")

    print("Carregando modelo...")
    model = whisper.load_model(args.modelo)

    print("Transcrevendo áudio...")
    resultado = model.transcribe(
        str(caminho_audio),
        **opcoes_transcricao,
    )

    print("Extraindo palavras com tempo...")
    palavras_audio_com_tempo = extrair_palavras_do_whisper(resultado)

    if args.depurar_palavras:
        for palavra in palavras_audio_com_tempo:
            print(f"{palavra['start']:7.2f} {palavra['texto_original']}")

    print("Alinhando letra com áudio...")
    tempos_linhas = estimar_tempos_das_linhas(linhas_letra, palavras_audio_com_tempo)

    print("Salvando letra sincronizada...")
    salvar_letra_sincronizada(tempos_linhas, caminho_saida)

    print("Pronto!")
    print(f"Arquivo gerado em: {caminho_saida}")


if __name__ == "__main__":
    main()
