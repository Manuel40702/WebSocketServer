const WebSocket = require('ws')
var uuid = require('uuid-random')

const wss = new WebSocket.WebSocketServer({port:8080}, () => {
    console.log('server started')
})

var isCorrectRoom = false;
let rooms = {}
const maxPlayer = 2
const playersData = {}
const spawnPoints = [
    { x: 4, y: 0.5, z: -1 },
    { x: -13, y: 15, z: -23},
]

wss.on('connection', function connection(client){

    client.id = uuid()

    playersData[client.id] = { id: client.id };

    
    client.on('message', (data) => {
        const dataJSON = JSON.parse(data)
        console.log("Player Message " + dataJSON.action)
        
        if(dataJSON.action === "createRoom"){
            createRoom(dataJSON.room)
            console.log("Room creado " + rooms)

            const spawnPoint = spawnPoints[0]
            client.send(JSON.stringify({
                type: "initialID",
                id: client.id,
                room: dataJSON.room,
                xPos: spawnPoint.x,
                yPos: spawnPoint.y,
                zPos: spawnPoint.z,
            }))        
        }
        else if(dataJSON.action === "joinRoom"){
            isCorrectRoom = false
            join(dataJSON.room)
            console.log(dataJSON.room)
            if(isCorrectRoom){
                const spawnPoint = spawnPoints[1]
                client.send(JSON.stringify({
                    type: "initialID",
                    id: client.id,
                    room: dataJSON.room,
                    xPos: spawnPoint.x,
                    yPos: spawnPoint.y,
                    zPos: spawnPoint.z,
                }))  
            }
        }
        else if(dataJSON.action === "message"){
            if(rooms[dataJSON.room]){
                rooms[dataJSON.room].forEach(player => {
                    if(player !== client && player.readyState === WebSocket.OPEN){
                        player.send(JSON.stringify({type: "message", message: dataJSON.message}))
                    }
                })
            }
        }
    })

    client.on('close', () =>{
        console.log("This connection closed")
        console.log("Removing client " + client.id)
        delete playersData[client.id]
        broadcastPlayerDisconnected(client.id);
    })

    // Funcion para crear room
    function createRoom(name){
        const room = name
        rooms[room] = [client]
        client["room"] = room
        client.send(JSON.stringify({
            type: 'createRoom',
            data: "Room creado con exito"
        }))
    }

    // Funcion para entrar a un room 
    function join(room) {
        if (!Object.keys(rooms).includes(room)) {
            client.send(JSON.stringify({
                type: 'joinRoom',
                data: "El room no existe"
            }))
            return;
        }
        if (rooms[room].length >= maxPlayer) {
            client.send(JSON.stringify({
                type: 'joinRoom',
                data: "El room esta lleno"
            }))
            return;
        }

        isCorrectRoom = true;
        rooms[room].push(client);
        client["room"] = room;
        client.send(JSON.stringify({
            type: 'joinRoom',
            data: "Ingresaste al room con exito"
        }))

    }
})

wss.on('listening', () => {
    console.log("listening on 8080")
})

// Notificar cambios de los jugadores 
function broadcastPlayerData(updatedPlayerId) {
    const playerData = playersData[updatedPlayerId];
    const message = JSON.stringify({
        type: 'playerUpdate',
        data: playerData
    });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.id !== updatedPlayerId) {
            client.send(message);
        }
    });
}

// Notificar a los demás jugadores que un jugador se desconectó
function broadcastPlayerDisconnected(disconnectedPlayerId) {
    const message = JSON.stringify({
        type: 'playerDisconnected',
        id: disconnectedPlayerId
    });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}