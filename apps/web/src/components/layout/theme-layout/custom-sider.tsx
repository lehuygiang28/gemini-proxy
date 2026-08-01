import React, { useContext, type CSSProperties, type ReactNode } from 'react';
import {
    Layout,
    Menu,
    Grid,
    Drawer,
    Button,
    theme,
    ConfigProvider,
    type MenuProps,
} from 'antd';
import {
    LogoutOutlined,
    UnorderedListOutlined,
    BarsOutlined,
    LeftOutlined,
    RightOutlined,
} from '@ant-design/icons';
import {
    type TreeMenuItem,
    useTranslate,
    useLogout,
    useIsExistAuthentication,
    useMenu,
    useLink,
    useWarnAboutChange,
} from '@refinedev/core';
import {
    useThemedLayoutContext,
    type RefineThemedLayoutSiderProps,
} from '@refinedev/antd';
import { CustomTitle } from './custom-title';

const drawerButtonStyles: CSSProperties = {
    borderStartStartRadius: 0,
    borderEndStartRadius: 0,
    position: 'fixed',
    top: 64,
    zIndex: 999,
};

type MenuItem = NonNullable<MenuProps['items']>[number];

function buildMenuItems(
    tree: TreeMenuItem[],
    selectedKey: string | undefined,
    Link: ReturnType<typeof useLink>,
    siderCollapsed: boolean,
    activeItemDisabled: boolean,
): MenuItem[] {
    return tree.map((item) => {
        const { key, children, meta, list } = item;
        const label = item?.label ?? meta?.label ?? item.name;
        const icon = meta?.icon ?? <UnorderedListOutlined />;
        if (children.length > 0) {
            return {
                key: String(key),
                icon,
                label,
                children: buildMenuItems(
                    children,
                    selectedKey,
                    Link,
                    siderCollapsed,
                    activeItemDisabled,
                ),
            };
        }
        const isSelected = key === selectedKey;
        const linkStyle: CSSProperties =
            activeItemDisabled && isSelected ? { pointerEvents: 'none' } : {};
        return {
            key: String(key),
            icon,
            label: (
                <>
                    <Link to={list ?? ''} style={linkStyle}>
                        {label}
                    </Link>
                    {!siderCollapsed && isSelected ? (
                        <div className="ant-menu-tree-arrow" />
                    ) : null}
                </>
            ),
            style: linkStyle,
        };
    });
}

/**
 * Themed sider using Ant Design Menu `items` (not deprecated children/Menu.Item).
 */
