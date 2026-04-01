from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from uuid import uuid4
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, or_, func
import logging
import time
import os
from . import models, schemas
from .database import engine, SessionLocal, Base, ensure_fts, ensure_notes_columns, ensure_todos_columns
from .logging_config import configure_logging

configure_logging()
logger = logging.getLogger("notes_app")

app = FastAPI(title="Python Notes App Backend")

default_allow_origin_regex = r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$"
allow_origin_regex = os.getenv("NOTES_APP_ALLOW_ORIGIN_REGEX") or default_allow_origin_regex

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    ensure_notes_columns(engine)
    ensure_todos_columns(engine)
    ensure_fts(engine)


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = request.headers.get("X-Request-Id") or str(uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        return response


app.add_middleware(RequestIdMiddleware)


@app.middleware("http")
async def log_requests(request, call_next):
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.perf_counter() - start) * 1000
        logger.exception(
            "请求异常 请求ID=%s 方法=%s 路径=%s 耗时ms=%.2f",
            getattr(request.state, "request_id", "-"),
            request.method,
            request.url.path,
            duration_ms,
        )
        raise
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "请求完成 请求ID=%s 方法=%s 路径=%s 状态码=%s 耗时ms=%.2f",
        getattr(request.state, "request_id", "-"),
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    logger.warning(
        "参数校验失败 请求ID=%s 路径=%s 详情=%s",
        getattr(request.state, "request_id", "-"),
        request.url.path,
        exc.errors(),
    )
    return JSONResponse(
        status_code=422,
        content={
            "detail": "参数校验失败",
            "errors": exc.errors(),
            "request_id": getattr(request.state, "request_id", "-"),
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    logger.warning(
        "业务异常 请求ID=%s 路径=%s 状态码=%s 详情=%s",
        getattr(request.state, "request_id", "-"),
        request.url.path,
        exc.status_code,
        exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "request_id": getattr(request.state, "request_id", "-")},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    logger.exception(
        "未捕获异常 请求ID=%s 路径=%s",
        getattr(request.state, "request_id", "-"),
        request.url.path,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "服务器内部错误", "request_id": getattr(request.state, "request_id", "-")},
    )

# 依赖项：获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from typing import List, Optional

def build_folder_tree(folders: List[models.Folder], parent_id: Optional[int] = None) -> List[schemas.Folder]:
    """
    递归构建文件夹树形结构。
    """
    branch = []
    for folder in folders:
        if folder.parent_id == parent_id:
            children = build_folder_tree(folders, folder.id)
            notes = [schemas.Note.from_orm(note) for note in folder.notes if not getattr(note, "is_deleted", 0)]
            
            # 创建 Folder Schema 实例，并设置 children 和 notes
            folder_schema = schemas.Folder.from_orm(folder)
            folder_schema.children = children
            folder_schema.notes = notes
            branch.append(folder_schema)
    return branch


ROOT_FOLDER_NAME = "未分类"


def get_or_create_root_folder(db: Session) -> models.Folder:
    folder = (
        db.query(models.Folder)
        .filter(models.Folder.parent_id.is_(None), models.Folder.name == ROOT_FOLDER_NAME)
        .first()
    )
    if folder is not None:
        return folder
    folder = models.Folder(name=ROOT_FOLDER_NAME, parent_id=None)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


def write_op_log(db: Session, entity_type: str, entity_id: int, action: str, detail: str | None = None) -> None:
    db.add(
        models.OperationLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            detail=detail,
        )
    )
    db.commit()

@app.post("/folders", response_model=schemas.Folder, tags=["Folders"])
def create_folder(folder: schemas.FolderCreate, db: Session = Depends(get_db)):
    db_folder = models.Folder(**folder.dict())
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    write_op_log(db, "folder", db_folder.id, "create", detail=db_folder.name)
    return db_folder

@app.get("/folders", response_model=List[schemas.Folder], tags=["Folders"])
def read_folders(db: Session = Depends(get_db)):
    folders = (
        db.query(models.Folder)
        .options(joinedload(models.Folder.notes).joinedload(models.Note.tags))
        .order_by(models.Folder.name)
        .all()
    )
    # 根文件夹是 parent_id 为 None 的文件夹
    return build_folder_tree(folders, parent_id=None)

