import { select } from '@inquirer/prompts';
import { supabase } from './database';
import { isCliInteractive, listOwnerDirectoryPage, resolveOwnerUserId } from './resolve-owner-user';

export interface User {
    id: string;
    email: string;
    created_at: string;
    updated_at: string;
}

export class UsersManager {
    static async getDefaultUser(
        userId?: string,
        options?: { readonly quick?: boolean; readonly interactive?: boolean },
    ): Promise<string> {
        await supabase.init();
        const interactive =
            options?.interactive ??
            isCliInteractive({
                quick: options?.quick,
                isTty: process.stdin.isTTY === true,
            });
        return resolveOwnerUserId({
            userId,
            interactive,
            listUsers: async () => {
                const { data, error } =
                    await supabase.client.auth.admin.listUsers(listOwnerDirectoryPage());
                if (error) {
                    throw new Error(error.message);
                }
                return (data?.users ?? []).map((user) => ({
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
            selectUser: async (choices) => {
                return select({
                    message: 'Select owner user',
                    choices: choices.map((user) => ({
                        name: `${user.email ?? 'unknown'} (${user.id})`,
                        value: user.id,
                    })),
                });
            },
        });
    }

    static notifyAutoAssignment(userId: string, userEmail?: string): void {
        const userInfo = userEmail ? `${userEmail} (${userId})` : userId;
        console.log(`⚠️  Auto-assigned user_id to: ${userInfo}`);
    }
}
