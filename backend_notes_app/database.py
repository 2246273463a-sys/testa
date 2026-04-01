from pathlib import Path
import shutil
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

BASE_DIR = Path(__file__).resolve().parent
env_db_path = os.getenv("NOTES_APP_DB_PATH")
DB_PATH = Path(env_db_path).resolve() if env_db_path else (BASE_DIR / "notes.db").resolve()
LEGACY_DB_PATH = (BASE_DIR.parent / "notes.db").resolve()

if not DB_PATH.exists() and LEGACY_DB_PATH.exists():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(LEGACY_DB_PATH, DB_PATH)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

# 创建 SQLAlchemy 引擎
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} # SQLite 需要这个参数
)

# 创建数据库会话
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 声明式基本类
Base = declarative_base()


def ensure_fts(engine) -> None:
    with engine.begin() as conn:
        existing_sql = conn.execute(
            text("SELECT sql FROM sqlite_master WHERE type='table' AND name='notes_fts'")
        ).scalar()

        if existing_sql and (
            "create virtual table" not in existing_sql.lower()
            or "tokenize='unicode61'" not in existing_sql.lower()
        ):
            conn.execute(text("DROP TRIGGER IF EXISTS notes_ai"))
            conn.execute(text("DROP TRIGGER IF EXISTS notes_ad"))
            conn.execute(text("DROP TRIGGER IF EXISTS notes_au"))
            conn.execute(text("DROP TABLE IF EXISTS notes_fts"))

        conn.execute(
            text(
                """
                CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
                    title,
                    content,
                    content='notes',
                    content_rowid='id',
                    tokenize='unicode61'
                );
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
                  INSERT INTO notes_fts(rowid, title, content) VALUES(new.id, new.title, new.content);
                END;
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
                  INSERT INTO notes_fts(notes_fts, rowid) VALUES('delete', old.id);
                END;
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
                  INSERT INTO notes_fts(notes_fts, rowid) VALUES('delete', old.id);
                  INSERT INTO notes_fts(rowid, title, content) VALUES(new.id, new.title, new.content);
                END;
                """
            )
        )

        conn.execute(text("INSERT INTO notes_fts(notes_fts) VALUES('rebuild');"))

        folders_existing_sql = conn.execute(
            text("SELECT sql FROM sqlite_master WHERE type='table' AND name='folders_fts'")
        ).scalar()

        if folders_existing_sql and (
            "create virtual table" not in folders_existing_sql.lower()
            or "tokenize='unicode61'" not in folders_existing_sql.lower()
        ):
            conn.execute(text("DROP TRIGGER IF EXISTS folders_ai"))
            conn.execute(text("DROP TRIGGER IF EXISTS folders_ad"))
            conn.execute(text("DROP TRIGGER IF EXISTS folders_au"))
            conn.execute(text("DROP TABLE IF EXISTS folders_fts"))

        conn.execute(
            text(
                """
                CREATE VIRTUAL TABLE IF NOT EXISTS folders_fts USING fts5(
                    name,
                    content='folders',
                    content_rowid='id',
                    tokenize='unicode61'
                );
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TRIGGER IF NOT EXISTS folders_ai AFTER INSERT ON folders BEGIN
                  INSERT INTO folders_fts(rowid, name) VALUES(new.id, new.name);
                END;
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TRIGGER IF NOT EXISTS folders_ad AFTER DELETE ON folders BEGIN
                  INSERT INTO folders_fts(folders_fts, rowid) VALUES('delete', old.id);
                END;
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TRIGGER IF NOT EXISTS folders_au AFTER UPDATE ON folders BEGIN
                  INSERT INTO folders_fts(folders_fts, rowid) VALUES('delete', old.id);
                  INSERT INTO folders_fts(rowid, name) VALUES(new.id, new.name);
                END;
                """
            )
        )
        conn.execute(text("INSERT INTO folders_fts(folders_fts) VALUES('rebuild');"))


def ensure_notes_columns(engine) -> None:
    desired = {
        "is_favorite": "INTEGER NOT NULL DEFAULT 0",
        "is_pinned": "INTEGER NOT NULL DEFAULT 0",
        "is_deleted": "INTEGER NOT NULL DEFAULT 0",
        "deleted_at": "DATETIME",
        "is_template": "INTEGER NOT NULL DEFAULT 0",
    }
    with engine.begin() as conn:
        cols = conn.execute(text("PRAGMA table_info('notes')")).mappings().all()
        existing = {c["name"] for c in cols}
        for name, ddl in desired.items():
            if name in existing:
                continue
            conn.execute(text(f"ALTER TABLE notes ADD COLUMN {name} {ddl}"))


def ensure_todos_columns(engine) -> None:
    desired = {
        "priority": "INTEGER NOT NULL DEFAULT 2",
        "due_at": "DATETIME",
    }
    with engine.begin() as conn:
        cols = conn.execute(text("PRAGMA table_info('todo_items')")).mappings().all()
        if not cols:
            return
        existing = {c["name"] for c in cols}
        for name, ddl in desired.items():
            if name in existing:
                continue
            conn.execute(text(f"ALTER TABLE todo_items ADD COLUMN {name} {ddl}"))