export function CustomSider({
    Title: TitleFromProps,
    meta,
    fixed,
    activeItemDisabled = false,
    siderItemsAreCollapsed = true,
}: RefineThemedLayoutSiderProps) {
    const { token } = theme.useToken();
    const {
        siderCollapsed,
        setSiderCollapsed,
        mobileSiderOpen,
        setMobileSiderOpen,
    } = useThemedLayoutContext();
    const isExistAuthentication = useIsExistAuthentication();
    const direction = useContext(ConfigProvider.ConfigContext)?.direction;
    const Link = useLink();
    const { warnWhen, setWarnWhen } = useWarnAboutChange();
    const translate = useTranslate();
    const { menuItems, selectedKey, defaultOpenKeys } = useMenu({ meta });
    const breakpoint = Grid.useBreakpoint();
    const { mutate: mutateLogout } = useLogout();
    const isMobile = typeof breakpoint.lg === 'undefined' ? false : !breakpoint.lg;
    const RenderToTitle = TitleFromProps ?? CustomTitle;

    const handleLogout = (): void => {
        if (warnWhen) {
            const confirmed = window.confirm(
                translate(
                    'warnWhenUnsavedChanges',
                    'Are you sure you want to leave? You have unsaved changes.',
                ),
            );
            if (confirmed) {
                setWarnWhen(false);
                mutateLogout();
            }
            return;
        }
        mutateLogout();
    };

    const defaultExpandMenuItems = siderItemsAreCollapsed
        ? []
        : menuItems.map(({ key }) => key).filter((key): key is string => Boolean(key));

    const treeItems = buildMenuItems(
        menuItems,
        selectedKey,
        Link,
        siderCollapsed,
        activeItemDisabled,
    );
    const items: MenuItem[] = isExistAuthentication
        ? [
              ...treeItems,
              {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: translate('buttons.logout', 'Logout'),
                  onClick: () => handleLogout(),
              },
          ]
        : treeItems;

    const renderMenu = (): ReactNode => (
        <Menu
            className="gp-scrollable"
            selectedKeys={selectedKey ? [selectedKey] : []}
            defaultOpenKeys={[...defaultOpenKeys, ...defaultExpandMenuItems]}
            mode="inline"
            style={{
                paddingTop: 8,
                border: 'none',
                overflow: 'auto',
                flex: 1,
                minHeight: 0,
            }}
            onClick={() => {
                setMobileSiderOpen(false);
            }}
            items={items}
        />
    );

    if (isMobile) {
        return (
            <>
                <Drawer
                    open={mobileSiderOpen}
                    onClose={() => setMobileSiderOpen(false)}
                    placement={direction === 'rtl' ? 'right' : 'left'}
                    closable={false}
                    width={200}
                    styles={{ body: { padding: 0 } }}
                    maskClosable
                >
                    <Layout>
                        <Layout.Sider
                            style={{
                                height: '100dvh',
                                backgroundColor: token.colorBgContainer,
                                borderRight: `1px solid ${token.colorBgElevated}`,
                            }}
                        >
                            <div
                                style={{
                                    width: 200,
                                    padding: '0 16px',
                                    display: 'flex',
                                    justifyContent: 'flex-start',
                                    alignItems: 'center',
                                    height: 64,
                                    backgroundColor: token.colorBgElevated,
                                }}
                            >
                                <RenderToTitle collapsed={false} />
                            </div>
                            {renderMenu()}
                        </Layout.Sider>
                    </Layout>
                </Drawer>
                <Button
                    style={drawerButtonStyles}
                    size="large"
                    onClick={() => setMobileSiderOpen(true)}
                    icon={<BarsOutlined />}
                />
            </>
        );
    }

    const siderStyles: CSSProperties = {
        backgroundColor: token.colorBgContainer,
        borderRight: `1px solid ${token.colorBgElevated}`,
        height: '100%',
        overflow: 'hidden',
    };
    if (fixed) {
        siderStyles.position = 'fixed';
        siderStyles.top = 0;
        siderStyles.height = '100dvh';
        siderStyles.zIndex = 999;
    }

    const OpenIcon = direction === 'rtl' ? RightOutlined : LeftOutlined;
    const CollapsedIcon = direction === 'rtl' ? LeftOutlined : RightOutlined;
    const IconComponent = siderCollapsed ? CollapsedIcon : OpenIcon;

    return (
        <>
            {fixed ? (
                <div
                    style={{
                        width: siderCollapsed ? 80 : 200,
                        transition: 'all 0.2s',
                    }}
                />
            ) : null}
            <Layout.Sider
                style={siderStyles}
                collapsible
                collapsed={siderCollapsed}
                onCollapse={(collapsed, type) => {
                    if (type === 'clickTrigger') {
                        setSiderCollapsed(collapsed);
                    }
                }}
                collapsedWidth={80}
                breakpoint="lg"
                trigger={
                    <Button
                        type="text"
                        style={{
                            borderRadius: 0,
                            height: '100%',
                            width: '100%',
                            backgroundColor: token.colorBgElevated,
                        }}
                    >
                        <IconComponent style={{ color: token.colorPrimary }} />
                    </Button>
                }
            >
                <div
                    style={{
                        width: siderCollapsed ? 80 : 200,
                        padding: siderCollapsed ? 0 : '0 16px',
                        display: 'flex',
                        justifyContent: siderCollapsed ? 'center' : 'flex-start',
                        alignItems: 'center',
                        height: 64,
                        backgroundColor: token.colorBgElevated,
                        fontSize: 14,
                    }}
                >
                    <RenderToTitle collapsed={siderCollapsed} />
                </div>
                {renderMenu()}
            </Layout.Sider>
        </>
    );
}
