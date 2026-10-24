/* ======================================
   ROVIXA POS
   INSTALLER CONFIGURATION
====================================== */

const INSTALLER_CONFIG = {

    CLIENT_ID:
        "465650752797-ji8ha0uvs5d173v588qapiur7dsl4lnp.apps.googleusercontent.com",

    TEMPLATE_SPREADSHEET_ID:
        "1MNXOrJqIO2xGytntyeHK87R0r_Zf0CNb2W748FXEc14",

    TEMPLATE_SCRIPT_ID:
        "179UpTQqLCA3SavC6M07GFqBLCWHQh87AIFpJ4Wj53rKf_0mCi4FHMJR4",

    CLIENT_CONFIG_SPREADSHEET_ID:
        "1osbB9wmW_7_s9OyOZzXhAFwZndZ83L8ZE_O3DnBxvJQ",

    CLIENT_CONFIG_SHEET_NAME:
        "Clients",

    CLIENT_CONFIG_RANGE:
        "Clients!A:F",

    CLIENT_CONFIG_HEADERS: [
        "Nama Toko",
        "Email Google",
        "Spreadsheet ID",
        "Apps Script ID",
        "Web App URL",
        "Tanggal Instalasi"
    ],

    DRIVE_API:
        "https://www.googleapis.com/drive/v3",

    SHEETS_API:
        "https://sheets.googleapis.com/v4",

    SCRIPT_API:
        "https://script.googleapis.com/v1",

    FOLDER_NAME:
        "Rovixa POS",

    SCRIPT_CONFIG_RANGE:
        "__INSTALLER_CONFIG!A1:B2",

    SCRIPT_ID_WAIT_INTERVAL:
        1000,

    SCRIPT_ID_TIMEOUT:
        30000,

    APPS_SCRIPT_SETTINGS_URL:
        "https://script.google.com/home/usersettings",

    OAUTH_VERIFICATION_HELP_URL:
        "https://support.google.com/cloud/answer/9110914",

    OAUTH_SCOPES: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/script.projects",
        "https://www.googleapis.com/auth/script.deployments"
    ].join(" ")
};