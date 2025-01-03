import SteamUser from "steam-user";
import GlobalOffensive from "globaloffensive";

export class MatchFetcher {
    private constructor(
        private user: SteamUser,
        private game: GlobalOffensive
    ) {}

    getDemoURLFromMatchId(matchId: string): Promise<string> {
        this.game.requestGame(matchId);

        return new Promise((res, rej) => {
            this.game.once("matchList", (matches) => {
                if (matches.length === 0) {
                    rej("matchList event got no matches. This can be caused by an invalid match code.");
                    return;
                }

                const roundsWithReplayURL = matches[0].roundstatsall.filter(round => round.map !== null);

                if (roundsWithReplayURL.length > 0) {
                    res(roundsWithReplayURL[0].map!);
                } else {
                    rej("No round found with a non-null 'map' property.");
                }
            });
        });
    }

    static async createMatchFetcher(accountName?: string, password?: string, twoFactorCode?: string): Promise<MatchFetcher> {
        const user = new SteamUser({
            webCompatibilityMode: true
        });
        
        let logonDetails: any;
        if (process.env.REFRESH_TOKEN) {
            logonDetails = {
                refreshToken: process.env.REFRESH_TOKEN
            };
        } else {
            if (!accountName || !password || !twoFactorCode) {
                throw new Error("No REFRESH_TOKEN env variable found! To sign in and get a token, all parameters must be provided");
            }

            logonDetails = {
                accountName,
                password,
                twoFactorCode
            };
        }

        user.once("refreshToken", (token) => {
            if (!logonDetails.refreshToken) {
                console.log(`Got new refresh token. Save this new one in an environment variable called REFRESH_TOKEN:\n${token}`);
            }
        });

        return new Promise((res, rej) => {
            user.once("error", rej);

            user.once("loggedOn", () => {
                const game = new GlobalOffensive(user);
                game.once("connectedToGC", () => {
                    user.removeListener("error", rej);

                    res(new MatchFetcher(user, game));
                });

                user.gamesPlayed([730], true);
            });

            user.logOn(logonDetails);
        })
    }
}