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
            "Spreadsheet pelanggan berhasil dibuat dari template, Apps Script terikat berhasil dibuat, dan deployment Web App berhasil dibuat.";

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
