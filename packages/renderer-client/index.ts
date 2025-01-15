import { Connection } from "rabbitmq-client";
import { HLAE } from "./hlae/HLAE";
import { parseConfig } from "./utils/parseConfig";
import { uploadFile } from "./utils/uploadFile";

const CONFIG_FILE_PATH = "./config.json";
const config = await parseConfig(CONFIG_FILE_PATH);
const hlae = new HLAE(config.HLAE_path, config.CS_path, config.clip_path);

console.log("Closing old CS2 instance if it exists...");
await hlae.exitCS2();
await Bun.sleep(2000);

console.log("Launching CS2 with HLAE...");
await hlae.launch({ width: 1920, height: 1080 });
console.log("CS2 Launched");

const rabbit = new Connection(config.RABBITMQ_URL);
rabbit.on("error", (err) => {
    console.log(`[RabbitMQ] Error: ${err}`);
});
rabbit.on("connection", () => {
    console.log("[RabbitMQ] Connection successfully established");
});

const sub = rabbit.createConsumer({
    queue: "demos",
    queueOptions: { durable: true, arguments: { "x-queue-type": "quorum", "x-delivery-limit": 5 } },
    qos: { prefetchCount: 1 },
    requeue: true,
}, async (msg) => {
    const demo = msg.body as Demo;

    await hlae.downloadDemo(demo);
    console.log("Generating clip...");
    const clip = await hlae.generateClip(demo);
    console.log("Uploading file...");
    await uploadFile(demo.webhook, clip.recordingFile);
    console.log("File sent! Deleting old demo...");
    hlae.deleteDemo(demo)
        .then(() => {
            console.log(`Demo ID ${demo.id} deleted`);
        })
        .catch((err) => {
            console.error(`Deletion error for Demo ID ${demo.id}: ${err}`);
        });
});

sub.on("error", (err) => {
    console.error(`[RabbitMQ] Sub error: ${err}`);
})

async function shutdown() {
    console.log("Shutting down...");
    await hlae.exitCS2();
    process.exit(0);
}

process.addListener("SIGINT", shutdown);
process.addListener("SIGTERM", shutdown);