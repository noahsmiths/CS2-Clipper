declare type Demo = {
    id?: string,
    url: string,
    clipIntervals: Array<ClipInterval>,
    fps: number,
    webhook: string,
    metadata?: any
}

declare type ClipInterval = {
    start: number,
    end: number,
    playerName: string,
}

declare type MirvMessage = {
    event: string,
    data: any
}

declare type Clip = {
    url: string,
    metadata?: any
}