
const PembelianBarcodeScanner = {

    stream: null,
    detector: null,
    scanning: false,
    controls: null,

    lastBarcode: "",
    lastDetectedTime: 0,
    scanCount: 0,

    targetMode: "pembelian",
    targetIndex: -1,

    /* ======================================
       BUKA SCANNER PEMBELIAN BIASA
    ====================================== */

    async open() {

        this.targetMode = "pembelian";
        this.targetIndex = -1;

        await this.startScanner();
    },

    /* ======================================
       BUKA SCANNER PEMBELIAN MASSAL
    ====================================== */

    async openForMassal(index) {

        if (
            !Number.isInteger(index) ||
            index < 0 ||
            !PembelianMassal.items[index]
        ) {
            Dialog.error(
                "Baris item Pembelian Massal tidak ditemukan.",
                "Scanner Barcode"
            );

            return;
        }

        this.targetMode = "massal";
        this.targetIndex = index;

        await this.startScanner();
    },

    /* ======================================
       START SCANNER
    ====================================== */

    async startScanner() {

        const modal = document.getElementById(
            "pembelian-barcode-scanner"
        );

        const video = document.getElementById(
            "pembelian-barcode-scanner-video"
        );

        const message = document.getElementById(
            "pembelian-barcode-scanner-message"
        );

        if (!modal || !video) {

            console.error(
                "Elemen scanner barcode tidak ditemukan."
            );

            Dialog.error(
                "Elemen scanner barcode tidak ditemukan.",
                "Scanner Barcode"
            );

            return;
        }

        this.bindCloseEvent();

modal.hidden = false;

        modal.hidden = false;

        this.scanning = false;
        this.controls = null;
        this.stream = null;

        this.lastBarcode = "";
        this.lastDetectedTime = 0;
        this.scanCount = 0;

        if (message) {
            message.textContent = "Menyiapkan kamera...";
        }

        try {

            if (
                !navigator.mediaDevices ||
                !navigator.mediaDevices.getUserMedia
            ) {
                throw new Error(
                    "Browser tidak mendukung akses kamera."
                );
            }

            if (
                !window.ZXingBrowser ||
                !window.ZXingBrowser.BrowserMultiFormatOneDReader
            ) {
                throw new Error(
                    "Library scanner barcode 1D tidak tersedia."
                );
            }

            this.detector =
                new ZXingBrowser.BrowserMultiFormatOneDReader();

            if (
                "timeBetweenDecodingAttempts" in this.detector
            ) {
                this.detector.timeBetweenDecodingAttempts = 50;
            }

            this.scanning = true;

            if (message) {
                message.textContent =
                    "Arahkan barcode ke dalam kotak...";
            }

            const constraints = {
                audio: false,
                video: {
                    width: {
                        ideal: 1280,
                        min: 960
                    },
                    height: {
                        ideal: 720,
                        min: 540
                    },
                    frameRate: {
                        ideal: 30,
                        max: 60
                    },
                    facingMode: {
                        ideal: "environment"
                    },
                    focusMode: {
                        ideal: "continuous"
                    }
                }
            };

            this.controls =
                await this.detector.decodeFromConstraints(
                    constraints,
                    video,
                    async (result, error, controls) => {

                        if (!this.scanning) {
                            return;
                        }

                        this.scanCount++;

                        if (error || !result) {
                            return;
                        }

                        const barcode = String(
                            result.getText
                                ? result.getText()
                                : ""
                        ).trim();

                        if (!barcode) {
                            return;
                        }

                        /* VALIDASI EAN-13 */

                        if (!/^\d{13}$/.test(barcode)) {
                            return;
                        }

                        /* DEBOUNCE */

                        const now = Date.now();

                        if (
                            barcode === this.lastBarcode &&
                            now - this.lastDetectedTime < 1000
                        ) {
                            return;
                        }

                        this.lastBarcode = barcode;
                        this.lastDetectedTime = now;
                        this.scanning = false;

                        if (message) {
                            message.textContent =
                                "Barcode ditemukan: " + barcode;
                        }

                        if (controls) {
                            try {
                                controls.stop();
                            } catch (stopError) {
                                console.warn(
                                    "ZXING STOP ERROR:",
                                    stopError
                                );
                            }
                        }

                        this.controls = null;

                        await this.handleBarcode(barcode);
                    }
                );

            if (video.srcObject) {
                this.stream = video.srcObject;
            }

            /* OPTIMASI KAMERA */

            try {

                const tracks = video.srcObject
                    ? video.srcObject.getVideoTracks()
                    : [];

                if (tracks.length > 0) {

                    const track = tracks[0];

                    this.stream = video.srcObject;

                    const capabilities =
                        track.getCapabilities
                            ? track.getCapabilities()
                            : {};

                    const advanced = {};

                    if (
                        Array.isArray(capabilities.focusMode) &&
                        capabilities.focusMode.includes("continuous")
                    ) {
                        advanced.focusMode = "continuous";
                    }

                    if (capabilities.zoom) {

                        const minZoom = Number(
                            capabilities.zoom.min
                        );

                        const maxZoom = Number(
                            capabilities.zoom.max
                        );

                        const targetZoom = Math.max(
                            minZoom,
                            Math.min(maxZoom, 1.5)
                        );

                        if (
                            targetZoom >= minZoom &&
                            targetZoom <= maxZoom
                        ) {
                            advanced.zoom = targetZoom;
                        }
                    }

                    if (
                        Object.keys(advanced).length > 0 &&
                        track.applyConstraints
                    ) {
                        await track.applyConstraints({
                            advanced: [advanced]
                        });
                    }
                }

            } catch (cameraEnhanceError) {

                console.warn(
                    "CAMERA OPTIMIZATION TIDAK TERSEDIA:",
                    cameraEnhanceError
                );
            }

        } catch (error) {

            console.error(
                "BARCODE CAMERA ERROR:",
                error
            );

            this.scanning = false;

            let errorMessage =
                "Kamera tidak dapat digunakan.";

            if (error.name === "NotAllowedError") {

                errorMessage =
                    "Izin kamera ditolak. Izinkan akses kamera pada browser.";

            } else if (error.name === "NotFoundError") {

                errorMessage =
                    "Kamera tidak ditemukan pada perangkat.";

            } else if (error.name === "NotReadableError") {

                errorMessage =
                    "Kamera sedang digunakan aplikasi lain.";

            } else if (error.message) {

                errorMessage = error.message;
            }

            if (message) {
                message.textContent = errorMessage;
            }

            this.close();

            Dialog.error(
                errorMessage,
                "Scanner Barcode"
            );
        }
    },

    /* ======================================
       PROSES BARCODE
    ====================================== */

    async handleBarcode(barcode) {

        this.scanning = false;

        if (!barcode) {
            return;
        }

        const mode = this.targetMode;
        const index = this.targetIndex;

        const message = document.getElementById(
            "pembelian-barcode-scanner-message"
        );

        if (message) {
            message.textContent =
                "Barcode ditemukan: " + barcode;
        }

        try {

            if (mode === "massal") {

                const page = document.getElementById(
                    "pembelian-massal-modal"
                );

                if (
                    !page ||
                    !PembelianMassal.items[index]
                ) {
                    throw new Error(
                        "Baris item Pembelian Massal tidak ditemukan."
                    );
                }

                PembelianMassal.cariBarcodeSatuan(
                    index,
                    barcode,
                    page
                );

            } else {

                const barcodeInput = document.getElementById(
                    "pembelian-barcode"
                );

                if (barcodeInput) {
                    barcodeInput.value = barcode;
                }

                await Pembelian.scanBarcode(barcode);
            }

        } catch (error) {

            console.error(
                "PROSES BARCODE CAMERA ERROR:",
                error
            );

            Dialog.error(
                error.message ||
                "Gagal memproses barcode.",
                "Pemrosesan Barcode"
            );

        } finally {

            this.close();

            if (mode === "pembelian") {

                const barcodeInput = document.getElementById(
                    "pembelian-barcode"
                );

                if (barcodeInput) {
                    barcodeInput.value = "";
                    barcodeInput.focus();
                }
            }
        }
    },

    /* ======================================
   BIND EVENT TOMBOL CLOSE
====================================== */

bindCloseEvent() {

    const modal = document.getElementById(
        "pembelian-barcode-scanner"
    );

    if (!modal) {
        return;
    }

    const closeButton = document.getElementById(
        "pembelian-barcode-scanner-close"
    );

    if (
        closeButton &&
        closeButton.dataset.bound !== "true"
    ) {

        closeButton.dataset.bound = "true";

        closeButton.addEventListener("click", () => {
            this.close();
        });
    }

    const backdrop = modal.querySelector(
        ".pembelian-barcode-scanner-backdrop"
    );

    if (
        backdrop &&
        backdrop.dataset.bound !== "true"
    ) {

        backdrop.dataset.bound = "true";

        backdrop.addEventListener("click", () => {
            this.close();
        });
    }
},

    /* ======================================
       CLOSE
    ====================================== */

    close() {

        this.scanning = false;

        if (this.controls) {

            try {
                this.controls.stop();
            } catch (error) {
                console.warn("ZXING STOP ERROR:", error);
            }

            this.controls = null;
        }

        this.stopCamera();

        const modal = document.getElementById(
            "pembelian-barcode-scanner"
        );

        if (modal) {
            modal.hidden = true;
        }

        const video = document.getElementById(
            "pembelian-barcode-scanner-video"
        );

        if (video) {

            try {
                video.pause();
            } catch (error) {
                console.warn("VIDEO PAUSE ERROR:", error);
            }

            video.srcObject = null;
        }

        this.detector = null;
        this.lastBarcode = "";
        this.lastDetectedTime = 0;
        this.scanCount = 0;

        this.targetMode = "pembelian";
        this.targetIndex = -1;
    },

    /* ======================================
       STOP CAMERA
    ====================================== */

    stopCamera() {

        if (!this.stream) {
            return;
        }

        this.stream.getTracks().forEach(track => {

            try {
                track.stop();
            } catch (error) {
                console.warn(
                    "CAMERA TRACK STOP ERROR:",
                    error
                );
            }
        });

        this.stream = null;
    }

};
