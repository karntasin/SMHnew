import axios from 'axios';
import { resolveAppUrl } from '@/lib/asset';

const api = axios.create({
    baseURL: window.location.origin,
    withCredentials: true,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
    },
});

api.interceptors.request.use((config) => {
    if (typeof config.url === 'string' && config.url.startsWith('/') && !config.url.startsWith('//')) {
        config.url = resolveAppUrl(config.url);
    }

    return config;
});

export default api;
