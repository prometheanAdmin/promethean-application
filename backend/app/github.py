"""GitHub App integration helpers.

Provides two public functions used by the enrollment flow:

- ``create_repo_from_template`` — fork a template repo into the org for a student
- ``invite_collaborator`` — add a GitHub user to the newly created repo

Both functions are async wrappers around PyGithub's synchronous API, executed
in a thread pool so they do not block the event loop.

Both functions NEVER raise — failures are logged and a sentinel value is
returned so callers can degrade gracefully without crashing the request.

Private key is read from ``settings.GITHUB_APP_PRIVATE_KEY`` (a PEM string).
Never log the private key — structlog context must not include it.
"""

from __future__ import annotations

import asyncio
from functools import lru_cache

import structlog
from github import Github, GithubException, GithubIntegration

from app.config import get_settings

log = structlog.get_logger(__name__)


@lru_cache(maxsize=1)
def _get_github_integration() -> GithubIntegration | None:
    """Return a cached GithubIntegration instance, or None if unconfigured.

    ``lru_cache(maxsize=1)`` ensures the PEM key is parsed exactly once.
    Returns None when GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY are not set,
    so callers can skip GitHub operations gracefully during local development.
    """
    settings = get_settings()
    if not settings.GITHUB_APP_ID or not settings.GITHUB_APP_PRIVATE_KEY:
        return None
    return GithubIntegration(
        integration_id=int(settings.GITHUB_APP_ID),
        private_key=settings.GITHUB_APP_PRIVATE_KEY,
    )


def _get_installation_client() -> Github | None:
    """Return an authenticated Github client for the org installation, or None."""
    integration = _get_github_integration()
    if integration is None:
        return None
    settings = get_settings()
    installation = integration.get_org_installation(settings.GITHUB_ORG)
    token = integration.get_access_token(installation.id)
    return Github(token.token)


async def create_repo_from_template(
    *,
    template_repo: str,
    new_repo_name: str,
    description: str = "",
    private: bool = True,
) -> str | None:
    """Fork a template repository into the org for a student.

    Args:
        template_repo: Full name of the template repo, e.g.
            ``"promethean-dev/project-template-python"``.
        new_repo_name: Name for the new repo (no org prefix).
        description: Optional description for the new repo.
        private: Whether to create the repo as private (default True).

    Returns:
        The HTML URL of the newly created repository, or ``None`` on failure.
        Never raises — all errors are logged at ERROR level.
    """
    settings = get_settings()

    def _sync_create() -> str | None:
        g = _get_installation_client()
        if g is None:
            log.warning("github_not_configured", op="create_repo")
            return None
        org = g.get_organization(settings.GITHUB_ORG)
        template = g.get_repo(template_repo)
        repo = org.create_repo_from_template(
            name=new_repo_name,
            repo=template,
            description=description,
            private=private,
        )
        return str(repo.html_url)

    try:
        url = await asyncio.get_running_loop().run_in_executor(None, _sync_create)
        if url:
            log.info(
                "github_repo_created",
                template=template_repo,
                new_repo=new_repo_name,
                url=url,
            )
        return url
    except GithubException as exc:
        log.error(
            "github_repo_create_failed",
            template=template_repo,
            new_repo=new_repo_name,
            status=exc.status,
            data=exc.data,
        )
        return None
    except Exception:
        log.exception(
            "github_repo_create_error",
            template=template_repo,
            new_repo=new_repo_name,
        )
        return None


async def invite_collaborator(
    *,
    repo_full_name: str,
    github_username: str,
    permission: str = "push",
) -> bool:
    """Invite a GitHub user as a collaborator on a repository.

    Args:
        repo_full_name: Full name including org, e.g.
            ``"promethean-dev/student-abc-project"``.
        github_username: The GitHub login of the student/mentor to invite.
        permission: GitHub permission level — ``"push"``, ``"pull"``, or
            ``"admin"`` (default ``"push"``).

    Returns:
        ``True`` on success, ``False`` on any failure.
        Never raises — all errors are logged at ERROR level.
    """
    def _sync_invite() -> bool:
        g = _get_installation_client()
        if g is None:
            log.warning("github_not_configured", op="invite_collaborator")
            return False
        repo = g.get_repo(repo_full_name)
        repo.add_to_collaborators(github_username, permission=permission)
        return True

    try:
        ok: bool = await asyncio.get_running_loop().run_in_executor(None, _sync_invite)
        if ok:
            log.info(
                "github_collaborator_invited",
                repo=repo_full_name,
                username=github_username,
                permission=permission,
            )
        return ok
    except GithubException as exc:
        log.error(
            "github_invite_failed",
            repo=repo_full_name,
            username=github_username,
            status=exc.status,
            data=exc.data,
        )
        return False
    except Exception:
        log.exception(
            "github_invite_error",
            repo=repo_full_name,
            username=github_username,
        )
        return False
