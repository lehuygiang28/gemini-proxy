// Shared user type for authentication across the monorepo

export interface User {
    id: string;
    email?: string;
    name?: string;
}
