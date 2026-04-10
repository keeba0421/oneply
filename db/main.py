from __future__ import annotations

import random
import re
import sqlite3
import string
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
DB_PATH = BASE_DIR / "short_links.db"

CODE_LENGTH = 6

APP_FIELDS = [
    "melon1",
    "melon2",
    "melon3",
    "melon4",
    "melon_ios",
    "genie_android",
    "genie_ios",
    "flo",
]

ALLOWED_SCHEMES = {
    "melonapp",
    "genieapp",
    "cromegenie",
    "ktolleh00167",
    "flomusic",
    "musicflo",
}


class GenerateRequest(BaseModel):
    list_title: str
    links: Dict[str, str]


@dataclass
class LinkPayload:
    melon1: Optional[str] = None
    melon2: Optional[str] = None
    melon3: Optional[str] = None
    melon4: Optional[str] = None
    melon_ios: Optional[str] = None
    genie_android: Optional[str] = None
    genie_ios: Optional[str] = None
    flo: Optional[str] = None

    def as_dict(self) -> Dict[str, Optional[str]]:
        return {
            "melon1": self.melon1,
            "melon2": self.melon2,
            "melon3": self.melon3,
            "melon4": self.melon4,
            "melon_ios": self.melon_ios,
            "genie_android": self.genie_android,
            "genie_ios": self.genie_ios,
            "flo": self.flo,
        }


app = FastAPI(title="Cookiebam Deep-Link Shortener")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
app.mount("/assets", StaticFiles(directory=ROOT_DIR), name="assets")
templates = Jinja2Templates(directory=str(BASE_DIR))


def db_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with db_conn() as conn:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS short_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                short_code TEXT UNIQUE NOT NULL,
                list_title TEXT,
                melon1 TEXT,
                melon2 TEXT,
                melon3 TEXT,
                melon4 TEXT,
                melon_ios TEXT,
                genie_android TEXT,
                genie_ios TEXT,
                flo TEXT,
                flo1 TEXT,
                flo2 TEXT,
                flo3 TEXT,
                flo4 TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        migrate_schema(conn)


def migrate_schema(conn: sqlite3.Connection) -> None:
    existing_columns = {
        row["name"]
        for row in conn.execute("PRAGMA table_info(short_links)").fetchall()
    }

    migration_columns = {
        "list_title": "TEXT",
        "melon_ios": "TEXT",
        "flo": "TEXT",
        "flo1": "TEXT",
        "flo2": "TEXT",
        "flo3": "TEXT",
        "flo4": "TEXT",
    }

    for column_name, column_type in migration_columns.items():
        if column_name not in existing_columns:
            conn.execute(
                f"ALTER TABLE short_links ADD COLUMN {column_name} {column_type}"
            )


@app.on_event("startup")
def startup() -> None:
    init_db()


def generate_unique_code() -> str:
    alphabet = string.ascii_letters + string.digits
    with db_conn() as conn:
        while True:
            code = "".join(random.choices(alphabet, k=CODE_LENGTH))
            existing = conn.execute(
                "SELECT 1 FROM short_links WHERE short_code = ? LIMIT 1", (code,)
            ).fetchone()
            if not existing:
                return code


def is_allowed_scheme(url: str) -> bool:
    scheme = urlparse(url).scheme.lower()
    return scheme in ALLOWED_SCHEMES


