/* ======================================
   ROVIXA POS
   INSTALLER INITIALIZATION
====================================== */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        () => Installer.init(),
        { once: true }
    );

} else {

    Installer.init();

}