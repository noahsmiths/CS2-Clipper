import { ChildProcess, exec } from "node:child_process";
import path from "node:path";
import { WebSocket, WebSocketServer } from "ws";

// @ts-ignore: Imports the file for building a single file exectuable with Bun
import mirvBridge from "./mirv-scripts/build/mirvBridge.mjs" with { type: "file" };
import { downloadBZip2 } from "../../shared/utils/BZip2Downloader";

export class HLAE {
    hlaeExecutablePath: string;
    hlaeSource2HookPath: string;
    cs2ExecutablePath: string;
    cs2ConfigPath: string;
    cs2MirvBridgePath: string;
    cs2DemoPath: string;
    cs2ClipPath: string = "C:\\cs2_clips";

    private CS2ChildProcess: ChildProcess | null = null;
    private CS2WebSocket: WebSocket | null = null;

    constructor(hlaePath: string, cs2Path: string) {
        this.hlaeExecutablePath = path.join(hlaePath, "HLAE.exe");
        this.hlaeSource2HookPath = path.join(hlaePath, "x64/AfxHookSource2.dll");
        this.cs2ExecutablePath = path.join(cs2Path, "bin/win64/cs2.exe");
        this.cs2ConfigPath = path.join(cs2Path, "csgo/cfg/cs2_clipper.cfg");
        this.cs2MirvBridgePath = path.join(cs2Path, "csgo/cfg/mirvBridge.mjs"); // Currently just using the cfg folder to host the script as well
        this.cs2DemoPath = path.join(cs2Path, "csgo");
    }

    private writeMirvScript(): Promise<void> {
        return new Promise(async (res, rej) => {
            const mirvBridgeFile = Bun.file(mirvBridge);

            await Bun.write(this.cs2MirvBridgePath, mirvBridgeFile);
            await Bun.write(this.cs2ConfigPath, `mirv_script_load "${this.cs2MirvBridgePath}"`);
            res();
        });
    }

    private checkIfConnected(): void {
        if (!this.CS2WebSocket) {
            throw new Error("Game not connected. Must call the launch() method first.");
        }
    }

    async launch(): Promise<void> {
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

        await this.writeMirvScript();

        const wss = new WebSocketServer({ port: 2222 });
        
        return new Promise<void>((res, rej) => {
            let isConnected = false;

            wss.on("connection", (ws) => {
                this.CS2WebSocket = ws;
    
                ws.on("error", (err) => {
                    console.error(err);
                    console.log("Exiting due to websocket error...");
    
                    this.exitCS2();
                    process.exit(1);
                });

                ws.once("message", (data) => {
                    if (data.toString() === "activated") {
                        isConnected = true;
                        res();
                    } else {
                        rej();
                    }
                });
            });

            this.CS2ChildProcess = exec(hlaeLaunchArgs.join(' '), () => {
                console.log("CS2 Closed");
            });

            setTimeout(() => {
                if (!isConnected) {
                    rej();
                }
            }, 60_000); // Timeout if game isn't launched and ready within 60 seconds
        });
    }

    exitCS2(): boolean {
        return this.CS2ChildProcess?.kill() || false;
    }

    generateClip(demo: Demo): Promise<{ recordingFile: string, demo: Demo }> {
        this.checkIfConnected();

        return new Promise(async (res, rej) => {
            console.log("downloading");
            // await downloadBZip2(demo.url, path.join(this.cs2DemoPath, demo.id + ".dem"));
            console.log("Download done. sending ws message");

            this.CS2WebSocket?.send(JSON.stringify({
                event: "recordClipRequest",
                data: {
                    demo: demo,
                    outputPath: this.cs2ClipPath,
                }
            }));

            this.CS2WebSocket?.once("message", (rawMessage) => {
                const message = JSON.parse(rawMessage.toString()) as MirvMessage;

                if (message.event === "recordClipResponse") {
                    if (message.data) {
                        console.log("Clipped successfully!");
                        res({recordingFile: "", demo});
                    } else {
                        console.log("Error clipping");
                        rej();
                    }
                }
            })
        });
    }
}