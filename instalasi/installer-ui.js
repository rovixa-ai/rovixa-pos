/* ======================================
   ROVIXA POS
   INSTALLER UI
====================================== */

Object.assign(Installer, {

    /* ======================================
       UPDATE INSTALLATION PROGRESS
    ====================================== */

    updateInstallationProgress(step, label) {

        const progressLabel =
            document.getElementById(
                "installer-progress-label"
            );

        const progressFill =
            document.getElementById(
                "installer-progress-fill"
            );

        const steps =
            document.querySelectorAll(
                ".step-item[data-step]"
            );

        const currentStep =
            Math.max(1, Math.min(4, Number(step) || 1));

        if (progressLabel) {
            progressLabel.textContent =
                label || "Memproses instalasi...";
        }

        if (progressFill) {
            progressFill.style.width =
                ((currentStep - 1) / 3 * 100) + "%";
        }

        steps.forEach((item) => {

            const itemStep =
                Number(item.dataset.step);

            item.classList.toggle(
                "active",
                itemStep === currentStep
            );

            item.classList.toggle(
                "completed",
                itemStep < currentStep
            );

            if (itemStep === currentStep) {
                item.setAttribute(
                    "aria-current",
                    "step"
                );
            } else {
                item.removeAttribute("aria-current");
            }

            const number =
                item.querySelector(".step-number");

            if (number) {
                number.textContent =
                    itemStep < currentStep
                        ? "✓"
                        : String(itemStep);
            }
        });
    },


    /* ======================================
       UPDATE STATUS PANEL
    ====================================== */

    updateStatusPanel(title, badge, state) {

        const panel =
            document.getElementById(
                "installer-status-panel"
            );

        const titleElement =
            document.getElementById(
                "installer-status-title"
            );

        const badgeElement =
            document.getElementById(
                "installer-status-badge"
            );

        const status =
            document.getElementById(
                "installer-status"
            );

        if (panel) {
            panel.hidden = false;
            panel.dataset.state = state || "info";
        }

        if (titleElement) {
            titleElement.textContent =
                title || "Status instalasi";
        }

        if (badgeElement) {
            badgeElement.textContent =
                badge || "Memproses";
        }

        if (status) {
            status.classList.add("visible");
            status.classList.remove(
                "error",
                "success"
            );

            if (state === "error") {
                status.classList.add("error");
            }

            if (state === "success") {
                status.classList.add("success");
            }
        }

        const icon =
            document.getElementById(
                "installer-status-icon"
            );

        if (icon) {
            icon.dataset.state = state || "info";
        }
    },


    /* ======================================
       SET STATUS MESSAGE
    ====================================== */

    setStatus(message, type = "info") {

        const status =
            document.getElementById(
                "installer-status"
            );

        if (!status) {
            return;
        }

        const normalizedType =
            type === "loading"
                ? "loading"
                : type === "error"
                    ? "error"
                    : type === "success"
                        ? "success"
                        : "info";

        const panel =
            document.getElementById(
                "installer-status-panel"
            );

        const titleMap = {
            loading: "Sedang memproses instalasi",
            error: "Proses memerlukan perhatian",
            success: "Proses berhasil",
            info: "Informasi instalasi"
        };

        const badgeMap = {
            loading: "Memproses",
            error: "Perlu tindakan",
            success: "Berhasil",
            info: "Informasi"
        };

        this.updateStatusPanel(
            titleMap[normalizedType],
            badgeMap[normalizedType],
            normalizedType
        );

        status.replaceChildren();

        const paragraph =
            document.createElement("p");

        paragraph.textContent =
            message || "";

        status.appendChild(paragraph);

        status.classList.add("visible");
        status.classList.remove("error", "success");

        if (normalizedType === "error") {
            status.classList.add("error");
        }

        if (normalizedType === "success") {
            status.classList.add("success");
        }

        if (panel) {
            panel.hidden = false;
        }
    },


    /* ======================================
       ACTION PANEL
    ====================================== */

    showActionPanel(title, description) {

        const panel =
            document.getElementById(
                "installer-action-panel"
            );

        const titleElement =
            document.getElementById(
                "installer-action-title"
            );

        const descriptionElement =
            document.getElementById(
                "installer-action-description"
            );

        const content =
            document.getElementById(
                "installer-action-content"
            );

        if (!panel || !content) {
            return null;
        }

        panel.hidden = false;

        if (titleElement) {
            titleElement.textContent =
                title || "Tindakan diperlukan";
        }

        if (descriptionElement) {
            descriptionElement.textContent =
                description || "";
        }

        content.replaceChildren();

        return content;
    },


    /* ======================================
       HIDE ACTION PANEL
    ====================================== */

    hideActionPanel() {

        const panel =
            document.getElementById(
                "installer-action-panel"
            );

        const content =
            document.getElementById(
                "installer-action-content"
            );

        if (content) {
            content.replaceChildren();
        }

        if (panel) {
            panel.hidden = true;
        }
    },


    /* ======================================
       CREATE ACTION BUTTON
    ====================================== */

    createActionButton(text, callback, className = "") {

        const button =
            document.createElement("button");

        button.type = "button";
        button.textContent = text;

        if (className) {
            button.className = className;
        }

        button.addEventListener(
            "click",
            callback
        );

        return button;
    },


    /* ======================================
       RETRY DEPLOYMENT STEP
    ====================================== */

    showRetryDeploymentStep(message) {

        this.setStatus(
            message ||
                "Deployment belum berhasil. Periksa pengaturan Google Apps Script API.",
            "error"
        );

        this.updateInstallationProgress(
            3,
            "Menunggu deployment"
        );

        const content =
            this.showActionPanel(
                "Lanjutkan instalasi",
                "Database dan Apps Script yang sudah dibuat akan tetap digunakan. Aktifkan API jika diperlukan, lalu kembali ke halaman ini."
            );

        if (!content) {
            return;
        }

        const settingsLink =
            document.createElement("a");

        settingsLink.href =
            INSTALLER_CONFIG.APPS_SCRIPT_SETTINGS_URL;

        settingsLink.target = "_blank";

        settingsLink.rel =
            "noopener noreferrer";

        settingsLink.textContent =
            "Buka Pengaturan Apps Script API";

        settingsLink.style.display = "inline-block";
        settingsLink.style.marginBottom = "10px";

        const instruction =
            document.createElement("p");

        instruction.textContent =
            "1. Buka pengaturan Google di tab baru. 2. Aktifkan Google Apps Script API jika belum aktif. 3. Kembali ke halaman installer ini.";

        instruction.style.fontSize = "12px";
        instruction.style.lineHeight = "1.7";
        instruction.style.color = "#92400e";

        const button =
            this.createActionButton(
                "Lanjutkan Deployment",
                () => this.continueDeployment()
            );

        content.append(
            settingsLink,
            instruction,
            button
        );
    },


    /* ======================================
       SUCCESS
    ====================================== */

    showSuccess() {

        this.updateInstallationProgress(
            4,
            "Instalasi selesai"
        );

        this.setStatus(
            "Database toko, Apps Script, dan deployment Web App berhasil disiapkan.",
            "success"
        );

        this.hideActionPanel();

        const status =
            document.getElementById(
                "installer-status"
            );

        if (!status) {
            return;
        }

        const databaseLink =
            document.createElement("a");

        databaseLink.href =
            this.spreadsheetUrl;

        databaseLink.target = "_blank";

        databaseLink.rel =
            "noopener noreferrer";

        databaseLink.textContent =
            "Buka Database Toko";

        databaseLink.style.display = "block";
        databaseLink.style.marginTop = "12px";

        const urlLabel =
            document.createElement("p");

        urlLabel.textContent =
            "URL Web App:";

        urlLabel.style.fontWeight = "bold";
        urlLabel.style.marginTop = "16px";

        const urlLink =
            document.createElement("a");

        urlLink.href =
            this.webAppUrl;

        urlLink.target = "_blank";

        urlLink.rel =
            "noopener noreferrer";

        urlLink.textContent =
            this.webAppUrl;

        urlLink.style.display = "block";
        urlLink.style.marginTop = "6px";

        const copyButton =
            this.createActionButton(
                "Salin URL Web App",
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
            databaseLink,
            urlLabel,
            urlLink,
            copyButton
        );
    }

});