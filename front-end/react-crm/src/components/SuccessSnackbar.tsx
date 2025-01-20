import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

interface SuccessSnackbarProps {
    open: boolean;
    onClose: () => void;
    message: string;
}

const SuccessSnackbar: React.FC<SuccessSnackbarProps> = ({ open, onClose, message }) => {
    return (
        <Snackbar open={open} autoHideDuration={3000} onClose={onClose}>
            <Alert onClose={onClose} severity="success" sx={{ width: '100%' }}>
                {message}
            </Alert>
        </Snackbar>
    );
};

export default SuccessSnackbar; 