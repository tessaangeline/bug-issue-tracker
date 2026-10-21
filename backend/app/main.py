from backend.app.routers import auth, issues, projects, users
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(issues.router)
app.include_router(issues.issue_router)


@app.get("/")
def root():
    return {"message": "Bug Tracker API is running!"}
