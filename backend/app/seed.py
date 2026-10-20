from backend.app.db.database import SessionLocal
from backend.app.models.user import User, UserRole
from backend.app.repositories import user_repository
from backend.app.security import hash_password

db = SessionLocal()

try:
    admin = User(
        name="Demo Admin",
        email="admin@example.com",
        password_hash=hash_password("admin123"),
        role=UserRole.SUPER_ADMIN,
    )

    existing_admin = user_repository.get_by_email(db, admin.email)

    if not existing_admin:
        db.add(admin)

    manager = User(
        name="Demo Manager",
        email="manager@example.com",
        password_hash=hash_password("manager123"),
        role=UserRole.PROJECT_MANAGER,
    )

    existing_manager = user_repository.get_by_email(db, manager.email)

    if not existing_manager:
        db.add(manager)

    member = User(
        name="Demo Member",
        email="member@example.com",
        password_hash=hash_password("member123"),
        role=UserRole.PROJECT_MEMBER,
    )

    existing_member = user_repository.get_by_email(db, member.email)

    if not existing_member:
        db.add(member)

    db.commit()

finally:
    db.close()
