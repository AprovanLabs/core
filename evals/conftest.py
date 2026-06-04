import os
import subprocess

import pytest
from phoenix.client import Client


@pytest.fixture
def git_sha():
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"], text=True
    ).strip()[:8]


@pytest.fixture
def skill_sha(request):
    skill_path = request.param
    return subprocess.check_output(
        ["git", "rev-parse", f"HEAD:{skill_path}"], text=True
    ).strip()[:8]


@pytest.fixture
def phoenix_client():
    working_dir = os.path.join(os.path.dirname(__file__), ".phoenix-data")
    os.makedirs(working_dir, exist_ok=True)

    os.environ.setdefault(
        "PHOENIX_WORKING_DIR", working_dir
    )
    os.environ.setdefault(
        "PHOENIX_SQL_DATABASE_URL",
        f"sqlite:///{working_dir}/phoenix.db",
    )

    return Client()
