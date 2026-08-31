import { supabase } from './database';
import { resolveOwnerUserId } from './resolve-owner-user';

export interface User {
    id: string;
    email: string;
    created_at: string;
    updated_at: string;
}

export class UsersManager {
    /**
     * Get the first user from the auth.users table
     * This is used for auto-assigning user_id when creating API keys
     * With service role key, we have full access to auth schema via supabase.auth.admin
     */
    static async getFirstUser(): Promise<User | null> {
        await supabase.init();

        try {
            // Use supabase.auth.admin to access auth.users table directly
            // Service role key gives us full access to auth schema
            const { data: users, error } = await supabase.client.auth.admin.listUsers({
                perPage: 1,
                page: 1,
            });

            if (error) {
                console.log('⚠️  Could not access auth.users table, trying alternative method...');
                // Fallback: get from existing API keys
                return await this.getFirstUserFromApiKeys();
            }

            // Get the first user from the list
            if (users && users.users && users.users.length > 0) {
                const firstUser = users.users[0];
                return {
                    id: firstUser.id,
                    email: firstUser.email || 'Unknown User',
                    created_at: firstUser.created_at,
                    updated_at: firstUser.updated_at || firstUser.created_at,
                };
            }

            return null;
        } catch (error) {
            console.log('⚠️  Error accessing auth.users, trying alternative method...');
            return await this.getFirstUserFromApiKeys();
        }
    }

    /**
     * Fallback method: Get user from existing API keys
     */
    private static async getFirstUserFromApiKeys(): Promise<User | null> {
        try {
            const { data: apiKeyData, error: apiKeyError } = await supabase.client
                .from('api_keys')
                .select('user_id')
                .not('user_id', 'is', null)
                .limit(1)
                .single();

            if (apiKeyError || !apiKeyData?.user_id) {
                return null; // No users found
            }

            return {
                id: apiKeyData.user_id,
                email: 'Unknown User',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Get or create a default user for API key assignment
     * If no users exist, this will throw an error
     */
    static async getDefaultUser(userId?: string): Promise<string> {
        await supabase.init();
        return resolveOwnerUserId({
            userId,
            interactive: process.stdin.isTTY === true,
            listUsers: async () => {
                const { data, error } = await supabase.client.auth.admin.listUsers({
                    perPage: 100,
                    page: 1,
                });
                if (error || !data?.users) {
                    return [];
                }
                return data.users.map((user) => ({
                    id: user.id,
                    email: user.email,
                }));
            },
            getUserById: async (id) => {
                const { data, error } = await supabase.client.auth.admin.getUserById(id);
                if (error || !data?.user) {
                    return null;
                }
                return { id: data.user.id };
            },
        });
    }

    /**
     * Notify user about auto-assignment of user_id
     */
    static notifyAutoAssignment(userId: string, userEmail?: string): void {
        const userInfo = userEmail ? `${userEmail} (${userId})` : userId;
        console.log(`⚠️  Auto-assigned user_id to: ${userInfo}`);
    }
}
