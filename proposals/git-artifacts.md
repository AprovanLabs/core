---
author: Jacob Sampson
date: 2023-05-01
org: labs
---

# Git Artifacts

## Overview

Provide a mechanism for creating immutable artifacts from git repositories, based on metadata files. Automatically build and cache these artifacts, only rebuilding when dependencies change.

Additionally, store these dependencies as a local cache in front of a centralzied artifact store, to reduce rebuild and fetchg time, as well as continuous iteration on the artifact.

```yml
name: my-artifact
version: "1.0.0",
keys:
- {{ .Branch }}
- {{ checksum "package-lock.json" }}
plugins: ["npm"]
```

_package.json_

```json
{
  "dependencies": {
    "my-artifact": "1.0.0"
  }
}
```

## Motivation

This enables organizations to work with either a mono- or multi-repo design, while still providing the benefits of mono-repo immutable artifacts created within a single commits without the issue of interdependency conflicts and multi-repo independent development and flexibility
