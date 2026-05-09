"""
Workspace sync — download files from NodeOps workspace and git push.
"""
import asyncio
import logging
import os
import shutil
from pathlib import Path
from backend.services import nodeops_client as noc
from backend.storage.file_store import repo_dir

logger = logging.getLogger(__name__)


async def download_workspace(runtime_host: str, project_token: str,
                             auth_token: str, target_dir: Path,
                             base_path: str = ""):
    """Recursively download all files from NodeOps workspace into target_dir.

    Uses /file?path= for directory listing and /file/content?path= for file content.
    """
    logger.info(f"Downloading workspace from {runtime_host} to {target_dir}")

    tree = await noc.get_file_tree(runtime_host, project_token, auth_token, base_path)
    entries = []
    if isinstance(tree, list):
        entries = [entry for entry in tree if isinstance(entry, dict)]
    elif isinstance(tree, dict):
        raw_entries = tree.get("files") or tree.get("entries") or tree.get("children") or []
        if isinstance(raw_entries, list):
            entries = [entry for entry in raw_entries if isinstance(entry, dict)]

    for entry in entries:
        if entry.get("ignored"):
            continue

        name = entry.get("name", "")
        entry_path = str(entry.get("path") or "").strip().lstrip("/")
        if not entry_path:
            entry_path = f"{base_path}/{name}".lstrip("/") if base_path else name
        if not entry_path:
            continue

        entry_type = str(entry.get("type", "file")).lower()
        is_dir = entry_type in ("directory", "dir", "folder", "tree")

        if is_dir:
            # Recurse into directory
            (target_dir / entry_path).mkdir(parents=True, exist_ok=True)
            await download_workspace(runtime_host, project_token, auth_token,
                                     target_dir, entry_path)
        else:
            # Download file content
            try:
                content = await noc.get_file_content(
                    runtime_host, project_token, auth_token, entry_path
                )
                file_path = target_dir / entry_path
                file_path.parent.mkdir(parents=True, exist_ok=True)
                with open(file_path, "wb") as f:
                    f.write(content)
                logger.debug(f"Downloaded: {entry_path}")
            except Exception as e:
                logger.warning(f"Failed to download {entry_path}: {e}")


async def sync_workspace_to_repo(runtime_host: str, project_token: str,
                                 auth_token: str, project_name: str):
    """Download workspace files and overwrite the local repo."""
    target = repo_dir(project_name)
    if not target.exists():
        logger.error(f"Repo dir does not exist: {target}")
        return False

    # Download into a temp dir first, then overwrite
    # (preserve .git and .nodeops dirs)
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        await download_workspace(runtime_host, project_token, auth_token, tmp_path)

        # Overwrite repo files (skip .git and .nodeops)
        for item in tmp_path.rglob("*"):
            if item.is_file():
                rel = item.relative_to(tmp_path)
                dest = target / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(item, dest)
                logger.debug(f"Synced: {rel}")

    logger.info(f"Workspace synced to {target}")
    return True


async def git_push(project_name: str, commit_message: str) -> str | None:
    """Git add, commit, and push in the repo directory.

    Returns commit hash on success, None on failure.
    """
    cwd = str(repo_dir(project_name))

    if not os.path.exists(os.path.join(cwd, ".git")):
        logger.error(f"Not a git repo: {cwd}")
        return None

    try:
        # git add -A
        proc = await asyncio.create_subprocess_exec(
            "git", "add", "-A",
            cwd=cwd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        await proc.wait()

        # Check if there's anything to commit
        proc = await asyncio.create_subprocess_exec(
            "git", "status", "--porcelain",
            cwd=cwd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        if not stdout.strip():
            logger.info("No changes to commit")
            return "no-changes"

        # git commit
        proc = await asyncio.create_subprocess_exec(
            "git", "commit", "-m", commit_message,
            cwd=cwd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            logger.error(f"git commit failed: {stderr.decode()}")
            return None

        # Get commit hash
        proc = await asyncio.create_subprocess_exec(
            "git", "rev-parse", "HEAD",
            cwd=cwd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        commit_hash = stdout.decode().strip()

        # git push
        proc = await asyncio.create_subprocess_exec(
            "git", "push",
            cwd=cwd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            logger.error(f"git push failed: {stderr.decode()}")
            return None

        logger.info(f"Pushed commit {commit_hash}")
        return commit_hash

    except Exception as e:
        logger.error(f"Git operation failed: {e}")
        return None


async def git_clone(github_url: str, project_name: str) -> bool:
    """Clone a GitHub repo into the project's repo directory."""
    target = repo_dir(project_name)

    if target.exists() and os.path.exists(os.path.join(str(target), ".git")):
        logger.info(f"Repo already cloned: {target}")
        return True

    target.parent.mkdir(parents=True, exist_ok=True)

    try:
        proc = await asyncio.create_subprocess_exec(
            "git", "clone", github_url, str(target),
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            logger.error(f"git clone failed: {stderr.decode()}")
            return False
        logger.info(f"Cloned {github_url} to {target}")
        return True
    except Exception as e:
        logger.error(f"git clone error: {e}")
        return False
