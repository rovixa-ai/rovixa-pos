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

                        if (purpose === "install") {

                            await this.installStoreDatabase();

                        } else if (purpose === "deploy") {

                            if (
                                !this.scriptId &&
                                this.databaseReadyForScript
                            ) {
                                await this.createBoundScriptFromTemplate();

                                await this.saveScriptIdToSpreadsheet();
                            }

                            if (this.scriptId) {

                                await this.runDeployment();

                            } else {

                                throw new Error(
                                    "Apps Script belum siap. Periksa pengaturan API lalu ulangi langkah ini."
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
        this.oauthPurpose = "install";

        this.setBusy(true);

        this.setStatus(
            "Meminta izin Google...",
            "loading"
        );

        this.tokenClient.requestAccessToken({
            prompt: "consent select_account"
        });
    }

});