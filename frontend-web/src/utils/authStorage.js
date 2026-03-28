export function storeAuthSession({ user, accessToken } = {}) {
  if (typeof window === 'undefined') return;

  if (user === null) {
    localStorage.removeItem('auth_user');
  } else if (user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  if (accessToken === null) {
    localStorage.removeItem('access_token');
  } else if (accessToken) {
    localStorage.setItem('access_token', accessToken);
  }

  // Refresh tokens should stay in httpOnly cookies only.
  localStorage.removeItem('refresh_token');
}

export function clearAuthSessionStorage() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('auth_user');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}
