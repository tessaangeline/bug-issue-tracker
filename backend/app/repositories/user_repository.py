from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.user import User


def create_user(db: Session, user: User) -> User:
    db.add(user)
    db.commit()
    # python object gets the database generated values like id
    db.refresh(user)

    return user


def get_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_all_users(
    db: Session,
    page: int = 1,
    page_size: int = 10,
    search: str = "",
    role: str | None = None,
    sort_order: str = "name-asc",
) -> tuple[list[User], int]:
    query = db.query(User)

    if search.strip():
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (User.name.ilike(search_term))
            | (User.email.ilike(search_term))
        )

    if role and role != "all":
        query = query.filter(User.role == role)

    if sort_order == "name-desc":
        query = query.order_by(func.lower(User.name).desc(), User.id.desc())
    else:
        query = query.order_by(func.lower(User.name).asc(), User.id.asc())

    total = query.count()

    users = (
        query
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return users, total


def update_user(db: Session) -> User:
    db.commit()
    db.refresh(User)
    return User


def delete_user(db: Session, user: User) -> User:
    db.delete(user)
    db.commit()


def get_by_id_for_update(db: Session, user_id: int) -> User | None:
    return (
        db.query(User)
        .filter(User.id == user_id)
        .with_for_update()
        .first()
    )


def get_by_email_excluding_user(
    db: Session,
    email: str,
    user_id: int,
) -> User | None:
    return (
        db.query(User)
        .filter(User.email == email, User.id != user_id)
        .first()
    )
