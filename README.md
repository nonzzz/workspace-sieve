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
  experimental?: { debug: boolean }
}

filterWorkspacePackagesFromDirectory(process.cwd(), {
  patterns: ['*', '**']
})
```

### API's

```ts
export declare function filterWorkspacePackagesFromDirectory(
  workspaceRoot: string,
  options?: FilterOptions
): Promise<FilterWorkspacePackagesFromDirectoryResult>

export declare function filterWorkspacePackagesByGraphics(
  packageGraph: Record<string, Package>,
  patterns: string[],
  options?: { experimental?: { debug: boolean } }
): FilterWorkspaceResult

export declare function searchForPackageRoot(current: string, root?: string): string

export declare function searchForWorkspaceRoot(current: string, root?: string): string
```

### Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/nonzzz/sponsors/sponsorkit/sponsors.svg">
    <img src="https://cdn.jsdelivr.net/gh/nonzzz/sponsors/sponsorkit/sponsors.svg"/>
  </a>
</p>

### Tips

- The implementation result is not consistent with pnpm filter (Not support filter selector for now!!!) Maybe needed if yijie want~
- `filterWorkspacePackagesFromDirectory` filter follow the pattern syntax not using `selector`.

### LICENSE

[MIT](./LICENSE)
