import React, { useState } from 'react';
import {
    Typography,
    Link,
    Dialog,
    DialogContent,
    DialogTitle,
    TextField,
    Button,
    Box,
    Alert,
    CircularProgress,
} from '@mui/material';
import { RegisterUrl, SERVER } from '../../services/ApiUrls';

export default function SignUpPrompt() {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Open the signup modal
    const handleOpen = () => {
        setOpen(true);
        setError('');
        setSuccessMessage('');
    };

    // Close the signup modal
    const handleClose = () => {
        setOpen(false);
        setEmail('');
        setFirstName('');
        setLastName('');
        setPassword('');
        setPassword2('');
        setError('');
        setSuccessMessage('');
    };

    // Handle the signup API request
    const handleSignUp = async () => {
        setLoading(true);
        setError('');
        setSuccessMessage('');

        // Validate form inputs
        if (!email || !password || !password2) {
            setError('Email and password fields are required.');
            setLoading(false);
            return;
        }

        if (password !== password2) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${SERVER}${RegisterUrl}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email, 
                    password, 
                    password2,
                    first_name: firstName,
                    last_name: lastName 
                }),
            });

            if (response.status === 201) {
                const data = await response.json();
                setSuccessMessage(data.message);
            } else {
                const errorData = await response.json();
                const errorMessage = parseErrorResponse(errorData);
                setError(errorMessage);
            }
        } catch (error) {
            setError('An error occurred. Please check your internet connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    // Function to parse error response dynamically
    const parseErrorResponse = (errorData: any): string => {
        const errorMessages: string[] = [];

        // Iterate through each key in the error response
        Object.entries(errorData).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                // Join multiple messages for a single field
                errorMessages.push(...value);
            } else if (typeof value === 'string') {
                errorMessages.push(value);
            }
        });

        // Join all collected error messages into a single string
        return errorMessages.join(' ');
    };

    return (
        <>
            {/* Prompt for Sign Up */}
            <Typography variant="body2" sx={{ mt: 2 }}>
                Don't have an account?{' '}
                <Link
                    component="button"
                    variant="body2"
                    onClick={handleOpen}
                    sx={{ color: '#1976d2', fontWeight: 'bold', textDecoration: 'underline' }}
                >
                    Sign Up
                </Link>
            </Typography>

            {/* Signup Modal */}
            <Dialog
                open={open}
                onClose={handleClose}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        backdropFilter: 'blur(5px)',
                    },
                }}
            >
                <DialogTitle>Create an Account</DialogTitle>
                <DialogContent>
                    {successMessage ? (
                        // Success message
                        <Box sx={{ textAlign: 'center', mt: 2 }}>
                            <Typography variant="h6" color="success.main">
                                Thank you!
                            </Typography>
                            <Typography>
                                Please check your mailbox to verify your email address and complete the registration!
                            </Typography>
                            <Button
                                variant="contained"
                                color="primary"
                                sx={{ mt: 2 }}
                                onClick={handleClose}
                            >
                                Close
                            </Button>
                        </Box>
                    ) : (
                        // Signup form
                        <Box component="form" sx={{ mt: 2 }}>
                            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                            <TextField
                                label="Email"
                                variant="outlined"
                                fullWidth
                                value={email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                label="First Name"
                                variant="outlined"
                                fullWidth
                                value={firstName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                label="Last Name"
                                variant="outlined"
                                fullWidth
                                value={lastName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                label="Password"
                                type="password"
                                variant="outlined"
                                fullWidth
                                value={password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                label="Confirm Password"
                                type="password"
                                variant="outlined"
                                fullWidth
                                value={password2}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword2(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <Button
                                variant="contained"
                                color="primary"
                                fullWidth
                                sx={{ mt: 2 }}
                                onClick={handleSignUp}
                                disabled={loading}
                            >
                                {loading ? <CircularProgress size={24} /> : 'Sign Up'}
                            </Button>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
