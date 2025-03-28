export interface ExportFields {
  import?: string
  require?: string
  default?: string
}

export type PackageBin = string | { [commandName: string]: string }

export type Dependencies = Record<string, string>

export type ProjectRootDir = string & { __brand: 'ProjectRootDir' }

export type PackageScripts = {
  [name: string]: string
} & {
  prepublish?: string,
  prepare?: string,
  prepublishOnly?: string,
  prepack?: string,
  postpack?: string,
  publish?: string,
  postpublish?: string,
  preinstall?: string,
  install?: string,
  postinstall?: string,
  preuninstall?: string,
  uninstall?: string,
  postuninstall?: string,
  preversion?: string,
  version?: string,
  postversion?: string,
  pretest?: string,
  test?: string,
  posttest?: string,
  prestop?: string,
  stop?: string,
  poststop?: string,
  prestart?: string,
  start?: string,
  poststart?: string,
  prerestart?: string,
  restart?: string,
  postrestart?: string,
  preshrinkwrap?: string,
  shrinkwrap?: string,
  postshrinkwrap?: string
}

export interface PeerDependenciesMeta {
  [dependencyName: string]: {
    optional?: boolean
  }
}

export interface DependenciesMeta {
  [dependencyName: string]: {
    injected?: boolean,
    node?: string,
    patch?: string
  }
}

export interface PublishConfig extends Record<string, unknown> {
  directory?: string
  linkDirectory?: boolean
  executableFiles?: string[]
  registry?: string
}

type Version = string
type Pattern = string
export interface TypesVersions {
  [version: Version]: {
    [pattern: Pattern]: string[]
  }
}

export interface BaseManifest {
  name?: string
  version?: string
  bin?: PackageBin
  description?: string
  directories?: {
    bin?: string
  }
  files?: string[]
  dependencies?: Dependencies
  devDependencies?: Dependencies
  optionalDependencies?: Dependencies
  peerDependencies?: Dependencies
  peerDependenciesMeta?: PeerDependenciesMeta
  dependenciesMeta?: DependenciesMeta
  bundleDependencies?: string[] | boolean
  bundledDependencies?: string[] | boolean
  homepage?: string
  repository?: string | { url: string }
  scripts?: PackageScripts
  config?: object
  engines?: {
    node?: string,
    npm?: string,
    pnpm?: string
  }
  cpu?: string[]
  os?: string[]
  libc?: string[]
  main?: string
  module?: string
  typings?: string
  types?: string
  publishConfig?: PublishConfig
  typesVersions?: TypesVersions
  readme?: string
  keywords?: string[]
  author?: string
  license?: string
  exports?: Record<string, string>
}

export interface ProjectManifest extends BaseManifest {
  packageManager?: string
  workspaces?: string[]
  private?: boolean
  resolutions?: Record<string, string>
}

export interface Package {
  manifest: BaseManifest
  dirPath: string
}

export interface PackageNode<P extends Package> {
  package: P
  dependencies: PackageNode<P>[]
}

export interface PackageGraph<P extends Package> {
  [id: string]: PackageNode<P>
}

export interface SupportedArchitectures {
  os?: string[]
  cpu?: string[]
  libc?: string[]
}

export interface PackageMetadata {
  manifest: ProjectManifest
  manifestPath: string
  dirPath: string
}
