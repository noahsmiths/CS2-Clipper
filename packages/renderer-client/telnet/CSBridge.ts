import { Telnet } from "telnet-client";

export function waitForLaunch(port: number) {
    const connection = new Telnet();
    const params = {
        host: '127.0.0.1',
        port: port,
        timeout: 30000,
        negotiationMandatory: false
    }
    
    return new Promise<Telnet>(async (res, _) => {
        await connection.connect(params);
        res(connection);
    });
}