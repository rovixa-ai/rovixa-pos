// ======================================
// TREEHOUSE POS
// SALES
// RENDER SELECTOR
// ORIENTATION RESPONSIVE
// ======================================

Object.assign(
    Sales,
    {
        renderResizeHandler: null,
        renderResizeTimer: null,
        renderObserver: null,
        currentRenderMode: null,

        /* ==================================
           DETEKSI MODE TAMPILAN
        ================================== */

        getRenderMode() {
            const isMobile = window.matchMedia(
                "(max-width: 768px)"
            ).matches;

            const isPortrait = window.matchMedia(
                "(orientation: portrait)"
            ).matches;

            if (isMobile && isPortrait) {
                return "mobile";
            }

            return "desktop";
        },

        /* ==================================
           RENDER HALAMAN SALES
        ================================== */

        render() {
            const container = document.getElementById(
                "pageContent"
            );

            if (!container) {
                console.error(
                    "pageContent tidak ditemukan."
                );
                return;
            }

            const renderMode = this.getRenderMode();

            const pageSelector =
                renderMode === "mobile"
                    ? ".sales-mobile-page"
                    : ".sales-desktop-page";

            /*
             * Pastikan struktur halaman sesuai mode.
             * Jika mode sama dan struktur benar,
             * jangan mengganti DOM.
             */

            if (
                this.currentRenderMode === renderMode &&
                container.querySelector(pageSelector)
            ) {
                return;
            }

            let html = "";

            /* ==================================
               MOBILE PORTRAIT
            ================================== */

            if (renderMode === "mobile") {
                if (
                    typeof SalesMobileRender === "undefined"
                ) {
                    console.error(
                        "SalesMobileRender tidak tersedia."
                    );
                    return;
                }

                html = SalesMobileRender.render();
            }

            /* ==================================
               DESKTOP / MOBILE LANDSCAPE
            ================================== */

            else {
                if (
                    typeof SalesDesktopRender === "undefined"
                ) {
                    console.error(
                        "SalesDesktopRender tidak tersedia."
                    );
                    return;
                }

                html = SalesDesktopRender.render();
            }

            /*
             * Ganti struktur tampilan saja.
             * Jangan reset Sales.products,
             * Sales.cart, atau Sales.discount.
             */

            container.innerHTML = html;

            this.currentRenderMode = renderMode;

            /* ==================================
               PULIHKAN DAFTAR BARANG
            ================================== */

            if (
                typeof this.renderProducts === "function"
            ) {
                this.renderProducts();
            }

            /* ==================================
               PULIHKAN KERANJANG
            ================================== */

            if (
                typeof Cart !== "undefined" &&
                typeof Cart.render === "function"
            ) {
                Cart.render();
            }

            /* ==================================
               PASANG ULANG EVENT SALES
            ================================== */

            if (typeof this.event === "function") {
                this.event();
            }

            /* ==================================
               PASANG ULANG EVENT KERANJANG
            ================================== */

            if (
                typeof Cart !== "undefined" &&
                typeof Cart.event === "function"
            ) {
                Cart.event();
            }
        },

        /* ==================================
           EVENT PERUBAHAN ORIENTASI
        ================================== */

        watchRenderMode() {
            /*
             * Hindari pemasangan listener ganda.
             */

            if (this.renderResizeHandler) {
                window.removeEventListener(
                    "resize",
                    this.renderResizeHandler
                );

                window.removeEventListener(
                    "orientationchange",
                    this.renderResizeHandler
                );
            }

            if (this.renderResizeTimer !== null) {
                clearTimeout(this.renderResizeTimer);
                this.renderResizeTimer = null;
            }

            this.renderResizeHandler = () => {
                if (this.renderResizeTimer !== null) {
                    clearTimeout(this.renderResizeTimer);
                }

                this.renderResizeTimer = setTimeout(() => {
                    this.renderResizeTimer = null;

                    const nextMode = this.getRenderMode();

                    const container = document.getElementById(
                        "pageContent"
                    );

                    if (!container) {
                        return;
                    }

                    const expectedSelector =
                        nextMode === "mobile"
                            ? ".sales-mobile-page"
                            : ".sales-desktop-page";

                    const currentPageExists =
                        Boolean(
                            container.querySelector(
                                expectedSelector
                            )
                        );

                    if (
                        nextMode !== this.currentRenderMode ||
                        !currentPageExists
                    ) {
                        this.render();
                    }
                }, 150);
            };

            window.addEventListener(
                "resize",
                this.renderResizeHandler
            );

            window.addEventListener(
                "orientationchange",
                this.renderResizeHandler
            );
        }
    }
);