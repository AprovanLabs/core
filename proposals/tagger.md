---
author: Jacob Sampson
date: 2023-05-01
org: labs
---

# Tagger

## Overview

Consistent methods of tagging resources across projects/apps/environments

```python
from tagger import getTagger, TagConfig

tagger = getTagger(
  org="myorg",
  app="myapp",
  project="myproject",
  environment="develop",
  config=TagConfig(
    separator="-",
  )
)

tagger.tag("my-resource", "my-tag") # 'myorg-myapp-myproject-develop-my-resource-my-tag'
```