@app.get("/folders/{folder_id}", response_model=schemas.Folder, tags=["Folders"])
def read_folder(folder_id: int, db: Session = Depends(get_db)):
    folder = (
        db.query(models.Folder)
        .options(joinedload(models.Folder.notes).joinedload(models.Note.tags))
        .filter(models.Folder.id == folder_id)
        .first()
    )
    if folder is None:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # 递归加载所有子文件夹和笔记
    all_folders = db.query(models.Folder).options(joinedload(models.Folder.notes).joinedload(models.Note.tags)).all()
    
    folder_schema = schemas.Folder.from_orm(folder)
    folder_schema.children = build_folder_tree(all_folders, parent_id=folder.id)
    folder_schema.notes = [schemas.Note.from_orm(note) for note in folder.notes]
    
    return folder_schema

@app.put("/folders/{folder_id}", response_model=schemas.Folder, tags=["Folders"])
def update_folder(folder_id: int, folder: schemas.FolderUpdate, db: Session = Depends(get_db)):
    db_folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if db_folder is None:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # 更新字段
    updates = folder.dict(exclude_unset=True)
    if "parent_id" in updates:
        new_parent_id = updates["parent_id"]
        if new_parent_id == folder_id:
            raise HTTPException(status_code=400, detail="Folder cannot be its own parent")
        if new_parent_id is not None:
            current = db.query(models.Folder).filter(models.Folder.id == new_parent_id).first()
            if current is None:
                raise HTTPException(status_code=404, detail="Parent folder not found")
            while current is not None and current.parent_id is not None:
                if current.parent_id == folder_id:
                    raise HTTPException(status_code=400, detail="Folder move would create a cycle")
                current = db.query(models.Folder).filter(models.Folder.id == current.parent_id).first()
    for key, value in updates.items():
        setattr(db_folder, key, value)
    
    db.commit()
    db.refresh(db_folder)
    write_op_log(db, "folder", db_folder.id, "update", detail=str(updates) if updates else None)
    return db_folder

@app.delete("/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Folders"])
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    db_folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if db_folder is None:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    folder_name = db_folder.name
    db.delete(db_folder)
    db.commit()
    write_op_log(db, "folder", folder_id, "delete", detail=folder_name)
    return

@app.post("/notes", response_model=schemas.Note, tags=["Notes"])
def create_note(note: schemas.NoteCreate, db: Session = Depends(get_db)):
    folder_id = note.folder_id
    if folder_id is None:
        folder_id = get_or_create_root_folder(db).id
    else:
        folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
        if folder is None:
            raise HTTPException(status_code=404, detail=f"Folder with id {folder_id} not found")

    payload = note.dict(exclude={"tag_ids"})
    payload["folder_id"] = folder_id
    db_note = models.Note(**payload)
    if note.tag_ids:
        tags = db.query(models.Tag).filter(models.Tag.id.in_(note.tag_ids)).all()
        db_note.tags = tags
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    write_op_log(db, "note", db_note.id, "create", detail=db_note.title)
    return db_note

@app.get("/notes", response_model=List[schemas.Note], tags=["Notes"])
def read_notes(
    folder_id: Optional[int] = None,
    include_deleted: bool = False,
    only_deleted: bool = False,
    only_favorite: bool = False,
    only_pinned: bool = False,
    only_templates: bool = False,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Note).options(joinedload(models.Note.tags))
    if folder_id is not None:
        query = query.filter(models.Note.folder_id == folder_id)
    if only_deleted:
        query = query.filter(models.Note.is_deleted == 1)
    elif not include_deleted:
        query = query.filter(models.Note.is_deleted == 0)
    if only_favorite:
        query = query.filter(models.Note.is_favorite == 1)
    if only_pinned:
        query = query.filter(models.Note.is_pinned == 1)
    if only_templates:
        query = query.filter(models.Note.is_template == 1)
    if q:
        query = query.filter(models.Note.title.contains(q))
    notes = query.order_by(models.Note.is_pinned.desc(), models.Note.updated_at.desc(), models.Note.created_at.desc()).all()
    return notes

