import { exec } from "node:child_process";
import path from "node:path";

export class HLAE {
    hlaeExecutablePath: string;
    hlaeSource2HookPath: string;
    cs2ExecutablePath: string;
    cs2ConfigPath: string;

    constructor(hlaePath: string, cs2Path: string) {
        this.hlaeExecutablePath = path.join(hlaePath, "HLAE.exe");
        this.hlaeSource2HookPath = path.join(hlaePath, "x64/AfxHookSource2.dll");
        this.cs2ExecutablePath = path.join(cs2Path, "bin/win64/cs2.exe");
        this.cs2ConfigPath = path.join(cs2Path, "csgo/cfg/cs2_clipper.cfg");
    }

    private writeMirvScript(): Promise<void> {
        return new Promise(async (res, rej) => {
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
            `"-steam -insecure +sv_lan 1 -window -console -game csgo -novid -exec cs2_clipper.cfg"`
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