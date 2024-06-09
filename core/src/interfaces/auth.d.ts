export interface User {
    name: string;
    email: string;
    uuid: string;
}

export interface AccessToken {
    token: string;
    expireIn: number;
}

export interface RefreshToken {
    token: string;
    expireIn: number;
}

export interface AuthData {
    user: User;
    accessToken: AccessToken;
    refreshToken: RefreshToken;
}

export interface BotInfo {
    uuid: string;
    name: string;
    token: string
    enabled: boolean;
    expired: boolean;
    expire_at: string;
    created_at: string;
}
