// OrganizationSettings.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { OrgAuthUrl, OrgUrl, SERVER } from '../services/ApiUrls';
import {
    Box,
    Container,
    Paper,
    Button,
    Stack,
    Tabs,
    Tab,
    Typography,
    FormControlLabel,
    Checkbox,
    Switch,
    FormGroup,
    Divider
} from '@mui/material';
import { CustomToolbar } from '../styles/CssStyled';
import PermissionsMatrix from '../pages/permissions/PermissionsMatrix';
import SuccessSnackbar from './SuccessSnackbar';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel = (props: TabPanelProps) => {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
};

const Settings = () => {
    const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false);
    const [pendingGoogleAuth, setPendingGoogleAuth] = useState(false);
    const [permissionsChanges, setPermissionsChanges] = useState<Map<string, string[]>>(new Map());
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const orgId = localStorage.getItem('org')

    useEffect(() => {
        // Fetch the current google_auth_enabled status when the component loads
        const fetchGoogleAuthStatus = async () => {
            try {
                const response = await axios.get(`${SERVER}${OrgAuthUrl}/${orgId}/`, {
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        Authorization: localStorage.getItem('Token'),
                        org: localStorage.getItem('org')
                    }
                });
                const enabled = response.data.google_auth_enabled;
                setGoogleAuthEnabled(enabled);
                setPendingGoogleAuth(enabled);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching Google Auth status:', error);
                setLoading(false);
            }
        };

        fetchGoogleAuthStatus();
    }, [orgId]);

    const handleCheckboxChange = () => {
        setPendingGoogleAuth(!pendingGoogleAuth);
    };

    const toggleGoogleAuth = async () => {
        try {
            const response = await axios.patch(`${SERVER}${OrgAuthUrl}/${orgId}/`, {
                google_auth_enabled: pendingGoogleAuth
            }, {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: localStorage.getItem('Token'),
                    org: localStorage.getItem('org')                    
                }
            });
            setGoogleAuthEnabled(response.data.google_auth_enabled);
            setPendingGoogleAuth(response.data.google_auth_enabled);
        } catch (error) {
            console.error('Error updating Google Auth status:', error);
            // Hata durumunda pending state'i mevcut duruma geri döndür
            setPendingGoogleAuth(googleAuthEnabled);
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const handlePermissionsChange = (changes: Map<string, string[]>) => {
        setPermissionsChanges(changes);
    };

    const handleSaveChanges = async () => {
        if (activeTab === 0 && googleAuthEnabled !== pendingGoogleAuth) {
            try {
                await toggleGoogleAuth();
                setSuccessMessage('Google authentication settings updated successfully');
                setShowSuccessMessage(true);
            } catch (error) {
                console.error('Error updating Google Auth status:', error);
            }
        } else if (activeTab === 1 && permissionsChanges.size > 0) {
            try {
                const rolePermissions = Array.from(permissionsChanges.entries()).map(([roleId, permissions]) => ({
                    role_id: roleId,
                    permissions: permissions
                }));

                await axios.post(`${SERVER}/api/roles/update_permissions/`, {
                    role_permissions: rolePermissions
                }, {
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        Authorization: localStorage.getItem('Token'),
                        org: localStorage.getItem('org')
                    }
                });

                // Clear changes after successful save
                setPermissionsChanges(new Map());
                setSuccessMessage('Permissions updated successfully');
                setShowSuccessMessage(true);
            } catch (error) {
                console.error('Error updating permissions:', error);
            }
        }
    };

    const handleCloseSnackbar = () => {
        setShowSuccessMessage(false);
    };

    if (loading) return <p>Loading settings...</p>;

    const hasChanges = activeTab === 0 
        ? googleAuthEnabled !== pendingGoogleAuth
        : permissionsChanges.size > 0;

    return (
        <Box sx={{ mt: '60px' }}>
            <CustomToolbar>
                <div></div>
                <Stack sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <Button 
                        onClick={handleSaveChanges}
                        variant="contained"
                        className={'add-button'}
                        disabled={!hasChanges}
                        sx={{
                            '&.Mui-disabled': {
                                backgroundColor: 'rgba(25, 118, 210, 0.5)',
                                color: 'white'
                            }
                        }}
                    >
                        Save Changes
                    </Button>
                </Stack>
            </CustomToolbar>

            <Container sx={{ width: '100%', maxWidth: '100%', minWidth: '100%' }}>
                <Box sx={{ width: '100%', minWidth: '100%', m: '15px 0px 0px 0px' }}>
                    <Paper sx={{ width: 'calc(100%-15px)', mb: 2, p: '15px' }}>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs 
                                value={activeTab} 
                                onChange={handleTabChange}
                                aria-label="settings tabs"
                            >
                                <Tab label="Authentication" />
                                <Tab label="Authorization" />
                            </Tabs>
                        </Box>

                        <TabPanel value={activeTab} index={0}>                            
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={pendingGoogleAuth}
                                            onChange={handleCheckboxChange}
                                            color="primary"
                                        />
                                    }
                                    label={
                                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                            <Typography variant="body1">
                                                Enable Google Login
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Allow users to sign in with their Google accounts
                                            </Typography>
                                        </Box>
                                    }
                                    sx={{
                                        margin: '8px 0',
                                        '.MuiFormControlLabel-label': {
                                            marginLeft: 1
                                        }
                                    }}
                                />
                            </FormGroup>
                        </TabPanel>

                        <TabPanel value={activeTab} index={1}>
                            <PermissionsMatrix 
                                onChanges={handlePermissionsChange}                                
                            />
                        </TabPanel>
                    </Paper>
                </Box>
            </Container>

            <SuccessSnackbar
                open={showSuccessMessage}
                onClose={handleCloseSnackbar}
                message={successMessage}
            />
        </Box>
    );
};

export default Settings;
