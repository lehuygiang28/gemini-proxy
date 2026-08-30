'use client';

import React from 'react';
import { Alert, Modal } from 'antd';

type ConfirmAlertModalProps = {
    open: boolean;
    title: string;
    description: string;
    okText: string;
    cancelText: string;
    onConfirm: () => void;
    onCancel: () => void;
};

/** Themed confirm dialog with warning alert — use instead of static Modal.confirm(). */
export function ConfirmAlertModal({
    open,
    title,
    description,
    okText,
    cancelText,
    onConfirm,
    onCancel,
}: ConfirmAlertModalProps): React.ReactElement {
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

/** @deprecated Use ConfirmAlertModal */
export const KeyRotateConfirmModal = ConfirmAlertModal;