def parse_deeplink(value: str, field_name: str) -> Optional[str]:
    text = value.strip()
    if not text:
        return None

    if text.startswith(("melonapp://", "cromegenie://", "ktolleh00167://", "flomusic://", "genieapp://", "musicflo://")):
        if is_allowed_scheme(text):
            return text
        raise ValueError(f"허용되지 않는 스킴입니다: {field_name}")

    if field_name.startswith("melon"):
        match = re.search(r"songId=(\d+)", text)
        if match:
            return f"melonapp://play?menuid=0&ctype=1&cid={match.group(1)}"

    if field_name.startswith("genie"):
        match = re.search(r"xgnm=(\d+)", text)
        if match:
            track_id = match.group(1)
            if field_name == "genie_android":
                return f"cromegenie://scan/?landing_type=31&landing_target={track_id}"
            return f"ktolleh00167://landing/?landing_type=31&landing_target={track_id}"

    if field_name.startswith("flo"):
        match = re.search(r"/track/(\d+)/details", text)
        if match:
            return f"flomusic://play/track?ids={match.group(1)}"

    raise ValueError(f"지원하지 않는 링크 형식입니다: {field_name}")


def normalize_payload(raw_links: Dict[str, str]) -> LinkPayload:
    normalized = {}
    errors = {}

    for field in APP_FIELDS:
        source_value = raw_links.get(field, "")
        try:
            normalized[field] = parse_deeplink(source_value, field)
        except ValueError as exc:
            errors[field] = str(exc)

    if errors:
        fields = ", ".join(sorted(errors.keys()))
        raise HTTPException(status_code=400, detail=f"입력 검증 실패: {fields}")

    if not any(normalized.values()):
        raise HTTPException(status_code=400, detail="최소 1개 이상의 앱 링크를 입력해 주세요.")

    return LinkPayload(**normalized)


def normalize_list_title(title: str) -> str:
    normalized = title.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="리스트 제목을 입력해 주세요.")
    if len(normalized) > 80:
        raise HTTPException(status_code=400, detail="리스트 제목은 80자 이내로 입력해 주세요.")
    return normalized


@app.get("/")
def root() -> RedirectResponse:
    return RedirectResponse(url="/ply/share")


@app.get("/ply/share")
def get_share_page(request: Request):
    return templates.TemplateResponse("ply/share/index.html", {"request": request})


@app.post("/generate")
def generate_link(payload: GenerateRequest):
    list_title = normalize_list_title(payload.list_title)
    link_payload = normalize_payload(payload.links)
    code = generate_unique_code()
    links = link_payload.as_dict()

    with db_conn() as conn:
        conn.execute(
            """
            INSERT INTO short_links (
                short_code,
                list_title,
                melon1, melon2, melon3, melon4, melon_ios,
                genie_android, genie_ios,
                flo,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                code,
                list_title,
                links["melon1"],
                links["melon2"],
                links["melon3"],
                links["melon4"],
                links["melon_ios"],
                links["genie_android"],
                links["genie_ios"],
                links["flo"],
                datetime.now(timezone.utc).isoformat(),
            ),
        )

    return {"short_code": code, "short_url": f"/s/{code}"}


@app.get("/s/{code}")
def get_bridge_page(code: str, request: Request):
    with db_conn() as conn:
        row = conn.execute(
            """
            SELECT short_code,
                     list_title,
                     melon1, melon2, melon3, melon4, melon_ios,
                   genie_android, genie_ios,
                     flo, flo1,
                   created_at
            FROM short_links
            WHERE short_code = ?
            LIMIT 1
            """,
            (code,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="존재하지 않는 코드입니다.")

    link_items = [
        ("멜론1", row["melon1"], "melon"),
        ("멜론2", row["melon2"], "melon"),
        ("멜론3", row["melon3"], "melon"),
        ("멜론4", row["melon4"], "melon"),
        ("멜론 iOS", row["melon_ios"], "melon"),
        ("지니 안드로이드", row["genie_android"], "genie"),
        ("지니 iOS", row["genie_ios"], "genie"),
        ("플로", row["flo"] or row["flo1"], "flo"),
    ]
    visible_links = [
        {"label": label, "url": url, "platform": platform}
        for label, url, platform in link_items
        if url
    ]

    return templates.TemplateResponse(
        "s/index.html",
        {
            "request": request,
            "code": code,
            "list_title": row["list_title"] or "제목 없음",
            "links": visible_links,
        },
    )
