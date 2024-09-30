import { exec as exec_original } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const exec = promisify(exec_original);

export function launchHLAE({ HLAE_path, CS_path }: { HLAE_path: string, CS_path: string }) {
    const HLAEExecutablePath = path.join(HLAE_path, "HLAE.exe");
    const HLAESource2HookPath = path.join(HLAE_path, "x64/AfxHookSource2.dll")
    const CS2ExecutablePath = path.join(CS_path, "bin/win64/cs2.exe");

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
        `"-steam -insecure +sv_lan 1 -window -console -game csgo -tools -netconport 2222 -noassetbrowser"`];

    // Must run in a shell. Errors when using execFile
    return exec(HLAEArgs.join(" "));
}