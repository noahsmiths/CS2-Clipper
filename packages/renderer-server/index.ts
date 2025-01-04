import 'dotenv/config';
import { MatchFetcher } from "./matches/MatchFetcher";
import { downloadBZip2 } from 'shared/utils/BZip2Downloader';
import { parseEvent } from '@laihoe/demoparser2';

const matchFetcher = await MatchFetcher.createMatchFetcher();

// const matchURL = await matchFetcher.getDemoURLFromMatchId("CSGO-Q3dUy-oWPE8-ZdFcG-EOqMd-FPGCF");
// console.log("downloading");
// await downloadBZip2(matchURL, "./demo.dem");
// console.log("Done");

performance.mark("demoparser-start");
const deaths = parseEvent("./demo.dem", "player_death", [], ["is_warmup_period"]).filter((event: any) => !event.is_warmup_period);
performance.mark("demoparser-end");
console.log(deaths);
