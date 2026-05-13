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


def criar_mapa_de_alinhamento(palavras_letra: list[str], palavras_audio: list[str]) -> dict[int, int]:
    matcher = difflib.SequenceMatcher(None, palavras_letra, palavras_audio)
    mapa = {}

    for bloco in matcher.get_matching_blocks():
        for deslocamento in range(bloco.size):
            indice_letra = bloco.a + deslocamento
            indice_audio = bloco.b + deslocamento
            mapa[indice_letra] = indice_audio

    return mapa


def estimar_tempos_das_linhas(linhas_letra: list[str], palavras_audio_com_tempo: list[dict]) -> list[tuple[float, str]]:
    palavras_letra = []
    faixa_linhas = []

    indice_global = 0

    for linha in linhas_letra:
        palavras_da_linha = separar_palavras(linha)

        inicio = indice_global
        fim = indice_global + len(palavras_da_linha)

        faixa_linhas.append((inicio, fim))
        palavras_letra.extend(palavras_da_linha)

        indice_global = fim

    palavras_audio = []

    for palavra in palavras_audio_com_tempo:
        palavras_audio.extend(separar_palavras(palavra["texto_normalizado"]))

    mapa = criar_mapa_de_alinhamento(palavras_letra, palavras_audio)

    tempos = []

    for indice_linha, linha in enumerate(linhas_letra):
        inicio_palavras, fim_palavras = faixa_linhas[indice_linha]

        indices_audio_encontrados = []

        for indice_palavra_letra in range(inicio_palavras, fim_palavras):
            if indice_palavra_letra in mapa:
                indices_audio_encontrados.append(mapa[indice_palavra_letra])

        if indices_audio_encontrados:
            primeiro_indice_audio = min(indices_audio_encontrados)

            if primeiro_indice_audio < len(palavras_audio_com_tempo):
                tempo = palavras_audio_com_tempo[primeiro_indice_audio]["start"]
            else:
                tempo = None
        else:
            tempo = None

        tempos.append([tempo, linha])

    preencher_tempos_faltando(tempos, palavras_audio_com_tempo)

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

    args = parser.parse_args()

    caminho_audio = Path(args.audio)
    caminho_letra = Path(args.letra)
    caminho_saida = Path(args.saida)

    if not caminho_audio.exists():
        raise FileNotFoundError(f"Áudio não encontrado: {caminho_audio}")

    if not caminho_letra.exists():
        raise FileNotFoundError(f"Letra não encontrada: {caminho_letra}")

    print("Carregando modelo...")
    model = whisper.load_model(args.modelo)

    print("Transcrevendo áudio...")
    resultado = model.transcribe(
        str(caminho_audio),
        language="pt",
        word_timestamps=True,
        verbose=False
    )

    print("Lendo letra...")
    linhas_letra = ler_linhas_letra(caminho_letra)

    print("Extraindo palavras com tempo...")
    palavras_audio_com_tempo = extrair_palavras_do_whisper(resultado)

    print("Alinhando letra com áudio...")
    tempos_linhas = estimar_tempos_das_linhas(linhas_letra, palavras_audio_com_tempo)

    print("Salvando letra sincronizada...")
    salvar_letra_sincronizada(tempos_linhas, caminho_saida)

    print("Pronto!")
    print(f"Arquivo gerado em: {caminho_saida}")


if __name__ == "__main__":
    main()