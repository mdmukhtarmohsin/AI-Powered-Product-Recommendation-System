import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authAPI, handleApiError } from "../services/api";

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setToken: (token) => {
        if (token) {
          localStorage.setItem("authToken", token);
        } else {
          localStorage.removeItem("authToken");
        }
        set({ token });
      },

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // Login action
      login: async (credentials) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authAPI.login(credentials);
          const { user, token } = response.data;

          get().setToken(token);
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true, user };
        } catch (error) {
          const errorInfo = handleApiError(error);
          set({
            error: errorInfo.message,
            isLoading: false,
          });
          return { success: false, error: errorInfo.message };
        }
      },

      // Register action
      register: async (userData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authAPI.register(userData);
          const { user, token } = response.data;

          get().setToken(token);
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true, user };
        } catch (error) {
          const errorInfo = handleApiError(error);
          set({
            error: errorInfo.message,
            isLoading: false,
          });
          return { success: false, error: errorInfo.message };
        }
      },

      // Logout action
      logout: () => {
        get().setToken(null);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });

        // Clear all local storage
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
      },

      // Get user profile
      getProfile: async () => {
        if (!get().isAuthenticated) return;

        set({ isLoading: true, error: null });

        try {
          const response = await authAPI.getProfile();
          const user = response.data.user;

          set({
            user,
            isLoading: false,
          });

          return { success: true, user };
        } catch (error) {
          const errorInfo = handleApiError(error);

          // If token is invalid, logout
          if (errorInfo.status === 401) {
            get().logout();
          }

          set({
            error: errorInfo.message,
            isLoading: false,
          });
          return { success: false, error: errorInfo.message };
        }
      },

      // Update user preferences
      updatePreferences: async (preferences) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authAPI.updatePreferences(preferences);
          const user = response.data.user;

          set({
            user,
            isLoading: false,
          });

          return { success: true, user };
        } catch (error) {
          const errorInfo = handleApiError(error);
          set({
            error: errorInfo.message,
            isLoading: false,
          });
          return { success: false, error: errorInfo.message };
        }
      },

      // Initialize auth state on app load
      initializeAuth: () => {
        const token = localStorage.getItem("authToken");
        if (token) {
          set({ token, isAuthenticated: true });
          // Verify token by getting profile
          get().getProfile();
        }
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
