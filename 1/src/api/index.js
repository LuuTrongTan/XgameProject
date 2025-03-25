export { default as API } from "./api";
export { profileApi } from "./profileApi";
export { authApi } from "./authApi";

// Thêm các API khác ở đây khi cần
// export { projectApi } from './projectApi';
// etc...

console.log("Token:", localStorage.getItem("token"));
