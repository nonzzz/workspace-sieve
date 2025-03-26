# Workspace Sieve

Filter packages in your monorepo

### Install

```bash
yarn add workspace-sieve
```

### Usage

```ts
import { filterWorkspacePackagesFromDirectory } from 'workspace-sieve'

interface FilterOptions {
  patterns: string[] // patterns mean the workspaces you need to match
  filter?: string[] // filter means the packages that need be filtered out in the workplace (based on the patterns matched result)
}

filterWorkspacePackagesFromDirectory(process.cwd(), {
  patterns: ['*', '**']
})
```

### Tips

- The implementation result is not consistent with pnpm filter (Not support filter selector for now!!!) Maybe needed if yijie want~
- `filterWorkspacePackagesFromDirectory` filter follow the pattern syntax not using `selector`.

### LICENSE

[MIT](./LICENSE)
