'use client';

import React from 'react';
import './landing.css';
import { LandingHeader } from './landing-header';
import { HeroSection } from './HeroSection';
import { DeploymentSection } from './DeploymentSection';
import { FooterSection } from './FooterSection';

export const LandingPage: React.FC = () => {
    return (
        <div className="gp-landing">
            <LandingHeader />
            <HeroSection />
            <DeploymentSection />
            <FooterSection />
        </div>
    );
};
