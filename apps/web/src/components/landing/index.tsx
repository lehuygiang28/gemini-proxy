'use client';

import React from 'react';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { CodeExamplesSection } from './CodeExamplesSection';
import { TechStackSection } from './TechStackSection';
import { DeploymentSection } from './DeploymentSection';
import { ArchitectureSection } from './ArchitectureSection';
import { FooterSection } from './FooterSection';
import { HeaderlessPageChrome } from '@components/headerless-page-chrome';

export const LandingPage: React.FC = () => {
    return (
        <HeaderlessPageChrome>
            <HeroSection />
            <FeaturesSection />
            <CodeExamplesSection />
            <TechStackSection />
            <DeploymentSection />
            <ArchitectureSection />
            <FooterSection />
        </HeaderlessPageChrome>
    );
};
