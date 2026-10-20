import os
import getpass
import requests

BASE_URL = os.getenv("BUGTRACKER_API_URL", "http://localhost:8000")
PROJECT_ID = 17
TARGET_COUNT = 110
PREFIX = "PAGINATION-TEST-"

# Use the token from your own BugTracker login.
token = os.getenv("BUGTRACKER_TOKEN") or getpass.getpass(
    "Paste your BugTracker access token (input hidden): "
)

headers = {"Authorization": f"Bearer {token}"}
session = requests.Session()
session.headers.update(headers)

# Confirm the project exists and that your account can access it.
project_response = session.get(
    f"{BASE_URL}/projects/{PROJECT_ID}/details",
    timeout=15,
)
project_response.raise_for_status()
print(f"Connected to project: {project_response.json().get('name', PROJECT_ID)}")

# Fetch every issue currently in this project.
existing_test_issues = []
page = 1

while True:
    response = session.get(
        f"{BASE_URL}/projects/{PROJECT_ID}/issues",
        params={"page": page, "page_size": 100},
        timeout=15,
    )
    response.raise_for_status()
    data = response.json()

    existing_test_issues.extend(
        issue for issue in data["items"] if issue["title"].startswith(PREFIX)
    )

    if page >= data["total_pages"]:
        break
    page += 1

already_created = len(existing_test_issues)
print(f"Existing pagination test issues: {already_created}")

if already_created >= TARGET_COUNT:
    print("110 test issues already exist. Nothing to create.")
    raise SystemExit(0)

remaining = TARGET_COUNT - already_created

confirm = input(
    f"Create {remaining} issues in project {PROJECT_ID}? Type YES to continue: "
)
if confirm != "YES":
    print("Cancelled. No issues created.")
    raise SystemExit(0)

severities = ["low", "medium", "high", "critical"]
created = 0

for number in range(1, TARGET_COUNT + 1):
    title = f"{PREFIX}{number:03d}"

    # Skip issues already created by an earlier run.
    if any(issue["title"] == title for issue in existing_test_issues):
        continue

    payload = {
        "title": title,
        "description": (
            f"Test issue {number:03d} for pagination testing "
            f"in project {PROJECT_ID}. Safe to delete after testing."
        ),
        "severity": severities[(number - 1) % len(severities)],
        "assignee_id": None,
        "estimated_duration_days": 1 + (number % 10),
    }

    response = session.post(
        f"{BASE_URL}/projects/{PROJECT_ID}/issues",
        json=payload,
        timeout=15,
    )

    if not response.ok:
        print(f"Stopped at issue {title}: HTTP {response.status_code}")
        print(response.text)
        break

    created += 1
    if created % 10 == 0:
        print(f"Created {created} new issues...")

print(f"Finished. Created {created} issues in project {PROJECT_ID}.")
print(f"Total test issues expected: {already_created + created}")
