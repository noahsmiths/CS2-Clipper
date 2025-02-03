import { EventEmitter } from "node:events";
import { MatchFetcher } from "../matches/MatchFetcher";
import { sleep } from "../utils/sleep";
import path from "node:path";
import { exists } from "shared/utils/exists";
import { downloadBZip2 } from "shared/utils/BZip2Downloader";
import { parseEvents, parseHeader } from "@laihoe/demoparser2";
import * as db from "../db";
import { readdir, unlink } from "node:fs/promises";

export class Demos extends EventEmitter {
    private timeout: Timer | undefined = undefined;
    private demoDownloadDirectory: string = import.meta.dirname;

    constructor(
        private matchFetcher: MatchFetcher,
        private steamAPIKey: string,
        private pollInterval: number
    ) {
        super();
    }

    private async clearDownloadedDemos() {
        const downloadedDemoFiles = (await readdir(this.demoDownloadDirectory, { withFileTypes: true }))
            .filter(ent => ent.isFile() && ent.name.endsWith(".dem"))
            .map(file => path.join(file.parentPath, file.name));
        const fileDeletions = downloadedDemoFiles.map(filePath => unlink(filePath));
        await Promise.all(fileDeletions);
    }

    async beginPolling() {
        try {
            await this.clearDownloadedDemos();
            await this.pollLatestMatches();
        } catch (err) {
            console.error(err);
        } finally {
            // Should add some code here to clear out any downloaded demos before next poll
            this.timeout = setTimeout(this.beginPolling.bind(this), this.pollInterval);
        }
    }

    stopPolling() {
        clearTimeout(this.timeout);
    }

    async pollLatestMatches() {
        const users = await db.getUsersAndMatchIds();
        const matches = await this.getLatestMatches(users);
        
        if (Object.keys(matches).length > 0) {
            console.log(`Found new matches ${Object.keys(matches)}`);
        }

        for (const matchId in matches) {
            try {
                const demoFile = await this.downloadDemo(matchId);
                const matchDetails = await this.parseDemo(demoFile);
                const userIds = matches[matchId]; // This is an array of only userIds who use the clipping service
                
                await db.upsertNewMatchDetails(matchId, matchDetails);

                for (const userId in matchDetails.usernames) { // This iterates over ALL people in the match, not just those who use the clipping service
                    // Only update the user match id if the userId is in the userIds array. Without this check, older demo checks for users can affect users with newer matches if they played a common one before
                    if (userIds.includes(userId)) {
                        await db.updateUserMatchIds(userId, matchId); // Comment this line out to prevent latest match id's from updating for users
                    }
                }

                this.emit("new-match", userIds, matchId, matchDetails);
            } catch (err) {
                console.error(err);
            }
        }
    }

    private async getLatestMatches(users: User[]): Promise<MatchesWithUsers> {
        const matches: MatchesWithUsers = {};
        
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const res = await fetch(`https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1?key=${this.steamAPIKey}&steamid=${user.steamId}&steamidkey=${user.authCode}&knowncode=${user.matchId}`);
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
    
    private async downloadDemo(matchId: string): Promise<string> {
        const matchURL = await this.matchFetcher.getDemoURLFromMatchId(matchId);
        const outputFile = path.join(this.demoDownloadDirectory, matchURL.substring(matchURL.lastIndexOf('/') + 1, matchURL.length - 4));
    
        if (!(await exists(outputFile))) {
            await downloadBZip2(matchURL, outputFile);
        }
    
        return outputFile;
    }
    
    private async parseDemo(demoPath: string): Promise<MatchDetails> {
        const header = parseHeader(demoPath);
        const allEvents = parseEvents(demoPath, ["player_death"], [], ["is_warmup_period"]).filter((event: any) => !event.is_warmup_period);
        const deaths = allEvents.filter((event: any) => event.event_name === 'player_death');
        const matchDetails: MatchDetails = {
            usernames: {},
            kills: {},
            deaths: {},
            map: header.map_name,
            winningSteamIDs: [],
            losingSteamIDs: [],
        };
    
        for (const death of deaths) {
            const victim = death.user_steamid;
            const attacker = death.attacker_steamid;
    
            if (victim !== null) {
                if (matchDetails.deaths[victim] === undefined) {
                    matchDetails.deaths[victim] = [];
                }
                matchDetails.usernames[victim] = death.user_name;
                matchDetails.deaths[victim].push([attacker, death.tick]);
            }
    
            if (attacker !== null) {
                if (matchDetails.kills[attacker] === undefined) {
                    matchDetails.kills[attacker] = [];
                }
                matchDetails.usernames[attacker] = death.attacker_name;
                matchDetails.kills[attacker].push([victim, death.tick]);
            }
        }
    
        await unlink(demoPath);
        return matchDetails;
    }
}