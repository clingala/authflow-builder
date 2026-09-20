# Auth configuration module

This module will own the versioned AuthFlow schema, defaults, migrations, and semantic validation in Phase 3. It must remain independent from React, persistence, delivery providers, and LLM interpretation.

Public boundary planned for Phase 3:

- `AuthFlowConfig` and versioned Zod schemas
- `parseAuthFlowConfig(input)`
- `createDefaultAuthFlowConfig(template)`
- `migrateAuthFlowConfig(input)`
- semantic checks such as unique field IDs and required identifiers

