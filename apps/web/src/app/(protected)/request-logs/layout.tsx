import React from 'react';

/**
 * Request Logs Layout with Parallel Routes
 * Supports both modal and full page views
 */
export default function RequestLogsLayout({
    children,
    modal,
}: {
    children: React.ReactNode;
    modal: React.ReactNode;
}) {
    return (
        <>
            {children}
            {modal}
        </>
    );
}
