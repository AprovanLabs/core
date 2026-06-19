<br>

<p align="center">
    <img width="300" src="https://raw.githubusercontent.com/AprovanLabs/aprovan.com/main/docs/assets/social-labs.png" alt="Aprovan Labs Icon">
</p>

<br>

<p align="center">
    <a href="https://aprovan.com" target="_blank">
        <img width="300" src="https://raw.githubusercontent.com/AprovanLabs/aprovan.com/main/docs/assets/text-labs.svg" alt="Aprovan Labs Logo">
    </a>
</p>

<h3 align="center" style="max-width: 38rem">
    built what's next
</h3>

<br>

## Development

### Pre-commit hooks

This repo uses [pre-commit](https://pre-commit.com/) to run checks before each commit. Install and set up:

```bash
pip install pre-commit
pre-commit install
```

Hooks included:

- **gitleaks** — scans for hardcoded secrets (API keys, tokens, passwords). Uses [`.gitleaks.toml`](.gitleaks.toml) for repo-specific rules and allowlists.

To run all hooks manually:

```bash
pre-commit run --all-files
```

## Scripts

```sh
ln -s ./repos/dotfiles/.agents .agents

uv pip install graph-sitter
uv tool install graph-sitter --python 3.13
```
