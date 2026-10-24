/* ======================================
   ROVIXA POS
   INSTALLER DEPLOYMENT
====================================== */

Object.assign(Installer, {

    /* ======================================
       RUN DEPLOYMENT
    ====================================== */

    async runDeployment() {

        if (!this.spreadsheetId || !this.scriptId) {
            throw new Error(
                "Spreadsheet atau Script ID pelanggan tidak ditemukan."
            );
        }

        this.setBusy(true);

        this.waitingForSpreadsheetOpen = true;
        this.waitingForAppsScriptSettings = false;

        this.updateInstallationProgress?.(
            3,
            "Memproses deployment Apps Script"
        );

        this.hideActionPanel?.();

        try {

            this.setStatus(
                "Memverifikasi Apps Script pelanggan...",
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
                (deployment.entryPoints || []).find(
                    (entry) =>
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
            this.databaseReadyForScript = true;

            this.setBusy(false);

            this.showSuccess();

        } catch (error) {

            this.setBusy(false);

            this.waitingForSpreadsheetOpen =
                Boolean(this.spreadsheetId && this.scriptId);

            this.waitingForAppsScriptSettings =
                Boolean(this.spreadsheetId && this.scriptId);

            this.setStatus(
                this.getDeploymentErrorMessage(error),
                "error"
            );

            this.showRetryDeploymentStep(
                this.getDeploymentErrorMessage(error)
            );
        }
    },


    /* ======================================
       DEPLOYMENT ERROR MESSAGE
    ====================================== */

    getDeploymentErrorMessage(error) {

        const message =
            error?.message ||
            "Deployment gagal.";

        const combined =
            (
                message + " " +
                (error?.apiStatus || "") + " " +
                (error?.apiReason || []).join(" ")
            ).toLowerCase();

        if (
            combined.includes("apps script api") ||
            combined.includes("script.googleapis.com") ||
            combined.includes("accessnotconfigured") ||
            combined.includes("service_disabled") ||
            combined.includes("has not been used") ||
            combined.includes("is disabled")
        ) {

            return (
                "Google Apps Script API belum aktif atau belum dapat digunakan " +
                "pada proyek Google Cloud yang terkait. Buka pengaturan Apps Script " +
                "API, aktifkan jika diperlukan, lalu kembali ke installer dan tekan " +
                "Lanjutkan Deployment. Database yang sudah dibuat tidak perlu dibuat ulang. " +
                "Detail: " + message
            );
        }

        if (
            combined.includes("permission_denied") ||
            combined.includes("insufficient") ||
            combined.includes("unauthorized") ||
            combined.includes("forbidden") ||
            combined.includes("access denied")
        ) {

            return (
                "Google menolak izin untuk melanjutkan deployment. Pastikan akun " +
                "Google yang digunakan memiliki akses ke template dan spreadsheet, " +
                "serta telah memberikan izin yang diminta. Setelah memperbaikinya, " +
                "kembali ke installer dan tekan Lanjutkan Deployment. Detail: " +
                message
            );
        }

        return (
            "Deployment belum berhasil. Database dan Apps Script yang sudah " +
            "dibuat tetap digunakan. Periksa pengaturan API atau izin Google, " +
            "kemudian kembali ke installer dan tekan Lanjutkan Deployment. Detail: " +
            message
        );
    },


    /* ======================================
       VERIFY BOUND SCRIPT
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

        if (project.parentId !== this.spreadsheetId) {
            throw new Error(
                "Script ID yang ditemukan bukan milik spreadsheet pelanggan."
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
                    versionNumber,
                    manifestFileName: "appsscript",
                    description:
                        "Rovixa POS Web App - " +
                        this.storeName
                })
            }
        );
    }

});