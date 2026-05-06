import { execFile } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { promisify } from "node:util";

import { rebuild } from "@electron/rebuild";
import { createCommandInvocation, createPackageManagerInvocation } from "@open-design/platform";

import { hashJson, hashPath, ToolPackCache } from "../cache.js";
import type { ToolPackConfig } from "../config.js";
import { ensureWorkspaceBuildArtifacts } from "../workspace-build.js";
import {
  ELECTRON_BUILDER_BUILD_DEPENDENCIES_FROM_SOURCE,
  ELECTRON_REBUILD_MODE,
  ELECTRON_REBUILD_NATIVE_MODULES,
  INTERNAL_PACKAGES,
  PRODUCT_NAME,
} from "./constants.js";
import { readPackagedVersion, writePackagedConfig } from "./manifest.js";
import { removeTree } from "./fs.js";
import type {
  AssembledAppCacheMetadata,
  AssembledAppCacheResult,
  ElectronReadyAppCacheMetadata,
  ElectronReadyAppCacheResult,
  NativeRebuildCacheMetadata,
  NativeRebuildCacheResult,
  PackedTarballInfo,
  PackedTarballsCacheMetadata,
  PackedTarballsCacheResult,
  WinPaths,
} from "./types.js";

const execFileAsync = promisify(execFile);

async function runPnpm(config: ToolPackConfig, args: string[], extraEnv: NodeJS.ProcessEnv = {}): Promise<void> {
  const invocation = createPackageManagerInvocation(args, process.env);
  await execFileAsync(invocation.command, invocation.args, {
    cwd: config.workspaceRoot,
    env: { ...process.env, ...extraEnv },
    windowsVerbatimArguments: invocation.windowsVerbatimArguments,
  });
}

async function runNpmInstall(appRoot: string): Promise<void> {
  const invocation = createCommandInvocation({
    args: ["install", "--omit=dev", "--no-package-lock"],
    command: process.platform === "win32" ? "npm.cmd" : "npm",
  });
  await execFileAsync(invocation.command, invocation.args, {
    cwd: appRoot,
    env: process.env,
    windowsVerbatimArguments: invocation.windowsVerbatimArguments,
  });
}

async function runElectronRebuild(config: ToolPackConfig, appRoot: string): Promise<void> {
  const foundModules = new Set<string>();
  const rebuildResult = rebuild({
    arch: "x64",
    buildFromSource: ELECTRON_BUILDER_BUILD_DEPENDENCIES_FROM_SOURCE,
    buildPath: appRoot,
    electronVersion: config.electronVersion,
    force: true,
    mode: ELECTRON_REBUILD_MODE,
    onlyModules: [...ELECTRON_REBUILD_NATIVE_MODULES],
    platform: "win32",
    projectRootPath: appRoot,
  });
  rebuildResult.lifecycle.on("modules-found", (modules: string[]) => {
    for (const moduleName of modules) foundModules.add(moduleName);
    process.stderr.write(`[tools-pack] rebuilding Electron ABI modules: ${modules.join(", ") || "none"}\n`);
  });
  await rebuildResult;
  const missingModules = ELECTRON_REBUILD_NATIVE_MODULES.filter((moduleName) => !foundModules.has(moduleName));
  if (missingModules.length > 0) {
    throw new Error(`Electron ABI rebuild did not discover required native module(s): ${missingModules.join(", ")}`);
  }
}

function nativeRebuildOutputPath(appRoot: string): string {
  return join(appRoot, "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node");
}

export async function rebuildWinNativeDependencies(
  config: ToolPackConfig,
  cache: ToolPackCache,
  assembledApp: AssembledAppCacheResult,
): Promise<NativeRebuildCacheResult> {
  const key = hashJson({
    arch: "x64",
    assembledAppKey: assembledApp.key,
    electronVersion: config.electronVersion,
    modules: ELECTRON_REBUILD_NATIVE_MODULES,
    platform: "win32",
    schemaVersion: 1,
  });
  const node = {
    id: "win.native-rebuild",
    key,
    outputs: ["better_sqlite3.node"],
    invalidate: async () => null,
    build: async ({ entryRoot }: { entryRoot: string }): Promise<NativeRebuildCacheMetadata> => {
      const stagingAppRoot = join(entryRoot, "app");
      await cp(assembledApp.appRoot, stagingAppRoot, { recursive: true });
      await runElectronRebuild(config, stagingAppRoot);
      await cp(nativeRebuildOutputPath(stagingAppRoot), join(entryRoot, "better_sqlite3.node"));
      return { modules: ELECTRON_REBUILD_NATIVE_MODULES };
    },
  };
  const manifest = await cache.acquire({
    materialize: [],
    node,
  });
  return {
    key,
    modules: manifest.payloadMetadata.modules,
    nodePath: join(manifest.entryPath, "better_sqlite3.node"),
  };
}

