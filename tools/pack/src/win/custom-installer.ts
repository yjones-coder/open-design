import { execFile } from "node:child_process";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

import type { ToolPackConfig } from "../config.js";
import { winResources } from "../resources.js";
import { PRODUCT_NAME } from "./constants.js";
import { pathExists } from "./fs.js";
import { readPackagedVersion } from "./manifest.js";
import { sanitizeNamespace } from "./paths.js";
import type { WinBuiltAppManifest, WinPaths } from "./types.js";

const execFileAsync = promisify(execFile);

function escapeNsisString(value: string): string {
  return value.replace(/"/g, '$\\"').replace(/\r?\n/g, "$\\r$\\n");
}

async function findFirstExistingPath(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }
  return null;
}

async function findElectronBuilderMakensis(config: ToolPackConfig): Promise<string | null> {
  const cacheRoots = [
    process.env.ELECTRON_BUILDER_CACHE,
    process.env.LOCALAPPDATA == null ? undefined : join(process.env.LOCALAPPDATA, "electron-builder", "Cache"),
    process.env.APPDATA == null ? undefined : join(process.env.APPDATA, "electron-builder", "Cache"),
    join(config.workspaceRoot, "node_modules", ".cache", "electron-builder"),
  ].filter((entry): entry is string => entry != null && entry.length > 0);
  for (const cacheRoot of cacheRoots) {
    const direct = await findFirstExistingPath([
      join(cacheRoot, "nsis", "nsis-3.0.4.1-nsis-3.0.4.1", "makensis.exe"),
      join(cacheRoot, "nsis", "nsis-3.0.4.1-nsis-3.0.4.1", "Bin", "makensis.exe"),
    ]);
    if (direct != null) return direct;
  }
  return null;
}

async function resolveMakensisCommand(config: ToolPackConfig): Promise<string> {
  const cached = await findElectronBuilderMakensis(config);
  if (cached != null) return cached;
  const candidates = [
    "makensis.exe",
    "makensis",
    "C:\\Program Files (x86)\\NSIS\\makensis.exe",
    "C:\\Program Files\\NSIS\\makensis.exe",
  ];
  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ["/VERSION"], { windowsHide: true });
      return candidate;
    } catch {
      // Keep probing known locations.
    }
  }
  throw new Error("makensis is required to build the Windows installer; install NSIS or populate the electron-builder NSIS cache");
}

