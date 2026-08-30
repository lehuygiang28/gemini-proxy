'use client';

import React from 'react';
import { Alert, Modal } from 'antd';

type KeyRotateConfirmModalProps = {
    open: boolean;
    title: string;
    description: string;
    okText: string;
    cancelText: string;
    onConfirm: () => void;
    onCancel: () => void;
};

export function KeyRotateConfirmModal({
    open,
    title,
    description,
    okText,
    cancelText,
    onConfirm,
    onCancel,
}: KeyRotateConfirmModalProps): React.ReactElement {
    return (
        <Modal
            open={open}
            title={title}
            okText={okText}
            cancelText={cancelText}
            onOk={onConfirm}
            onCancel={onCancel}
            destroyOnHidden
        >
            <Alert type="warning" message={description} showIcon />
        </Modal>
    );
}
