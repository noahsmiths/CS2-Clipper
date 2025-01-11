import { ChildProcess, exec } from "node:child_process";
import path from "node:path";
import { WebSocket, WebSocketServer } from "ws";

// @ts-ignore: Imports the file for building a single file exectuable with Bun
import mirvBridge from "./mirv-scripts/build/mirvBridge.mjs" with { type: "file" };
import { downloadBZip2 } from "../../shared/utils/BZip2Downloader";
import { FFMpeg } from "./FFMpeg";
import { readdir } from "node:fs/promises";
import { rimraf } from "rimraf";

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
    private ffmpeg: FFMpeg;

    constructor(hlaePath: string, cs2Path: string) {
        this.hlaeExecutablePath = path.join(hlaePath, "HLAE.exe");
        this.hlaeSource2HookPath = path.join(hlaePath, "x64/AfxHookSource2.dll");
        this.cs2ExecutablePath = path.join(cs2Path, "bin/win64/cs2.exe");
        this.cs2ConfigPath = path.join(cs2Path, "csgo/cfg/cs2_clipper.cfg");
        this.cs2MirvBridgePath = path.join(cs2Path, "csgo/cfg/mirvBridge.mjs"); // Currently just using the cfg folder to host the script as well
        this.cs2DemoPath = path.join(cs2Path, "csgo");
        this.ffmpeg = new FFMpeg(path.join(hlaePath, "ffmpeg/bin/ffmpeg.exe"));
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

    exitCS2(): Promise<void> {
        // return this.CS2ChildProcess?.kill() || false;
        return new Promise((res, rej) => {
            if (this.CS2ChildProcess === null) {
                return res();
            }

            exec(`taskkill /im cs2.exe /f /t`, (err) => {
                if (err) {
                    rej(err);
                } else {
                    res();
                }
            })
        });
    }

    generateClip(demo: Demo): Promise<{ recordingFile: string, demo: Demo }> {
        this.checkIfConnected();

        return new Promise(async (res, rej) => {
            console.log("downloading");
            // await downloadBZip2(demo.url, path.join(this.cs2DemoPath, demo.id + ".dem"));
            console.log("Download done. sending ws message");

            await rimraf(this.cs2ClipPath, {preserveRoot: true}); // Clear the clip directory

            this.CS2WebSocket?.send(JSON.stringify({
                event: "recordClipRequest",
                data: {
                    demo: demo,
                    outputPath: this.cs2ClipPath,
                }
            }));

            this.CS2WebSocket?.once("message", async (rawMessage) => {
                const message = JSON.parse(rawMessage.toString()) as MirvMessage;

                if (message.event === "recordClipResponse" && !message.data) {
                    console.log("Error clipping");
                    return rej();
                }

                const clipFolders = (await readdir(this.cs2ClipPath, { withFileTypes: true })).filter(ent => ent.isDirectory).slice(0, demo.clipIntervals.length).map(dir => path.join(dir.parentPath, dir.name));
                const videoClips = clipFolders.map(folder => path.join(folder, "video_with_audio.mp4"));
                await this.ffmpeg.addAudioToVideos(
                    clipFolders.map(folder => path.join(folder, "video.mp4")),
                    clipFolders.map(folder => path.join(folder, "audio.wav")),
                    videoClips
                );
                const outputFile = await this.ffmpeg.concatVideos(videoClips, this.cs2ClipPath);

                return res({
                    recordingFile: outputFile,
                    demo: demo
                });
            })
        });
    }
}