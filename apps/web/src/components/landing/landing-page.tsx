'use client';

import React from 'react';
import { FeaturesSection } from './features-section';
import { Footer } from './footer';
import { HeroSection } from './hero-section';
import { PlatformSection } from './platform-section';

export function LandingPage() {
    return (
        <div>
            <HeroSection />
            <FeaturesSection />
            <PlatformSection />
            <Footer />
        </div>
    );
}
