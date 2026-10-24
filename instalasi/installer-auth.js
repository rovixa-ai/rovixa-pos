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

                            if (this.webAppUrl) {

                                await this.retrySaveClientConfiguration();

                                return;
                            }

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

                            if (this.webAppUrl) {

                                await this.retrySaveClientConfiguration();

                                return;
                            }

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

        this.waitingForAppsScriptSettings = true;

        this.showAppsScriptSettingsStep(
            "Sebelum membuat database, periksa pengaturan Google Apps Script API terlebih dahulu. Aktifkan jika diperlukan, lalu kembali ke installer dan lanjutkan."
        );

    },


    async verifyAppsScriptApi() {

        this.setStatus(
            "Memeriksa akses Google Apps Script API...",
            "loading"
        );

        const templateScriptId =
            INSTALLER_CONFIG.TEMPLATE_SCRIPT_ID;

        if (!templateScriptId) {

            throw new Error(
                "TEMPLATE_SCRIPT_ID belum dikonfigurasi."
            );

        }

        let response;

        try {

            response = await fetch(
                INSTALLER_CONFIG.SCRIPT_API +
                "/projects/" +
                encodeURIComponent(templateScriptId) +
                "/content",
                {
                    method: "GET",
                    headers: {
                        Authorization:
                            "Bearer " + this.accessToken
                    }
                }
            );

        } catch (error) {

            throw new Error(
                "Tidak dapat menghubungi Google Apps Script API. Periksa koneksi internet dan konfigurasi API."
            );

        }

        if (!response.ok) {

            let details = {};

            try {
                details = await response.json();
            } catch (error) {
                details = {};
            }

            const apiMessage =
                details.error?.message || "";

            const status =
                response.status;

            const error = new Error(
                status === 403
                    ? "Akses Apps Script API ditolak. Pastikan API aktif dan akun Google memiliki izin mengakses project template. " + apiMessage
                    : status === 404
                        ? "Project Apps Script template tidak ditemukan atau akun tidak memiliki akses."
                        : "Pemeriksaan Apps Script API gagal (HTTP " +
                          status +
                          "). " +
                          apiMessage
            );

            error.service = "apps-script";
            error.status = status;

            throw error;

        }

        const result =
            await response.json();

        if (!result.files?.length) {

            const error = new Error(
                "File pada project Apps Script template tidak ditemukan."
            );

            error.service = "apps-script";

            throw error;

        }

        this.waitingForAppsScriptSettings = false;

        this.setStatus(
            "Akses Apps Script API berhasil diverifikasi.",
            "success"
        );

        if (this.webAppUrl) {

            await this.retrySaveClientConfiguration();

            return;
        }

        if (!this.spreadsheetId) {

            await this.installStoreDatabase();

            return;

        }

        if (!this.scriptId) {

            if (this.databaseReadyForScript) {

                await this.createBoundScriptFromTemplate();

            } else {

                throw new Error(
                    "Spreadsheet sudah dibuat tetapi proses penyalinan database belum selesai. Jangan membuat spreadsheet baru."
                );

            }

        }

        await this.runDeployment();

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