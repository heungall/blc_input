import { createContext, useContext, useState, useCallback } from 'react';

/**
 * user 구조:
 * {
 *   email:    string,
 *   name:     string,
 *   picture:  string,
 *   idToken:  string,   // Apps Script 호출 시 사용
 *   cellId:   string,
 *   cellName: string,
 *   members:  string[], // 초기 멤버 목록
 * }
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback((profile, cellInfo, idToken) => {
    setUser({
      email:    profile.email,
      name:     profile.name,
      picture:  profile.picture,
      idToken,
      cellId:   cellInfo.cellId,
      cellName: cellInfo.cellName,
      members:  cellInfo.members || [],
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
