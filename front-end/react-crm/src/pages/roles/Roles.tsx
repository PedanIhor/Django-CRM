import React, { useState, useEffect } from 'react'
import { Box, Button, Stack, Container, Paper, TableContainer, Table, TableRow, TableCell, TableBody, IconButton, Popover, TextField } from '@mui/material'
import { CustomToolbar } from '../../styles/CssStyled';
import { FiPlus } from "@react-icons/all-files/fi/FiPlus";
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import { EnhancedTableHead } from '../../components/EnchancedTableHead';
import { fetchData } from '../../components/FetchData';
import { RolesUrl, SERVER } from '../../services/ApiUrls';

export default function Roles() {

    interface Role {
        id: string;
        name: string;
        permissions: any[];
    }

    interface HeadCell {
        disablePadding: boolean;
        id: any;
        label: string;
        numeric: boolean;
        align?: 'left' | 'right' | 'center';
    }
    const headCells: readonly HeadCell[] = [
        {
          id: 'name',
          numeric: false,
          disablePadding: false,
          label: 'Name'
        },
        {
          id: '',
          numeric: true,
          disablePadding: false,
          label: 'Actions',
          align: 'right'
        }
    ]


    const [order, setOrder] = useState('asc')
    const [orderBy, setOrderBy] = useState('Website')


    const [roles, setRoles] = useState<Role[]>([])


    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const isPopoverOpen = Boolean(anchorEl);
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const popoverId = isPopoverOpen ? 'simple-popover' : undefined;
    const [roleName, setRoleName] = useState('');

    const getRoles = async () => {
        const Header = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
          }
        try {
            await fetchData(`${RolesUrl}/?include_permissions=true`, 'GET', null as any, Header)
                .then((res: any) => {
                    if (!res.error) {
                        setRoles(res)
                    }
                })
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    const addRole = async (name: string) => {
        const Header = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
        }

        const data = {
            name: name,
            permissions: []
        }

        try {
            await fetchData(`${RolesUrl}/`, 'POST', JSON.stringify(data), Header)
                .then((res: any) => {
                    if (!res.error) {
                        getRoles()
                    }
                })
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    const updateRole = async (role: any, newName: string) => {
        const Header = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
        }

        const data = {
            name: newName,
            permissions: role.permissions
        }

        try {
            await fetchData(`${RolesUrl}/${role.id}/`, 'PATCH', JSON.stringify(data), Header)
                .then((res: any) => {
                    if (!res.error) {
                        getRoles()
                    }
                })
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    const deleteRole = async (id: any) => {
        const Header = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
        }
        try {
            console.log('Attempting to delete role:', id);
            const response = await fetch(`${SERVER}${RolesUrl}/${id}/`, {
                method: 'DELETE',
                headers: Header as any,
                body: null as any
              })
            
            console.log('Delete response:', response);
            await getRoles();
            console.log('Roles refreshed');
        } catch (error) {
            console.error('Error deleting data:', error);
        }
    }
    
    useEffect(() => {
        getRoles()
    }, [])
    
    const onAddRole = (event: React.MouseEvent<HTMLButtonElement>) => {
        // Show Popup
        setEditingRoleId(null);
        setRoleName('');
        setAnchorEl(event.currentTarget);
    }

    const onEditRole = (event: React.MouseEvent<HTMLButtonElement>, role: any) => {
        // Show Popup
        setEditingRoleId(role.id)
        setRoleName(role.name)
        setAnchorEl(event.currentTarget);
    }

    const onDeleteRole = (id: any) => {
        // Delete Role
        deleteRole(id)
    }

    const handlePopoverClose = () => {
        setAnchorEl(null);

        setTimeout(() => {
            setEditingRoleId(null);
            setRoleName('');
        }, 300);
    };

    const handleRequestSort = (event: any, property: any) => {
        const isAsc = orderBy === property && order === 'asc'
        setOrder(isAsc ? 'desc' : 'asc')
        setOrderBy(property)
    }

    const actionsButtons = (role: any) => {
        return (
            <>
                <IconButton onClick={(event) => onEditRole(event, role)}>
                    <FaEdit
                        style={{ fill: '#1A3353', cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                </IconButton>
                <IconButton onClick={() => onDeleteRole(role.id)} >
                    <FaTrashAlt 
                        style={{ fill: '#1A3353', cursor: 'pointer', width: '18px', height: '18px' }} 
                    />
                </IconButton>
            </>
        )
    }

    const itemRole = (role: any, index: any) => {
        return (<TableRow key={index} sx={{
            border: 0,
            '&:nth-of-type(even)': {
                backgroundColor: 'whitesmoke'
            },
            color: 'rgb(26, 51, 83)'
        }}>
            <TableCell sx={{ borderBottom: 'none' }}>
                <div style={{ display: 'flex' }}>
                    {role.name}
                </div>
            </TableCell>
            <TableCell sx={{ display: 'flex', justifyContent: 'flex-end', borderBottom: 'none'}}>
                <div style={{ minHeight: '30px' }}>
                    {role.name !== 'ADMIN' && actionsButtons(role)}
                </div>
            </TableCell>
        </TableRow>)
    }

    const rolePopover = () => {
        return <Popover
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}
            id={popoverId}
            open={isPopoverOpen}
            anchorEl={anchorEl}
            onClose={handlePopoverClose}
        >
            <Box sx={{ p: 3, width: 300 }}>
            <Stack spacing={2}>
                <TextField
                    fullWidth
                    label="Role Name"
                    variant="outlined"
                    size="small"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                />
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                    <Button 
                        variant="outlined" 
                        onClick={handlePopoverClose}
                    >
                        Cancel
                    </Button>
                    <Button 
                        variant="contained"
                        onClick={() => {
                            if (editingRoleId === null) {
                                addRole(roleName)
                            } else {
                                const roleToUpdate = roles.find(role => role.id === editingRoleId);
                                updateRole(roleToUpdate, roleName)
                            }
                            setRoleName('');
                            handlePopoverClose();
                        }}
                    >
                        {editingRoleId === null ? 'ADD' : 'UPDATE'}
                    </Button>
                </Stack>
            </Stack>
        </Box>
        </Popover>
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
            <Container sx={{ width: '100%', maxWidth: '100%', minWidth: '100%' }}>
                <Box sx={{ width: '100%', minWidth: '100%', m: '15px 0px 0px 0px' }}>
                    <Paper sx={{ width: 'cal(100%-15px)', mb: 2, p: '0px 15px 15px 15px' }}>
                        <TableContainer>
                            <Table>
                                <EnhancedTableHead
                                    headCells={headCells}
                                    order={order}
                                    orderBy={orderBy}
                                    onRequestSort={handleRequestSort}
                                />
                                <TableBody>
                                    {roles?.map((role: any, index: any) => (
                                        itemRole(role, index)
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>
            </Container>
            { rolePopover() }
        </Box>
    );
};
