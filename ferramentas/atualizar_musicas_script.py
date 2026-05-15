import argparse
import re
from pathlib import Path


MARCADOR_INICIO = "/* INICIO_LISTA_MUSICAS_AUTO */"
MARCADOR_FIM = "/* FIM_LISTA_MUSICAS_AUTO */"

BLOCO_COM_MARCADOR_RE = re.compile(
    rf"{re.escape(MARCADOR_INICIO)}\s*const\s+musicas\s*=\s*\[.*?\];\s*{re.escape(MARCADOR_FIM)}",
    re.DOTALL,
)
BLOCO_SEM_MARCADOR_RE = re.compile(r"const\s+musicas\s*=\s*\[.*?\];", re.DOTALL)
ENTRADA_MUSICA_RE = re.compile(
    r"""\{\s*nome:\s*"(?P<nome>(?:\\.|[^"\\])*)",\s*arquivo:\s*"(?P<arquivo>(?:\\.|[^"\\])*)",\s*letra:\s*"(?P<letra>(?:\\.|[^"\\])*)"\s*\}""",
    re.DOTALL,
)


def escapar_js(valor: str) -> str:
    return valor.replace("\\", "\\\\").replace('"', '\\"')


def capitalizar_palavra(palavra: str) -> str:
    if palavra == "":
        return palavra

    return palavra[0].upper() + palavra[1:].lower()


def formatar_titulo(titulo: str) -> str:
    return re.sub(r"\S+", lambda match: capitalizar_palavra(match.group(0)), titulo.strip())


def formatar_nome_exibicao(nome: str) -> str:
    if " - " not in nome:
        return formatar_titulo(nome)

    artista, titulo = nome.split(" - ", 1)
    return f"{artista.strip().upper()} - {formatar_titulo(titulo)}"


def nome_automatico(caminho_mp3: Path) -> str:
    partes = [parte for parte in caminho_mp3.stem.split("-") if parte]

    if not partes:
        return caminho_mp3.stem

    if len(partes) >= 4:
        artista = " ".join(partes[:2]).upper()
        titulo = formatar_titulo(" ".join(partes[2:]))
        return f"{artista} - {titulo}"

    return formatar_titulo(" ".join(partes))


def ler_musicas_existentes(texto_script: str) -> list[dict[str, str]]:
    return [
        {
            "nome": match.group("nome"),
            "arquivo": match.group("arquivo").replace("\\/", "/"),
            "letra": match.group("letra").replace("\\/", "/"),
        }
        for match in ENTRADA_MUSICA_RE.finditer(texto_script)
    ]


def montar_lista_musicas(
    musicas_mp3: list[Path],
    entradas_existentes: list[dict[str, str]],
    pasta_musicas: Path,
    pasta_letras: Path,
) -> list[dict[str, str]]:
    existentes_por_arquivo = {
        entrada["arquivo"].replace("\\", "/"): entrada
        for entrada in entradas_existentes
    }
    mp3_por_arquivo = {
        f"{pasta_musicas.as_posix()}/{arquivo.name}": arquivo
        for arquivo in musicas_mp3
    }

    lista_final = []
    ja_adicionados = set()

    for entrada in entradas_existentes:
        arquivo_relativo = entrada["arquivo"].replace("\\", "/")

        if arquivo_relativo not in mp3_por_arquivo:
            continue

        arquivo_mp3 = mp3_por_arquivo[arquivo_relativo]
        lista_final.append({
            "nome": formatar_nome_exibicao(entrada["nome"]),
            "arquivo": arquivo_relativo,
            "letra": f"{pasta_letras.as_posix()}/{arquivo_mp3.stem}.txt",
        })
        ja_adicionados.add(arquivo_relativo)

    for arquivo_relativo, arquivo_mp3 in sorted(mp3_por_arquivo.items()):
        if arquivo_relativo in ja_adicionados:
            continue

        entrada_antiga = existentes_por_arquivo.get(arquivo_relativo)
        lista_final.append({
            "nome": formatar_nome_exibicao(entrada_antiga["nome"]) if entrada_antiga else nome_automatico(arquivo_mp3),
            "arquivo": arquivo_relativo,
            "letra": f"{pasta_letras.as_posix()}/{arquivo_mp3.stem}.txt",
        })

    return lista_final


def formatar_bloco_musicas(musicas: list[dict[str, str]]) -> str:
    linhas = [
        MARCADOR_INICIO,
        "const musicas = [",
    ]

    for indice, musica in enumerate(musicas):
        virgula = "," if indice < len(musicas) - 1 else ""
        linhas.extend([
            "    {",
            f'        nome: "{escapar_js(musica["nome"])}",',
            f'        arquivo: "{escapar_js(musica["arquivo"])}",',
            f'        letra: "{escapar_js(musica["letra"])}"',
            f"    }}{virgula}",
        ])

    linhas.extend([
        "];",
        MARCADOR_FIM,
    ])

    return "\n".join(linhas)


def atualizar_script(
    caminho_script: Path,
    pasta_musicas: Path,
    pasta_letras: Path,
) -> int:
    texto_script = caminho_script.read_text(encoding="utf-8")
    entradas_existentes = ler_musicas_existentes(texto_script)
    musicas_mp3 = sorted(pasta_musicas.glob("*.mp3"))
    lista_musicas = montar_lista_musicas(
        musicas_mp3,
        entradas_existentes,
        pasta_musicas,
        pasta_letras,
    )
    bloco_novo = formatar_bloco_musicas(lista_musicas)

    if BLOCO_COM_MARCADOR_RE.search(texto_script):
        texto_novo = BLOCO_COM_MARCADOR_RE.sub(bloco_novo, texto_script, count=1)
    elif BLOCO_SEM_MARCADOR_RE.search(texto_script):
        texto_novo = BLOCO_SEM_MARCADOR_RE.sub(bloco_novo, texto_script, count=1)
    else:
        raise RuntimeError("Nao encontrei o bloco const musicas = [...] no arquivo de script informado.")

    if texto_novo != texto_script:
        caminho_script.write_text(texto_novo, encoding="utf-8")

    return len(lista_musicas)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Atualiza a lista const musicas do assets/js/script.js usando os MP3 da pasta midia/musicas."
    )
    parser.add_argument("--script", default="assets/js/script.js")
    parser.add_argument("--musicas", default="midia/musicas")
    parser.add_argument("--letras", default="midia/letras-sincronizadas")

    args = parser.parse_args()

    caminho_script = Path(args.script)
    pasta_musicas = Path(args.musicas)
    pasta_letras = Path(args.letras)

    if not caminho_script.exists():
        raise FileNotFoundError(f"Script nao encontrado: {caminho_script}")

    if not pasta_musicas.exists():
        raise FileNotFoundError(f"Pasta de musicas nao encontrada: {pasta_musicas}")

    total = atualizar_script(caminho_script, pasta_musicas, pasta_letras)
    print(f"[OK] {caminho_script} atualizado com {total} musica(s).")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
