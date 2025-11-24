import axios from 'axios';

// Configure axios defaults for ngrok
axios.defaults.baseURL = window.location.origin;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
axios.defaults.withCredentials = true;

// Axios automatically handles CSRF via the XSRF-TOKEN cookie set by Laravel
// We do not need to manually set the header from the meta tag, as that can become stale in an SPA

export default axios;
