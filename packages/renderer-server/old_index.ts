import 'dotenv/config';
import { MatchFetcher } from "./matches/MatchFetcher";
import { downloadBZip2 } from 'shared/utils/BZip2Downloader';
import { parseEvent } from '@laihoe/demoparser2';

const matchFetcher = await MatchFetcher.createMatchFetcher();

// const matchURL = await matchFetcher.getDemoURLFromMatchId("CSGO-xbmhJ-U5CFA-5TC8N-KnQLo-AYEyB");
// console.log(matchURL);
// console.log("downloading");
// await downloadBZip2(matchURL, "./demo.dem");
// console.log("Done");

const deaths = parseEvent("./demo.dem", "player_death", [], ["is_warmup_period"]).filter((event: any) => !event.is_warmup_period);
// console.log(deaths[0]);
console.log(deaths);

// const connects = parseEvent("./demo.dem", "player_info");
// console.log(connects);

// let prevDeath = Infinity;
// const clipTimes = [];
// for (let death of deaths) {
//     clipTimes.push({
//         "start": death.tick - 64,
//         "end": death.tick + 64,
//         "playerName": "p0pul4r_VL0NER",
//     })
// };

// console.log(clipTimes);
