/**
 * Helper để lấy cookie theo tên
 * @param {string} name - Tên cookie cần lấy
 * @returns {string|null} - Giá trị cookie hoặc null
 */
export function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(';').shift();
  }
  return null;
}

/**
 * Lấy access token từ cookie
 * Token được lưu ở cookie name 'at' (ACCESS_TOKEN_COOKIE_NAME từ backend)
 * @returns {string|null}
 */
export function getAccessToken() {
  return getCookie('at');
}

/**
 * Lấy refresh token từ cookie
 * Token được lưu ở cookie name 'rt' (REFRESH_TOKEN_COOKIE_NAME từ backend)
 * @returns {string|null}
 */
export function getRefreshToken() {
  return getCookie('rt');
}
