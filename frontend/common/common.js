const BASE_URL = 'http://localhost:4000'; 
const $api = {};

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 900000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  }
});


// 添加token到请求头
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => {
    const res = response.data;
    const isGraphQL = response.config.url?.includes('/graphql');

    // ========== 1. 处理 GraphQL 响应格式 ==========
    if (isGraphQL) {
      if (!res.errors && res.data) {
        return res.data; 
      } 
      else {
        const errorMsg = res.errors?.[0]?.message || 'GraphQL操作失败';
        alert(errorMsg);
        return Promise.reject(new Error(errorMsg));
      }
    }

    // ========== 2. 处理 RESTful 响应格式 ==========
    if (res.code === 200) {
      return res.data;
    } else {
      alert(res.msg || '操作失败');
      return Promise.reject(new Error(res.msg || '业务错误'));
    }
  },
  (error) => {
    const errorMsg = error.response?.data?.msg 
      || error.response?.data?.errors?.[0]?.message 
      || error.message 
      || '网络异常，请稍后重试';
    alert(errorMsg);
    return Promise.reject(error);
  }
);



$api.get = (url, params) => axiosInstance.get(url, { params });
$api.post = (url, data) => axiosInstance.post(url, data);
window.$api = $api;

$api.isLogin = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  return !!token && !!user;
};

$api.getUserInfo = () => {
  if (!$api.isLogin()) return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (err) {
    console.error('解析用户信息失败：', err);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return null;
  }
};
window.axiosInstance = axiosInstance;
console.log('api.js：axiosInstance已全局暴露', window.axiosInstance); 