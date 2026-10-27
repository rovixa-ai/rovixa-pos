// ======================================
// TREEHOUSE POS
// SALES
// RENDER SELECTOR
// ======================================

Object.assign(
    Sales,
    {

        render() {

            const container =
                document.getElementById("pageContent");

            if (!container) {

                console.error(
                    "pageContent tidak ditemukan."
                );

                return;

            }

            const isMobile =
                window.matchMedia(
                    "(max-width: 768px)"
                ).matches ||
                (
                    window.matchMedia(
                        "(pointer: coarse)"
                    ).matches &&
                    window.matchMedia(
                        "(max-width: 1366px)"
                    ).matches
                );

            if (isMobile) {

                if (
                    typeof SalesMobileRender ===
                    "undefined"
                ) {

                    console.error(
                        "SalesMobileRender tidak tersedia."
                    );

                    return;

                }

                container.innerHTML =
                    SalesMobileRender.render();

            } else {

                if (
                    typeof SalesDesktopRender ===
                    "undefined"
                ) {

                    console.error(
                        "SalesDesktopRender tidak tersedia."
                    );

                    return;

                }

                container.innerHTML =
                    SalesDesktopRender.render();

            }

        }

    }
);