import { ChildProcess, exec } from "node:child_process";
import path from "node:path";
import { WebSocket, WebSocketServer } from "ws";

// @ts-ignore: Imports the file for building a single file exectuable with Bun
import mirvBridge from "./mirv-scripts/build/mirvBridge.mjs" with { type: "file" };
import { downloadBZip2 } from "../../shared/utils/BZip2Downloader";
import { FFMpeg } from "./FFMpeg";
import { exists, readdir, stat } from "node:fs/promises";
import { rimraf } from "rimraf";
import { fstat, unlink } from "node:fs";

export class HLAE {
    hlaeExecutablePath: string;
    hlaeSource2HookPath: string;
    cs2ExecutablePath: string;
    cs2ConfigPath: string;
    cs2MirvBridgePath: string;
    cs2DemoPath: string;
    cs2ClipPath: string;

    private CS2ChildProcess: ChildProcess | null = null;
    private CS2WebSocket: WebSocket | null = null;
    private ffmpeg: FFMpeg;

    constructor(hlaePath: string, cs2Path: string, clipPath: string) {
        this.hlaeExecutablePath = path.join(hlaePath, "HLAE.exe");
        this.hlaeSource2HookPath = path.join(hlaePath, "x64/AfxHookSource2.dll");
        this.cs2ExecutablePath = path.join(cs2Path, "bin/win64/cs2.exe");
        this.cs2ConfigPath = path.join(cs2Path, "csgo/cfg/cs2_clipper.cfg");
        this.cs2MirvBridgePath = path.join(cs2Path, "csgo/cfg/mirvBridge.mjs"); // Currently just using the cfg folder to host the script as well
        this.cs2DemoPath = path.join(cs2Path, "csgo");
        this.ffmpeg = new FFMpeg(path.join(hlaePath, "ffmpeg/bin/ffmpeg.exe"));
        this.cs2ClipPath = clipPath;
    }

    private writeMirvScript(): Promise<void> {
        return new Promise(async (res) => {
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

    async launch(resolution: { width: number, height: number }): Promise<void> {
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
            `"-steam -insecure +sv_lan 1 -window -console -game csgo -novid -w ${resolution.width} -h ${resolution.height} +exec cs2_clipper.cfg"`
        ];

        await this.writeMirvScript();

        const wss = new WebSocketServer({ host: "127.0.0.1", port: 2222 });
        
        return new Promise<void>((res, rej) => {
            let isConnected = false;

            wss.on("connection", (ws) => {
                console.log("Websocket connected");
                this.CS2WebSocket = ws;
    
                ws.on("error", async (err) => {
                    console.error(`Websocket error code: ${err}`);

                    isConnected = false;
                    console.log("Waiting 3 seconds before force-closing...");
                    await Bun.sleep(3000);

                    if (!isConnected) {
                        await this.exitCS2();
                        process.exit(1);
                    }
                });

                ws.on("close", async (err) => {
                    console.error(`Websocket close code: ${err}`);
                    isConnected = false;
                    console.log("Waiting 3 seconds before force-closing...");
                    await Bun.sleep(3000);

                    if (!isConnected) {
                        await this.exitCS2();
                        process.exit(1);
                    }
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

            this.CS2ChildProcess = exec(hlaeLaunchArgs.join(' '));

            setTimeout(() => {
                if (!isConnected) {
                    rej();
                }
            }, 60_000); // Timeout if game isn't launched and ready within 60 seconds
        });
    }

    exitCS2(): Promise<void> {
        return new Promise((res) => {
            this.CS2WebSocket?.removeAllListeners("error");
            this.CS2WebSocket?.removeAllListeners("close");

            exec(`taskkill /im cs2.exe /f /t`, () => {
                res();
            });
        });
    }

    async downloadDemoIfDoesNotExist(demo: Demo) {
        if (!(await this.demoExists(demo))) {
            console.log("Demo not already downloaded.");
            return this.downloadDemo(demo);
        } else {
            console.log("Demo already downloaded.");
        }
    }

    async demoExists(demo: Demo) {
        return exists(path.join(this.cs2DemoPath, demo.id + ".dem"));
    }

    async downloadDemo(demo: Demo) {
        console.log(`Downloading demo with ID ${demo.id}`);
        await downloadBZip2(demo.url, path.join(this.cs2DemoPath, demo.id + ".dem"));
        console.log(`Download done for demo ${demo.id}`);
    }

    async deleteDemo(demo: Demo) {
        console.log(`Deleting demo with ID ${demo.id}`);
        await this.deleteFile(path.join(this.cs2DemoPath, demo.id + ".dem"));
    }

    /**
     * Delete the oldest demos, with the option to keep `numberToKeep` most recent demos.
     * 
     * @param numberToKeep How many of the most recent demo's to keep downloaded
     */
    async deleteOldestDemos(numberToKeep: number = 0) {

        const demoFiles = (await readdir(this.cs2DemoPath, { withFileTypes: true }))
            .filter(ent => ent.isFile() && ent.name.endsWith(".dem"))
            .map(async (file) => {
                const filePath = path.join(file.parentPath, file.name);
                const fileStat = await stat(filePath);

                return { filePath, creationTime: fileStat.mtimeMs };
            });
        const demoFilesWithTimes = await Promise.all(demoFiles);

        const endIndex = numberToKeep <= 0 ? demoFilesWithTimes.length : -numberToKeep;
        const deletions = demoFilesWithTimes
            .toSorted((a, b) => a.creationTime - b.creationTime) // Sort by ascending order of timestamp (oldest to newest)
            .slice(0, endIndex)
            .map((file) => {
                return this.deleteFile(file.filePath);
            });
        return (await Promise.all(deletions)).length;
    }

    private deleteFile(filePath: string) {
        return new Promise<void>((res) => {
            unlink(filePath, () => {
                res();
            });
        });
    }

    generateClip(demo: Demo): Promise<{ recordingFile: string, demo: Demo }> {
        return new Promise(async (res, rej) => {
            this.checkIfConnected();
            
            if (!(await this.demoExists(demo))) {
                return rej("Demo file not found.");
            }

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

                if (message.event === "recordClipResponseError") {
                    console.error(`Error clipping: ${message.data}`);
                    return rej();
                }

                await Bun.sleep(2000); // Wait 2 seconds before stitching clips for final data to be written

                console.log("Clips done. Processing clips...");
                const clipFolders = (await readdir(this.cs2ClipPath, { withFileTypes: true })).filter(ent => ent.isDirectory).slice(0, demo.clipIntervals.length).map(dir => path.join(dir.parentPath, dir.name));
                const videoClips = clipFolders.map(folder => path.join(folder, "video_with_audio.mp4"));
                await this.ffmpeg.addAudioToVideos(
                    clipFolders.map(folder => path.join(folder, "video.mp4")),
                    clipFolders.map(folder => path.join(folder, "audio.wav")),
                    videoClips
                );
                const outputFile = await this.ffmpeg.concatVideos(videoClips, this.cs2ClipPath);
                console.log("Done processing clips");

                return res({
                    recordingFile: outputFile,
                    demo: demo
                });
            })
        });
    }
}