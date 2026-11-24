
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
            async (event) => {

                if (
                    button.disabled ||
                    button.dataset.loading === "true" ||
                    this.actionInProgress ||
                    this.busy
                ) {
                    return;
                }

                this.actionInProgress = true;

                const buttons =
                    Array.from(
                        document.querySelectorAll("button")
                    );

                const previousStates =
                    buttons.map(item => ({
                        button: item,
                        disabled: item.disabled
                    }));

                buttons.forEach(item => {
                    item.disabled = true;
                });

                button.dataset.loading = "true";
                button.setAttribute("aria-busy", "true");

                try {

                    if (typeof callback === "function") {
                        await callback(event);
                    }

                } finally {

                    this.actionInProgress = false;

                    previousStates.forEach(state => {

                        if (!state.button.isConnected) {
                            return;
                        }

                        delete state.button.dataset.busyDisabled;

                        state.button.disabled =
                            state.disabled || Boolean(this.busy);

                    });

                    delete button.dataset.loading;
                    button.removeAttribute("aria-busy");

                }

            }
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
       READ CLIENT APPLICATION LINKS
       GOOGLE SHEETS API V4
    ====================================== */

    async readClientApplicationLinks() {

        const clientSpreadsheetId =
            INSTALLER_CONFIG.CLIENT_CONFIG_SPREADSHEET_ID;

        const clientId =
            String(this.spreadsheetId || "").trim();

        if (!clientSpreadsheetId) {
            throw new Error(
                "Spreadsheet konfigurasi pusat tidak tersedia."
            );
        }

        if (!clientId) {
            throw new Error(
                "Spreadsheet ID toko tidak tersedia."
            );
        }

        if (!this.accessToken) {
            throw new Error(
                "Token akses Google tidak tersedia. Silakan lakukan autentikasi kembali."
            );
        }

        const range =
            INSTALLER_CONFIG.CLIENT_CONFIG_RANGE ||
            "Clients!A:I";

        const url =
            INSTALLER_CONFIG.SHEETS_API +
            "/spreadsheets/" +
            encodeURIComponent(clientSpreadsheetId) +
            "/values/" +
            encodeURIComponent(range);

        const response =
            await this.apiRequest(
                url,
                {
                    method: "GET"
                }
            );

        const rows =
            response &&
            Array.isArray(response.values)
                ? response.values
                : [];

        if (rows.length < 2) {
            throw new Error(
                "Data konfigurasi pelanggan belum tersedia."
            );
        }

        const matches =
            rows.slice(1).filter(row =>
                String(row[2] || "").trim() === clientId
            );

        if (matches.length === 0) {
            throw new Error(
                "Data toko tidak ditemukan di Client Config Spreadsheet."
            );
        }

        if (matches.length > 1) {
            throw new Error(
                "Data toko ditemukan lebih dari satu kali di Client Config Spreadsheet."
            );
        }

        const row =
            matches[0];

        const storeName =
            String(row[0] || "").trim();

        if (!storeName) {
            throw new Error(
                "Nama toko pada konfigurasi pusat tidak tersedia."
            );
        }

        return {
            storeName: storeName,

            managementUrl:
                String(row[6] || "").trim(),

            penjualanUrl:
                String(row[7] || "").trim(),

            pembelianUrl:
                String(row[8] || "").trim()
        };
    },


    /* ======================================
       CREATE APPLICATION LINK
    ====================================== */

    createApplicationLink(label, url) {

        const container =
            document.createElement("div");

        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "6px";
        container.style.padding = "14px";
        container.style.marginBottom = "10px";
        container.style.border = "1px solid #d6e2dd";
        container.style.borderRadius = "12px";
        container.style.background =
            "linear-gradient(145deg, #ffffff 0%, #f8fbfa 100%)";

        const title =
            document.createElement("strong");

        title.textContent =
            label;

        title.style.color = "#17221e";
        title.style.fontSize = "14px";

        container.appendChild(title);

        const normalizedUrl =
            String(url || "").trim();

        if (!normalizedUrl) {

            const unavailable =
                document.createElement("span");

            unavailable.textContent =
                "Link belum tersedia.";

            unavailable.style.fontSize = "13px";
            unavailable.style.color = "#68766f";

            container.appendChild(unavailable);

            return container;
        }

        let parsedUrl;

        try {
            parsedUrl =
                new URL(normalizedUrl);
        } catch (error) {
            parsedUrl = null;
        }

        if (
            !parsedUrl ||
            !["https:", "http:"].includes(parsedUrl.protocol)
        ) {

            const invalid =
                document.createElement("span");

            invalid.textContent =
                "URL tidak valid.";

            invalid.style.fontSize = "13px";
            invalid.style.color = "#dc2626";

            container.appendChild(invalid);

            return container;
        }

        const link =
            document.createElement("a");

        link.href =
            parsedUrl.href;

        link.target = "_blank";

        link.rel =
            "noopener noreferrer";

        link.textContent =
            "Buka Aplikasi";

        link.style.display = "inline-block";
        link.style.color = "#059669";
        link.style.fontSize = "13px";
        link.style.fontWeight = "600";
        link.style.textDecoration = "none";
        link.style.wordBreak = "break-all";

        container.appendChild(link);

        return container;
    },


    /* ======================================
       SHOW FINAL INSTALLATION PAGE
    ====================================== */

    showFinalInstallationPage(configuration) {

        const content =
            this.showActionPanel(
                "Instalasi Berhasil",
                "Aplikasi Rovixa POS untuk toko " +
                    configuration.storeName +
                    " berhasil disiapkan."
            );

        if (!content) {
            return;
        }

        const heading =
            document.createElement("h3");

        heading.textContent =
            configuration.storeName;

        heading.style.margin = "0 0 16px";
        heading.style.fontSize = "18px";
        heading.style.fontWeight = "700";
        heading.style.color = "#17221e";

        const description =
            document.createElement("p");

        description.textContent =
            "Silakan pilih aplikasi yang ingin dibuka.";

        description.style.margin = "0 0 14px";
        description.style.fontSize = "13px";
        description.style.color = "#68766f";

        const linksContainer =
            document.createElement("div");

        linksContainer.style.display = "flex";
        linksContainer.style.flexDirection = "column";
        linksContainer.style.gap = "2px";

        linksContainer.append(
            this.createApplicationLink(
                "Management",
                configuration.managementUrl
            ),

            this.createApplicationLink(
                "Penjualan",
                configuration.penjualanUrl
            ),

            this.createApplicationLink(
                "Pembelian",
                configuration.pembelianUrl
            )
        );

        content.append(
            heading,
            description,
            linksContainer
        );
    },


    /* ======================================
       COMPLETE INSTALLATION
    ====================================== */

    async completeInstallation() {

        this.updateInstallationProgress(
            4,
            "Menyiapkan halaman akhir instalasi"
        );

        this.setStatus(
            "Otorisasi telah dikonfirmasi. Sedang mengambil link aplikasi dari Client Config Spreadsheet...",
            "loading"
        );

        this.hideActionPanel();

        try {

            const configuration =
                await this.readClientApplicationLinks();

            this.updateInstallationProgress(
                4,
                "Instalasi selesai"
            );

            this.setStatus(
                "Instalasi berhasil. Ketiga link aplikasi telah berhasil dibaca dari Client Config Spreadsheet.",
                "success"
            );

            this.showFinalInstallationPage(
                configuration
            );

        } catch (error) {

            console.error(
                "Gagal mengambil link aplikasi:",
                error
            );

            this.setStatus(
                error && error.message
                    ? error.message
                    : "Instalasi selesai, tetapi link aplikasi gagal dimuat.",
                "error"
            );

            const content =
                this.showActionPanel(
                    "Link aplikasi belum berhasil dimuat",
                    "Instalasi dan deployment sudah selesai. Anda dapat mencoba mengambil kembali link aplikasi dari Client Config Spreadsheet."
                );

            if (content) {

                const retryButton =
                    this.createActionButton(
                        "Coba Muat Link Kembali",
                        () => this.completeInstallation()
                    );

                content.appendChild(
                    retryButton
                );
            }
        }
    },


    /* ======================================
       SUCCESS
       OPEN WEB APP FOR OWNER AUTHORIZATION
    ====================================== */

    showSuccess() {

        this.updateInstallationProgress(
            4,
            "Menunggu otorisasi Google"
        );

        if (!this.webAppUrl) {

            this.hideActionPanel();

            this.setStatus(
                "Deployment selesai, tetapi URL Web App tidak tersedia. Periksa hasil deployment.",
                "error"
            );

            return;
        }

        this.setStatus(
            "Deployment berhasil. Buka Web App untuk menyelesaikan otorisasi Google Apps Script. Halaman Installer akan tetap terbuka.",
            "success"
        );

        const content =
            this.showActionPanel(
                "Verifikasi otorisasi Google",
                "Buka Web App pada tab baru. Selesaikan persetujuan Google dengan menekan Izinkan. Setelah Web App menampilkan respons JSON, kembali ke tab Installer ini."
            );

        if (!content) {
            return;
        }

        const openButton =
            this.createActionButton(
                "Buka Web App untuk Otorisasi",
                () => {

                    if (!this.webAppUrl) {

                        this.setStatus(
                            "URL Web App tidak tersedia.",
                            "error"
                        );

                        return;
                    }

                    const webAppWindow =
                        window.open(
                            this.webAppUrl,
                            "_blank"
                        );

                    if (!webAppWindow) {

                        this.setStatus(
                            "Tab Web App tidak dapat dibuka. Izinkan popup untuk halaman Installer, kemudian coba kembali.",
                            "error"
                        );

                        return;
                    }

                    this.setStatus(
                        "Web App telah dibuka pada tab baru. Selesaikan otorisasi Google, kemudian kembali ke halaman Installer.",
                        "info"
                    );

                }
            );

        const instruction =
            document.createElement("p");

        instruction.textContent =
            "Setelah menekan Izinkan di Google dan melihat respons JSON Web App, kembali ke tab Installer.";

        instruction.style.fontSize = "12px";
        instruction.style.lineHeight = "1.7";
        instruction.style.marginTop = "12px";

        const confirmButton =
            this.createActionButton(
                "Saya Sudah Menyelesaikan Otorisasi",
                () => {

                    const confirmed =
                        window.confirm(
                            "Apakah Anda sudah menekan Izinkan dan melihat respons JSON dari Web App?"
                        );

                    if (!confirmed) {
                        return;
                    }

                    this.completeInstallation();

                }
            );

        content.append(
            openButton,
            instruction,
            confirmButton
        );
    }

});
