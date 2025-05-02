// frontend/api/userApi.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_URL, { fetchWithToken } from './config';
import {
    User,
    UserCreateRequest,
    UserUpdateRequest,
    VerifyEmailRequest,
    ForgetPasswordRequest,
    ResetPasswordRequest,
    UpdatePasswordRequest,
    UserResponse,
    AuthResponse, // Type for SUCCESSFUL auth
    RefreshTokenResponse,
    VerifyEmailResponse,
    ResetPasswordResponse,
    UpdatePasswordResponse,
    AuthUser
} from '../types/user';
import { Platform } from 'react-native';

// --- createFormData helper remains the same ---
const createFormData = (uri: string, body: Record<string, any> = {}): FormData => {
    const formData = new FormData();
    const uriParts = uri.split('.');
    const fileType = uriParts[uriParts.length - 1];
    const fileName = uri.split('/').pop() || `profile.${fileType}`;

    formData.append('profilePicture', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        name: fileName,
        type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
    } as any);

    Object.keys(body).forEach(key => {
        formData.append(key, body[key]);
    });

    return formData;
};

// Specific type for the upload response
interface UploadResponse {
    message: string;
    user: AuthUser; // Backend returns the updated user object
}


const userApi = {
    login: async (email: string, password: string): Promise<AuthResponse> => {
        const response = await fetch(`${BASE_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include',
        });

        // Try to parse JSON regardless of status first
        const data = await response.json();

        if (!response.ok) {
            // If response is not ok, 'data' likely contains { message: string }
            // Throw the message from the parsed data if it exists
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

        // If response IS ok, 'data' should match AuthResponse
        // Add runtime check for safety (optional but good practice)
        if (!data.accessToken || !data.user) {
             console.error("Login response structure mismatch:", data);
             throw new Error("Login successful but received unexpected data format.");
        }

        await AsyncStorage.setItem('accessToken', data.accessToken);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        return data as AuthResponse; // Cast to AuthResponse after checks
    },

    // --- Other functions (logout, getAllUsers, etc.) remain the same ---
    // ... make sure type assertions like `as Promise<User[]>` or `as AuthUser` are used where needed ...

    logout: async (): Promise<void> => {
        try {
            await fetchWithToken(`${BASE_URL}/users/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.warn("Logout request failed (maybe token expired?):", error);
        } finally {
            await AsyncStorage.removeItem('accessToken');
            await AsyncStorage.removeItem('user');
        }
    },

    getAllUsers: async (): Promise<User[]> => {
        const response = await fetchWithToken(`${BASE_URL}/users`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
            throw new Error(errorData.message);
        }
        return response.json() as Promise<User[]>;
    },

    getUserById: async (id: string): Promise<User> => {
        const response = await fetchWithToken(`${BASE_URL}/users/${id}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
            throw new Error(errorData.message);
        }
        return response.json() as Promise<User>;
    },

    createUser: async (userData: UserCreateRequest): Promise<UserResponse> => {
        const response = await fetch(`${BASE_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });
        const data: UserResponse = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        return data;
    },

    register: async (userData: UserCreateRequest): Promise<UserResponse> => {
        const response = await fetch(`${BASE_URL}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });
        const data: UserResponse = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        return data;
    },

    uploadProfilePicture: async (userId: string, imageUri: string): Promise<UploadResponse> => {
        const formData = createFormData(imageUri);

        const { accessToken } = await AsyncStorage.getItem('accessToken') ? { accessToken: await AsyncStorage.getItem('accessToken') } : { accessToken: null };

        const response = await fetch(`${BASE_URL}/users/${userId}/upload-profile-picture`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': accessToken ? `Bearer ${accessToken}` : '',
            },
            credentials: 'include',
        });

        const data: UploadResponse = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }

         if (data.user) {
             await AsyncStorage.setItem('user', JSON.stringify(data.user));
         }

        return data;
    },

    updateUserById: async (id: string, userData: UserUpdateRequest): Promise<AuthUser> => {
        const response = await fetchWithToken(`${BASE_URL}/users/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                 const errorJson = await response.json();
                 errorMsg = errorJson.message || errorMsg;
            } catch (_) { /* ignore parsing error */ }
           throw new Error(errorMsg);
        }

        const data: AuthUser = await response.json();

        const currentUserDataString = await AsyncStorage.getItem('user');
        if (currentUserDataString) {
            try {
                const currentUserData: AuthUser = JSON.parse(currentUserDataString);
                if (currentUserData._id === id) {
                     const updatedStoredUser = { ...currentUserData, ...data };
                     await AsyncStorage.setItem('user', JSON.stringify(updatedStoredUser));
                }
            } catch (e) {
                console.error("Error parsing or updating user in AsyncStorage:", e);
            }
        }
        return data;
    },

    deleteUserById: async (id: string): Promise<{ message: string }> => {
        const response = await fetchWithToken(`${BASE_URL}/users/${id}`, {
            method: 'DELETE',
        });
        const data: { message: string } = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        return data;
    },

    verifyEmail: async (verificationData: VerifyEmailRequest): Promise<VerifyEmailResponse> => {
        const response = await fetch(`${BASE_URL}/users/verify-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(verificationData),
            credentials: 'include',
        });
        const data: VerifyEmailResponse = await response.json();
         if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        await AsyncStorage.setItem('accessToken', data.accessToken);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        return data;
    },

    forgetPassword: async (forgetPasswordData: ForgetPasswordRequest): Promise<{ message: string }> => {
        const response = await fetch(`${BASE_URL}/users/forget-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(forgetPasswordData),
        });
        const data: { message: string } = await response.json();
        if (!response.ok) {
           throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
       return data;
    },

    resetPassword: async (resetPasswordData: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
        const response = await fetch(`${BASE_URL}/users/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(resetPasswordData),
            credentials: 'include',
        });
        const data: ResetPasswordResponse = await response.json();
        if (!response.ok) {
           throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        await AsyncStorage.setItem('accessToken', data.accessToken);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        return data;
    },

    updatePassword: async (passwordData: UpdatePasswordRequest): Promise<UpdatePasswordResponse> => {
        const response = await fetchWithToken(`${BASE_URL}/users/update-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(passwordData),
        });
        const data: UpdatePasswordResponse = await response.json();
        if (!response.ok) {
           throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        return data;
    },

    getDoctors: async (): Promise<User[]> => {
        const response = await fetchWithToken(`${BASE_URL}/users/doctors`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
            throw new Error(errorData.message);
        }
        return response.json() as Promise<User[]>;
    },
    getPatients: async (): Promise<User[]> => {
        const response = await fetchWithToken(`${BASE_URL}/users/patients`);
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
            throw new Error(errorData.message);
        }
        return response.json() as Promise<User[]>;
    },

    refreshToken: async (): Promise<RefreshTokenResponse> => {
        const response = await fetch(`${BASE_URL}/users/refresh-token`, {
            method: 'POST',
            credentials: 'include',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
            throw new Error(errorData.message || 'Token refresh failed');
        }

        return response.json() as Promise<RefreshTokenResponse>;
    },

    blockUser: async (userId: string): Promise<{ message: string }> => {
        const response = await fetchWithToken(`${BASE_URL}/users/${userId}/block`, {
            method: 'PUT',
        });
        const data: { message: string } = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        return data;
    },

    unblockUser: async (userId: string): Promise<{ message: string }> => {
        const response = await fetchWithToken(`${BASE_URL}/users/${userId}/unblock`, {
            method: 'PUT',
        });
        const data: { message: string } = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        return data;
    },
};

export default userApi;