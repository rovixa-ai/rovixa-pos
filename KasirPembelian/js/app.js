/*======================================
TREEHOUSE POS
APP
======================================*/

const App = {

    async init() {

        Loading.show(
            "Menyiapkan database dan memuat data aplikasi...",
            "Memuat Aplikasi"
        );

        try {

            Loading.update(
                "Menginisialisasi database lokal...",
                "Memuat Aplikasi"
            );

            await DB.init();

            Loading.update(
                "Memuat konfigurasi toko...",
                "Memuat Aplikasi"
            );

            await StoreConfig.load();

            Loading.update(
                "Menyiapkan sinkronisasi data...",
                "Memuat Aplikasi"
            );

            Sync.init();

            /*======================================
            DOWNLOAD DATA USER UNTUK LOGIN
            ======================================*/

            Loading.update(
                "Memuat data pengguna...",
                "Memuat Aplikasi"
            );

            if (
                typeof Download !== "undefined" &&
                typeof Download.downloadUsers === "function"
            ) {

                const usersResult =
                    await Download.downloadUsers();

                if (
                    !usersResult ||
                    usersResult.success !== true
                ) {

                    console.warn(
                        "Download user gagal:",
                        usersResult?.message
                    );

                }

            }

            /*======================================
            DOWNLOAD DATA TRANSAKSI
            ======================================*/

            Loading.update(
                "Mengunduh dan menyiapkan data transaksi...",
                "Memuat Aplikasi"
            );

            const result =
                await Download.bootstrap();

            if (
                !result ||
                !result.success
            ) {

                console.warn(
                    "Download gagal:",
                    result?.message
                );

            }

            /*======================================
            VALIDASI SESSION LOGIN
            ======================================*/

            Loading.update(
                "Memeriksa sesi pengguna...",
                "Memuat Aplikasi"
            );

            let sessionResult = {
                success: false,
                loggedIn: false
            };

            if (
                typeof Auth !== "undefined" &&
                typeof Auth.validateSession === "function"
            ) {

                sessionResult =
                    await Auth.validateSession();

            }

            /*======================================
            SESSION VALID
            BUKA HALAMAN PEMBELIAN
            ======================================*/

            if (
                sessionResult &&
                sessionResult.success === true &&
                sessionResult.loggedIn === true
            ) {

                Loading.update(
                    "Menyiapkan tampilan aplikasi...",
                    "Memuat Aplikasi"
                );

                this.renderHeader();

                Router.go("pembelian");

            }

            /*======================================
            SESSION TIDAK VALID
            TAMPILKAN LOGIN
            ======================================*/

            else {

                if (
                    typeof Login === "undefined" ||
                    typeof Login.init !== "function"
                ) {

                    throw new Error(
                        "Modul Login tidak tersedia. " +
                        "Pastikan js/auth.js dan js/login.js sudah dimuat."
                    );

                }

                await Login.init();

            }

        } catch (error) {

            console.error(
                "APP PEMBELIAN INIT ERROR:",
                error
            );

            Dialog.error(
                error.message ||
                "Gagal memuat aplikasi."
            );

        } finally {

            Loading.hide();

        }

    },


    /*======================================
LOGOUT
======================================*/

async logout() {

    const confirmed = await Dialog.confirm(
            "Apakah Anda yakin ingin logout?",
            {
                title: "Konfirmasi Logout",
                confirmText: "Ya, Logout",
                cancelText: "Batal",
                variant: "danger"
            }
        );

        if (!confirmed) {
            return;
        }

    if (
        typeof Auth !== "undefined" &&
        typeof Auth.logout === "function"
    ) {

        Auth.logout();

    }

    const app =
        document.getElementById("app");

    if (app) {

        app.classList.add(
            "login-mode"
        );

    }

    const loginPage =
        document.getElementById("loginPage");

    if (loginPage) {

        loginPage.remove();

    }

    if (
        typeof Login !== "undefined" &&
        typeof Login.init === "function"
    ) {

        await Login.init();

    } else {

        Dialog.error(
            "Modul Login tidak tersedia."
        );

    }

},


    /*======================================
    RENDER HEADER
    ======================================*/

    renderHeader() {

        const isMobile =
            window.matchMedia(
                "(max-width: 768px)"
            ).matches;

        if (isMobile) {

            AppMobileRender.renderHeader();

        } else {

            AppDesktopRender.renderHeader();

        }

        const sidebar =
            document.getElementById("sidebar");

        if (sidebar) {
            sidebar.remove();
        }

        const mobileMenu =
            document.getElementById("mobileMenu");

        if (mobileMenu) {
            mobileMenu.remove();
        }

    },


    /*======================================
    RENDER PEMBELIAN MASSAL
    DESKTOP / MOBILE
    ======================================*/

    renderPembelianMassal() {

        const isMobile =
            window.matchMedia(
                "(max-width: 768px)"
            ).matches;

        if (isMobile) {

            if (
                typeof PembelianMassalMobileRender ===
                "undefined"
            ) {

                console.error(
                    "PembelianMassalMobileRender tidak ditemukan. " +
                    "Pastikan masal-render-mobile.js sudah dimuat."
                );

                return null;

            }

            return PembelianMassalMobileRender.render();

        }

        if (
            typeof PembelianMassalRender ===
            "undefined"
        ) {

            console.error(
                "PembelianMassalRender tidak ditemukan. " +
                "Pastikan masal-render.js sudah dimuat."
            );

            return null;

        }

        return PembelianMassalRender.render();

    },


    /*======================================
    LOAD PAGE
    ======================================*/

    loadPage(page) {

        /*==================================
        CEGAH AKSES HALAMAN TANPA LOGIN
        ==================================*/

        if (
            typeof Auth !== "undefined" &&
            !Auth.isLoggedIn()
        ) {

            if (
                typeof Login !== "undefined"
            ) {

                Login.init();

            }

            return;

        }

        const pages = {

            pembelian: {
                title: "Pembelian",
                subtitle: "Transaksi pembelian"
            },

            "laporan-pembelian": {
                title: "Laporan Pembelian",
                subtitle: "Laporan transaksi pembelian"
            }

        };

        const info =
            pages[page];

        if (!info) {
            return;
        }


        /*==================================
        PEMBELIAN MASSAL
        SEBAGAI HALAMAN UTAMA
        ==================================*/

        if (page === "pembelian") {

            const headerTitle =
                document.getElementById(
                    "header-title"
                );

            const headerSubtitle =
                document.getElementById(
                    "header-subtitle"
                );

            const pageElement =
                document.getElementById(
                    "page"
                );

            if (headerTitle) {

                headerTitle.textContent =
                    info.title;

            }

            if (headerSubtitle) {

                headerSubtitle.textContent =
                    info.subtitle;

            }

            if (!pageElement) {
                return;
            }

            const renderedHTML =
                this.renderPembelianMassal();

            if (renderedHTML === null) {
                return;
            }

            pageElement.innerHTML =
                renderedHTML;

            const params =
                typeof Router !== "undefined"
                    ? Router.params || {}
                    : {};

            PembelianMassal.init(params);


            /*==================================
            LAPORAN PEMBELIAN MODAL
            ==================================*/

            const laporanModal =
                document.getElementById(
                    "laporanPembelianModal"
                );

            if (!laporanModal) {

                const laporanContainer =
                    document.createElement(
                        "div"
                    );

                laporanContainer.innerHTML =
                    LaporanPembelian.render();

                const modal =
                    laporanContainer.firstElementChild;

                if (modal) {

                    document.body.appendChild(
                        modal
                    );

                }

            }

            LaporanPembelian.init();

        }


        /*==================================
        LAPORAN PEMBELIAN
        MODAL
        ==================================*/

        else if (
            page === "laporan-pembelian"
        ) {

            LaporanPembelian.openModal();

            return;

        }

    }

};


document.addEventListener(
    "DOMContentLoaded",
    () => {

        App.init();

    }
);