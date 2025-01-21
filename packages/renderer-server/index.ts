import 'dotenv/config';
import { MatchFetcher } from "./matches/MatchFetcher";
import { downloadBZip2 } from 'shared/utils/BZip2Downloader';
import { parseEvent } from '@laihoe/demoparser2';
import { sleep } from './utils/sleep';
import * as db from './db';
import path from "node:path";
import { stat } from "node:fs/promises";
import { exists } from 'shared/utils/exists';

const matchFetcher = await MatchFetcher.createMatchFetcher();

async function getLatestMatches(users: User[]): Promise<Matches> {
    const matches: Matches = {};
    
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const res = await fetch(`https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1?key=${process.env.STEAM_API_KEY}&steamid=${user.steamId}&steamidkey=${user.authCode}&knowncode=${user.matchCode}`);
        if (res.status !== 200) {
            if (res.status === 429 || res.status === 503) {
                await sleep(1000);
                i--;
            }
            continue;
        }

        const data = (await res.json()) as { result: { nextcode: string } };
        const code = data.result.nextcode;
        if (code !== "n/a") { // Next code found
            if (matches.hasOwnProperty(code)) {
                matches[code].push(user.steamId);
            } else {
                matches[code] = [user.steamId];
            }
        }
    }

    return matches;
}

async function downloadDemo(matchId: string): Promise<string> {
    const matchURL = await matchFetcher.getDemoURLFromMatchId(matchId);
    const outputFile = path.join(import.meta.dirname, matchURL.substring(matchURL.lastIndexOf('/') + 1, matchURL.length - 4));

    if (!(await exists(outputFile))) {
        await downloadBZip2(matchURL, outputFile);
    }

    return outputFile;
}

async function parseDemo(demoPath: string): Promise<MatchDetails> {
    const deaths = parseEvent(demoPath, "player_death", [], ["is_warmup_period"]).filter((death: any) => !death.is_warmup_period);
    const matchDetails: MatchDetails = {};

    for (const death of deaths) {
        const victim = death.user_steamid;
        const attacker = death.attacker_steamid;

        if (victim !== null) {
            if (!(victim in matchDetails)) {
                matchDetails[victim] = {
                    kills: [],
                    deaths: [],
                };
            }
            matchDetails[victim].deaths.push(death.tick);
        }

        if (attacker !== null) {
            if (!(attacker in matchDetails)) {
                matchDetails[attacker] = {
                    kills: [],
                    deaths: [],
                };
            }
            matchDetails[attacker].kills.push(death.tick);
        }
    }

    return matchDetails;
}

const users = await db.getUsersAndMatchCodes();
const matches = await getLatestMatches(users);

for (const match in matches) {
    const demoFile = await downloadDemo(match);
    const details = await parseDemo(demoFile);

    console.log(JSON.stringify(details));
}