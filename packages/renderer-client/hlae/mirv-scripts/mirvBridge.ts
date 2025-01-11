// function sleep(timeMS: number) {
//     return new Promise(res => setTimeout(res, timeMS));
// }

function waitForClip() {
    return new Promise<void>((res) => {
        mirv.onRecordEnd = () => {
            mirv.onRecordEnd = undefined;
            res();
        }
    });
}

function waitForRoundStart() {
    return new Promise<void>((res) => {
        mirv.onGameEvent = (e) => {
            if (e.name === "round_poststart") {
                mirv.onGameEvent = undefined;
                res();
            }
        }
    });
}

async function recordClip({demo, outputPath}: {demo: Demo, outputPath: string}) {
    mirv.exec(`mirv_streams record name "${outputPath}"`);
    mirv.exec(`mirv_streams record fps ${demo.fps}`);
    mirv.exec(`mirv_streams record screen enabled 1`);
    mirv.exec(`mirv_streams record startMovieWav 1`);
    mirv.exec(`mirv_streams record screen settings afxFfmpeg`);

    mirv.exec(`playdemo ${demo.id}`);

    await waitForRoundStart();
    mirv.exec(`demoui`);

    for (let i = 0; i < demo.clipIntervals.length; i++) {
        mirv.exec(`mirv_cmd clear`);
        mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[i].start - 96} spec_player ${demo.clipIntervals[i].playerName}`);
        mirv.exec(`demo_gototick ${demo.clipIntervals[i].start - 96}`); // Go to 1.5 seconds before clip start
        mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[i].start} mirv_streams record start`);
        mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[i].end} mirv_streams record end`);
        mirv.exec(`demo_resume`);
        await waitForClip();
        mirv.exec(`demo_pause`);
    }

    mirv.exec(`disconnect`);
}

function handleMessages(inSocket: mirv.WsIn, outSocket: mirv.WsOut) {
    async function handleIncoming() {
        while (true) {
            const rawMessage = await inSocket.next() as string;
            const message = JSON.parse(rawMessage) as MirvMessage;

            switch (message.event) {
                case "recordClipRequest":
                    recordClip(message.data)
                        .then(async () => {
                            await outSocket.send(JSON.stringify({
                                event: "recordClipResponse",
                                data: true
                            }));
                        })
                        .catch(async () => {
                            await outSocket.send(JSON.stringify({
                                event: "recordClipResponse",
                                data: false
                            }));
                        });
                    break;
            }
        }
    }

    handleIncoming();
}

mirv.connect_async("ws://localhost:2222/")
    .then((ws) => {
        ws.out.send("activated")
            .then(() => {
                handleMessages(ws.in, ws.out);
            })
            .catch(mirv.message);
    })
    .catch(mirv.message);