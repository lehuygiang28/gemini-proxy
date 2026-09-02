'use client';

import React from 'react';
import './landing.css';
import { LandingHeader } from './landing-header';
import { HeroSection } from './HeroSection';
import { DeploymentSection } from './DeploymentSection';
import { FooterSection } from './FooterSection';

type LandingPageProps = {
    origin: string;
};

export const LandingPage: React.FC<LandingPageProps> = ({ origin }) => {
    return (
        <div className="gp-landing">
            <LandingHeader />
            <HeroSection origin={origin} />
            <DeploymentSection />
            <FooterSection />
        </div>
    );
};
