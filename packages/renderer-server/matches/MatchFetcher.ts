import SteamUser from "steam-user";
import GlobalOffensive from "globaloffensive";

export class MatchFetcher {
    private constructor(
        private user: SteamUser,
        private game: GlobalOffensive
    ) {}

    static async createMatchFetcher(accountName?: string, password?: string, twoFactorCode?: string): Promise<MatchFetcher> {
        const user = new SteamUser();
        
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

        user.logOn(logonDetails);

        user.once("refreshToken", (token) => {
            if (!logonDetails.refreshToken) {
                console.log(`Logged on without refresh token. Save this new one in an environment variable called REFRESH_TOKEN:\n${token}`);
            }
        });

        return new Promise((res, rej) => {
            user.once("error", rej);

            user.once("loggedOn", () => {
                const game = new GlobalOffensive(user);
                game.once("connectedToGC", () => {
                    user.removeAllListeners("error");
                    
                    res(new MatchFetcher(user, game));
                });

                user.gamesPlayed([730], true);
            });
        })
    }
}