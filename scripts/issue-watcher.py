#!/usr/bin/env python3
"""
iSchool GitHub Issue Watcher

Periodically fetches open issues (and their comments) from the
ridwanullahh/ischool repo and logs any changes to a state file +
human-readable changelog.

Used by the system cron (see setup-issue-cron.sh).

Reads the GitHub token from ~/.git-credentials (first entry) so the
token is never duplicated in config files.

Output:
  /home/z/my-project/scripts/.issue-state.json   - last-seen state
  /home/z/my-project/scripts/issue-changelog.log - append-only human log
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

REPO = "ridwanullahh/ischool"
STATE_FILE = Path("/home/z/my-project/scripts/.issue-state.json")
CHANGELOG = Path("/home/z/my-project/scripts/issue-changelog.log")
TOKEN_FILE = Path.home() / ".git-credentials"


def load_token() -> str:
    """Extract the GitHub token from ~/.git-credentials (first entry)."""
    if not TOKEN_FILE.exists():
        print("ERROR: ~/.git-credentials not found", file=sys.stderr)
        sys.exit(1)
    text = TOKEN_FILE.read_text().strip()
    # format: https://username:TOKEN@host
    m = re.search(r":(github_pat_[A-Za-z0-9_]+)@", text)
    if not m:
        print("ERROR: could not parse token from ~/.git-credentials", file=sys.stderr)
        sys.exit(1)
    return m.group(1)


def api_get(path: str, token: str) -> dict:
    url = f"https://api.github.com/repos/{REPO}/{path}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "ischool-issue-watcher",
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"issues": {}, "last_check": None}


def save_state(state: dict) -> None:
    state["last_check"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    STATE_FILE.write_text(json.dumps(state, indent=2))


def log_change(line: str) -> None:
    ts = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())
    CHANGELOG.open("a").write(f"[{ts}] {line}\n")


def main() -> int:
    token = load_token()
    # Fetch open issues (paginated, first 100)
    issues = api_get("issues?state=open&sort=updated&direction=desc&per_page=100", token)
    # GitHub returns PRs in this endpoint too; filter them out
    issues = [i for i in issues if "pull_request" not in i]

    state = load_state()
    prev_issues = state["issues"]
    new_state = {"issues": {}}
    changes = []

    for iss in issues:
        num = iss["number"]
        title = iss["title"]
        updated = iss["updated_at"]
        comments_count = iss.get("comments", 0)
        url = iss["html_url"]

        prev = prev_issues.get(str(num))
        if prev is None:
            changes.append(f"NEW ISSUE #{num}: {title} ({url})")
        elif prev.get("updated_at") != updated:
            changes.append(f"UPDATED ISSUE #{num}: {title} (comments: {prev.get('comments',0)} -> {comments_count})")

        # If comments increased, fetch the latest comments to surface them
        if prev and comments_count > prev.get("comments", 0):
            try:
                cs = api_get(f"issues/{num}/comments?per_page=100", token)
                last_two = cs[-2:] if len(cs) >= 2 else cs
                for c in last_two:
                    user = c.get("user", {}).get("login", "?")
                    body = (c.get("body") or "").replace("\n", " ")[:200]
                    changes.append(f"  COMMENT on #{num} by @{user}: {body}")
            except Exception as e:
                changes.append(f"  (could not fetch comments for #{num}: {e})")

        new_state["issues"][str(num)] = {
            "title": title,
            "updated_at": updated,
            "comments": comments_count,
            "url": url,
        }

    # Detect closed issues (present before, absent now)
    for num, prev in prev_issues.items():
        if num not in new_state["issues"]:
            changes.append(f"CLOSED ISSUE #{num}: {prev.get('title','?')}")

    save_state(new_state)

    if changes:
        for c in changes:
            log_change(c)
        print(f"Detected {len(changes)} change(s):")
        for c in changes:
            print(f"  - {c}")
    else:
        print(f"No changes. {len(issues)} open issue(s) tracked.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
