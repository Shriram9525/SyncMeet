import { Server } from "socket.io"


let connections = {}
let messages = {}
let timeOnline = {}
let waitingRooms = {} // format: { [roomPath]: [{ socketId, username }] }

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });


    io.on("connection", (socket) => {

        console.log("SOMETHING CONNECTED")

        socket.on("join-call", (path, username) => {
            socket.username = username || "Guest";
            timeOnline[socket.id] = new Date();

            // Check if this is the first participant (Host)
            if (connections[path] === undefined || connections[path].length === 0) {
                connections[path] = [socket.id];
                console.log(`Room created: "${path}". Host: ${socket.id} (${socket.username})`);
                
                io.to(socket.id).emit("waiting-room-admitted"); // Host is admitted immediately

                for (let a = 0; a < connections[path].length; a++) {
                    io.to(connections[path][a]).emit("user-joined", socket.id, connections[path])
                }

                if (messages[path] !== undefined) {
                    for (let a = 0; a < messages[path].length; ++a) {
                        io.to(socket.id).emit("chat-message", messages[path][a]['data'],
                            messages[path][a]['sender'], messages[path][a]['socket-id-sender'])
                    }
                }
            } else {
                // Not the host, put in waiting room
                if (waitingRooms[path] === undefined) {
                    waitingRooms[path] = [];
                }
                waitingRooms[path].push({ socketId: socket.id, username: socket.username });
                console.log(`User ${socket.id} (${socket.username}) added to waiting room for "${path}"`);

                io.to(socket.id).emit("waiting-room-joined");

                // Notify host
                const hostId = connections[path][0];
                io.to(hostId).emit("user-waiting", waitingRooms[path]);
            }
        })

        socket.on("waiting-room-action", (data) => {
            const { socketId, action, path } = data;
            if (!waitingRooms[path]) return;

            // Remove from waiting list
            waitingRooms[path] = waitingRooms[path].filter(u => u.socketId !== socketId);

            if (action === "admit") {
                if (!connections[path]) {
                    connections[path] = [];
                }
                connections[path].push(socketId);
                console.log(`User ${socketId} admitted to room "${path}"`);

                io.to(socketId).emit("waiting-room-admitted");

                // Trigger join call flow for them
                for (let a = 0; a < connections[path].length; a++) {
                    io.to(connections[path][a]).emit("user-joined", socketId, connections[path]);
                }

                // Send chat history to admitted user
                if (messages[path] !== undefined) {
                    for (let a = 0; a < messages[path].length; ++a) {
                        io.to(socketId).emit("chat-message", messages[path][a]['data'],
                            messages[path][a]['sender'], messages[path][a]['socket-id-sender']);
                    }
                }
            } else if (action === "reject") {
                console.log(`User ${socketId} rejected from room "${path}"`);
                io.to(socketId).emit("waiting-room-rejected");
            }

            // Update host with remaining waiting list
            if (connections[path] && connections[path].length > 0) {
                const hostId = connections[path][0];
                io.to(hostId).emit("user-waiting", waitingRooms[path]);
            }
        });

        socket.on("kick-user", (data) => {
            const { socketId, path } = data;
            if (connections[path] && connections[path][0] === socket.id) {
                console.log(`Host ${socket.id} kicked user ${socketId} from room "${path}"`);
                
                const index = connections[path].indexOf(socketId);
                if (index !== -1) {
                    connections[path].splice(index, 1);
                }
                
                io.to(socketId).emit("kicked");
                
                connections[path].forEach(clientId => {
                    io.to(clientId).emit('user-left', socketId);
                });
            }
        });

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        socket.on("chat-message", (data, sender) => {

            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {


                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }

                    return [room, isFound];

                }, ['', false]);

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = []
                }

                messages[matchingRoom].push({ 'sender': sender, "data": data, "socket-id-sender": socket.id })
                console.log("message", matchingRoom, ":", sender, data)

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id)
                })
            }

        })

        const getRoom = () => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);
            return found ? matchingRoom : null;
        };

        socket.on("raise-hand", (data) => {
            const room = getRoom();
            if (room) {
                connections[room].forEach((elem) => {
                    if (elem !== socket.id) {
                        io.to(elem).emit("raise-hand", socket.id, data.handRaised);
                    }
                });
            }
        });

        socket.on("reaction", (data) => {
            const room = getRoom();
            if (room) {
                connections[room].forEach((elem) => {
                    io.to(elem).emit("reaction", socket.id, data.emoji);
                });
            }
        });

        socket.on("share-status", (toId, status) => {
            io.to(toId).emit("share-status", socket.id, status);
        });

        socket.on("screen-sharing", (data) => {
            const room = getRoom();
            if (room) {
                connections[room].forEach((elem) => {
                    if (elem !== socket.id) {
                        io.to(elem).emit("screen-sharing", socket.id, data);
                    }
                });
            }
        });

        socket.on("disconnect", () => {
            // Clean up waiting rooms
            for (const [roomPath, waitingList] of Object.entries(waitingRooms)) {
                const index = waitingList.findIndex(u => u.socketId === socket.id);
                if (index !== -1) {
                    waitingRooms[roomPath].splice(index, 1);
                    console.log(`User ${socket.id} left waiting room for "${roomPath}"`);
                    if (connections[roomPath] && connections[roomPath].length > 0) {
                        io.to(connections[roomPath][0]).emit("user-waiting", waitingRooms[roomPath]);
                    }
                }
            }

            // Clean up active connections
            for (const [roomPath, clients] of Object.entries(connections)) {
                const index = clients.indexOf(socket.id);
                if (index !== -1) {
                    const hostLeft = (index === 0);

                    // Notify remaining clients
                    clients.forEach(clientId => {
                        if (clientId !== socket.id) {
                            io.to(clientId).emit('user-left', socket.id);
                        }
                    });

                    connections[roomPath].splice(index, 1);
                    console.log(`User ${socket.id} left room "${roomPath}"`);

                    if (connections[roomPath].length === 0) {
                        delete connections[roomPath];
                        delete waitingRooms[roomPath];
                    } else if (hostLeft) {
                        // Host left! Promote the next client
                        const newHostId = connections[roomPath][0];
                        console.log(`New host promoted: ${newHostId} for room "${roomPath}"`);
                        io.to(newHostId).emit("host-promoted", { waitingList: waitingRooms[roomPath] || [] });
                    }
                }
            }
        })


    })


    return io;
}

