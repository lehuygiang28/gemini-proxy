'use client';

import React from 'react';
import { Modal } from 'antd';
import { AccountSettingsForm } from './account-settings-form';

type AccountSettingsModalProps = {
    open: boolean;
    onClose: () => void;
};

/**
 * Clerk-style account popup — profile / email / security outside Settings tabs.
 */
export function AccountSettingsModal({ open, onClose }: AccountSettingsModalProps) {
    return (
        <Modal
            title="Account"
            open={open}
            onCancel={onClose}
            footer={null}
            destroyOnHidden
            width={700}
            centered
            className="gp-account-modal"
            styles={{
                body: {
                    padding: 0,
                    maxHeight: 'min(75dvh, 640px)',
                    overflow: 'hidden',
                },
            }}
        >
            {open ? <AccountSettingsForm /> : null}
        </Modal>
    );
}
