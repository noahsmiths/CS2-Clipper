import mirvBridge from "./mirv-scripts/build/mirvBridge.mjs" with { type: "file" };
import { exec } from "node:child_process";
import path from "node:path";

export class HLAE {
    hlaeExecutablePath: string;
    hlaeSource2HookPath: string;
    cs2ExecutablePath: string;
    cs2ConfigPath: string;
    cs2MirvBridgePath: string;

    constructor(hlaePath: string, cs2Path: string) {
        this.hlaeExecutablePath = path.join(hlaePath, "HLAE.exe");
        this.hlaeSource2HookPath = path.join(hlaePath, "x64/AfxHookSource2.dll");
        this.cs2ExecutablePath = path.join(cs2Path, "bin/win64/cs2.exe");
        this.cs2ConfigPath = path.join(cs2Path, "csgo/cfg/cs2_clipper.cfg");
        this.cs2MirvBridgePath = path.join(cs2Path, "csgo/cfg/mirvBridge.mjs"); // Currently just using the cfg folder to host the script as well
    }

    private writeMirvScript(): Promise<void> {
        return new Promise(async (res, rej) => {
            const mirvBridgeFile = Bun.file(mirvBridge);

            await Bun.write(this.cs2MirvBridgePath, mirvBridgeFile);
            await Bun.write(this.cs2ConfigPath, `mirv_script_load "${this.cs2MirvBridgePath}"`);
            res();
        });
    }

    launch(): Promise<void> {
        const hlaeLaunchArgs = [
            `"${this.hlaeExecutablePath}"`,
            "-customLoader",
            "-noGui",
            "-autoStart",
            "-hookDllPath",
            `"${this.hlaeSource2HookPath}"`,
            "-programPath",
            `"${this.cs2ExecutablePath}"`,
            "-cmdLine",
            `"-steam -insecure +sv_lan 1 -window -console -game csgo -novid +exec cs2_clipper.cfg"`
        ];

        return new Promise(async (res, rej) => {
            await this.writeMirvScript();

            exec(hlaeLaunchArgs.join(' '), (err) => {
                if (err !== null) {
                    rej(err);
                    return;
                }

                return res();
            })
        });
    }
}