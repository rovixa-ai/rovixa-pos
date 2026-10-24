/* ======================================
   ROVIXA POS
   INSTALLER DEPLOYMENT
====================================== */

Object.assign(Installer, {

    /* ======================================
       RUN DEPLOYMENT
    ====================================== */

    async runDeployment() {

        if (
            !this.waitingForSpreadsheetOpen ||
            !this.spreadsheetId
        ) {

            throw new Error(
                "Spreadsheet hasil salinan tidak ditemukan."
            );
        }

        this.setBusy(true);

        try {

            this.setStatus(
                "Menunggu Script ID hasil salinan...",
                "loading"
            );

            this.scriptId =
                await this.waitForCopiedScriptId();

            this.setStatus(
                "Memverifikasi proyek Apps Script...",
                "loading"
            );

            await this.verifyCopiedScript();

            this.setStatus(
                "Membuat versi Apps Script...",
                "loading"
            );

            const version =
                await this.createScriptVersion();

            if (!version.versionNumber) {

                throw new Error(
                    "Nomor versi Apps Script tidak ditemukan."
                );
            }

            this.setStatus(
                "Melakukan deployment Web App...",
                "loading"
            );

            const deployment =
                await this.createWebAppDeployment(
                    version.versionNumber
                );

            const webApp =
                (deployment.entryPoints || [])
                    .find((entry) =>
                        entry.entryPointType === "WEB_APP"
                    );

            if (!webApp?.webApp?.url) {

                throw new Error(
                    "Deployment dibuat, tetapi URL Web App tidak ditemukan."
                );
            }

            this.webAppUrl =
                webApp.webApp.url;

            this.waitingForSpreadsheetOpen = false;
            this.waitingForAppsScriptSettings = false;

            this.setBusy(false);

            this.showSuccess();

        } catch (error) {

            this.setBusy(false);

            this.setStatus(
                error.message ||
                "Deployment gagal.",
                "error"
            );

            /*
             * Jangan menyalin ulang database ketika
             * deployment gagal. Pengguna dapat mencoba
             * melanjutkan kembali dari langkah ini.
             */
            this.waitingForSpreadsheetOpen = true;
            this.waitingForAppsScriptSettings = true;

            this.showRetryDeploymentStep(
                error.message ||
                "Deployment gagal."
            );
        }
    },


    /* ======================================
       WAIT FOR COPIED SCRIPT ID
    ====================================== */

    async waitForCopiedScriptId() {

        const startedAt =
            Date.now();

        let lastError = "";

        while (
            Date.now() - startedAt <
            INSTALLER_CONFIG.SCRIPT_ID_TIMEOUT
        ) {

            const elapsedSeconds =
                Math.floor(
                    (Date.now() - startedAt) / 1000
                );

            this.setStatus(
                "Menunggu Script ID hasil salinan... " +
                elapsedSeconds +
                " detik dari 30 detik.",
                "loading"
            );

            try {

                const scriptId =
                    await this.readCopiedScriptId();

                if (
                    scriptId &&
                    scriptId !==
                    INSTALLER_CONFIG.TEMPLATE_SCRIPT_ID
                ) {

                    return scriptId;
                }

                lastError =
                    "Script ID yang terbaca masih sama dengan ID template.";

            } catch (error) {

                lastError =
                    error.message;

            }

            await new Promise((resolve) => {

                setTimeout(
                    resolve,
                    INSTALLER_CONFIG.SCRIPT_ID_WAIT_INTERVAL
                );

            });

        }

        throw new Error(
            "Script ID hasil salinan tidak berhasil diperoleh dalam 30 detik. " +
            (lastError || "Pastikan spreadsheet salinan sudah dibuka.")
        );
    },


    /* ======================================
       READ SCRIPT ID FROM SHEET
    ====================================== */

    async readCopiedScriptId() {

        const range =
            encodeURIComponent(
                INSTALLER_CONFIG.SCRIPT_CONFIG_RANGE
            );

        const url =
            INSTALLER_CONFIG.SHEETS_API +
            "/spreadsheets/" +
            encodeURIComponent(this.spreadsheetId) +
            "/values/" +
            range;

        const result =
            await this.apiRequest(url);

        const rows =
            result.values || [];

        const row =
            rows.find((item) =>
                item[0] === "scriptId"
            );

        const scriptId =
            row?.[1]?.trim();

        if (!scriptId) {

            throw new Error(
                "Script ID belum tertulis di sheet konfigurasi."
            );
        }

        if (
            !/^[a-zA-Z0-9_-]+$/.test(scriptId)
        ) {

            throw new Error(
                "Format Script ID tidak valid."
            );
        }

        return scriptId;
    },


    /* ======================================
       VERIFY COPIED SCRIPT
    ====================================== */

    async verifyCopiedScript() {

        const url =
            INSTALLER_CONFIG.SCRIPT_API +
            "/projects/" +
            encodeURIComponent(this.scriptId);

        const project =
            await this.apiRequest(url);

        if (
            !project.scriptId ||
            project.scriptId !== this.scriptId
        ) {

            throw new Error(
                "Proyek Apps Script tidak berhasil diverifikasi."
            );
        }

        if (
            project.parentId &&
            project.parentId !== this.spreadsheetId
        ) {

            throw new Error(
                "Script ID yang ditemukan bukan milik spreadsheet hasil salinan."
            );
        }

        return project;
    },


    /* ======================================
       CREATE VERSION
    ====================================== */

    async createScriptVersion() {

        const url =
            INSTALLER_CONFIG.SCRIPT_API +
            "/projects/" +
            encodeURIComponent(this.scriptId) +
            "/versions";

        return this.apiRequest(
            url,
            {

                method: "POST",

                body: JSON.stringify({

                    description:
                        "Rovixa POS - " +
                        this.storeName +
                        " - Instalasi otomatis"

                })

            }
        );
    },


    /* ======================================
       CREATE WEB APP DEPLOYMENT
    ====================================== */

    async createWebAppDeployment(versionNumber) {

        const url =
            INSTALLER_CONFIG.SCRIPT_API +
            "/projects/" +
            encodeURIComponent(this.scriptId) +
            "/deployments";

        return this.apiRequest(
            url,
            {
                method: "POST",

                body: JSON.stringify({
                    versionNumber: versionNumber,

                    manifestFileName: "appsscript",

                    description:
                        "Rovixa POS Web App - " +
                        this.storeName
                })
            }
        );
    }

});
