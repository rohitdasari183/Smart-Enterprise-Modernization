import { useEnterpriseContext } from '../context/EnterpriseContext';
export const useEnterprise = () => {
  const { enterprises, loading, refreshEnterprises } = useEnterpriseContext();
  return { enterprises, loading, refreshEnterprises };
};
