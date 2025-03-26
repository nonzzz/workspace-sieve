# Workspace Sieve

Filter packages in your monorepo

### Install

```bash
yarn add workspace-sieve
```

### Usage

```ts
import { filterWorkspacePackagesFromDirectory } from 'workspace-sieve'

filterWorkspacePackagesFromDirectory(process.cwd(), {
  patterns: ['*', '**']
})
```
