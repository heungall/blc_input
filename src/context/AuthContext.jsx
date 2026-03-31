import { createContext, useContext, useState, useCallback } from 'react';

/**
 * user 구조:
 * {
 *   email:      string,
 *   name:       string,
 *   picture:    string,
 *   idToken:    string,
 *   cellId:     string,
 *   cellName:   string,
 *   members:    string[],
 *   weeklyData: object|null,  // 이번 주 기존 제출 데이터
 *   role:       string,       // 'leader' | 'admin'
 * }
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback((profile, cellInfo, idToken) => {
    setUser({
      email:      profile.email,
      name:       profile.name,
      picture:    profile.picture,
      idToken,
      cellId:     cellInfo.cellId,
      cellName:   cellInfo.cellName,
      members:    cellInfo.members || [],
      weeklyData: cellInfo.weeklyData || null,
      role:       cellInfo.role || 'leader',
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
