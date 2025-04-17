import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

interface SuccessSnackbarProps {
    open: boolean;
    onClose: () => void;
    message: string;
    sx?: object;
}

const SuccessSnackbar: React.FC<SuccessSnackbarProps> = ({ open, onClose, message, sx }) => {
    return (
        <Snackbar open={open} autoHideDuration={10000} onClose={onClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
            <Alert onClose={onClose} severity="success" sx={{ width: '100%', ...sx }}>
                {message}
            </Alert>
        </Snackbar>
    );
};

export default SuccessSnackbar; 