import { Connection } from "rabbitmq-client";
import { HLAE } from "./hlae/HLAE";
import { parseConfig } from "./utils/parseConfig";
import { uploadFile, uploadFileToStreamable } from "./utils/uploadFile";
import { checkIfValveURL } from "./utils/checkIfValveURL";

const CONFIG_FILE_PATH = "./config.json";
const config = await parseConfig(CONFIG_FILE_PATH);
const hlae = new HLAE(config.HLAE_path, config.CS_path, config.clip_path);

console.log("Closing old CS2 instance if it exists...");
await hlae.exitCS2();
await Bun.sleep(2000);

// console.log("Launching CS2 with HLAE...");
// await hlae.launch({ width: 1920, height: 1080 });
// console.log("CS2 Launched");

const rabbit = new Connection(config.RABBITMQ_URL);
rabbit.on("error", (err) => {
    console.log(`[RabbitMQ] Error: ${err}`);
});
rabbit.on("connection", () => {
    console.log("[RabbitMQ] Connection successfully established");
});

let autoShutdown: Timer;
const pub = rabbit.createPublisher({
    // Enable publish confirmations, similar to consumer acknowledgements
    confirm: true,
    // Enable retries
    maxAttempts: 2,
});
const sub = rabbit.createConsumer({
    queue: "demos",
    queueOptions: { durable: true, arguments: { "x-queue-type": "quorum", "x-delivery-limit": 5 } },
    qos: { prefetchCount: 1 },
    requeue: true,
}, async (msg) => {
    try {
        clearTimeout(autoShutdown);

        const demo = JSON.parse(msg.body) as Demo;
        if (!checkIfValveURL(demo.url)) {
            throw new Error(`The following is not a valid Valve demo url: ${demo.url}`);
        }

        if (!hlae.checkIfConnected()) {
            console.log("CS2 not yet launched. Launching...");
            await hlae.launch(config.DEMO_CLIP_RESOLUTION);
            console.log("CS2 Launched");
        }

        // Give the demo a custom ID, matching the download URL from Valve of the match
        demo.id = "to_clip" + demo.url.substring(demo.url.lastIndexOf('/') + 1, demo.url.length - 8);

        await hlae.downloadDemoIfDoesNotExist(demo);
        console.log("Generating clip...");
        const clip = await hlae.generateClip(demo);
        console.log("Uploading file...");
        // await uploadFile(demo.webhook, clip.recordingFile);
        const url = await uploadFileToStreamable(`${demo.metadata.username}'s Clip`, clip.recordingFile);
        await pub.send("clips", JSON.stringify({
            url: url,
            metadata: demo.metadata
        } as Clip));
        console.log("File sent! Deleting old demo...");
        hlae.deleteOldestDemos(config.DEMO_CACHE_LIMIT)
            .then((numberDeleted) => {
                console.log(`Deleted ${numberDeleted} demo(s).`);
            })
            .catch((err) => {
                console.error(`Demo deletion error: ${err}`);
            });
    } catch (err) {
        throw err;
    } finally {
        autoShutdown = setTimeout(() => {
            console.log("No new clip request in last 5 minutes. Going to shutdown.");
            shutdown();
        }, 300_000); // Auto-restart in 5 minutes. Process will be restarted, but CS2 will remain closed until new clip request.
    }
});

sub.on("error", (err) => {
    console.error(`[RabbitMQ] Sub error: ${err}`);
});

async function shutdown() {
    console.log("Shutting down...");
    await hlae.exitCS2();
    process.exit(0);
}

process.addListener("SIGINT", shutdown);
process.addListener("SIGTERM", shutdown);