@app.get("/notes/{note_id}", response_model=schemas.Note, tags=["Notes"])
def read_note(note_id: int, db: Session = Depends(get_db)):
    note = db.query(models.Note).options(joinedload(models.Note.tags)).filter(models.Note.id == note_id).first()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@app.put("/notes/{note_id}", response_model=schemas.Note, tags=["Notes"])
def update_note(note_id: int, note: schemas.NoteUpdate, db: Session = Depends(get_db)):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    updates = note.dict(exclude_unset=True)
    if "folder_id" in updates:
        folder_id = updates["folder_id"]
        if folder_id is None:
            updates["folder_id"] = get_or_create_root_folder(db).id
        else:
            folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
            if folder is None:
                raise HTTPException(status_code=404, detail=f"Folder with id {folder_id} not found")

    tag_ids = None
    if "tag_ids" in updates:
        tag_ids = updates.pop("tag_ids")
    for key, value in updates.items():
        setattr(db_note, key, value)
    if tag_ids is not None:
        tags = []
        if tag_ids:
            tags = db.query(models.Tag).filter(models.Tag.id.in_(tag_ids)).all()
        db_note.tags = tags
    
    db.commit()
    db.refresh(db_note)
    write_op_log(db, "note", db_note.id, "update", detail=str(updates) if updates else None)
    return db_note


@app.post("/notes/bulk", response_model=List[schemas.Note], tags=["Notes"])
def bulk_notes(payload: schemas.NoteBulkAction, db: Session = Depends(get_db)):
    ids = [int(x) for x in (payload.ids or []) if x is not None]
    if not ids:
        return []

    notes = db.query(models.Note).options(joinedload(models.Note.tags)).filter(models.Note.id.in_(ids)).all()
    action = (payload.action or "").strip()

    if action == "favorite_on":
        for n in notes:
            n.is_favorite = 1
    elif action == "favorite_off":
        for n in notes:
            n.is_favorite = 0
    elif action == "pin_on":
        for n in notes:
            n.is_pinned = 1
    elif action == "pin_off":
        for n in notes:
            n.is_pinned = 0
    elif action == "trash":
        for n in notes:
            if getattr(n, "is_deleted", 0):
                continue
            n.is_deleted = 1
            n.deleted_at = func.now()
    elif action == "restore":
        for n in notes:
            n.is_deleted = 0
            n.deleted_at = None
    elif action == "template_on":
        for n in notes:
            n.is_template = 1
    elif action == "template_off":
        for n in notes:
            n.is_template = 0
    elif action == "move_folder":
        folder_id = payload.folder_id
        if folder_id is None:
            folder_id = get_or_create_root_folder(db).id
        else:
            folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
            if folder is None:
                raise HTTPException(status_code=404, detail=f"Folder with id {folder_id} not found")
        for n in notes:
            n.folder_id = folder_id
    elif action == "set_tags":
        tag_ids = payload.tag_ids
        tags = []
        if tag_ids:
            tags = db.query(models.Tag).filter(models.Tag.id.in_(tag_ids)).all()
        for n in notes:
            n.tags = tags
    elif action == "hard_delete":
        removed = []
        for n in notes:
            removed.append(n)
            db.delete(n)
        db.commit()
        write_op_log(db, "note", 0, "bulk_hard_delete", detail=str(len(removed)))
        return []
    else:
        raise HTTPException(status_code=400, detail="Unsupported bulk action")

    db.commit()
    for n in notes:
        db.refresh(n)
    write_op_log(db, "note", 0, "bulk", detail=action)
    return notes


@app.get("/tags", response_model=List[schemas.Tag], tags=["Tags"])
def list_tags(db: Session = Depends(get_db)):
    tags = db.query(models.Tag).order_by(models.Tag.name).all()
    return tags


@app.post("/tags", response_model=schemas.Tag, tags=["Tags"])
def create_tag(tag: schemas.TagCreate, db: Session = Depends(get_db)):
    exists = db.query(models.Tag).filter(models.Tag.name == tag.name).first()
    if exists is not None:
        raise HTTPException(status_code=409, detail="Tag already exists")
    db_tag = models.Tag(name=tag.name, color=tag.color)
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    write_op_log(db, "tag", db_tag.id, "create", detail=db_tag.name)
    return db_tag


