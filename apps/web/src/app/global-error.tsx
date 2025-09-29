'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    console.error(error);

    return (
        <html>
            <body style={{ fontFamily: 'system-ui', padding: 24 }}>
                <h1>Something went wrong!</h1>
                {process.env.NODE_ENV !== 'production' && (
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{error?.stack ?? String(error)}</pre>
                )}
                <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                    <button onClick={() => reset()}>Try again</button>
                    <a href="/">Go home</a>
                </div>
            </body>
        </html>
    );
}
