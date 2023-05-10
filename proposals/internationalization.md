---
author: Jacob Sampson
date: 2023-05-01
org: labs
---

# Internationalization

## Overview

Open-source project for easy internationalization of web applications. Use the work from 'El Yankee' as a template.

Default translations are shown using the literal string. Other langauges are mapped to the literal translation. Additionally, provide a mechanism for default transformations of the literal string in other languages, with ovveride capabilities.

```javascript
// Upper-cammel case
export const ucc = (s: string) =>
  s
    .split(' ')
    .map((w: string) => `${w.slice(0, 1).toUpperCase()}${w.slice(1)}`)
    .join(' ');

export const plural = (s: string) => `${s}s`;

...

const l = useLocalization();

l('update', ucc, plural); // 'Updates'
```
