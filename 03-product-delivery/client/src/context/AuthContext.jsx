import { createContext, useContext, useReducer, useEffect } from 'react';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: null,
  loading: true,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, user: action.payload.user, token: action.payload.token, loading: false };
    case 'LOGOUT':
      return { ...state, user: null, token: null, loading: false };
    case 'LOADED':
      return { ...state, loading: false };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const token = localStorage.getItem('ff_token');
    const user = localStorage.getItem('ff_user');
    if (token && user) {
      try {
        dispatch({ type: 'SET_AUTH', payload: { token, user: JSON.parse(user) } });
      } catch {
        localStorage.removeItem('ff_token');
        localStorage.removeItem('ff_user');
        dispatch({ type: 'LOADED' });
      }
    } else {
      dispatch({ type: 'LOADED' });
    }
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Erro ao fazer login' }));
      throw new Error(err.message || 'Credenciais inválidas');
    }
    const json = await res.json();
    const data = json.data || json;
    localStorage.setItem('ff_token', data.accessToken);
    localStorage.setItem('ff_user', JSON.stringify(data.user));
    dispatch({ type: 'SET_AUTH', payload: { token: data.accessToken, user: data.user } });
    return data;
  };

  const register = async (name, email, phone, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Erro ao criar conta' }));
      throw new Error(err.message || 'Erro ao criar conta');
    }
    const json = await res.json();
    const data = json.data || json;
    localStorage.setItem('ff_token', data.accessToken);
    localStorage.setItem('ff_user', JSON.stringify(data.user));
    dispatch({ type: 'SET_AUTH', payload: { token: data.accessToken, user: data.user } });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('ff_token');
    localStorage.removeItem('ff_user');
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (updates) => {
    const newUser = { ...state.user, ...updates };
    localStorage.setItem('ff_user', JSON.stringify(newUser));
    dispatch({ type: 'UPDATE_USER', payload: updates });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;

