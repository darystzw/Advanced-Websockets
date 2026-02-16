import {WebSocket, WebSocketServer} from 'ws';
import {wsArcjet} from "../arcjet.js";

function sendJson(socket, payload){
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

function broadCast(wss, payload){
    for (const client of wss.clients){
        if (client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
    }
}

export function attachWebsocketServer(server){
    const wss = new WebSocketServer({
        server,
        path: '/ws',
        maxPayload: 1024 * 1024
    });

    wss.on('connection',  async (socket, req) => {
        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req);

                if (decision.isDenied) {
                    const code = decision.reason.isRateLimit() ? 1013 : 1008;
                    const reason = decision.reason.isRateLimit() ? 'Rate limit exceeded' : 'Access denied';
                    socket.close(code, reason);
                    return;
                }
            } catch (e) {
                console.error('Error while protecting websocket connection', e);
                socket.close(1011, 'Internal server error');
                return;
            }
        }

        socket.isAlive = true;
        socket.on('pong', () => socket.isAlive = true);

        sendJson(socket, {type: 'welcome', message: 'Welcome to the match broadcasting service!'});

        socket.on('error', console.error);
    })

    const interval = setInterval(() => {
        wss.clients.forEach(client => {
            if (client.isAlive === false) {
                client.terminate();
                return;
            }
            client.isAlive = false;
            client.ping();
        });
    }, 30000)

    wss.on('close', () => clearInterval(interval));

    function broadcastMatchCreated(match){
        broadCast(wss, {type: 'match_created', data: match});
    }

    return {broadcastMatchCreated};
}