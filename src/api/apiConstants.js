
const baseUrlnew = "https://app.erpportaal.nl/api/";

module.exports = {

    Login: `${baseUrlnew}login`,
    Verifyotp: `${baseUrlnew}verify_otp`,
    Workorderuitvoer: `${baseUrlnew}workorder`,
    resend_otp: `${baseUrlnew}resend_otp`,
    companyLogin: `${baseUrlnew}company_login`,
    register: `${baseUrlnew}registers`,
    createUserWithRelaties: `${baseUrlnew}create_user_with_relaties`,
    relationship: `${baseUrlnew}get_relationship`,
    permission: `${baseUrlnew}permission`,
    emailmobilelogin: `${baseUrlnew}login_email_mobile`,
    maritalstatus: `${baseUrlnew}get_marital_status`,
    Connections: `${baseUrlnew}get_connections`,
    relatiesdata: `${baseUrlnew}get_relaties_data`,
    langauge: `${baseUrlnew}get_language`,
    country: `${baseUrlnew}get_country`,
    countryList: `${baseUrlnew}country/list`,
    

    // TMS API MODE ON
    getOrderByDriver: `${baseUrlnew}tms-driver/get-tms-order-by-region`,
    Verify_status: `${baseUrlnew}tms-driver/verify-order-item-status`,
    status_update: `${baseUrlnew}tms-driver/update-order-item-status`,
    status_list: `${baseUrlnew}tms-driver/get-tms-status-list`,
    store_image_comment: `${baseUrlnew}tms-driver/store-tms-comment-img`,
    missed_backorder: `${baseUrlnew}tms-driver/manage-missed-or-backorder`,
    get_AllSlideDataApi: `${baseUrlnew}tms-home/get-tms-home-slider`,
    getMultipleOrderData: `${baseUrlnew}tms-driver/get-multiple-orders-data-by-ids`,
    get_order_data_by_id:`${baseUrlnew}tms-driver/get-order-data-by-id`,
    get_location_by_region_date:`${baseUrlnew}tms-driver/get-location-by-region-date`,
    store_customer_signature:`${baseUrlnew}tms-driver/store-customer-signature`,
    get_tms_orders_flat_by_region:`${baseUrlnew}tms-driver/get-tms-orders-flat-by-region`,
    // new tms api
    store_tms_comment:`${baseUrlnew}tms-driver/store-tms-comment`,
    store_tms_comment_img_new:`${baseUrlnew}tms-driver/store-tms-comment-img-new`,
    store_tms_image_upload_error:`${baseUrlnew}tms-driver/store-tms-image-upload-error`,
    update_driver_live_location:`${baseUrlnew}tms-driver/update-driver-live-location`,
    start_region_trip:`${baseUrlnew}tms-driver/start-region-trip`,
    end_region_trip:`${baseUrlnew}tms-driver/end-region-trip`,
    revert_order_item_status:`${baseUrlnew}tms-driver/revert-order-item-status`,
    update_order_item_product:`${baseUrlnew}tms-driver/update-order-item-product`,
    update_order_data:`${baseUrlnew}tms-driver/update-order-data`,
    get_add_product_categories:`${baseUrlnew}tms-driver/get-add-product-categories`,
    get_add_product_prices:`${baseUrlnew}tms-driver/get-add-product-prices`,
    add_product_to_order:`${baseUrlnew}tms-driver/add-product-to-order`,
};




