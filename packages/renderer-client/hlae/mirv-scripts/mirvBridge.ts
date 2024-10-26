function handleMessages(inSocket: mirv.WsIn, outSocket: mirv.WsOut) {
    
}

mirv.connect_async("ws://localhost:2222/")
    .then((ws) => {
        handleMessages(ws.in, ws.out);
    })
    .catch((err) => {
        mirv.message(err);
    });