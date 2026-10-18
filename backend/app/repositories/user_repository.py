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