@app.put("/tags/{tag_id}", response_model=schemas.Tag, tags=["Tags"])
def update_tag(tag_id: int, tag: schemas.TagUpdate, db: Session = Depends(get_db)):
    db_tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if db_tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    updates = tag.dict(exclude_unset=True)
    if "name" in updates:
        other = db.query(models.Tag).filter(models.Tag.name == updates["name"]).first()
        if other is not None and other.id != tag_id:
            raise HTTPException(status_code=409, detail="Tag name already exists")
    for key, value in updates.items():
        setattr(db_tag, key, value)
    db.commit()
    db.refresh(db_tag)
    write_op_log(db, "tag", db_tag.id, "update", detail=str(updates) if updates else None)
    return db_tag


@app.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Tags"])
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    db_tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if db_tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    tag_name = db_tag.name
    db.delete(db_tag)
    db.commit()
    write_op_log(db, "tag", tag_id, "delete", detail=tag_name)
    return

@app.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Notes"])
def delete_note(note_id: int, db: Session = Depends(get_db)):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")

    if getattr(db_note, "is_deleted", 0):
        return

    db_note.is_deleted = 1
    db_note.deleted_at = func.now()
    db.commit()
    db.refresh(db_note)
    write_op_log(db, "note", note_id, "trash", detail=db_note.title)
    return


@app.post("/notes/{note_id}/restore", response_model=schemas.Note, tags=["Notes"])
def restore_note(note_id: int, db: Session = Depends(get_db)):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    db_note.is_deleted = 0
    db_note.deleted_at = None
    db.commit()
    db.refresh(db_note)
    write_op_log(db, "note", note_id, "restore", detail=db_note.title)
    return db_note


@app.delete("/notes/{note_id}/hard", status_code=status.HTTP_204_NO_CONTENT, tags=["Notes"])
def hard_delete_note(note_id: int, db: Session = Depends(get_db)):
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    title = db_note.title
    db.delete(db_note)
    db.commit()
    write_op_log(db, "note", note_id, "hard_delete", detail=title)
    return


@app.delete("/trash/empty", status_code=status.HTTP_204_NO_CONTENT, tags=["Notes"])
def empty_trash(db: Session = Depends(get_db)):
    trashed = db.query(models.Note).filter(models.Note.is_deleted == 1).all()
    count = 0
    for n in trashed:
        db.delete(n)
        count += 1
    db.commit()
    write_op_log(db, "note", 0, "trash_empty", detail=str(count))
    return


@app.get("/todos", response_model=List[schemas.TodoItem], tags=["Todos"])
def list_todos(note_id: Optional[int] = None, checked: Optional[bool] = None, db: Session = Depends(get_db)):
    q = db.query(models.TodoItem)
    if note_id is not None:
        q = q.filter(models.TodoItem.note_id == note_id)
    if checked is not None:
        q = q.filter(models.TodoItem.checked == (1 if checked else 0))
    items = q.order_by(models.TodoItem.checked.asc(), models.TodoItem.id.desc()).all()
    return items