async function writeInstallerScript(config: ToolPackConfig, paths: WinPaths): Promise<void> {
  const productName = escapeNsisString(PRODUCT_NAME);
  const exeName = escapeNsisString(`${PRODUCT_NAME}.exe`);
  const uninstallerName = escapeNsisString(`Uninstall ${PRODUCT_NAME}.exe`);
  const shortcutName = escapeNsisString(`${PRODUCT_NAME}.lnk`);
  const registryKey = escapeNsisString(`Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${PRODUCT_NAME}-${sanitizeNamespace(config.namespace)}`);
  const appPathsKey = escapeNsisString(`Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${PRODUCT_NAME}.exe`);
  const nsisLogPath = escapeNsisString(paths.nsisLogPath);

  await mkdir(dirname(paths.installerScriptPath), { recursive: true });
  await writeFile(
    paths.installerScriptPath,
    `Unicode true
ManifestDPIAware true
RequestExecutionLevel user

!ifndef OUTPUT_EXE
  !error "OUTPUT_EXE define is required"
!endif
!ifndef PAYLOAD_7Z
  !error "PAYLOAD_7Z define is required"
!endif
!ifndef SEVEN_Z_EXE
  !error "SEVEN_Z_EXE define is required"
!endif
!ifndef SEVEN_Z_DLL
  !error "SEVEN_Z_DLL define is required"
!endif
!ifndef APP_ICON
  !error "APP_ICON define is required"
!endif
!ifndef APP_VERSION
  !error "APP_VERSION define is required"
!endif

!include "MUI2.nsh"
!include "LogicLib.nsh"

Name "${productName}"
OutFile "\${OUTPUT_EXE}"
InstallDir "$LOCALAPPDATA\\Programs\\${productName}"
InstallDirRegKey HKCU "${registryKey}" "InstallLocation"
Icon "\${APP_ICON}"
UninstallIcon "\${APP_ICON}"
ShowInstDetails show
ShowUninstDetails show

!define MUI_ABORTWARNING
!define MUI_ICON "\${APP_ICON}"
!define MUI_UNICON "\${APP_ICON}"
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "SimpChinese"

Function LogInstallerEvent
  Exch $0
  Push $1
  CreateDirectory "${escapeNsisString(dirname(paths.nsisLogPath))}"
  FileOpen $1 "${nsisLogPath}" a
  IfErrors done
  FileWrite $1 "$0$\\r$\\n"
  FileClose $1
done:
  Pop $1
  Pop $0
FunctionEnd

Function un.LogInstallerEvent
  Exch $0
  Push $1
  CreateDirectory "${escapeNsisString(dirname(paths.nsisLogPath))}"
  FileOpen $1 "${nsisLogPath}" a
  IfErrors done
  FileWrite $1 "$0$\\r$\\n"
  FileClose $1
done:
  Pop $1
  Pop $0
FunctionEnd

Section "Install"
  SetShellVarContext current
  Push "install section start"
  Call LogInstallerEvent

  IfFileExists "$INSTDIR\\${exeName}" 0 prepare_install_dir
  RMDir /r "$INSTDIR"

prepare_install_dir:
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File "/oname=$PLUGINSDIR\\payload.7z" "\${PAYLOAD_7Z}"
  File "/oname=$PLUGINSDIR\\7z.exe" "\${SEVEN_Z_EXE}"
  File "/oname=$PLUGINSDIR\\7z.dll" "\${SEVEN_Z_DLL}"

  CreateDirectory "$INSTDIR"
  Push "payload extraction start"
  Call LogInstallerEvent
  nsExec::ExecToLog '"$PLUGINSDIR\\7z.exe" x -y "$PLUGINSDIR\\payload.7z" "-o$INSTDIR"'
  Pop $0
  Push "payload extraction exit=$0"
  Call LogInstallerEvent
  \${If} $0 != "0"
    DetailPrint "7z extraction failed with exit code $0"
    Abort
  \${EndIf}

  WriteUninstaller "$INSTDIR\\${uninstallerName}"
  CreateShortCut "$DESKTOP\\${shortcutName}" "$INSTDIR\\${exeName}" "" "$INSTDIR\\${exeName}" 0
  CreateShortCut "$SMPROGRAMS\\${shortcutName}" "$INSTDIR\\${exeName}" "" "$INSTDIR\\${exeName}" 0
  WriteRegStr HKCU "${registryKey}" "DisplayName" "${productName} \${APP_VERSION}"
  WriteRegStr HKCU "${registryKey}" "DisplayVersion" "\${APP_VERSION}"
  WriteRegStr HKCU "${registryKey}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${registryKey}" "UninstallString" '"$INSTDIR\\${uninstallerName}" /currentuser'
  WriteRegStr HKCU "${registryKey}" "QuietUninstallString" '"$INSTDIR\\${uninstallerName}" /currentuser /S'
  WriteRegStr HKCU "${registryKey}" "DisplayIcon" "$INSTDIR\\${exeName},0"
  WriteRegStr HKCU "${appPathsKey}" "" "$INSTDIR\\${exeName}"
  Push "install section done"
  Call LogInstallerEvent
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  Push "uninstall section start"
  Call un.LogInstallerEvent
  Delete "$DESKTOP\\${shortcutName}"
  Delete "$SMPROGRAMS\\${shortcutName}"
  DeleteRegKey HKCU "${registryKey}"
  DeleteRegKey HKCU "${appPathsKey}"
  Delete "$INSTDIR\\${uninstallerName}"
  RMDir /r "$INSTDIR"
  Push "uninstall section done"
  Call un.LogInstallerEvent
SectionEnd
`,
    "utf8",
  );
}

export async function buildCustomWinNsisInstaller(
  config: ToolPackConfig,
  paths: WinPaths,
  builtApp: WinBuiltAppManifest,
): Promise<void> {
  if (process.platform !== "win32") throw new Error("Windows installer build must run on Windows");
  const makensisCommand = await resolveMakensisCommand(config);
  const packagedVersion = await readPackagedVersion(config);

  await mkdir(dirname(paths.installerPayloadPath), { recursive: true });
  await mkdir(dirname(paths.setupPath), { recursive: true });
  await rm(paths.installerPayloadPath, { force: true });
  await rm(paths.setupPath, { force: true });
  await execFileAsync(winResources.sevenZipExe, ["a", "-t7z", "-mx=1", "-ms=off", paths.installerPayloadPath, ".\\*"], {
    cwd: builtApp.unpackedRoot,
    windowsHide: true,
  });
  await stat(paths.installerPayloadPath);
  await writeInstallerScript(config, paths);
  await execFileAsync(makensisCommand, [
    "/V2",
    `/DAPP_VERSION=${packagedVersion}`,
    `/DOUTPUT_EXE=${paths.setupPath}`,
    `/DPAYLOAD_7Z=${paths.installerPayloadPath}`,
    `/DSEVEN_Z_EXE=${winResources.sevenZipExe}`,
    `/DSEVEN_Z_DLL=${winResources.sevenZipDll}`,
    `/DAPP_ICON=${paths.winIconPath}`,
    paths.installerScriptPath,
  ], {
    cwd: dirname(paths.installerScriptPath),
    windowsHide: true,
  });
  await stat(paths.setupPath);
}
