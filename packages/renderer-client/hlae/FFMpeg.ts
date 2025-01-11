import path from "node:path";
import { writeFile } from "node:fs/promises";
import { exec } from "node:child_process";

export class FFMpeg {
    constructor(
        private ffmpegPath: string
    ) {}

    async addAudioToVideos(videoFileList: string[], audioFileList: string[], outputFileList: string[]) {
        // Could be made concurrent thru Promise.all()?
        for (let i = 0; i < videoFileList.length; i++) {
            await this.execFFMpegWithArgs(`-i ${videoFileList[i]} -i ${audioFileList[i]} -c:v copy -c:a aac -strict experimental ${outputFileList[i]}`);
        }
    }

    async concatVideos(videoFileList: string[], outputDirectory: string) {
        const listFile = path.join(outputDirectory, "list.txt");
        await writeFile(listFile, videoFileList.map(videoFile => `file '${videoFile}'`).join("\n"));

        const outputFile = path.join(outputDirectory, "output.mp4");
        await this.execFFMpegWithArgs(`-safe 0 -f concat -i ${listFile} -c copy ${outputFile}`);

        return outputFile;
    }

    private execFFMpegWithArgs(...args: string[]): Promise<void> {
        return new Promise((res, rej) => {
            exec([`"${this.ffmpegPath}"`, ...args].join(' '), (err) => {
                if (err) {
                    rej(err);
                } else {
                    res();
                }
            })
        });
    }
}