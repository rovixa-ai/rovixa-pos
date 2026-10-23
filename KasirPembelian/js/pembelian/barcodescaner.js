const PembelianBarcodeScanner = {

    stream: null,
    detector: null,
    scanning: false,
    controls: null,

    lastBarcode: "",
    lastDetectedTime: 0,
    scanCount: 0,

    async open() {

        const modal =
            document.getElementById(
                "pembelian-barcode-scanner"
            );

        const video =
            document.getElementById(
                "pembelian-barcode-scanner-video"
            );

        const message =
            document.getElementById(
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

        modal.hidden = false;

        this.scanning = false;
        this.controls = null;
        this.stream = null;

        this.lastBarcode = "";
        this.lastDetectedTime = 0;
        this.scanCount = 0;

        if (message) {

            message.textContent =
                "Menyiapkan kamera...";
        }

        try {

            /* ======================================
               CEK KAMERA
            ====================================== */

            if (
                !navigator.mediaDevices ||
                !navigator.mediaDevices.getUserMedia
            ) {

                throw new Error(
                    "Browser tidak mendukung akses kamera."
                );
            }

            /* ======================================
               CEK ZXING
            ====================================== */

            if (
                !window.ZXingBrowser ||
                !window.ZXingBrowser.BrowserMultiFormatOneDReader
            ) {

                throw new Error(
                    "Library scanner barcode 1D tidak tersedia."
                );
            }

            /* ======================================
               DECODER
            ====================================== */

            this.detector =
                new ZXingBrowser.BrowserMultiFormatOneDReader();

            if (
                "timeBetweenDecodingAttempts" in
                this.detector
            ) {

                this.detector.timeBetweenDecodingAttempts =
                    50;
            }

            /* ======================================
               STATUS
            ====================================== */

            this.scanning = true;

            if (message) {

                message.textContent =
                    "Arahkan barcode ke dalam kotak...";
            }

            /* ======================================
               CAMERA CONSTRAINT
            ====================================== */

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

            /* ======================================
               START SCANNER
            ====================================== */

            this.controls =
                await this.detector.decodeFromConstraints(
                    constraints,
                    video,
                    async (
                        result,
                        error,
                        controls
                    ) => {

                        if (!this.scanning) {
                            return;
                        }

                        this.scanCount++;

                        if (
                            this.scanCount % 100 === 0
                        ) {

                            
                        }

                        if (error || !result) {
                            return;
                        }

                        const text =
                            result.getText
                                ? result.getText()
                                : "";

                        const barcode =
                            String(
                                text || ""
                            ).trim();

                        if (!barcode) {
                            return;
                        }

                       

                        /* ==================================
                           VALIDASI EAN-13
                        ================================== */

                        if (
                            !/^\d{13}$/.test(
                                barcode
                            )
                        ) {

                            return;
                        }

                        /* ==================================
                           DEBOUNCE
                        ================================== */

                        const now =
                            Date.now();

                        if (
                            barcode ===
                            this.lastBarcode &&
                            now -
                            this.lastDetectedTime <
                            1000
                        ) {

                            return;
                        }

                        this.lastBarcode =
                            barcode;

                        this.lastDetectedTime =
                            now;

                        /* ==================================
                           STOP SCANNING
                        ================================== */

                        this.scanning = false;

                        if (message) {

                            message.textContent =
                                "Barcode ditemukan: " +
                                barcode;
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

                        await this.handleBarcode(
                            barcode
                        );
                    }
                );

            /* ======================================
               SIMPAN STREAM
            ====================================== */

            if (video.srcObject) {

                this.stream =
                    video.srcObject;
            }

            /* ======================================
               CAMERA OPTIMIZATION
            ====================================== */

            try {

                const tracks =
                    video.srcObject
                        ? video.srcObject.getVideoTracks()
                        : [];

                if (tracks.length === 0) {

                    console.warn(
                        "Video track kamera tidak ditemukan."
                    );

                } else {

                    const track =
                        tracks[0];

                    this.stream =
                        video.srcObject;

                    const capabilities =
                        track.getCapabilities
                            ? track.getCapabilities()
                            : {};

                    const advanced = {};

                    /* ==================================
                       AUTOFOCUS
                    ================================== */

                    if (
                        Array.isArray(
                            capabilities.focusMode
                        ) &&
                        capabilities.focusMode.includes(
                            "continuous"
                        )
                    ) {

                        advanced.focusMode =
                            "continuous";
                    }

                    /* ==================================
                       ZOOM
                    ================================== */

                    if (capabilities.zoom) {

                        const minZoom =
                            Number(
                                capabilities.zoom.min
                            );

                        const maxZoom =
                            Number(
                                capabilities.zoom.max
                            );

                        let targetZoom = 1.5;

                        targetZoom =
                            Math.max(
                                minZoom,
                                targetZoom
                            );

                        targetZoom =
                            Math.min(
                                maxZoom,
                                targetZoom
                            );

                        if (
                            targetZoom >= minZoom &&
                            targetZoom <= maxZoom
                        ) {

                            advanced.zoom =
                                targetZoom;
                        }
                    }

                    /* ==================================
                       APPLY CAMERA SETTINGS
                    ================================== */

                    if (
                        Object.keys(
                            advanced
                        ).length > 0 &&
                        track.applyConstraints
                    ) {

                        await track.applyConstraints({
                            advanced: [
                                advanced
                            ]
                        });

                        
                    }
                }

            } catch (cameraEnhanceError) {

                console.warn(
                    "CAMERA OPTIMIZATION TIDAK TERSEDIA:",
                    cameraEnhanceError
                );
            }

            /* ======================================
               CAMERA READY
            ====================================== */

           

        } catch (error) {

            console.error(
                "BARCODE CAMERA ERROR:",
                error
            );

            this.scanning = false;

            let errorMessage =
                "Kamera tidak dapat digunakan.";

            if (
                error.name ===
                "NotAllowedError"
            ) {

                errorMessage =
                    "Izin kamera ditolak. Izinkan akses kamera pada browser.";

            } else if (
                error.name ===
                "NotFoundError"
            ) {

                errorMessage =
                    "Kamera tidak ditemukan pada perangkat.";

            } else if (
                error.name ===
                "NotReadableError"
            ) {

                errorMessage =
                    "Kamera sedang digunakan aplikasi lain.";

            } else if (error.message) {

                errorMessage =
                    error.message;
            }

            if (message) {

                message.textContent =
                    errorMessage;
            }

            this.close();

            Dialog.error(
                errorMessage,
                "Scanner Barcode"
            );
        }
    },

    /* ==========================================
       HANDLE BARCODE
    ========================================== */

    async handleBarcode(barcode) {

        this.scanning = false;

        if (!barcode) {
            return;
        }

        

        const message =
            document.getElementById(
                "pembelian-barcode-scanner-message"
            );

        if (message) {

            message.textContent =
                "Barcode ditemukan: " +
                barcode;
        }

        const barcodeInput =
            document.getElementById(
                "pembelian-barcode"
            );

        if (barcodeInput) {

            barcodeInput.value =
                barcode;
        }

        try {

            await Pembelian.scanBarcode(
                barcode
            );

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

            if (barcodeInput) {

                barcodeInput.value = "";

                barcodeInput.focus();
            }
        }
    },

    /* ==========================================
       CLOSE
    ========================================== */

    close() {

        this.scanning = false;

        /* ======================================
           STOP ZXING
        ====================================== */

        if (this.controls) {

            try {

                this.controls.stop();

            } catch (error) {

                console.warn(
                    "ZXING STOP ERROR:",
                    error
                );
            }

            this.controls = null;
        }

        /* ======================================
           STOP CAMERA
        ====================================== */

        this.stopCamera();

        /* ======================================
           HIDE MODAL
        ====================================== */

        const modal =
            document.getElementById(
                "pembelian-barcode-scanner"
            );

        if (modal) {

            modal.hidden = true;
        }

        /* ======================================
           RESET VIDEO
        ====================================== */

        const video =
            document.getElementById(
                "pembelian-barcode-scanner-video"
            );

        if (video) {

            try {

                video.pause();

            } catch (error) {

                console.warn(
                    "VIDEO PAUSE ERROR:",
                    error
                );
            }

            video.srcObject = null;
        }

        /* ======================================
           RESET STATE
        ====================================== */

        this.detector = null;

        this.lastBarcode = "";
        this.lastDetectedTime = 0;
        this.scanCount = 0;
    },

    /* ==========================================
       STOP CAMERA
    ========================================== */

    stopCamera() {

        if (!this.stream) {
            return;
        }

        this.stream
            .getTracks()
            .forEach(
                track => {

                    try {

                        track.stop();

                    } catch (error) {

                        console.warn(
                            "CAMERA TRACK STOP ERROR:",
                            error
                        );
                    }
                }
            );

        this.stream = null;
    }

};