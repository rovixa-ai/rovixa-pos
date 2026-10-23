// ======================================
// CUSTOMER SCREEN NETWORK
// TREEHOUSE POS
// WEBSOCKET CLIENT
// ======================================

const CustScreenNetwork = {

    socket: null,

    url: "",

    connected: false,

    onMessage: null,

    onConnect: null,

    onDisconnect: null,

    onError: null,


    // ======================================
    // INIT
    // ======================================

    init(url) {

        this.url =
            String(
                url || ""
            ).trim();

        if (!this.url) {

            console.warn(
                "CUSTOMER SCREEN NETWORK URL BELUM DIATUR."
            );

            return;

        }

        this.connect();

    },


    // ======================================
    // CONNECT
    // ======================================

    connect() {

        if (!this.url) {
            return;
        }

        if (
            this.socket &&
            (
                this.socket.readyState ===
                WebSocket.OPEN ||

                this.socket.readyState ===
                WebSocket.CONNECTING
            )
        ) {

            return;

        }


       


        try {

            this.socket =
                new WebSocket(
                    this.url
                );

        }
        catch (error) {

            console.error(
                "CUSTOMER SCREEN WEBSOCKET ERROR:",
                error
            );

            this.connected =
                false;

            if (
                typeof this.onError ===
                "function"
            ) {

                this.onError(
                    error
                );

            }

            return;

        }


        // ==================================
        // OPEN
        // ==================================

        this.socket.addEventListener(
            "open",
            () => {

                this.connected =
                    true;

            

                if (
                    typeof this.onConnect ===
                    "function"
                ) {

                    this.onConnect();

                }

            }
        );


        // ==================================
        // MESSAGE
        // ==================================

        this.socket.addEventListener(
            "message",
            event => {

                let message =
                    event.data;

                try {

                    message =
                        JSON.parse(
                            message
                        );

                }
                catch (error) {

                    console.warn(
                        "CUSTOMER SCREEN MESSAGE BUKAN JSON:",
                        message
                    );

                    return;

                }


                if (
                    typeof this.onMessage ===
                    "function"
                ) {

                    this.onMessage(
                        message
                    );

                }

            }
        );


        // ==================================
        // CLOSE
        // ==================================

        this.socket.addEventListener(
            "close",
            () => {

                this.connected =
                    false;

                console.warn(
                    "CUSTOMER SCREEN NETWORK DISCONNECTED"
                );

                if (
                    typeof this.onDisconnect ===
                    "function"
                ) {

                    this.onDisconnect();

                }

            }
        );


        // ==================================
        // ERROR
        // ==================================

        this.socket.addEventListener(
            "error",
            error => {

                this.connected =
                    false;

                console.error(
                    "CUSTOMER SCREEN NETWORK ERROR:",
                    error
                );

                if (
                    typeof this.onError ===
                    "function"
                ) {

                    this.onError(
                        error
                    );

                }

            }
        );

    },


    // ======================================
    // SEND
    // ======================================

    send(message) {

        if (
            !this.socket ||
            this.socket.readyState !==
            WebSocket.OPEN
        ) {

            console.warn(
                "CUSTOMER SCREEN NETWORK BELUM TERHUBUNG."
            );

            return false;

        }


        try {

            this.socket.send(
                JSON.stringify(
                    message
                )
            );

            return true;

        }
        catch (error) {

            console.error(
                "CUSTOMER SCREEN NETWORK SEND ERROR:",
                error
            );

            return false;

        }

    },


    // ======================================
    // DISCONNECT
    // ======================================

    disconnect() {

        if (!this.socket) {
            return;
        }


        try {

            this.socket.close();

        }
        catch (error) {

            console.error(
                "CUSTOMER SCREEN NETWORK CLOSE ERROR:",
                error
            );

        }


        this.socket =
            null;

        this.connected =
            false;

    }

};