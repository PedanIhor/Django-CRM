import React from 'react';
import { Box, Button, Stack, } from '@mui/material'
import { CustomToolbar } from '../../styles/CssStyled';
import { FiPlus } from "@react-icons/all-files/fi/FiPlus";

 export default function Roles() {

    const onAddRole = () => {
        // navigate('/app/roles/add-roles')
    }

    return (
        <Box sx={{ mt: '60px' }}>
            <CustomToolbar>
                <Stack sx={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    alignItems: 'center',
                    width: '100%',
                    justifyContent: 'flex-end'
                }}>
                    <Button
                        variant='contained'
                        startIcon={<FiPlus className='plus-icon' />}
                        onClick={onAddRole}
                        className={'add-button'}
                    >
                        Add Role
                    </Button>
                </Stack>
            </CustomToolbar>
        </Box>
    );
};