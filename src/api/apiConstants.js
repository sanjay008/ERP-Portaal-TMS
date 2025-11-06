
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
    register: `${baseUrlnew}registers`,
    emailmobilelogin: `${baseUrlnew}login_email_mobile`,
    maritalstatus: `${baseUrlnew}get_marital_status`,
    Connections: `${baseUrlnew}get_connections`,
    relatiesdata: `${baseUrlnew}get_relaties_data`,
    langauge: `${baseUrlnew}get_language`,
    country: `${baseUrlnew}get_country`,
    

    // TMS API MODE ON
    
    getOrderByDriver: `${baseUrlnew}tms-driver/get-tms-order-by-region`,
    Verify_status: `${baseUrlnew}tms-driver/verify-order-item-status`,
    status_update: `${baseUrlnew}tms-driver/update-order-item-status`,
    status_list: `${baseUrlnew}tms-driver/get-tms-status-list`,
    store_image_comment: `${baseUrlnew}tms-driver/store-tms-comment-img`,
    missed_backorder: `${baseUrlnew}tms-driver/manage-missed-or-backorder`,
    get_AllSlideDataApi: `${baseUrlnew}tms-home/get-tms-home-slider`,
    getMultipleOrderData: `${baseUrlnew}tms-driver/get-multiple-orders-data-by-ids`,
    get_order_data_by_id:`${baseUrlnew}tms-driver/get-order-data-by-id`

};





