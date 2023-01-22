export type HasKey<T extends Record<string, unknown>, K extends keyof T> = K extends keyof T ? 1 : 0;
