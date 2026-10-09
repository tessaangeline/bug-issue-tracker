from fastapi import FastAPI

from backend.app.routers import users, auth
from backend.app.routers import projects, issues

app = FastAPI()

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(issues.router)
app.include_router(issues.issue_router)


@app.get("/")
def root():
    return {"message": "Bug Tracker API is running!"}
