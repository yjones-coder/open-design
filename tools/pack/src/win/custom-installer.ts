import { execFile } from "node:child_process";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

import type { ToolPackConfig } from "../config.js";
import { winResources } from "../resources.js";
import { PRODUCT_NAME } from "./constants.js";
import { pathExists } from "./fs.js";
import { resolveWinInstallIdentity } from "./identity.js";
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
  const identity = resolveWinInstallIdentity(config);
  const productName = escapeNsisString(identity.displayName);
  const exeName = escapeNsisString(identity.exeName);
  const uninstallerName = escapeNsisString(identity.uninstallerName);
  const shortcutName = escapeNsisString(identity.shortcutName);
  const registryKey = escapeNsisString(identity.registryKey);
  const appPathsKey = escapeNsisString(identity.appPathsKey);
  const namespace = escapeNsisString(config.namespace);
  const localDataRoot = escapeNsisString(`$APPDATA\\${PRODUCT_NAME}\\namespaces\\${sanitizeNamespace(config.namespace)}`);
  const nsisLogPath = escapeNsisString(paths.nsisLogPath);

  await mkdir(dirname(paths.installerScriptPath), { recursive: true });
  const script = `Unicode true
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
!include "nsDialogs.nsh"

Name "${productName}"
OutFile "\${OUTPUT_EXE}"
InstallDir "$LOCALAPPDATA\\Programs\\${productName}"
InstallDirRegKey HKCU "${registryKey}" "InstallLocation"
Icon "\${APP_ICON}"
UninstallIcon "\${APP_ICON}"
ShowInstDetails show
ShowUninstDetails hide

!define MUI_ABORTWARNING
!define MUI_ICON "\${APP_ICON}"
!define MUI_UNICON "\${APP_ICON}"
!insertmacro MUI_PAGE_WELCOME
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE DirectoryPageLeave
!insertmacro MUI_PAGE_DIRECTORY
!undef MUI_PAGE_CUSTOMFUNCTION_LEAVE
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\\${exeName}"
!define MUI_FINISHPAGE_RUN_TEXT "$(LaunchApp)"
!define MUI_FINISHPAGE_SHOWREADME
!define MUI_FINISHPAGE_SHOWREADME_TEXT "$(CreateDesktopShortcut)"
!define MUI_FINISHPAGE_SHOWREADME_FUNCTION CreateDesktopShortcut
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
UninstPage custom un.UninstallOptionsPage un.UninstallOptionsPageLeave
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "SimpChinese"

LangString CreateDesktopShortcut \${LANG_ENGLISH} "Create desktop shortcut"
LangString CreateDesktopShortcut \${LANG_SIMPCHINESE} "创建桌面快捷方式"
LangString LaunchApp \${LANG_ENGLISH} "Launch ${productName}"
LangString LaunchApp \${LANG_SIMPCHINESE} "启动 ${productName}"
LangString RemoveDesktopShortcut \${LANG_ENGLISH} "Remove desktop shortcut"
LangString RemoveDesktopShortcut \${LANG_SIMPCHINESE} "删除桌面快捷方式"
LangString RemoveLocalData \${LANG_ENGLISH} "Delete local data for this installation"
LangString RemoveLocalData \${LANG_SIMPCHINESE} "删除此安装的本地数据"
LangString UninstallOptionsTitle \${LANG_ENGLISH} "Uninstall options"
LangString UninstallOptionsTitle \${LANG_SIMPCHINESE} "卸载选项"
LangString UninstallOptionsSubtitle \${LANG_ENGLISH} "Choose which local items to remove."
LangString UninstallOptionsSubtitle \${LANG_SIMPCHINESE} "选择要删除的本地项目。"
LangString RunningInstancesMessage \${LANG_ENGLISH} "${productName} is still running. Close all ${productName} windows and background processes, then choose Retry."
LangString RunningInstancesMessage \${LANG_SIMPCHINESE} "${productName} 仍在运行。请关闭所有 ${productName} 窗口和后台进程，然后选择重试。"
LangString RunningInstancesSilentAbort \${LANG_ENGLISH} "${productName} is still running. Close it before running the installer silently."
LangString RunningInstancesSilentAbort \${LANG_SIMPCHINESE} "${productName} 仍在运行。请先关闭它，再运行静默安装。"
LangString ExistingInstallMessage \${LANG_ENGLISH} "${productName} is already installed in the selected folder. Choose OK to overwrite it, or Cancel to stop installation."
LangString ExistingInstallMessage \${LANG_SIMPCHINESE} "所选文件夹中已经安装了 ${productName}。选择确定覆盖，或取消安装。"
LangString ExistingInstallSilentOverwrite \${LANG_ENGLISH} "Existing installation found; silent install will overwrite it."
LangString ExistingInstallSilentOverwrite \${LANG_SIMPCHINESE} "发现已有安装；静默安装将覆盖它。"

Var RemoveDesktopShortcutCheckbox
Var RemoveLocalDataCheckbox
Var RemoveDesktopShortcutState
Var RemoveLocalDataState
Var RunningInstancesOutput

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

Function un.onInit
  StrCpy $RemoveDesktopShortcutState "\${BST_CHECKED}"
  StrCpy $RemoveLocalDataState 0
FunctionEnd

Function DetectRunningInstances
  Push $0
  Push $1
  nsExec::ExecToStack 'powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$ns = ''${namespace}''; $flag = ''--od-stamp-namespace='' + $ns; $install = ''$INSTDIR''.ToLowerInvariant(); $matches = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and ( $_.CommandLine.Contains($flag) -or ( $install.Length -gt 0 -and $_.ExecutablePath -and $_.ExecutablePath.ToLowerInvariant().StartsWith($install) ) ) }; if ($matches) { ($matches | ForEach-Object { [string]$_.ProcessId + '' '' + $_.Name }) -join ''; '' }"'
  Pop $0
  Pop $1
  \${If} $0 == "0"
    StrCpy $RunningInstancesOutput $1
  \${Else}
    StrCpy $RunningInstancesOutput ""
    Push "running instance detection failed exit=$0 output=$1"
    Call LogInstallerEvent
  \${EndIf}
  Pop $1
  Pop $0
FunctionEnd

Function .onInit
  SetShellVarContext current

check_running:
  Call DetectRunningInstances
  \${If} $RunningInstancesOutput != ""
    IfSilent 0 interactive_running
      Push "install aborted: running instances detected: $RunningInstancesOutput"
      Call LogInstallerEvent
      Abort "$(RunningInstancesSilentAbort)"
interactive_running:
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(RunningInstancesMessage)$\\r$\\n$\\r$\\n$RunningInstancesOutput" IDRETRY check_running IDCANCEL cancel_install
  \${EndIf}

  IfFileExists "$INSTDIR\\${exeName}" existing_install no_existing_install
existing_install:
  IfSilent 0 no_existing_install
    Push "$(ExistingInstallSilentOverwrite)"
    Call LogInstallerEvent
    Goto no_existing_install

cancel_install:
  Push "install cancelled before file changes"
  Call LogInstallerEvent
  Abort

no_existing_install:
FunctionEnd

Function DirectoryPageLeave
  IfSilent done
  IfFileExists "$INSTDIR\\${exeName}" existing_install done
existing_install:
  MessageBox MB_OKCANCEL|MB_ICONQUESTION "$(ExistingInstallMessage)$\\r$\\n$\\r$\\n$INSTDIR" IDOK done IDCANCEL cancel_install
cancel_install:
  Push "install cancelled at existing install confirmation"
  Call LogInstallerEvent
  Abort
done:
FunctionEnd

Function CreateDesktopShortcut
  SetShellVarContext current
  CreateShortCut "$DESKTOP\\${shortcutName}" "$INSTDIR\\${exeName}" "" "$INSTDIR\\${exeName}" 0
FunctionEnd

Function RemoveInstallDir
  Push $0
  nsExec::ExecToLog 'powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "if (Test-Path -LiteralPath ''$INSTDIR'') { Remove-Item -LiteralPath ''$INSTDIR'' -Recurse -Force -ErrorAction SilentlyContinue }"'
  Pop $0
  Push "install dir remove exit=$0"
  Call LogInstallerEvent
  Pop $0
FunctionEnd

Function un.UninstallOptionsPage
  IfSilent done
  !insertmacro MUI_HEADER_TEXT "$(UninstallOptionsTitle)" "$(UninstallOptionsSubtitle)"
  nsDialogs::Create 1018
  Pop $0
  \${If} $0 == error
    Abort
  \${EndIf}

  \${NSD_CreateCheckbox} 0 0 100% 12u "$(RemoveDesktopShortcut)"
  Pop $RemoveDesktopShortcutCheckbox
  \${NSD_Check} $RemoveDesktopShortcutCheckbox

  \${NSD_CreateCheckbox} 0 18u 100% 12u "$(RemoveLocalData)"
  Pop $RemoveLocalDataCheckbox

  nsDialogs::Show
done:
FunctionEnd

Function un.UninstallOptionsPageLeave
  StrCpy $RemoveDesktopShortcutState "\${BST_CHECKED}"
  StrCpy $RemoveLocalDataState 0
  IfSilent done
  \${NSD_GetState} $RemoveDesktopShortcutCheckbox $RemoveDesktopShortcutState
  \${NSD_GetState} $RemoveLocalDataCheckbox $RemoveLocalDataState
done:
FunctionEnd

Function un.RemoveInstallDirContents
  Push $0
  nsExec::ExecToLog 'powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "if (Test-Path -LiteralPath ''$INSTDIR'') { Get-ChildItem -LiteralPath ''$INSTDIR'' -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue }"'
  Pop $0
  Push "install dir fast remove exit=$0"
  Call un.LogInstallerEvent
  Pop $0
FunctionEnd

Function un.RemoveLocalDataRoot
  Push $0
  nsExec::ExecToLog 'powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "if (Test-Path -LiteralPath ''${localDataRoot}'') { Remove-Item -LiteralPath ''${localDataRoot}'' -Recurse -Force -ErrorAction SilentlyContinue }"'
  Pop $0
  Push "local data remove exit=$0"
  Call un.LogInstallerEvent
  Pop $0
FunctionEnd

Section "Install"
  SetShellVarContext current
  Push "install section start"
  Call LogInstallerEvent

  IfFileExists "$INSTDIR\\${exeName}" 0 prepare_install_dir
  Call RemoveInstallDir

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
  IfSilent 0 skip_silent_desktop_shortcut
  CreateShortCut "$DESKTOP\\${shortcutName}" "$INSTDIR\\${exeName}" "" "$INSTDIR\\${exeName}" 0
skip_silent_desktop_shortcut:
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
  \${If} $RemoveDesktopShortcutState == \${BST_CHECKED}
    Delete "$DESKTOP\\${shortcutName}"
  \${EndIf}
  Delete "$SMPROGRAMS\\${shortcutName}"
  DeleteRegKey HKCU "${registryKey}"
  DeleteRegKey HKCU "${appPathsKey}"
  \${If} $RemoveLocalDataState == \${BST_CHECKED}
    Call un.RemoveLocalDataRoot
  \${EndIf}
  Call un.RemoveInstallDirContents
  Delete "$INSTDIR\\${uninstallerName}"
  RMDir "$INSTDIR"
  Push "uninstall section done"
  Call un.LogInstallerEvent
SectionEnd
`;
  await writeFile(paths.installerScriptPath, `\uFEFF${script}`, "utf8");
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
