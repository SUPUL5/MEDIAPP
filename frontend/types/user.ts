// frontend/types/user.ts
export interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
    status: string;
    specialization?: string | null;
    profilePicture?: string | null; // Already allows null/undefined
    verificationAttempts?: number;
    verificationCodeExpireTime?: string;
    refreshToken?: string;
    phone: string;
    hospital?: string | null;
    gender: string;
    dateOfBirth: string;
}

export interface UserCreateRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
    phone: string;
    hospital?: string;
    specialization?: string;
    gender: string;
    dateOfBirth: string;
    profilePicture?: string; // Allow sending picture during creation
}

export interface UserUpdateRequest {
    firstName?: string;
    lastName?: string;
    specialization?: string;
    profilePicture?: string | null; // Explicitly allow null here too if needed
    phone?: string;
    hospital?: string;
    gender?: string;
    dateOfBirth?: string;
}

// Add types for password update
export interface UpdatePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export interface UpdatePasswordResponse {
    message: string;
}

export interface VerifyEmailRequest {
    email: string;
    verificationCode: number;
}

export interface ForgetPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    email: string;
    resetPasswordCode: number;
    newPassword: string;
}

export interface UserResponse {
    message: string;
    user?: User;
    users?:User[];
    doctors?:User[];
    patients?:User[];
}

export interface AuthUser {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    status: string;
    specialization?: string | null;
    profilePicture?: string | null; // Already allows null/undefined
    phone: string;
    gender: string;
    dateOfBirth: string;
    hospital?: string | null;
}

export interface AuthResponse {
    accessToken: string;
    user: AuthUser;
}

export interface RefreshTokenResponse {
    accessToken: string;
}

export interface VerifyEmailResponse {
    message: string;
    accessToken: string;
    user: AuthUser;
}

export interface ResetPasswordResponse {
    message: string;
    accessToken: string;
    user: AuthUser;
}