const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCliInteractive(input: {
    readonly quick?: boolean;
    readonly isTty: boolean;
}): boolean {
    if (input.quick) {
        return false;
    }
    return input.isTty;
}

export function listOwnerDirectoryPage(): { readonly page: 1; readonly perPage: 2 } {
    return { page: 1, perPage: 2 };
}

export async function resolveOwnerUserId(input: {
    readonly userId?: string;
    readonly interactive: boolean;
    readonly listUsers?: () => Promise<Array<{ id: string; email?: string }>>;
    readonly getUserById?: (id: string) => Promise<{ id: string } | null>;
    readonly selectUser?: (choices: Array<{ id: string; email?: string }>) => Promise<string>;
}): Promise<string> {
    if (input.userId) {
        if (!UUID_PATTERN.test(input.userId)) {
            throw new Error('Invalid user id UUID');
        }
        if (input.getUserById) {
            const found = await input.getUserById(input.userId);
            if (!found) {
                throw new Error('User not found');
            }
        }
        return input.userId;
    }

    const users = input.listUsers ? await input.listUsers() : [];
    if (users.length === 0) {
        throw new Error('No users found in the database');
    }
    if (users.length === 1) {
        return users[0]!.id;
    }
    if (!input.interactive) {
        throw new Error('--user-id is required when multiple users exist');
    }
    if (!input.selectUser) {
        throw new Error('--user-id is required when multiple users exist');
    }
    return input.selectUser(users);
}
