from sqlalchemy.orm import Session

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


def get_all_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.id).all()
