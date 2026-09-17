
const { getApiBaseUrl } = require('../utils/apiBaseUrl');

const producation_base = "https://app.erpportaal.nl/api/";
const development = "https://development.erpportaal.nl/api/";

const isProductation = true

function activeBase() {
    return getApiBaseUrl(isProductation ? producation_base : development);
}

const paths = {
    Login: 'login',
    Verifyotp: 'verify_otp',
    Workorderuitvoer: 'workorder',
    resend_otp: 'resend_otp',
    companyLogin: 'company_login',
    register: 'registers',
    createUserWithRelaties: 'create_user_with_relaties',
    relationship: 'get_relationship',
    permission: 'permission',
    emailmobilelogin: 'login_email_mobile',
    maritalstatus: 'get_marital_status',
    Connections: 'get_connections',
    relatiesdata: 'get_relaties_data',
    langauge: 'get_language',
    country: 'get_country',
    countryList: 'country/list',
    getOrderByDriver: 'tms-driver/get-tms-order-by-region',
    Verify_status: 'tms-driver/verify-order-item-status',
    status_update: 'tms-driver/update-order-item-status',
    status_list: 'tms-driver/get-tms-status-list',
    store_image_comment: 'tms-driver/store-tms-comment-img',
    missed_backorder: 'tms-driver/manage-missed-or-backorder',
    get_AllSlideDataApi: 'tms-home/get-tms-home-slider',
    getMultipleOrderData: 'tms-driver/get-multiple-orders-data-by-ids',
    get_order_data_by_id: 'tms-driver/get-order-data-by-id',
    get_location_by_region_date: 'tms-driver/get-location-by-region-date',
    store_customer_signature: 'tms-driver/store-customer-signature',
    get_tms_orders_flat_by_region: 'tms-driver/get-tms-orders-flat-by-region',
    store_tms_comment: 'tms-driver/store-tms-comment',
    store_tms_comment_img_new: 'tms-driver/store-tms-comment-img-new',
    store_tms_image_upload_error: 'tms-driver/store-tms-image-upload-error',
    update_driver_live_location: 'tms-driver/update-driver-live-location',
    start_region_trip: 'tms-driver/start-region-trip',
    end_region_trip: 'tms-driver/end-region-trip',
    revert_order_item_status: 'tms-driver/revert-order-item-status',
    update_order_item_product: 'tms-driver/update-order-item-product',
    update_order_data: 'tms-driver/update-order-data',
    get_add_product_categories: 'tms-driver/get-add-product-categories',
    get_add_product_prices: 'tms-driver/get-add-product-prices',
    add_product_to_order: 'tms-driver/add-product-to-order',
    send_driver_whatsapp_message: 'tms-driver/send-driver-whatsapp-message',
    contactUs: 'store-contact-us',
    getDriverCompany: 'tms-driver/get-driver-company',
    storeDriverCompany: 'tms-driver/store-driver-company',
    updateDriverCompany: 'tms-driver/update-driver-company',
    uploadDriverCompanyLogo: 'tms-driver/upload-driver-company-logo',
    updateProfile: 'updateprofiles',
    getQuickUploadTypes: 'documenten/get-quick-upload-types',
    getRelatieDocuments: 'documenten/get-relatie-documents',
    getDocumentDetails: 'documenten/get-document-details',
    quickUploadDocument: 'documenten/quick-upload',
};

const apiConstants = {};

Object.keys(paths).forEach((key) => {
    Object.defineProperty(apiConstants, key, {
        enumerable: true,
        configurable: false,
        get() {
            return `${activeBase()}${paths[key]}`;
        },
    });
});

module.exports = apiConstants;
