'use client';

import React from 'react';
import { theme } from 'antd';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { CodeExamplesSection } from './CodeExamplesSection';
import { TechStackSection } from './TechStackSection';
import { DeploymentSection } from './DeploymentSection';
import { ArchitectureSection } from './ArchitectureSection';
import { FooterSection } from './FooterSection';
import { LanguageSwitcher } from '@components/language-switcher';

const { useToken } = theme;

export const LandingPage: React.FC = () => {
    const { token } = useToken();

    return (
        <div
            style={{
                minHeight: '100vh',
                background: token.colorBgLayout,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    padding: token.padding,
                }}
            >
                <LanguageSwitcher />
            </div>
            <HeroSection />
            <FeaturesSection />
            <CodeExamplesSection />
            <TechStackSection />
            <DeploymentSection />
            <ArchitectureSection />
            <FooterSection />
        </div>
    );
};
