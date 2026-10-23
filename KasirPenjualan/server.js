// ======================================
// TREEHOUSE POS
// CUSTOMER SCREEN SERVER
// WEBSOCKET RELAY
// ======================================

const WebSocket =
    require("ws");


const PORT =
    8080;


const server =
    new WebSocket.Server({
        port: PORT
    });


const clients =
    new Set();


server.on(
    "connection",
    socket => {


        

        clients.add(
            socket
        );


        socket.on(
            "message",
            message => {


                const data =
                    message.toString();


               


                clients.forEach(
                    client => {


                        if (
                            client !== socket &&
                            client.readyState ===
                            WebSocket.OPEN
                        ) {

                            client.send(
                                data
                            );

                        }

                    }
                );

            }
        );


        socket.on(
            "close",
            () => {


                clients.delete(
                    socket
                );


               

            }
        );


        socket.on(
            "error",
            error => {


                console.error(
                    "WEBSOCKET ERROR:",
                    error
                );


                clients.delete(
                    socket
                );

            }
        );

    }
);


