import os

RAIZ = "."
IGNORAR_CARPETAS = {"node_modules", ".git", ".vite", "dist", "build", "__pycache__"}
IGNORAR_ARCHIVOS = {"package-lock.json", ".DS_Store"}

def imprimir_arbol(path, prefijo=""):
    entradas = sorted(os.listdir(path))
    entradas = [e for e in entradas if e not in IGNORAR_CARPETAS and e not in IGNORAR_ARCHIVOS]
    for i, nombre in enumerate(entradas):
        ruta = os.path.join(path, nombre)
        es_ultimo = i == len(entradas) - 1
        conector = "└── " if es_ultimo else "├── "
        print(prefijo + conector + nombre)
        if os.path.isdir(ruta):
            extension = "    " if es_ultimo else "│   "
            imprimir_arbol(ruta, prefijo + extension)

imprimir_arbol(RAIZ)