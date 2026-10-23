const DashboardRender = {

    render() {

        const isMobile =
            window.innerWidth <= 768;


        if (isMobile) {

            if (
                typeof DashboardMobileRender !==
                "undefined"
            ) {

                return DashboardMobileRender.render();

            }


            return "";

        }


        if (
            typeof DashboardDesktopRender !==
            "undefined"
        ) {

            return DashboardDesktopRender.render();

        }


        return "";

    }

};