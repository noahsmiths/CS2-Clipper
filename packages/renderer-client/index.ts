import { HLAE } from "./hlae/HLAE";
import { parseConfig } from "./utils/parseConfig";

const CONFIG_FILE_PATH = "./config.json";
const config = await parseConfig(CONFIG_FILE_PATH);
const hlae = new HLAE(config.HLAE_path, config.CS_path);

hlae.launch()
    .then(() => {
        console.log("CS2 Launched without error");
        hlae.generateClip({
            id: "test-demo",
            url: "http://replay129.valve.net/730/003727610429107601608_0736207833.dem.bz2",
            clipIntervals: [
                { start: 8127, end: 8255, playerName: 'p0pul4r_VL0NER' },
                { start: 17505, end: 17633, playerName: 'p0pul4r_VL0NER' },
                { start: 19956, end: 20084, playerName: 'p0pul4r_VL0NER' },
                { start: 23215, end: 23343, playerName: 'p0pul4r_VL0NER' },
                { start: 35666, end: 35794, playerName: 'p0pul4r_VL0NER' },
                { start: 36140, end: 36268, playerName: 'p0pul4r_VL0NER' },
                { start: 52971, end: 53099, playerName: 'p0pul4r_VL0NER' },
                { start: 57824, end: 57952, playerName: 'p0pul4r_VL0NER' },
                { start: 62724, end: 62852, playerName: 'p0pul4r_VL0NER' },
                { start: 66542, end: 66670, playerName: 'p0pul4r_VL0NER' },
                { start: 93286, end: 93414, playerName: 'p0pul4r_VL0NER' },
                { start: 121823, end: 121951, playerName: 'p0pul4r_VL0NER' },
                { start: 141079, end: 141207, playerName: 'p0pul4r_VL0NER' },
                // { start: 141153, end: 141281, playerName: '' }
            ],
            fps: 30
        });
    })
    .catch((err) => {
        console.error("CS2 launch error: ", err);
    });

console.log("launching");
