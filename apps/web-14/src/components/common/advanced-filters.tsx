'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Card,
    Row,
    Col,
    Button,
    Input,
    Select,
    DatePicker,
    Space,
    Collapse,
    Tag,
    Typography,
    theme,
    Form,
    InputNumber,
} from 'antd';
import {
    FilterOutlined,
    ReloadOutlined,
    BugOutlined,
    ThunderboltOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;
const { Text } = Typography;
const { useToken } = theme;

export interface FilterState {
    // Basic filters
    searchText: string;
    status: 'all' | 'success' | 'failed';
    apiFormat: 'all' | 'gemini' | 'openai';
    retryStatus: 'all' | 'with_retries' | 'no_retries';

    // Date range
    dateRange: [Dayjs | null, Dayjs | null] | null;
    datePreset: string;

    // Performance filters
    durationRange: [number | null, number | null];
    tokenRange: [number | null, number | null];
    responseTimeRange: [number | null, number | null];

    // Retry severity
    retrySeverity: string[];
    attemptCountRange: [number | null, number | null];

    // Error filters
    errorTypes: string[];
    statusCodes: number[];
    hasErrors: boolean | null;

    // Advanced filters
    streamOnly: boolean | null;
    modelFilter: string[];
    userFilter: string;
    proxyKeyFilter: string;
    apiKeyFilter: string;
}

export interface FilterPreset {
    id: string;
    name: string;
    description: string;
    filters: Partial<FilterState>;
    isDefault?: boolean;
}

interface AdvancedFiltersProps {
    onFiltersChange: (filters: FilterState) => void;
    onReset: () => void;
    loading?: boolean;
    initialFilters?: Partial<FilterState>;
    filterOptions?: {
        models: string[];
        errorTypes: string[];
        statusCodes: number[];
    };
}

const DEFAULT_FILTERS: FilterState = {
    searchText: '',
    status: 'all',
    apiFormat: 'all',
    retryStatus: 'all',
    dateRange: null,
    datePreset: 'last_24_hours',
    durationRange: [null, null],
    tokenRange: [null, null],
    responseTimeRange: [null, null],
    retrySeverity: [],
    attemptCountRange: [null, null],
    errorTypes: [],
    statusCodes: [],
    hasErrors: null,
    streamOnly: null,
    modelFilter: [],
    userFilter: '',
    proxyKeyFilter: '',
    apiKeyFilter: '',
};

const DATE_PRESETS = [
    {
        value: 'last_hour',
        label: 'Last Hour',
        getRange: () => [dayjs().subtract(1, 'hour'), dayjs()],
    },
    {
        value: 'last_24_hours',
        label: 'Last 24 Hours',
        getRange: () => [dayjs().subtract(1, 'day'), dayjs()],
    },
    {
        value: 'last_7_days',
        label: 'Last 7 Days',
        getRange: () => [dayjs().subtract(7, 'days'), dayjs()],
    },
    {
        value: 'last_30_days',
        label: 'Last 30 Days',
        getRange: () => [dayjs().subtract(30, 'days'), dayjs()],
    },
    {
        value: 'last_90_days',
        label: 'Last 90 Days',
        getRange: () => [dayjs().subtract(90, 'days'), dayjs()],
    },
    { value: 'custom', label: 'Custom Range', getRange: () => [null, null] },
];

const RETRY_SEVERITY_OPTIONS = [
    { value: 'success', label: 'Success (1 attempt)', color: 'success' },
    { value: 'minor', label: 'Minor Issue (2 attempts)', color: 'warning' },
    { value: 'moderate', label: 'Moderate Issue (3-4 attempts)', color: 'orange' },
    { value: 'high', label: 'High Issue (5 attempts)', color: 'volcano' },
    { value: 'critical', label: 'Critical Issue (6-10 attempts)', color: 'red' },
    { value: 'severe', label: 'Severe Issue (11-20 attempts)', color: 'magenta' },
    { value: 'extreme', label: 'Extreme Issue (20+ attempts)', color: 'purple' },
];

const STATUS_CODE_OPTIONS = [
    { value: 400, label: '400 - Bad Request' },
    { value: 401, label: '401 - Unauthorized' },
    { value: 403, label: '403 - Forbidden' },
    { value: 404, label: '404 - Not Found' },
    { value: 429, label: '429 - Too Many Requests' },
    { value: 500, label: '500 - Internal Server Error' },
    { value: 502, label: '502 - Bad Gateway' },
    { value: 503, label: '503 - Service Unavailable' },
    { value: 504, label: '504 - Gateway Timeout' },
];

// Helper function to get status code label
const getStatusCodeLabel = (statusCode: number): string => {
    const option = STATUS_CODE_OPTIONS.find((opt) => opt.value === statusCode);
    return option ? option.label.split(' - ')[1] : 'Unknown';
};

const FILTER_PRESETS: FilterPreset[] = [
    {
        id: 'recent_failures',
        name: 'Recent Failures',
        description: 'Failed requests from the last 24 hours',
        filters: {
            status: 'failed',
        },
    },
    {
        id: 'high_retry_requests',
        name: 'High Retry Requests',
        description: 'Requests with 5+ retry attempts',
        filters: {
            retrySeverity: ['high', 'critical', 'severe', 'extreme'],
        },
    },
    {
        id: 'slow_requests',
        name: 'Slow Requests',
        description: 'Requests taking more than 10 seconds',
        filters: {
            durationRange: [10000, null],
        },
    },
    {
        id: 'high_token_usage',
        name: 'High Token Usage',
        description: 'Requests using more than 10,000 tokens',
        filters: {
            tokenRange: [10000, null],
        },
    },
    {
        id: 'rate_limited',
        name: 'Rate Limited',
        description: 'Requests hitting rate limits',
        filters: {
            errorTypes: ['rate_limit'],
            statusCodes: [429],
        },
    },
];

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
    onFiltersChange,
    onReset,
    loading = false,
    initialFilters = {},
    filterOptions = { models: [], errorTypes: [], statusCodes: [] },
}) => {
    const { token } = useToken();
    const [form] = Form.useForm();
    const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS, ...initialFilters });
    const [activePreset, setActivePreset] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Use debounced search for search text
    const { searchValue, debouncedValue, setSearchValue, clearSearch, isSearching } =
        useDebouncedSearch({
            delay: 500,
            initialValue: filters.searchText || '',
        });

    // Track if we've initialized the date range
    const hasInitializedDateRange = useRef(false);

    // Initialize date range on component mount
    useEffect(() => {
        // If no date range is set and we haven't initialized yet, set default (24 hours)
        if (!hasInitializedDateRange.current && !filters.dateRange) {
            const presetConfig = DATE_PRESETS.find((p) => p.value === 'last_24_hours');
            if (presetConfig) {
                const [start, end] = presetConfig.getRange();
                setFilters((prev) => ({
                    ...prev,
                    dateRange: [start, end],
                    datePreset: 'last_24_hours',
                }));
                hasInitializedDateRange.current = true;
            }
        }
    }, [filters.dateRange]);

    useEffect(() => {
        onFiltersChange(filters);
    }, [filters, onFiltersChange]);

    // Update filters when debounced search value changes
    useEffect(() => {
        if (debouncedValue !== filters.searchText) {
            setFilters((prev) => ({ ...prev, searchText: debouncedValue }));
        }
    }, [debouncedValue, filters.searchText]);

    const handleFilterChange = (key: keyof FilterState, value: unknown) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleDatePresetChange = (preset: string) => {
        const presetConfig = DATE_PRESETS.find((p) => p.value === preset);
        if (presetConfig && preset !== 'custom') {
            const [start, end] = presetConfig.getRange();
            setFilters((prev) => ({
                ...prev,
                datePreset: preset,
                dateRange: [start, end],
            }));
        } else {
            setFilters((prev) => ({
                ...prev,
                datePreset: preset,
                dateRange: [null, null],
            }));
        }
    };

    const handlePresetSelect = (preset: FilterPreset) => {
        setActivePreset(preset.id);
        // Preserve current date range if it exists, otherwise use default (24 hours)
        const currentDateRange = filters.dateRange;
        const defaultDateRange =
            currentDateRange || ([dayjs().subtract(1, 'day'), dayjs()] as [Dayjs, Dayjs]);

        const newFilters: FilterState = {
            ...DEFAULT_FILTERS,
            ...preset.filters,
            dateRange: defaultDateRange,
            datePreset: currentDateRange ? filters.datePreset : 'last_24_hours',
        };
        setFilters(newFilters);
        form.setFieldsValue(newFilters);
    };

    const handleReset = () => {
        // Reset to default filters with 24 hours date range
        const resetFilters: FilterState = {
            ...DEFAULT_FILTERS,
            dateRange: [dayjs().subtract(1, 'day'), dayjs()] as [Dayjs, Dayjs],
            datePreset: 'last_24_hours',
        };
        setFilters(resetFilters);
        setActivePreset(null);
        form.setFieldsValue(resetFilters);
        clearSearch();
        onReset();
    };

    const getActiveFiltersCount = () => {
        let count = 0;
        if (filters.searchText) count++;
        if (filters.status !== 'all') count++;
        if (filters.apiFormat !== 'all') count++;
        if (filters.retryStatus !== 'all') count++;
        if (filters.dateRange) count++;
        if (filters.durationRange[0] !== null || filters.durationRange[1] !== null) count++;
        if (filters.tokenRange[0] !== null || filters.tokenRange[1] !== null) count++;
        if (filters.retrySeverity.length > 0) count++;
        if (filters.errorTypes.length > 0) count++;
        if (filters.statusCodes.length > 0) count++;
        if (filters.hasErrors !== null) count++;
        if (filters.streamOnly !== null) count++;
        if (filters.modelFilter.length > 0) count++;
        if (filters.userFilter) count++;
        if (filters.proxyKeyFilter) count++;
        if (filters.apiKeyFilter) count++;
        return count;
    };

    const activeFiltersCount = getActiveFiltersCount();

    return (
        <Card
            style={{
                marginBottom: token.marginMD,
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowSecondary,
            }}
            bodyStyle={{
                padding: token.paddingLG,
                background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorFillQuaternary} 100%)`,
            }}
            loading={loading}
        >
            {/* Quick Filters */}
            <div style={{ marginBottom: token.marginLG }}>
                <Text
                    strong
                    style={{
                        fontSize: token.fontSizeLG,
                        marginBottom: token.marginMD,
                        display: 'block',
                    }}
                >
                    🔍 Quick Filters
                </Text>
                <Row gutter={[token.marginMD, token.marginMD]} align="middle">
                    <Col xs={24} sm={6}>
                        <Search
                            placeholder="Search request ID, user, or content..."
                            allowClear
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            loading={isSearching}
                            style={{ width: '100%' }}
                            size="large"
                        />
                    </Col>
                    <Col xs={24} sm={4}>
                        <Select
                            placeholder="Status"
                            value={filters.status}
                            onChange={(value) => handleFilterChange('status', value)}
                            style={{ width: '100%' }}
                            size="large"
                        >
                            <Option value="all">All Status</Option>
                            <Option value="success">✅ Success</Option>
                            <Option value="failed">❌ Failed</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={4}>
                        <Select
                            placeholder="API Format"
                            value={filters.apiFormat}
                            onChange={(value) => handleFilterChange('apiFormat', value)}
                            style={{ width: '100%' }}
                            size="large"
                        >
                            <Option value="all">All Formats</Option>
                            <Option value="gemini">🤖 Gemini</Option>
                            <Option value="openai">🧠 OpenAI</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={4}>
                        <Select
                            placeholder="Retry Status"
                            value={filters.retryStatus}
                            onChange={(value) => handleFilterChange('retryStatus', value)}
                            style={{ width: '100%' }}
                            size="large"
                        >
                            <Option value="all">All Requests</Option>
                            <Option value="with_retries">🔄 With Retries</Option>
                            <Option value="no_retries">✅ No Retries</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={3}>
                        <Select
                            placeholder="Time Range"
                            value={filters.datePreset}
                            onChange={handleDatePresetChange}
                            style={{ width: '100%' }}
                            size="large"
                        >
                            {DATE_PRESETS.map((preset) => (
                                <Option key={preset.value} value={preset.value}>
                                    {preset.label}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={3}>
                        <Space>
                            <Button
                                icon={<FilterOutlined />}
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                type={showAdvanced ? 'primary' : 'default'}
                                size="large"
                                style={{
                                    borderRadius: token.borderRadiusLG,
                                    fontWeight: 500,
                                }}
                            >
                                Advanced {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                            </Button>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={handleReset}
                                disabled={activeFiltersCount === 0}
                                size="large"
                                style={{
                                    borderRadius: token.borderRadiusLG,
                                    fontWeight: 500,
                                }}
                            >
                                Reset
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </div>

            {/* Custom Date Range */}
            {filters.datePreset === 'custom' && (
                <Row
                    gutter={[token.marginMD, token.marginMD]}
                    style={{ marginTop: token.marginMD }}
                >
                    <Col xs={24} sm={8}>
                        <RangePicker
                            value={filters.dateRange}
                            onChange={(dates) => handleFilterChange('dateRange', dates)}
                            showTime={{ format: 'HH:mm:ss' }}
                            format="YYYY-MM-DD HH:mm:ss"
                            style={{ width: '100%' }}
                        />
                    </Col>
                </Row>
            )}

            {/* Filter Presets */}
            <div style={{ marginTop: token.marginLG }}>
                <Text
                    strong
                    style={{
                        fontSize: token.fontSizeLG,
                        marginBottom: token.marginMD,
                        display: 'block',
                    }}
                >
                    ⚡ Quick Presets
                </Text>
                <Row gutter={[token.marginMD, token.marginMD]}>
                    <Col span={24}>
                        <Space wrap>
                            {FILTER_PRESETS.map((preset) => (
                                <Button
                                    key={preset.id}
                                    size="middle"
                                    type={activePreset === preset.id ? 'primary' : 'default'}
                                    onClick={() => handlePresetSelect(preset)}
                                    title={preset.description}
                                    style={{
                                        borderRadius: token.borderRadiusLG,
                                        fontWeight: 500,
                                        height: 'auto',
                                        padding: `${token.paddingXS}px ${token.paddingMD}px`,
                                    }}
                                >
                                    {preset.name}
                                </Button>
                            ))}
                        </Space>
                    </Col>
                </Row>
            </div>

            {/* Advanced Filters */}
            <Collapse
                activeKey={showAdvanced ? ['advanced'] : []}
                onChange={(keys) => setShowAdvanced(keys.includes('advanced'))}
                style={{
                    marginTop: token.marginLG,
                    borderRadius: token.borderRadiusLG,
                }}
                ghost
            >
                <Panel
                    header={
                        <Space>
                            <FilterOutlined style={{ color: token.colorPrimary }} />
                            <Text strong style={{ fontSize: token.fontSizeLG }}>
                                🔧 Advanced Filters
                            </Text>
                            {activeFiltersCount > 0 && (
                                <Tag color="blue" style={{ borderRadius: token.borderRadius }}>
                                    {activeFiltersCount} active
                                </Tag>
                            )}
                        </Space>
                    }
                    key="advanced"
                    style={{ borderRadius: token.borderRadiusLG }}
                >
                    <Form form={form} layout="vertical">
                        <Row gutter={[token.marginLG, token.marginMD]}>
                            {/* Performance Filters */}
                            <Col xs={24} md={8}>
                                <Card
                                    size="small"
                                    title={
                                        <Space>
                                            <ThunderboltOutlined
                                                style={{ color: token.colorWarning }}
                                            />
                                            <Text strong>⚡ Performance</Text>
                                        </Space>
                                    }
                                    style={{
                                        borderRadius: token.borderRadiusLG,
                                        boxShadow: token.boxShadowTertiary,
                                    }}
                                    bodyStyle={{ padding: token.paddingMD }}
                                >
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div>
                                            <Text strong>Duration (ms)</Text>
                                            <Input.Group compact>
                                                <InputNumber
                                                    placeholder="Min"
                                                    value={filters.durationRange[0]}
                                                    onChange={(value) =>
                                                        handleFilterChange('durationRange', [
                                                            value,
                                                            filters.durationRange[1],
                                                        ])
                                                    }
                                                    style={{ width: '50%' }}
                                                />
                                                <InputNumber
                                                    placeholder="Max"
                                                    value={filters.durationRange[1]}
                                                    onChange={(value) =>
                                                        handleFilterChange('durationRange', [
                                                            filters.durationRange[0],
                                                            value,
                                                        ])
                                                    }
                                                    style={{ width: '50%' }}
                                                />
                                            </Input.Group>
                                        </div>
                                        <div>
                                            <Text strong>Token Usage</Text>
                                            <Input.Group compact>
                                                <InputNumber
                                                    placeholder="Min"
                                                    value={filters.tokenRange[0]}
                                                    onChange={(value) =>
                                                        handleFilterChange('tokenRange', [
                                                            value,
                                                            filters.tokenRange[1],
                                                        ])
                                                    }
                                                    style={{ width: '50%' }}
                                                />
                                                <InputNumber
                                                    placeholder="Max"
                                                    value={filters.tokenRange[1]}
                                                    onChange={(value) =>
                                                        handleFilterChange('tokenRange', [
                                                            filters.tokenRange[0],
                                                            value,
                                                        ])
                                                    }
                                                    style={{ width: '50%' }}
                                                />
                                            </Input.Group>
                                        </div>
                                        <div>
                                            <Text strong>Response Time (ms)</Text>
                                            <Input.Group compact>
                                                <InputNumber
                                                    placeholder="Min"
                                                    value={filters.responseTimeRange[0]}
                                                    onChange={(value) =>
                                                        handleFilterChange('responseTimeRange', [
                                                            value,
                                                            filters.responseTimeRange[1],
                                                        ])
                                                    }
                                                    style={{ width: '50%' }}
                                                />
                                                <InputNumber
                                                    placeholder="Max"
                                                    value={filters.responseTimeRange[1]}
                                                    onChange={(value) =>
                                                        handleFilterChange('responseTimeRange', [
                                                            filters.responseTimeRange[0],
                                                            value,
                                                        ])
                                                    }
                                                    style={{ width: '50%' }}
                                                />
                                            </Input.Group>
                                        </div>
                                    </Space>
                                </Card>
                            </Col>

                            {/* Retry & Error Filters */}
                            <Col xs={24} md={8}>
                                <Card
                                    size="small"
                                    title={
                                        <Space>
                                            <BugOutlined style={{ color: token.colorError }} />
                                            <Text strong>🐛 Retry & Errors</Text>
                                        </Space>
                                    }
                                    style={{
                                        borderRadius: token.borderRadiusLG,
                                        boxShadow: token.boxShadowTertiary,
                                    }}
                                    bodyStyle={{ padding: token.paddingMD }}
                                >
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div>
                                            <Text strong>Retry Severity</Text>
                                            <Select
                                                mode="multiple"
                                                placeholder="Select severity levels"
                                                value={filters.retrySeverity}
                                                onChange={(value) =>
                                                    handleFilterChange('retrySeverity', value)
                                                }
                                                style={{ width: '100%' }}
                                            >
                                                {RETRY_SEVERITY_OPTIONS.map((option) => (
                                                    <Option key={option.value} value={option.value}>
                                                        <Tag color={option.color}>
                                                            {option.label}
                                                        </Tag>
                                                    </Option>
                                                ))}
                                            </Select>
                                        </div>
                                        <div>
                                            <Text strong>Attempt Count</Text>
                                            <Input.Group compact>
                                                <InputNumber
                                                    placeholder="Min"
                                                    value={filters.attemptCountRange[0]}
                                                    onChange={(value) =>
                                                        handleFilterChange('attemptCountRange', [
                                                            value,
                                                            filters.attemptCountRange[1],
                                                        ])
                                                    }
                                                    style={{ width: '50%' }}
                                                />
                                                <InputNumber
                                                    placeholder="Max"
                                                    value={filters.attemptCountRange[1]}
                                                    onChange={(value) =>
                                                        handleFilterChange('attemptCountRange', [
                                                            filters.attemptCountRange[0],
                                                            value,
                                                        ])
                                                    }
                                                    style={{ width: '50%' }}
                                                />
                                            </Input.Group>
                                        </div>
                                        <div>
                                            <Text strong>Error Types</Text>
                                            <Select
                                                mode="multiple"
                                                placeholder="Select error types"
                                                value={filters.errorTypes}
                                                onChange={(value) =>
                                                    handleFilterChange('errorTypes', value)
                                                }
                                                style={{ width: '100%' }}
                                                loading={loading}
                                            >
                                                {filterOptions.errorTypes.map((errorType) => (
                                                    <Option key={errorType} value={errorType}>
                                                        {errorType}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </div>
                                        <div>
                                            <Text strong>Status Codes</Text>
                                            <Select
                                                mode="multiple"
                                                placeholder="Select status codes"
                                                value={filters.statusCodes}
                                                onChange={(value) =>
                                                    handleFilterChange('statusCodes', value)
                                                }
                                                style={{ width: '100%' }}
                                                loading={loading}
                                            >
                                                {filterOptions.statusCodes.map((statusCode) => (
                                                    <Option key={statusCode} value={statusCode}>
                                                        {statusCode} -{' '}
                                                        {getStatusCodeLabel(statusCode)}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </div>
                                        <div>
                                            <Text strong>Has Errors</Text>
                                            <Select
                                                value={filters.hasErrors}
                                                onChange={(value) =>
                                                    handleFilterChange('hasErrors', value)
                                                }
                                                style={{ width: '100%' }}
                                                placeholder="Select option"
                                            >
                                                <Option value={null}>All</Option>
                                                <Option value={true}>Yes</Option>
                                                <Option value={false}>No</Option>
                                            </Select>
                                        </div>
                                    </Space>
                                </Card>
                            </Col>

                            {/* Advanced Options */}
                            <Col xs={24} md={8}>
                                <Card
                                    size="small"
                                    title={
                                        <Space>
                                            <EyeOutlined style={{ color: token.colorInfo }} />
                                            <Text strong>🔍 Advanced</Text>
                                        </Space>
                                    }
                                    style={{
                                        borderRadius: token.borderRadiusLG,
                                        boxShadow: token.boxShadowTertiary,
                                    }}
                                    bodyStyle={{ padding: token.paddingMD }}
                                >
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <div>
                                            <Text strong>Stream Only</Text>
                                            <Select
                                                value={filters.streamOnly}
                                                onChange={(value) =>
                                                    handleFilterChange('streamOnly', value)
                                                }
                                                style={{ width: '100%' }}
                                                placeholder="Select option"
                                            >
                                                <Option value={null}>All</Option>
                                                <Option value={true}>Yes</Option>
                                                <Option value={false}>No</Option>
                                            </Select>
                                        </div>
                                        <div>
                                            <Text strong>Model Filter</Text>
                                            <Select
                                                mode="multiple"
                                                placeholder="Select models"
                                                value={filters.modelFilter}
                                                onChange={(value) =>
                                                    handleFilterChange('modelFilter', value)
                                                }
                                                style={{ width: '100%' }}
                                                loading={loading}
                                            >
                                                {filterOptions.models.map((model) => (
                                                    <Option key={model} value={model}>
                                                        {model}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </div>
                                        <div>
                                            <Text strong>User ID</Text>
                                            <Input
                                                placeholder="Filter by user ID"
                                                value={filters.userFilter}
                                                onChange={(e) =>
                                                    handleFilterChange('userFilter', e.target.value)
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Text strong>Proxy Key ID</Text>
                                            <Input
                                                placeholder="Filter by proxy key ID"
                                                value={filters.proxyKeyFilter}
                                                onChange={(e) =>
                                                    handleFilterChange(
                                                        'proxyKeyFilter',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Text strong>API Key ID</Text>
                                            <Input
                                                placeholder="Filter by API key ID"
                                                value={filters.apiKeyFilter}
                                                onChange={(e) =>
                                                    handleFilterChange(
                                                        'apiKeyFilter',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </Space>
                                </Card>
                            </Col>
                        </Row>
                    </Form>
                </Panel>
            </Collapse>
        </Card>
    );
};
