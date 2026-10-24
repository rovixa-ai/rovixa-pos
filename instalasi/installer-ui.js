
/* ======================================
   ROVIXA POS
   INSTALLER UI
====================================== */

Object.assign(Installer, {

    /* ======================================
       RETRY DEPLOYMENT STEP
    ====================================== */

    showRetryDeploymentStep(message) {

        const status =
            document.getElementById(
                "installer-status"
            );

        if (!status) {
            return;
        }

        status.className =
            "installer-status installer-status-error";

        status.replaceChildren();

        const title =
            document.createElement("strong");

        title.textContent =
            "Deployment belum berhasil.";

        const description =
            document.createElement("p");

        description.textContent =
            message +
            " Periksa pengaturan Apps Script API. Database yang sudah disalin tetap digunakan.";

        const settingsLink =
            document.createElement("a");

        settingsLink.href =
            INSTALLER_CONFIG.APPS_SCRIPT_SETTINGS_URL;

        settingsLink.target = "_blank";

        settingsLink.rel =
            "noopener noreferrer";

        settingsLink.textContent =
            "Buka Pengaturan Apps Script";

        const button =
            document.createElement("button");

        button.type = "button";

        button.textContent =
            "Coba Deployment Lagi";

        button.addEventListener(
            "click",
            () => this.continueDeployment()
        );

        status.append(
            title,
            description,
            settingsLink,
            document.createElement("br"),
            button
        );
    },


    /* ======================================
       AUTHORIZATION STEP
    ====================================== */

    showAuthorizationStep() {

        const status =
            document.getElementById(
                "installer-status"
            );

        if (!status) {
            return;
        }

        status.className =
            "installer-status";

        status.replaceChildren();

        const title =
            document.createElement("strong");

        title.textContent =
            "Deployment Web App berhasil.";

        const description =
            document.createElement("p");

        description.textContent =
            "Langkah berikutnya, buka Web App untuk menyelesaikan otorisasi Google Apps Script jika diminta.";

        const openButton =
            document.createElement("button");

        openButton.type = "button";

        openButton.textContent =
            "Buka Web App untuk Otorisasi";

        openButton.addEventListener(
            "click",
            () => {

                if (!this.webAppUrl) {

                    this.setStatus(
                        "URL Web App tidak tersedia.",
                        "error"
                    );

                    return;
                }

                window.open(
                    this.webAppUrl,
                    "_blank",
                    "noopener,noreferrer"
                );

            }
        );

        const instruction =
            document.createElement("p");

        instruction.textContent =
            "Selesaikan izin Google pada tab yang terbuka. Setelah selesai, kembali ke halaman installer ini.";

        const confirmButton =
            document.createElement("button");

        confirmButton.type = "button";

        confirmButton.textContent =
            "Saya Sudah Memberikan Izin";

        confirmButton.addEventListener(
            "click",
            async () => {

                if (this.busy) {
                    return;
                }

                this.setBusy(true);

                this.setStatus(
                    "Memeriksa URL Web App...",
                    "loading"
                );

                try {

                    if (
                        typeof this.verifyWebAppUrl !==
                        "function"
                    ) {

                        throw new Error(
                            "Fungsi verifikasi Web App belum tersedia."
                        );
                    }

                    await this.verifyWebAppUrl();

                    this.authorizationStepCompleted =
                        true;

                    this.setBusy(false);

                    this.showSuccess();

                } catch (error) {

                    this.setBusy(false);

                    this.setStatus(
                        "URL Web App belum dapat diverifikasi. Pastikan proses otorisasi sudah selesai, lalu buka kembali Web App dan coba lagi. " +
                        (
                            error.message || ""
                        ),
                        "error"
                    );

                    this.showAuthorizationStep();

                }

            }
        );

        status.append(
            title,
            description,
            openButton,
            instruction,
            confirmButton
        );
    },


    /* ======================================
       SUCCESS
    ====================================== */

    showSuccess() {

        const status =
            document.getElementById(
                "installer-status"
            );

        if (!status) {
            return;
        }

        status.className =
            "installer-status installer-status-success";

        status.replaceChildren();

        const title =
            document.createElement("strong");

        title.textContent =
            "Instalasi Rovixa POS berhasil.";

        const description =
            document.createElement("p");

        description.textContent =
            "Database berhasil disalin, deployment Web App dibuat, dan langkah otorisasi installer telah diselesaikan.";

        const databaseLink =
            document.createElement("a");

        databaseLink.href =
            this.spreadsheetUrl;

        databaseLink.target = "_blank";

        databaseLink.rel =
            "noopener noreferrer";

        databaseLink.textContent =
            "Buka Database";

        const urlLabel =
            document.createElement("p");

        urlLabel.textContent =
            "URL Web App:";

        const urlLink =
            document.createElement("a");

        urlLink.href =
            this.webAppUrl;

        urlLink.target = "_blank";

        urlLink.rel =
            "noopener noreferrer";

        urlLink.textContent =
            this.webAppUrl;

        const copyButton =
            document.createElement("button");

        copyButton.type = "button";

        copyButton.textContent =
            "Salin URL Web App";

        copyButton.addEventListener(
            "click",
            async () => {

                try {

                    await navigator.clipboard.writeText(
                        this.webAppUrl
                    );

                    copyButton.textContent =
                        "URL berhasil disalin";

                } catch {

                    this.setStatus(
                        "Penyalinan otomatis gagal. Salin URL Web App secara manual.",
                        "error"
                    );

                }

            }
        );

        status.append(
            title,
            description,
            databaseLink,
            urlLabel,
            urlLink,
            copyButton
        );
    }

});
