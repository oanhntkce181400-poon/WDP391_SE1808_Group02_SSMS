# Shared Packages (Optional)

- models/ – platform-agnostic TypeScript types and enums
- validation/ – Zod/Yup schemas aligned with DTOs
- api-client/ – generated OpenAPI client/types from backend Swagger

If you prefer strict separation, this `shared/` can be a separate repository and consumed via a private registry.
