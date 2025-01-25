declare interface User {
    steamId: string,
    authCode: string,
    matchId: string,
}

declare interface MatchesWithUsers {
    [matchId: string]: string[],
}

declare interface Match {
    [steamId: string]: MatchDetails
}

declare interface MatchDetails {
    username: string,
    kills: number[],
    deaths: number[],
}