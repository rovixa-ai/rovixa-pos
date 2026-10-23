const StoreConfigEvent = {

    event() {

        const saveButton =
            document.getElementById(
                "storeConfigSave"
            );


        if (saveButton) {

            saveButton.addEventListener(
                "click",
                () => StoreConfig.save()
            );

        }


        const nameInput =
            document.getElementById(
                "storeConfigName"
            );


        if (nameInput) {

            nameInput.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter"
                    ) {

                        event.preventDefault();

                        StoreConfig.save();

                    }

                }
            );

        }


        const logoSource =
            document.getElementById(
                "storeConfigLogoSource"
            );


        if (logoSource) {

            logoSource.addEventListener(
                "change",
                () =>
                    StoreConfig.logoSourceChanged()
            );

        }


        const logoFile =
            document.getElementById(
                "storeConfigLogoFile"
            );


        if (logoFile) {

            logoFile.addEventListener(
                "change",
                event =>
                    StoreConfig.logoFileChanged(
                        event
                    )
            );

        }


        const logoDrive =
            document.getElementById(
                "storeConfigLogoDrive"
            );


        if (logoDrive) {

            logoDrive.addEventListener(
                "input",
                () =>
                    StoreConfig.logoSourceChanged()
            );

        }


        const logoUrl =
            document.getElementById(
                "storeConfigLogoUrl"
            );


        if (logoUrl) {

            logoUrl.addEventListener(
                "input",
                () =>
                    StoreConfig.logoSourceChanged()
            );

        }


        StoreConfig.initAccordion();

    }

};