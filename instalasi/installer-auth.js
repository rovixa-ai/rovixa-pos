/* ======================================
   ROVIXA POS
   INSTALLER GOOGLE AUTHENTICATION
====================================== */

Object.assign(Installer, {

    loadGoogleIdentity() {

        if (
            window.google &&
            google.accounts &&
            google.accounts.oauth2
        ) {
            this.initializeTokenClient();
            return;
        }

        const existingScript =
            document.querySelector(
                'script[src="https://accounts.google.com/gsi/client"]'
            );

        if (existingScript) {

            existingScript.addEventListener(
                "load",
                () => this.initializeTokenClient(),
                { once: true }
            );

            existingScript.addEventListener(
                "error",
                () => {
                    this.setStatus(
                        "Google Identity Services gagal dimuat.",
                        "error"
                    );
                },
                { once: true }
            );

            return;
        }

        const script =
            document.createElement("script");

        script.src =
            "https://accounts.google.com/gsi/client";

        script.async = true;
        script.defer = true;

        script.onload = () => {
            this.initializeTokenClient();
        };

        script.onerror = () => {

            this.setStatus(
                "Google Identity Services gagal dimuat.",
                "error"
            );

        };

        document.head.appendChild(script);
    },


    initializeTokenClient() {

        if (
            !window.google ||
            !google.accounts ||
            !google.accounts.oauth2
        ) {

            this.setStatus(
                "Layanan autentikasi Google belum tersedia.",
                "error"
            );

            return;
        }

        this.tokenClient =
            google.accounts.oauth2.initTokenClient({

                client_id:
                    INSTALLER_CONFIG.CLIENT_ID,

                scope:
                    INSTALLER_CONFIG.OAUTH_SCOPES,

                callback: async (response) => {

                    if (
                        !response ||
                        response.error ||
                        !response.access_token
                    ) {

                        this.setBusy(false);

                        this.setStatus(
                            "Otorisasi Google gagal: " +
                            (
                                response?.error_description ||
                                response?.error ||
                                "Token akses tidak diperoleh."
                            ),
                            "error"
                        );

                        return;
                    }

                    this.accessToken =
                        response.access_token;

                    const purpose =
                        this.oauthPurpose;

                    this.oauthPurpose = "";

                    try {

                        if (purpose === "verify-api") {

                            await this.verifyAppsScriptApi();

                            return;
                        }

                        if (purpose === "install") {

                            if (this.spreadsheetId) {

                                if (!this.scriptId) {

                                    await this.createBoundScriptFromTemplate();

                                }

                                if (this.scriptId) {

                                    await this.runDeployment();

                                } else {

                                    throw new Error(
                                        "Apps Script belum siap. Database yang sudah dibuat tidak akan dibuat ulang."
                                    );

                                }

                                return;
                            }

                            await this.installStoreDatabase();

                        } else if (purpose === "deploy") {

                            if (!this.spreadsheetId) {

                                throw new Error(
                                    "Spreadsheet belum tersedia. Periksa status instalasi sebelum mencoba kembali."
                                );

                            }

                            if (
                                !this.scriptId &&
                                this.databaseReadyForScript
                            ) {

                                await this.createBoundScriptFromTemplate();

                            }

                            if (this.scriptId) {

                                await this.runDeployment();

                            } else {

                                throw new Error(
                                    "Apps Script belum siap. Silakan periksa pengaturan API lalu ulangi langkah ini."
                                );

                            }

                        } else {

                            this.setBusy(false);

                            this.setStatus(
                                "Tujuan otorisasi tidak ditemukan. Silakan ulangi langkah terakhir.",
                                "error"
                            );

                        }

                    } catch (error) {

                        this.setBusy(false);

                        if (
                            error.service === "apps-script" ||
                            this.waitingForAppsScriptSettings
                        ) {

                            this.showAppsScriptSettingsStep(
                                error.message ||
                                "Google Apps Script API belum dapat digunakan."
                            );

                            return;
                        }

                        this.setStatus(
                            error.message ||
                            "Instalasi gagal.",
                            "error"
                        );

                    }

                }

            });
    },


    startInstallation() {

        if (this.busy) {
            return;
        }

        const nameInput =
            document.getElementById("store-name");

        const storeName =
            nameInput?.value?.trim();

        if (!storeName) {

            this.setStatus(
                "Nama toko wajib diisi.",
                "error"
            );

            nameInput?.focus();

            return;
        }

        if (!this.tokenClient) {

            this.setStatus(
                "Layanan Google belum siap. Coba kembali.",
                "error"
            );

            return;
        }

        this.storeName = storeName;

        /*
         * TAHAP PERTAMA:
         * Tampilkan pengaturan Apps Script terlebih dahulu.
         * Jangan membuat spreadsheet pada tahap ini.
         */

        this.waitingForAppsScriptSettings = true;

        this.showAppsScriptSettingsStep(
            "Sebelum membuat database, periksa pengaturan Google Apps Script API terlebih dahulu. Aktifkan jika diperlukan, lalu kembali ke installer dan lanjutkan."
        );

    },


    async verifyAppsScriptApi() {

        this.setBusy(true);

        this.setStatus(
            "Memeriksa akses Google Apps Script API...",
            "loading"
        );

        try {

            const response = await fetch(
                "https://script.googleapis.com/v1/projects",
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            "Bearer " + this.accessToken
                    }
                }
            );

            /*
             * HTTP 200 atau 403 bisa berarti API sudah aktif,
             * tetapi 403 juga bisa disebabkan izin atau kebijakan.
             * Karena itu, jangan menganggap 403 sebagai sukses.
             */

            if (response.status === 403) {

                const result =
                    await response.json().catch(() => ({}));

                throw new Error(
                    result?.error?.message ||
                    "Akses Google Apps Script API ditolak. Pastikan API aktif dan akun memiliki izin yang diperlukan."
                );

            }

            if (!response.ok) {

                const result =
                    await response.json().catch(() => ({}));

                throw new Error(
                    result?.error?.message ||
                    "Pemeriksaan Google Apps Script API gagal. HTTP " +
                    response.status
                );

            }

            this.waitingForAppsScriptSettings = false;

            this.setStatus(
                "Akses Google Apps Script API berhasil diperiksa. Melanjutkan pembuatan database...",
                "success"
            );

            /*
             * Spreadsheet baru dibuat setelah pemeriksaan berhasil.
             * Jika ID sudah tersedia, lanjutkan proses yang ada.
             */

            if (this.spreadsheetId) {

                this.oauthPurpose = "deploy";

                if (!this.scriptId) {

                    await this.createBoundScriptFromTemplate();

                }

                if (this.scriptId) {

                    await this.runDeployment();

                } else {

                    throw new Error(
                        "Apps Script belum siap. Database yang sudah dibuat tidak akan dibuat ulang."
                    );

                }

                return;
            }

            await this.installStoreDatabase();

        } catch (error) {

            this.setBusy(false);

            this.waitingForAppsScriptSettings = true;

            this.showAppsScriptSettingsStep(
                error.message ||
                "Google Apps Script API belum dapat digunakan. Periksa pengaturan API, lalu coba lagi."
            );

        }

    },


    continueAfterAppsScriptSettings() {

        if (this.busy) {
            return;
        }

        const nameInput =
            document.getElementById("store-name");

        const storeName =
            nameInput?.value?.trim() ||
            this.storeName ||
            "";

        if (!storeName) {

            this.setStatus(
                "Nama toko wajib diisi.",
                "error"
            );

            nameInput?.focus();

            return;
        }

        if (!this.tokenClient) {

            this.setStatus(
                "Layanan Google belum siap. Coba kembali.",
                "error"
            );

            return;
        }

        this.storeName = storeName;

        this.oauthPurpose = "verify-api";

        this.setBusy(true);

        this.setStatus(
            "Meminta izin Google untuk memeriksa Apps Script API...",
            "loading"
        );

        this.tokenClient.requestAccessToken({
            prompt: "consent select_account"
        });

    }

});