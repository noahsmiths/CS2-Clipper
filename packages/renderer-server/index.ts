import 'dotenv/config';
import { MatchFetcher } from "./matches/MatchFetcher";
import { downloadBZip2 } from 'shared/utils/BZip2Downloader';
import { parseEvent } from '@laihoe/demoparser2';
import { DemoFile } from 'demofile';
import fs from "node:fs";

const matchFetcher = await MatchFetcher.createMatchFetcher();

const matchURL = await matchFetcher.getDemoURLFromMatchId("CSGO-Q3dUy-oWPE8-ZdFcG-EOqMd-FPGCF");
console.log("downloading");
await downloadBZip2(matchURL, "./demo.dem");
console.log("Done");

performance.mark("demoparser-start");
const deaths = parseEvent("./demo.dem", "player_death", [], ["is_warmup_period"]).filter((event: any) => !event.is_warmup_period);
performance.mark("demoparser-end");
console.log(deaths);

const demoFile = new DemoFile;

let deathCount = 0;

performance.mark("demofile-start");
demoFile.gameEvents.on("player_death", e => {
  const victim = demoFile.entities.getByUserId(e.userid);
  const victimName = victim ? victim.name : "unnamed";

  // Attacker may have disconnected so be aware.
  // e.g. attacker could have thrown a grenade, disconnected, then that grenade
  // killed another player.
  const attacker = demoFile.entities.getByUserId(e.attacker);
  const attackerName = attacker ? attacker.name : "unnamed";

  const headshotText = e.headshot ? " HS" : "";

//   console.log(`${attackerName} [${e.weapon}${headshotText}] ${victimName}`);
    if (++deathCount === deaths.length) performance.mark("demofile-end");
});

demoFile.parseStream(fs.createReadStream("./demo.dem"));

performance.measure("demoparser", "demoparser-start", "demoparser-end");
performance.measure("demofile", "demofile-start", "demofile-end");