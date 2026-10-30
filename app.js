
(function () {
    "use strict";

    const params =
        new URLSearchParams(
            window.location.search
        );

    const clientId =
        (params.get("client") || "").trim();

    const statusElement =
        document.getElementById("client-status");

    const appLinks =
        document.querySelectorAll("[data-app-link]");

    if (!clientId) {

        statusElement.textContent =
            "ID pelanggan tidak ditemukan. Buka Treehouse POS menggunakan tautan pelanggan yang valid.";

        statusElement.classList.add("error");

        appLinks.forEach(link => {

            link.addEventListener("click", function (event) {

                event.preventDefault();

                statusElement.textContent =
                    "Aplikasi tidak dibuka karena parameter client belum tersedia.";

                statusElement.classList.add("error");

            });

        });

        return;
    }

    appLinks.forEach(link => {

        const target =
            new URL(
                link.getAttribute("href"),
                window.location.href
            );

        target.searchParams.set(
            "client",
            clientId
        );

        link.href = target.href;

    });

    statusElement.textContent =
        "ID pelanggan terdeteksi. Silakan pilih aplikasi.";

})();