async function buildWorkspaceArtifacts(config: ToolPackConfig): Promise<void> {
  const webNextEnvPath = join(config.workspaceRoot, "apps", "web", "next-env.d.ts");
  const previousWebNextEnv = await readFile(webNextEnvPath, "utf8").catch(() => null);

  await runPnpm(config, ["--filter", "@open-design/contracts", "build"]);
  await runPnpm(config, ["--filter", "@open-design/sidecar-proto", "build"]);
  await runPnpm(config, ["--filter", "@open-design/sidecar", "build"]);
  await runPnpm(config, ["--filter", "@open-design/platform", "build"]);
  await runPnpm(config, ["--filter", "@open-design/daemon", "build"]);
  try {
    await runPnpm(config, ["--filter", "@open-design/web", "build"], { OD_WEB_OUTPUT_MODE: config.webOutputMode });
    await runPnpm(config, ["--filter", "@open-design/web", "build:sidecar"]);
  } finally {
    if (previousWebNextEnv == null) await rm(webNextEnvPath, { force: true });
    else await writeFile(webNextEnvPath, previousWebNextEnv, "utf8");
  }
  await runPnpm(config, ["--filter", "@open-design/desktop", "build"]);
  await runPnpm(config, ["--filter", "@open-design/packaged", "build"]);
}

export async function ensureWinWorkspaceBuild(config: ToolPackConfig, cache: ToolPackCache): Promise<void> {
  await ensureWorkspaceBuildArtifacts(config, cache, async () => {
    await buildWorkspaceArtifacts(config);
  });
}

async function createWorkspaceTarballsCacheKey(config: ToolPackConfig): Promise<string> {
  const packageHashes: Record<string, string> = {};
  for (const packageInfo of INTERNAL_PACKAGES) {
    packageHashes[packageInfo.name] = await hashPath(join(config.workspaceRoot, packageInfo.directory), {
      ignoreDirectoryNames: [".next", "dist", "node_modules"],
    });
  }
  const rootPackageJson = JSON.parse(await readFile(join(config.workspaceRoot, "package.json"), "utf8")) as {
    packageManager?: unknown;
  };

  return hashJson({
    node: "win.workspace-tarballs",
    packageHashes,
    packageManager: rootPackageJson.packageManager,
    pnpmLock: await hashPath(join(config.workspaceRoot, "pnpm-lock.yaml")),
    schemaVersion: 1,
  });
}

export async function collectWorkspaceTarballs(
  config: ToolPackConfig,
  paths: WinPaths,
  cache: ToolPackCache,
): Promise<PackedTarballsCacheResult> {
  const key = await createWorkspaceTarballsCacheKey(config);
  const node = {
    id: "win.workspace-tarballs",
    key,
    outputs: ["tarballs"],
    invalidate: async () => null,
    build: async ({ entryRoot }: { entryRoot: string }): Promise<PackedTarballsCacheMetadata> => {
      const tarballsRoot = join(entryRoot, "tarballs");
      await mkdir(tarballsRoot, { recursive: true });
      const packedTarballs: PackedTarballInfo[] = [];
      for (const packageInfo of INTERNAL_PACKAGES) {
        const beforeEntries = new Set(await readdir(tarballsRoot));
        await runPnpm(config, ["-C", packageInfo.directory, "pack", "--pack-destination", tarballsRoot]);
        const newEntries = (await readdir(tarballsRoot)).filter((entry) => !beforeEntries.has(entry));
        if (newEntries.length !== 1 || newEntries[0] == null) {
          throw new Error(`expected one tarball for ${packageInfo.name}, got ${newEntries.length}`);
        }
        packedTarballs.push({ fileName: newEntries[0], packageName: packageInfo.name });
      }
      return { tarballs: packedTarballs };
    },
  };
  const manifest = await cache.acquire({
    materialize: [{ from: "tarballs", to: paths.tarballsRoot }],
    node,
  });
  return { key, tarballs: manifest.payloadMetadata.tarballs };
}

function createAssembledAppDependencies(
  paths: Pick<WinPaths, "assembledAppRoot" | "tarballsRoot">,
  packedTarballs: PackedTarballInfo[],
): Record<string, string> {
  const tarballByPackage = Object.fromEntries(packedTarballs.map((entry) => [entry.packageName, entry.fileName] as const));
  return Object.fromEntries(
    INTERNAL_PACKAGES.map((packageInfo) => {
      const tarball = tarballByPackage[packageInfo.name];
      if (tarball == null) throw new Error(`missing tarball for ${packageInfo.name}`);
      return [packageInfo.name, `file:${relative(paths.assembledAppRoot, join(paths.tarballsRoot, tarball))}`];
    }),
  );
}

