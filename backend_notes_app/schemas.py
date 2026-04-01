from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

# --- Folder Schemas ---
class FolderBase(BaseModel):
    name: str = Field(..., example="My New Folder")
    parent_id: Optional[int] = Field(None, example=1)

class FolderCreate(FolderBase):
    pass

class FolderUpdate(FolderBase):
    name: Optional[str] = Field(None, example="Updated Folder Name")
    parent_id: Optional[int] = Field(None, example=2) # 用于拖拽移动

class FolderInDBBase(FolderBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True # for SQLAlchemy ORM

class Folder(FolderInDBBase):
    children: List["Folder"] = Field(default_factory=list)
    notes: List["Note"] = Field(default_factory=list)


class TagBase(BaseModel):
    name: str
    color: str


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class TagInDBBase(TagBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Tag(TagInDBBase):
    pass

# --- Note Schemas ---
class NoteBase(BaseModel):
    title: str = Field(..., example="My Awesome Note")
    content: str = Field(..., example="This is the **content** of my note, with `code block`.")
    folder_id: Optional[int] = Field(None, example=1)
    tag_ids: Optional[List[int]] = None

    is_favorite: Optional[bool] = False
    is_pinned: Optional[bool] = False
    is_deleted: Optional[bool] = False
    is_template: Optional[bool] = False

class NoteCreate(NoteBase):
    pass

class NoteUpdate(NoteBase):
    title: Optional[str] = Field(None, example="Updated Note Title")
    content: Optional[str] = Field(None, example="Updated **content** of my note.")
    folder_id: Optional[int] = Field(None, example=2) # 用于拖拽移动
    tag_ids: Optional[List[int]] = None

class NoteInDBBase(NoteBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True # for SQLAlchemy ORM

class Note(NoteInDBBase):
    # Note 响应模型不需要包含 Folder 对象，避免循环引用
    tags: List[Tag] = Field(default_factory=list)


class NoteBulkAction(BaseModel):
    ids: List[int]
    action: str
    folder_id: Optional[int] = None
    tag_ids: Optional[List[int]] = None


class SearchResult(BaseModel):
    type: str
    id: int
    title: str
    snippet: Optional[str] = None
    folder_id: Optional[int] = None


class OperationLog(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    action: str
    detail: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TodoItemBase(BaseModel):
    text: str
    checked: Optional[bool] = False
    note_id: Optional[int] = None
    priority: Optional[int] = 2
    due_at: Optional[datetime] = None


class TodoItemCreate(TodoItemBase):
    pass


class TodoItemUpdate(BaseModel):
    text: Optional[str] = None
    checked: Optional[bool] = None
    note_id: Optional[int] = None
    priority: Optional[int] = None
    due_at: Optional[datetime] = None


class TodoItem(TodoItemBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# 更新 Folder 模型的 forward_refs
Folder.model_rebuild()
Note.model_rebuild()
