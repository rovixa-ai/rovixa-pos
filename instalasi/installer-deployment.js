/* ======================================
   ROVIXA POS
   INSTALLER DEPLOYMENT
====================================== */

Object.assign(Installer, {

    /* ======================================
       RUN DEPLOYMENT
    ====================================== */

    async runDeployment() {

        if (this.busy && this._deploymentProcessActive) {
            return;
        }

        if (!this.spreadsheetId || !this.scriptId) {
            throw new Error(
                "Spreadsheet atau Script ID pelanggan tidak ditemukan."
            );
        }

        this._deploymentProcessActive = true;

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

            this.setStatus(
                "Deployment berhasil. Menyimpan data instalasi...",
                "loading"
            );

            await this.saveClientConfiguration();

            this.showSuccess();

        } catch (error) {

            if (this.webAppUrl) {

                this.setStatus(
                    "Deployment Web App sudah berhasil, tetapi data instalasi " +
                    "belum berhasil disimpan ke Client Configuration. " +
                    "Tekan tombol Coba Simpan Lagi untuk mengulangi penyimpanan " +
                    "tanpa membuat database atau deployment baru. Detail: " +
                    (error?.message || "Penyimpanan gagal."),
                    "error"
                );

                this.showRetryClientConfigurationStep();

                return;
            }

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

        } finally {

            this._deploymentProcessActive = false;

            this.setBusy(false);

        }
    },


    /* ======================================
       SAVE CLIENT CONFIGURATION
    ====================================== */

    async saveClientConfiguration() {

        if (
            !this.spreadsheetId ||
            !this.scriptId ||
            !this.webAppUrl
        ) {
            throw new Error(
                "Data instalasi belum lengkap. Spreadsheet ID, Script ID, " +
                "dan Web App URL wajib tersedia."
            );
        }

        const masterSpreadsheetId =
            INSTALLER_CONFIG.CLIENT_CONFIG_SPREADSHEET_ID;

        const sheetName =
            INSTALLER_CONFIG.CLIENT_CONFIG_SHEET_NAME;

        if (!masterSpreadsheetId || !sheetName) {
            throw new Error(
                "ID spreadsheet atau nama tab Client Configuration belum dikonfigurasi."
            );
        }

        const deploymentOwnsBusyState =
            Boolean(this._deploymentProcessActive);

        this.setBusy(true);

        try {

            this.setStatus(
                "Menyimpan hasil instalasi ke Client Configuration...",
                "loading"
            );

            const email =
                await this.getInstallerGoogleEmail();

            const storeName =
                String(this.storeName || "").trim();

            if (!storeName) {
                throw new Error(
                    "Nama toko belum tersedia."
                );
            }

            if (!email) {
                throw new Error(
                    "Email akun Google tidak berhasil diperoleh. " +
                    "Pastikan izin email Google sudah diberikan."
                );
            }

            const installedAt =
                new Date().toISOString();

            const rowValues = [
                storeName,
                email,
                this.spreadsheetId,
                this.scriptId,
                this.webAppUrl,
                installedAt
            ];

            const escapedSheetName =
                "'" + sheetName.replace(/'/g, "''") + "'";

            const readRange =
                encodeURIComponent(
                    escapedSheetName + "!A:F"
                );

            const readUrl =
                INSTALLER_CONFIG.SHEETS_API +
                "/spreadsheets/" +
                encodeURIComponent(masterSpreadsheetId) +
                "/values/" +
                readRange;

            const result =
                await this.apiRequest(readUrl);

            const rows =
                Array.isArray(result.values)
                    ? result.values
                    : [];

            const existingIndex =
                rows.findIndex((row, index) =>
                    index > 0 &&
                    String(row?.[2] || "").trim() ===
                        this.spreadsheetId
                );

            if (existingIndex >= 0) {

                const sheetRow =
                    existingIndex + 1;

                const updateRange =
                    encodeURIComponent(
                        escapedSheetName +
                        "!A" + sheetRow +
                        ":F" + sheetRow
                    );

                const updateUrl =
                    INSTALLER_CONFIG.SHEETS_API +
                    "/spreadsheets/" +
                    encodeURIComponent(masterSpreadsheetId) +
                    "/values/" +
                    updateRange +
                    "?valueInputOption=USER_ENTERED";

                await this.apiRequest(
                    updateUrl,
                    {
                        method: "PUT",
                        body: JSON.stringify({
                            range:
                                escapedSheetName +
                                "!A" + sheetRow +
                                ":F" + sheetRow,
                            majorDimension: "ROWS",
                            values: [rowValues]
                        })
                    }
                );

            } else {

                const appendRange =
                    encodeURIComponent(
                        escapedSheetName + "!A:F"
                    );

                const appendUrl =
                    INSTALLER_CONFIG.SHEETS_API +
                    "/spreadsheets/" +
                    encodeURIComponent(masterSpreadsheetId) +
                    "/values/" +
                    appendRange +
                    ":append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS";

                await this.apiRequest(
                    appendUrl,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            majorDimension: "ROWS",
                            values: [rowValues]
                        })
                    }
                );

            }

            this.clientConfigurationSaved = true;
            this.clientConfigurationEmail = email;

            return true;

        } finally {

            /*
             * Jika deployment masih berjalan, deployment yang
             * bertanggung jawab mengaktifkan kembali tombol.
             */

            if (!deploymentOwnsBusyState) {
                this.setBusy(false);
            }

        }
    },


    /* ======================================
       GET INSTALLER GOOGLE EMAIL
    ====================================== */

    async getInstallerGoogleEmail() {

        if (this.clientConfigurationEmail) {
            return this.clientConfigurationEmail;
        }

        const existingEmail =
            this.googleEmail ||
            this.userEmail ||
            this.accountEmail ||
            this.email;

        if (existingEmail) {
            this.clientConfigurationEmail =
                String(existingEmail).trim();

            return this.clientConfigurationEmail;
        }

        if (!this.accessToken) {
            throw new Error(
                "Token akses Google tidak tersedia. Silakan autentikasi kembali."
            );
        }

        const response = await fetch(
            "https://openidconnect.googleapis.com/v1/userinfo",
            {
                method: "GET",
                headers: {
                    Authorization: "Bearer " + this.accessToken
                }
            }
        );

        let profile = {};

        try {
            profile = await response.json();
        } catch (error) {
            profile = {};
        }

        if (!response.ok || !profile.email) {
            throw new Error(
                profile.error_description ||
                profile.error?.message ||
                "Email akun Google tidak dapat dibaca. " +
                "Pastikan OAuth memiliki scope openid, email, " +
                "dan https://www.googleapis.com/auth/userinfo.email. " +
                "Autentikasi ulang Google, lalu coba simpan kembali."
            );
        }

        this.clientConfigurationEmail =
            String(profile.email).trim();

        return this.clientConfigurationEmail;
    },


    /* ======================================
       RETRY SAVE CLIENT CONFIGURATION
    ====================================== */

    async retrySaveClientConfiguration() {

        if (this.busy) {
            return;
        }

        this.setBusy(true);
        this.hideActionPanel?.();

        try {

            await this.saveClientConfiguration();

            this.showSuccess();

        } catch (error) {

            this.setStatus(
                "Data instalasi belum berhasil disimpan ke Client Configuration. " +
                "Database dan deployment yang sudah dibuat tetap digunakan. " +
                "Periksa izin Google, lalu coba simpan kembali. Detail: " +
                (error?.message || "Penyimpanan gagal."),
                "error"
            );

            this.showRetryClientConfigurationStep();

        } finally {

            this.setBusy(false);

        }
    },


    /* ======================================
       SHOW RETRY SAVE ACTION
    ====================================== */

    showRetryClientConfigurationStep() {

        const content =
            this.showActionPanel(
                "Simpan hasil instalasi",
                "Deployment Web App sudah tersedia. Perbaiki izin atau koneksi " +
                "Google jika diperlukan, lalu simpan kembali data instalasi. " +
                "Database dan deployment tidak akan dibuat ulang."
            );

        if (!content) return;

        const button =
            this.createActionButton(
                "Coba Simpan Lagi",
                () => this.retrySaveClientConfiguration()
            );

        content.appendChild(button);
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