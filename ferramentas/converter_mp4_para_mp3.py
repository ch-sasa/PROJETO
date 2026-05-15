import argparse
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path


EXTENSOES_VIDEO_SUPORTADAS = {
    ".mp4",
    ".mkv",
    ".mov",
    ".avi",
    ".webm",
    ".flv",
    ".wmv",
    ".m4v",
    ".mpg",
    ".mpeg",
    ".3gp",
    ".3g2",
    ".ts",
    ".mts",
    ".m2ts",
    ".ogv",
}


def encontrar_ffmpeg() -> str:
    candidatos = [
        Path(sys.executable).parent / "ffmpeg.exe",
        Path.cwd() / ".venv" / "Scripts" / "ffmpeg.exe",
    ]

    try:
        import imageio_ffmpeg

        candidatos.append(Path(imageio_ffmpeg.get_ffmpeg_exe()))
    except Exception:
        pass

    ffmpeg_do_path = shutil.which("ffmpeg")

    if ffmpeg_do_path:
        candidatos.append(Path(ffmpeg_do_path))

    for candidato in candidatos:
        if candidato and candidato.exists():
            try:
                subprocess.run(
                    [str(candidato), "-version"],
                    capture_output=True,
                    check=True,
                    text=True,
                )
                return str(candidato)
            except Exception:
                continue

    raise FileNotFoundError(
        "Nao encontrei um ffmpeg funcionando. Rode pela .venv ou instale imageio-ffmpeg."
    )


def listar_videos(pasta_entrada: Path) -> list[Path]:
    if not pasta_entrada.exists():
        pasta_entrada.mkdir(parents=True, exist_ok=True)

    return sorted(
        arquivo.resolve()
        for arquivo in pasta_entrada.iterdir()
        if arquivo.is_file() and arquivo.suffix.lower() in EXTENSOES_VIDEO_SUPORTADAS
    )


def normalizar_nome_arquivo(nome: str) -> str:
    nome = unicodedata.normalize("NFD", nome)
    nome = "".join(char for char in nome if unicodedata.category(char) != "Mn")
    nome = nome.lower()
    nome = re.sub(r"[^a-z0-9]+", "-", nome)
    nome = re.sub(r"-+", "-", nome).strip("-")

    if nome == "":
        return "audio"

    return nome


def preparar_letra_compativel(
    arquivo_video: Path,
    nome_compativel: str,
    pasta_letras: Path,
) -> None:
    pasta_letras.mkdir(parents=True, exist_ok=True)

    letra_original = pasta_letras / f"{arquivo_video.stem}.txt"
    letra_compativel = pasta_letras / f"{nome_compativel}.txt"

    if letra_compativel.exists():
        print(f"[LETRA] Encontrada: {letra_compativel}")
        return

    if letra_original.exists():
        shutil.copy2(letra_original, letra_compativel)
        print(f"[LETRA] Copiada para nome compativel: {letra_compativel}")
        return

    letra_compativel.write_text("", encoding="utf-8")
    print(f"[LETRA] Arquivo vazio criado: {letra_compativel}")


def converter_video_para_mp3(
    ffmpeg: str,
    arquivo_video: Path,
    pasta_saida: Path,
    pasta_letras: Path,
    bitrate: str,
    sobrescrever: bool,
) -> bool:
    pasta_saida.mkdir(parents=True, exist_ok=True)

    nome_compativel = normalizar_nome_arquivo(arquivo_video.stem)
    arquivo_mp3 = pasta_saida / f"{nome_compativel}.mp3"

    if arquivo_mp3.exists() and not sobrescrever:
        print(f"[PULANDO] Ja existe: {arquivo_mp3}")
        preparar_letra_compativel(arquivo_video, nome_compativel, pasta_letras)
        return True

    comando = [
        ffmpeg,
        "-y" if sobrescrever else "-n",
        "-i",
        str(arquivo_video),
        "-vn",
        "-acodec",
        "libmp3lame",
        "-b:a",
        bitrate,
        str(arquivo_mp3),
    ]

    print(f"[CONVERTENDO] {arquivo_video}")
    print(f"[NOME MP3] {arquivo_mp3.name}")

    resultado = subprocess.run(
        comando,
        capture_output=True,
        text=True,
    )

    if resultado.returncode != 0:
        print(f"[ERRO] Falha ao converter: {arquivo_video}")
        print(resultado.stderr.strip())
        return False

    print(f"[OK] MP3 criado: {arquivo_mp3}")
    preparar_letra_compativel(arquivo_video, nome_compativel, pasta_letras)
    return True


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Converte arquivos de video para .mp3 usando ffmpeg."
    )
    parser.add_argument(
        "--entrada",
        default="midia/videos-para-converter",
        help="Pasta unica de onde os videos serao lidos. Padrao: midia/videos-para-converter",
    )
    parser.add_argument(
        "--saida",
        default="midia/musicas",
        help="Pasta onde os MP3 serao salvos. Padrao: midia/musicas",
    )
    parser.add_argument(
        "--letras",
        default="midia/letras",
        help="Pasta das letras usadas pelo comando principal. Padrao: midia/letras",
    )
    parser.add_argument(
        "--bitrate",
        default="192k",
        help="Qualidade do MP3. Padrao: 192k",
    )
    parser.add_argument(
        "--sobrescrever",
        action="store_true",
        help="Sobrescreve MP3 ja existente.",
    )

    args = parser.parse_args()

    try:
        ffmpeg = encontrar_ffmpeg()
    except FileNotFoundError as erro:
        print(f"[ERRO] {erro}")
        return 1

    pasta_entrada = Path(args.entrada).resolve()
    arquivos_video = listar_videos(pasta_entrada)

    if not arquivos_video:
        extensoes = ", ".join(sorted(EXTENSOES_VIDEO_SUPORTADAS))
        print(f"[AVISO] Nenhum video encontrado em: {pasta_entrada}")
        print(f"[INFO] Formatos aceitos: {extensoes}")
        return 1

    pasta_saida = Path(args.saida).resolve()
    pasta_letras = Path(args.letras).resolve()
    sucessos = 0
    erros = 0

    print(f"FFmpeg: {ffmpeg}")
    print(f"Entrada: {pasta_entrada}")
    print(f"Saida: {pasta_saida}")
    print(f"Letras: {pasta_letras}")
    print()

    for arquivo_video in arquivos_video:
        if converter_video_para_mp3(
            ffmpeg,
            arquivo_video,
            pasta_saida,
            pasta_letras,
            args.bitrate,
            args.sobrescrever,
        ):
            sucessos += 1
        else:
            erros += 1

    print()
    print("==========================================")
    print("RESUMO")
    print("==========================================")
    print(f"Convertidos/pulados: {sucessos}")
    print(f"Erros: {erros}")
    print("==========================================")

    return 0 if erros == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
