---
name: api-design
description: REST and GraphQL API design guide for AprovanLabs backend services. Use when designing or reviewing API endpoints, schemas, and contracts.
triggers:
  - API design
  - REST
  - GraphQL
  - endpoint
  - schema design
  - API contract
---

# API Design Skill

Use this skill when designing or reviewing REST or GraphQL APIs.

## When to Use

- Designing new API endpoints or GraphQL resolvers
- Reviewing an API implementation for contract quality
- Versioning or deprecating an existing API
- Writing OpenAPI specs or GraphQL schema definitions

## REST Design Principles

### Resource Naming

- Use nouns, not verbs: `/users`, not `/getUsers`
- Plural resource names: `/orders`, not `/order`
- Nest resources for ownership relationships: `/users/{id}/orders`
- Keep URLs lowercase with hyphens: `/user-profiles`, not `/userProfiles`
- Maximum 3 levels of nesting: `/resource/{id}/sub-resource/{id}` is the limit

### HTTP Methods

| Method | Use | Idempotent | Safe |
|---|---|---|---|
| GET | Read resource(s) | Yes | Yes |
| POST | Create resource | No | No |
| PUT | Replace resource entirely | Yes | No |
| PATCH | Partial update | No | No |
| DELETE | Delete resource | Yes | No |

### Status Codes

| Code | When |
|---|---|
| 200 | Successful read or update |
| 201 | Resource created (POST) |
| 204 | Success with no body (DELETE) |
| 400 | Client error: invalid input |
| 401 | Unauthenticated |
| 403 | Authenticated but unauthorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate, optimistic lock) |
| 422 | Validation failure (with error detail) |
| 500 | Server error |

### Request/Response Envelope

Use consistent envelopes for list responses:

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20
  }
}
```

Single resource responses can return the object directly.

Error response format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable summary",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### Versioning

- Version in the URL path: `/v1/users`
- Keep version pinned per-router, not per-endpoint
- Maintain backwards compatibility within a major version
- Deprecation: add `Deprecation` and `Sunset` response headers before removing

## GraphQL Design Principles

### Schema

- Use descriptive names: `UserProfile`, not `User`
- Add descriptions to all types and fields (they become API documentation)
- Use enums for fixed option sets
- Use connections/edges for paginated lists (Relay spec)

### Mutations

- Name mutations as verb + noun: `createUser`, `updateOrderStatus`
- Return the mutated resource (not just a boolean)
- Use input types for mutation arguments: `createUser(input: CreateUserInput!)`

### Performance

- Avoid N+1: use DataLoader for batching related lookups
- Rate-limit expensive queries with query complexity limits
- Use persisted queries in production

## API Contract Review Checklist

Before approving an API implementation:

- [ ] Endpoint follows REST resource naming conventions
- [ ] Correct HTTP methods and status codes
- [ ] All inputs validated with clear error messages
- [ ] Auth checks present before any data access
- [ ] Pagination for any list endpoint that could grow large
- [ ] Error envelope consistent with existing API
- [ ] OpenAPI spec or GraphQL schema updated
- [ ] Integration tests cover happy path and primary error cases
