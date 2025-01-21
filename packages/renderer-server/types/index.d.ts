declare interface User {
    steamId: string,
    authCode: string,
    matchCode: string,
}

declare interface Matches {
    [matchCode: string]: string[],
}

declare interface MatchDetails {
    [steamId: string]: {
        kills: number[],
        deaths: number[],
    }
}