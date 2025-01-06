function recordClip({demo, outputPath}: {demo: Demo, outputPath: string}): Promise<void> {
    mirv.exec(`mirv_streams record name "${outputPath}"`);
    mirv.exec(`mirv_streams record fps ${demo.fps}`);
    mirv.exec(`mirv_streams record screen enabled 1`);
    mirv.exec(`mirv_streams record startMovieWav 1`);
    mirv.exec(`mirv_streams record screen settings afxFfmpeg`);
    mirv.exec(`mirv_cmd clear`);
    mirv.exec(`mirv_cmd addAtTick 0 demoui`);
    mirv.exec(`mirv_cmd addAtTick 0 demoui`);
    mirv.exec(`mirv_cmd addAtTick 0 demo_gototick ${demo.clipIntervals[0].start}`);
    mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[0].start} spec_player ${demo.clipIntervals[0].playerName}`);
    mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[0].start} mirv_streams record start`);

    for (let i = 1; i < demo.clipIntervals.length; i++) {
        mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[i - 1].end} demo_gototick ${demo.clipIntervals[i].start}`);
        mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[i].start} spec_player ${demo.clipIntervals[i].playerName}`);
    }

    mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[demo.clipIntervals.length - 1].end} mirv_streams record end`);
    mirv.exec(`mirv_cmd addAtTick ${demo.clipIntervals[demo.clipIntervals.length - 1].end} disconnect`);
    
    mirv.exec(`playdemo ${demo.id}`);

    return new Promise((res) => {
        mirv.onRecordEnd = () => {
            mirv.onRecordEnd = undefined;
            res();
        }
    });
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