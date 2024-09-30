import { exec as exec_original } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const exec = promisify(exec_original);

export function launchHLAE(HLAEPath: string, CSPath: string, port: number) {
    const HLAEExecutablePath = path.join(HLAEPath, "HLAE.exe");
    const HLAESource2HookPath = path.join(HLAEPath, "x64/AfxHookSource2.dll")
    const CS2ExecutablePath = path.join(CSPath, "bin/win64/cs2.exe");

    const HLAEArgs = [
        `"${HLAEExecutablePath}"`,
        "-customLoader",
        "-noGui",
        "-autoStart",
        "-hookDllPath",
        `"${HLAESource2HookPath}"`,
        "-programPath",
        `"${CS2ExecutablePath}"`,
        "-cmdLine",
        `"-steam -insecure +sv_lan 1 -window -console -game csgo -tools -netconport ${port} -noassetbrowser"`];

    // Must run in a shell via exec. Errors when using execFile
    return exec(HLAEArgs.join(" "));
}