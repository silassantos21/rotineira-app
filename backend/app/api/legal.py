from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()

_LEGAL_HTML_PATH = Path(__file__).resolve().parent.parent / "static" / "legal.html"


@router.get("/legal", response_class=HTMLResponse, include_in_schema=False)
def legal_page() -> HTMLResponse:
    """Página pública de Política de Privacidade e Termos de Uso.

    Não requer autenticação — usada tanto pelo link nas telas do app
    quanto pelo campo de URL exigido nas lojas (App Store / Play Console).
    """
    html = _LEGAL_HTML_PATH.read_text(encoding="utf-8")
    return HTMLResponse(content=html)
