/* ======================================
   ROVIXA POS
   INSTALLER DEPLOYMENT
====================================== */

Object.assign(Installer, {

    async runDeployment() {

        if (!this.spreadsheetId || !this.scriptId) {
            throw new Error(
                "Spreadsheet atau Script ID pelanggan tidak ditemukan."
            );
        }

        this.setBusy(true);

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

            this.webAppUrl = webApp.webApp.url;

            this.waitingForSpreadsheetOpen = false;
            this.waitingForAppsScriptSettings = false;

            this.setBusy(false);
            this.showSuccess();

        } catch (error) {

            this.setBusy(false);

            this.setStatus(
                error.message || "Deployment gagal.",
                "error"
            );

            this.waitingForSpreadsheetOpen =
                Boolean(this.spreadsheetId);

            this.waitingForAppsScriptSettings = true;

            this.showRetryDeploymentStep(
                error.message || "Deployment gagal."
            );
        }
    },


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