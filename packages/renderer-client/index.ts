import { HLAE } from "./hlae/HLAE";
import { parseConfig } from "./utils/parseConfig";

const CONFIG_FILE_PATH = "./config.json";
const config = await parseConfig(CONFIG_FILE_PATH);
const hlae = new HLAE(config.HLAE_path, config.CS_path);

hlae.launch()
    .then(() => {
        console.log("CS2 Closed without error");
    })
    .catch((err) => {
        console.error("CS2 Close with error: ", err);
    });

console.log("launching");


Bun.serve({
    fetch(req, server) {
        // upgrade the request to a WebSocket
        if (server.upgrade(req)) {
            return; // do not return a Response
        }
        return new Response("Upgrade failed", { status: 500 });
    },
    websocket: {
        message(ws, message) {}, // a message is received
        open(ws) {
            console.log("Opened");
        }, // a socket is opened
        close(ws, code, message) {
            console.log("Closed");
        }, // a socket is closed
        drain(ws) {}, // the socket is ready to receive more data
    },
    port: 2222
});
