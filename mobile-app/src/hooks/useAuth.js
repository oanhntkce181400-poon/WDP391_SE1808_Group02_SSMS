import useAuthStore from '../stores/useAuthStore';

export default function useAuth() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const setAuth = useAuthStore((state) => state.setAuth);
  const logout = useAuthStore((state) => state.logout);

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: Boolean(accessToken),
    setAuth,
    logout,
  };
}
