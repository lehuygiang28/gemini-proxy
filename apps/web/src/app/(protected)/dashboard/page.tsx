'use client';

import { Card, Row, Col, Statistic } from 'antd';
import React from 'react';

export default function DashboardPage() {
    return (
        <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
                <Card>
                    <Statistic title="API Keys" valueRender={() => <span>-</span>} />
                </Card>
            </Col>
            <Col xs={24} md={8}>
                <Card>
                    <Statistic title="Proxy API Keys" valueRender={() => <span>-</span>} />
                </Card>
            </Col>
            <Col xs={24} md={8}>
                <Card>
                    <Statistic title="Requests (24h)" valueRender={() => <span>-</span>} />
                </Card>
            </Col>
        </Row>
    );
}
