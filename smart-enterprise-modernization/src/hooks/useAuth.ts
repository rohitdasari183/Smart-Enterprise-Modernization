import { useAuthContext } from '../context/AuthContext';
export const useAuth = () => {
  const { currentUser, loading, logout } = useAuthContext();
  return { currentUser, loading, logout };
};
