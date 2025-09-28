import React from 'react';
import { Typography, Space, Statistic, Row, Col, theme } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { calculateSuccessRate } from '@/utils/table-helpers';

const { Text } = Typography;
const { useToken } = theme;

interface UsageStatisticsProps {
    successCount: number;
    failureCount: number;
}

export const UsageStatistics: React.FC<UsageStatisticsProps> = ({ successCount, failureCount }) => {
    const { token } = useToken();
    const successRate = calculateSuccessRate(successCount, failureCount);

    return (
        <Space direction="vertical" size="small">
            <Row gutter={16}>
                <Col>
                    <Statistic
                        value={successCount}
                        prefix={<CheckCircleOutlined style={{ color: token.colorSuccess }} />}
                        valueStyle={{ fontSize: token.fontSize }}
                    />
                </Col>
                <Col>
                    <Statistic
                        value={failureCount}
                        prefix={<CloseCircleOutlined style={{ color: token.colorError }} />}
                        valueStyle={{ fontSize: token.fontSize }}
                    />
                </Col>
            </Row>
            <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                Success Rate: {successRate}%
            </Text>
        </Space>
    );
};
