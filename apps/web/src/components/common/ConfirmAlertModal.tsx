'use client';

import React from 'react';
import { Alert, Modal, type ModalProps } from 'antd';

type ConfirmAlertModalProps = {
    open: boolean;
    title: string;
    description: string;
    okText: string;
    cancelText: string;
    onConfirm: () => void;
    onCancel: () => void;
    children?: React.ReactNode;
    okButtonProps?: ModalProps['okButtonProps'];
    confirmLoading?: boolean;
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
    children,
    okButtonProps,
    confirmLoading,
}: ConfirmAlertModalProps): React.ReactElement {
    return (
        <Modal
            open={open}
            title={title}
            okText={okText}
            cancelText={cancelText}
            onOk={onConfirm}
            onCancel={onCancel}
            okButtonProps={okButtonProps}
            confirmLoading={confirmLoading}
            destroyOnHidden
        >
            <Alert type="warning" message={description} showIcon />
            {children}
        </Modal>
    );
}

/** @deprecated Use ConfirmAlertModal */
export const KeyRotateConfirmModal = ConfirmAlertModal;
