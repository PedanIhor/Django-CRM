import React, { useEffect, useState } from 'react';
import { Box, Button, Container, Paper, Typography, Avatar, Grid, TextField, IconButton } from '@mui/material';
import { CustomToolbar } from '../../styles/CssStyled';
import { fetchData } from '../../components/FetchData';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import SuccessSnackbar from '../../components/SuccessSnackbar';
import axios from 'axios';
import { SERVER } from '../../services/ApiUrls';

interface ProfileData {
    address_line: string;
    city: string;
    country: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    postcode: string;
    profile_pic: string;
    state: string;
    street: string;
}

const MyProfile: React.FC = () => {
    const [userData, setUserData] = useState<ProfileData | null>(null);
    const [editPersonal, setEditPersonal] = useState(false);
    const [editAddress, setEditAddress] = useState(false);
    const [formData, setFormData] = useState<ProfileData | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        const getProfile = async () => {
            const Header = {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: localStorage.getItem('Token'),
                org: localStorage.getItem('org')
            };

            try {
                const response = await fetchData('/api/profile-detail/', 'GET', null as any, Header);
                console.log('Full Response:', response);
                setUserData(response);
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        };

        getProfile();
    }, []);

    useEffect(() => {
        if (userData) {
            setFormData(userData);
        }
    }, [userData]);

    const handleInputChange = (field: keyof ProfileData) => (event: React.ChangeEvent<HTMLInputElement>) => {
        if (formData) {
            setFormData({
                ...formData,
                [field]: event.target.value
            });
        }
    };

    const handleSave = async (section: 'personal' | 'address') => {
        if (!formData) return;

        const Header = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
        };

        try {
            let dataToSend;
            if (section === 'personal') {
                dataToSend = {
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    phone: formData.phone
                };
            } else {
                // Send address fields at root level to match serializer structure
                dataToSend = {
                    address_line: formData.address_line,
                    street: formData.street,
                    city: formData.city,
                    state: formData.state,
                    postcode: formData.postcode,
                    country: formData.country
                };
            }

            const response = await fetchData(
                '/api/profile-detail/', 
                'PATCH', 
                JSON.stringify(dataToSend),
                Header
            );
            
            // Add logging to debug the response
            console.log('Update Response:', response);
            
            setUserData(response);
            if (section === 'personal') {
                setEditPersonal(false);
                setSnackbarMessage('Personal information updated successfully');
            }
            if (section === 'address') {
                setEditAddress(false);
                setSnackbarMessage('Address information updated successfully');
            }
            setSnackbarOpen(true);
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    

const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        setSelectedFile(file);

        const formData = new FormData();
        formData.append('profile_pic', file);

        const headers = {
            Accept: 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
        };

        try {
            // Upload the image to the server and get the URL
            const uploadResponse = await axios.post(`${SERVER}/api/upload-profile-pic/`, formData, { headers });

            const uploadResult = uploadResponse.data;
            const imageUrl = uploadResult.url; // Assuming the server returns the URL of the saved image
            console.log('Image URL:', imageUrl);
            // Update the formData state with the new profile picture URL
            setFormData((prevFormData) => {
                if (prevFormData) {
                    return {
                        ...prevFormData,
                        profile_pic: imageUrl
                    };
                }
                return prevFormData;
            });

            // Update the userData state with the new profile picture URL
            if (userData) {
                setUserData({
                    ...userData,
                    profile_pic: imageUrl
                });
            }

            setSnackbarMessage('Profile picture updated successfully');
            setSnackbarOpen(true);
        } catch (error) {
            console.error('Error updating profile picture:', error);
        }
    }
};

    return (
        <Box sx={{ mt: '60px' }}>
            <CustomToolbar>
                <div style={{ flex: 1 }}></div>                
            </CustomToolbar>
            
            <Container sx={{ width: '100%', maxWidth: '100%', minWidth: '100%' }}>
                <Box sx={{ width: '100%', minWidth: '100%', m: '15px 0px 0px 0px' }}>
                    <Paper sx={{ width: 'cal(100%-15px)', mb: 2, p: '0px 15px 15px 15px' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 2 }}>
                            {/* First Section - Profile Overview */}
                            <Paper 
                                elevation={0}
                                sx={{ 
                                    p: 3, 
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 2
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Avatar 
                                    src={userData?.profile_pic ? `${SERVER}${userData.profile_pic}` : undefined}
                                    sx={{ width: 100, height: 100 }}
                                />
                                    <Box>
                                        <Typography variant="h5" sx={{ color: '#0e0e0e !important', fontWeight: "400 !important" }}>
                                            {userData?.first_name} {userData?.last_name}
                                        </Typography>
                                        <Typography variant="body1" sx={{ color: 'rgba(74, 99, 103, 0.6)' }}>
                                            {userData?.city}, {userData?.country}
                                        </Typography>
                                        <Typography 
                                            variant="body2" 
                                            sx={{ color: 'blue', cursor: 'pointer' }} 
                                            onClick={() => document.getElementById('fileInput')?.click()}
                                        >
                                            Change Profile Image
                                        </Typography>
                                        <input 
                                            type="file" 
                                            id="fileInput" 
                                            style={{ display: 'none' }} 
                                            onChange={handleFileChange} 
                                        />
                                    </Box>
                                </Box>
                            </Paper>

                            {/* Second Section - Personal Information */}
                            <Paper 
                                elevation={0}
                                sx={{ 
                                    p: 3, 
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 2
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" sx={{ color: '#0e0e0e !important', fontWeight: "500 !important" }}>
                                        Personal Information
                                    </Typography>
                                    {!editPersonal ? (
                                        <IconButton onClick={() => setEditPersonal(true)} size="small">
                                            <EditIcon />
                                        </IconButton>
                                    ) : (
                                        <Box>
                                            <IconButton onClick={() => handleSave('personal')} size="small" sx={{ mr: 1 }}>
                                                <SaveIcon />
                                            </IconButton>
                                            <IconButton onClick={() => {
                                                setEditPersonal(false);
                                                setFormData(userData);
                                            }} size="small">
                                                <CancelIcon />
                                            </IconButton>
                                        </Box>
                                    )}
                                </Box>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" sx={{ color: 'rgba(74, 99, 103, 0.6)' }}>First Name</Typography>
                                        {editPersonal ? (
                                            <TextField
                                                fullWidth
                                                value={formData?.first_name || ''}
                                                onChange={handleInputChange('first_name')}
                                                size="small"
                                            />
                                        ) : (
                                            <Typography variant="body1">{userData?.first_name}</Typography>
                                        )}
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" sx={{ color: 'rgba(74, 99, 103, 0.6)' }}>Last Name</Typography>
                                        {editPersonal ? (
                                            <TextField
                                                fullWidth
                                                value={formData?.last_name || ''}
                                                onChange={handleInputChange('last_name')}
                                                size="small"
                                            />
                                        ) : (
                                            <Typography variant="body1">{userData?.last_name}</Typography>
                                        )}
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" sx={{ color: 'rgba(74, 99, 103, 0.6)' }}>Email</Typography>
                                        <Typography variant="body1">{userData?.email}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" sx={{ color: 'rgba(74, 99, 103, 0.6)' }}>Phone</Typography>
                                        {editPersonal ? (
                                            <TextField
                                                fullWidth
                                                value={formData?.phone || ''}
                                                onChange={handleInputChange('phone')}
                                                size="small"
                                            />
                                        ) : (
                                            <Typography variant="body1">{userData?.phone}</Typography>
                                        )}
                                    </Grid>
                                </Grid>
                            </Paper>

                            {/* Third Section - Address */}
                            <Paper 
                                elevation={0}
                                sx={{ 
                                    p: 3, 
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 2
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" sx={{ color: '#0e0e0e !important', fontWeight: "500 !important" }}>
                                        Address
                                    </Typography>
                                    {!editAddress ? (
                                        <IconButton onClick={() => setEditAddress(true)} size="small">
                                            <EditIcon />
                                        </IconButton>
                                    ) : (
                                        <Box>
                                            <IconButton onClick={() => handleSave('address')} size="small" sx={{ mr: 1 }}>
                                                <SaveIcon />
                                            </IconButton>
                                            <IconButton onClick={() => {
                                                setEditAddress(false);
                                                setFormData(userData);
                                            }} size="small">
                                                <CancelIcon />
                                            </IconButton>
                                        </Box>
                                    )}
                                </Box>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" sx={{ color: 'rgba(74, 99, 103, 0.6)' }}>Address Line</Typography>
                                        {editAddress ? (
                                            <TextField
                                                fullWidth
                                                value={formData?.address_line || ''}
                                                onChange={handleInputChange('address_line')}
                                                size="small"
                                            />
                                        ) : (
                                            <Typography variant="body1">{userData?.address_line}</Typography>
                                        )}
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" sx={{ color: 'rgba(74, 99, 103, 0.6)' }}>Street</Typography>
                                        {editAddress ? (
                                            <TextField
                                                fullWidth
                                                value={formData?.street || ''}
                                                onChange={handleInputChange('street')}
                                                size="small"
                                            />
                                        ) : (
                                            <Typography variant="body1">{userData?.street}</Typography>
                                        )}
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" sx={{ color: 'rgba(74, 99, 103, 0.6)' }}>City</Typography>
                                        {editAddress ? (
                                            <TextField
                                                fullWidth
                                                value={formData?.city || ''}
                                                onChange={handleInputChange('city')}
                                                size="small"
                                            />
                                        ) : (
                                            <Typography variant="body1">{userData?.city}</Typography>
                                        )}
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" sx={{ color: 'rgba(74, 99, 103, 0.6)' }}>State</Typography>
                                        {editAddress ? (
                                            <TextField
                                                fullWidth
                                                value={formData?.state || ''}
                                                onChange={handleInputChange('state')}
                                                size="small"
                                            />
                                        ) : (
                                            <Typography variant="body1">{userData?.state}</Typography>
                                        )}
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" sx={{ color: 'rgba(74, 99, 103, 0.6)' }}>Postal Code</Typography>
                                        {editAddress ? (
                                            <TextField
                                                fullWidth
                                                value={formData?.postcode || ''}
                                                onChange={handleInputChange('postcode')}
                                                size="small"
                                            />
                                        ) : (
                                            <Typography variant="body1">{userData?.postcode}</Typography>
                                        )}
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" sx={{ color: 'rgba(74, 99, 103, 0.6)' }}>Country</Typography>
                                        {editAddress ? (
                                            <TextField
                                                fullWidth
                                                value={formData?.country || ''}
                                                onChange={handleInputChange('country')}
                                                size="small"
                                            />
                                        ) : (
                                            <Typography variant="body1">{userData?.country}</Typography>
                                        )}
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Box>
                    </Paper>
                </Box>
            </Container>
            <SuccessSnackbar 
                open={snackbarOpen}
                onClose={handleSnackbarClose}
                message={snackbarMessage}
            />
        </Box>
    );
};

export default MyProfile;