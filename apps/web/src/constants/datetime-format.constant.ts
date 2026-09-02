export const DATETIME_FORMAT_COOKIE_NAME = '_gp_datetime_format' as const;

export const DATETIME_FORMAT_MODES = ['relative', 'exact', 'auto'] as const;

export type DatetimeFormatMode = (typeof DATETIME_FORMAT_MODES)[number];