@app.post("/todos", response_model=schemas.TodoItem, tags=["Todos"])
def create_todo(payload: schemas.TodoItemCreate, db: Session = Depends(get_db)):
    note_id = payload.note_id
    if note_id is not None:
        note = db.query(models.Note).filter(models.Note.id == note_id).first()
        if note is None:
            raise HTTPException(status_code=404, detail="Note not found")
    priority = payload.priority if payload.priority is not None else 2
    try:
        priority = int(priority)
    except Exception:
        priority = 2
    priority = max(1, min(priority, 3))

    item = models.TodoItem(
        text=payload.text,
        checked=1 if payload.checked else 0,
        note_id=note_id,
        priority=priority,
        due_at=payload.due_at,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    write_op_log(db, "todo", item.id, "create", detail=item.text)
    return item


@app.put("/todos/{todo_id}", response_model=schemas.TodoItem, tags=["Todos"])
def update_todo(todo_id: int, payload: schemas.TodoItemUpdate, db: Session = Depends(get_db)):
    item = db.query(models.TodoItem).filter(models.TodoItem.id == todo_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    updates = payload.dict(exclude_unset=True)
    if "note_id" in updates:
        note_id = updates["note_id"]
        if note_id is not None:
            note = db.query(models.Note).filter(models.Note.id == note_id).first()
            if note is None:
                raise HTTPException(status_code=404, detail="Note not found")
        item.note_id = note_id
    if "text" in updates and updates["text"] is not None:
        item.text = updates["text"]
    if "checked" in updates and updates["checked"] is not None:
        item.checked = 1 if updates["checked"] else 0
    if "priority" in updates and updates["priority"] is not None:
        try:
            p = int(updates["priority"])
        except Exception:
            p = 2
        item.priority = max(1, min(p, 3))
    if "due_at" in updates:
        item.due_at = updates.get("due_at")
    db.commit()
    db.refresh(item)
    write_op_log(db, "todo", item.id, "update", detail=str(updates))
    return item


@app.delete("/todos/{todo_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Todos"])
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    item = db.query(models.TodoItem).filter(models.TodoItem.id == todo_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    text_val = item.text
    db.delete(item)
    db.commit()
    write_op_log(db, "todo", todo_id, "delete", detail=text_val)
    return

@app.get("/search", response_model=List[schemas.SearchResult], tags=["Search"])
def search_notes(query: str, db: Session = Depends(get_db)):
    q = (query or "").strip()
    if not q:
        return []

    rows = db.execute(
        text(
            """
            SELECT type, id, title, snippet, folder_id
            FROM (
                SELECT
                    'note' AS type,
                    n.id AS id,
                    n.title AS title,
                    snippet(notes_fts, 1, '[[', ']]', '…', 12) AS snippet,
                    n.folder_id AS folder_id,
                    bm25(notes_fts) AS score
                FROM notes n
                JOIN notes_fts ON notes_fts.rowid = n.id
                WHERE notes_fts MATCH :q AND (n.is_deleted = 0 OR n.is_deleted IS NULL)
                UNION ALL
                SELECT
                    'folder' AS type,
                    f.id AS id,
                    f.name AS title,
                    snippet(folders_fts, 0, '[[', ']]', '…', 12) AS snippet,
                    f.parent_id AS folder_id,
                    bm25(folders_fts) AS score
                FROM folders f
                JOIN folders_fts ON folders_fts.rowid = f.id
                WHERE folders_fts MATCH :q
            )
            ORDER BY score
            LIMIT 50
            """
        ),
        {"q": q},
    ).mappings()
    results = [dict(row) for row in rows]
    seen = {(r["type"], r["id"]) for r in results}

    if any(ord(ch) > 127 for ch in q):
        folders = db.query(models.Folder).filter(models.Folder.name.contains(q)).limit(50).all()
        for f in folders:
            key = ("folder", f.id)
            if key in seen:
                continue
            seen.add(key)
            results.append(
                {
                    "type": "folder",
                    "id": f.id,
                    "title": f.name,
                    "snippet": None,
                    "folder_id": f.parent_id,
                }
            )

        notes = (
            db.query(models.Note)
            .filter(or_(models.Note.title.contains(q), models.Note.content.contains(q)))
            .order_by(models.Note.created_at.desc())
            .limit(50)
            .all()
        )
        for n in notes:
            key = ("note", n.id)
            if key in seen:
                continue
            seen.add(key)
            results.append(
                {
                    "type": "note",
                    "id": n.id,
                    "title": n.title,
                    "snippet": None,
                    "folder_id": n.folder_id,
                }
            )

    return results[:50]


@app.get("/logs", response_model=List[schemas.OperationLog], tags=["Logs"])
def list_logs(limit: int = 200, db: Session = Depends(get_db)):
    safe_limit = max(1, min(limit, 2000))
    logs = db.query(models.OperationLog).order_by(models.OperationLog.id.desc()).limit(safe_limit).all()
    return logs


@app.post("/client-logs", tags=["Logs"])
def create_client_log(payload: dict, db: Session = Depends(get_db)):
    message = payload.get("message")
    stack = payload.get("stack")
    url = payload.get("url")
    ua = payload.get("userAgent")
    detail = {"message": message, "stack": stack, "url": url, "userAgent": ua}
    write_op_log(db, "client", 0, "error", detail=str(detail))
    logger.error("前端错误上报 %s", detail)
    return {"ok": True}

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to Python Notes App Backend!"}