async function writeAssembledAppEntrypoints(
  paths: Pick<WinPaths, "assembledAppRoot" | "assembledMainEntryPath" | "assembledPackageJsonPath" | "tarballsRoot">,
  packedTarballs: PackedTarballInfo[],
  packagedVersion: string,
  options: { dependencies?: Record<string, string> } = {},
): Promise<void> {
  await mkdir(paths.assembledAppRoot, { recursive: true });
  await writeFile(
    paths.assembledPackageJsonPath,
    `${JSON.stringify(
      {
        dependencies: options.dependencies ?? createAssembledAppDependencies(paths, packedTarballs),
        description: "Open Design packaged runtime",
        main: "./main.cjs",
        name: "open-design-packaged-app",
        private: true,
        productName: PRODUCT_NAME,
        version: packagedVersion,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(
    paths.assembledMainEntryPath,
    'import("@open-design/packaged").catch((error) => {\n  console.error("packaged entry failed", error);\n  process.exit(1);\n});\n',
    "utf8",
  );
}

async function createAssembledAppCacheKey(
  config: ToolPackConfig,
  tarballsKey: string,
  packedTarballs: PackedTarballInfo[],
  packagedVersion: string,
): Promise<string> {
  return hashJson({
    electronVersion: config.electronVersion,
    node: "win.assembled-app",
    packagedVersion,
    packedTarballs,
    platform: "win32",
    schemaVersion: 3,
    tarballsKey,
    webOutputMode: config.webOutputMode,
  });
}

export async function writeAssembledApp(
  config: ToolPackConfig,
  paths: WinPaths,
  tarballs: PackedTarballsCacheResult,
  cache: ToolPackCache,
): Promise<AssembledAppCacheResult> {
  const packagedVersion = await readPackagedVersion(config);
  await removeTree(join(config.roots.output.namespaceRoot, "assembled"));
  const packedTarballs = tarballs.tarballs;
  const key = await createAssembledAppCacheKey(config, tarballs.key, packedTarballs, packagedVersion);
  const node = {
    id: "win.assembled-app",
    key,
    outputs: ["app"],
    invalidate: async () => null,
    build: async ({ entryRoot }: { entryRoot: string }): Promise<AssembledAppCacheMetadata> => {
      const assembledAppRoot = join(entryRoot, "app");
      await writeAssembledAppEntrypoints(
        { ...paths, assembledAppRoot, assembledMainEntryPath: join(assembledAppRoot, "main.cjs"), assembledPackageJsonPath: join(assembledAppRoot, "package.json") },
        packedTarballs,
        packagedVersion,
      );
      await runNpmInstall(assembledAppRoot);
      return { packagedVersion };
    },
  };
  const manifest = await cache.acquire({
    materialize: [],
    node,
  });
  await writePackagedConfig(config, paths, packagedVersion);
  return { appRoot: join(manifest.entryPath, "app"), key, packagedVersion };
}

export async function prepareElectronReadyApp(
  assembledApp: AssembledAppCacheResult,
  nativeRebuild: NativeRebuildCacheResult,
  cache: ToolPackCache,
): Promise<ElectronReadyAppCacheResult> {
  const key = hashJson({
    assembledAppKey: assembledApp.key,
    nativeRebuildKey: nativeRebuild.key,
    node: "win.electron-ready-app",
    schemaVersion: 2,
  });
  const node = {
    id: "win.electron-ready-app",
    key,
    outputs: ["app"],
    invalidate: async () => null,
    build: async ({ entryRoot }: { entryRoot: string }): Promise<ElectronReadyAppCacheMetadata> => {
      const appRoot = join(entryRoot, "app");
      await cp(assembledApp.appRoot, appRoot, { recursive: true });
      await cp(nativeRebuild.nodePath, nativeRebuildOutputPath(appRoot));
      return { assembledAppKey: assembledApp.key, nativeRebuildKey: nativeRebuild.key };
    },
  };
  const manifest = await cache.acquire({
    materialize: [],
    node,
  });
  return {
    appRoot: join(manifest.entryPath, "app"),
    assembledAppKey: manifest.payloadMetadata.assembledAppKey,
    key,
    nativeRebuildKey: manifest.payloadMetadata.nativeRebuildKey,
  };
}
