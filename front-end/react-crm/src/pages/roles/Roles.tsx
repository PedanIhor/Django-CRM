import React from 'react'
import { useState, useEffect } from 'react'
import { Box, Button, Stack, Container, Paper, TableContainer, Table, TableRow, TableCell, TableBody, IconButton } from '@mui/material'
import { CustomToolbar } from '../../styles/CssStyled';
import { FiPlus } from "@react-icons/all-files/fi/FiPlus";
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import { EnhancedTableHead } from '../../components/EnchancedTableHead';
import { fetchData } from '../../components/FetchData';
import { RolesUrl } from '../../services/ApiUrls';

 export default function Roles() {

    interface HeadCell {
        disablePadding: boolean;
        id: any;
        label: string;
        numeric: boolean;
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
          label: 'Action'
        }
    ]


    const [order, setOrder] = useState('asc')
    const [orderBy, setOrderBy] = useState('Website')


    const [roles, setRoles] = useState([])

    const getRoles = async () => {
        const Header = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
          }
        try {
            await fetchData(`${RolesUrl}/`, 'GET', null as any, Header)
                .then((res: any) => {
                    if (!res.error) {
                        setRoles(res)
                    }
                })
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }
    
    useEffect(() => {
        getRoles()
    }, [])
    
    const onAddRole = () => {
        // Show Popup
    }

    const onEditRole = () => {
        // Show Popup
    }

    const onDeleteRole = () => {
        // Delete Role
    }

    const handleRequestSort = (event: any, property: any) => {
        const isAsc = orderBy === property && order === 'asc'
        setOrder(isAsc ? 'desc' : 'asc')
        setOrderBy(property)
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
                                        <TableRow key={index}>
                                            <TableCell>
                                                <div style={{ display: 'flex' }}>
                                                    {role.name}
                                                </div>
                                            </TableCell>
                                            {role.name === 'ADMIN' ? null :
                                                <TableCell className='tableCell'>
                                                    <IconButton>
                                                        <FaEdit
                                                            // onClick={() => EditItem(role.id)}
                                                            style={{ fill: '#1A3353', cursor: 'pointer', width: '18px' }}
                                                        />
                                                    </IconButton>
                                                    <IconButton>
                                                        <FaTrashAlt 
                                                        // onClick={() => onDeleteRole(role?.id)} 
                                                            style={{ fill: '#1A3353', cursor: 'pointer', width: '15px' }} 
                                                        />
                                                        </IconButton>
                                                </TableCell>
                                            }
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>
            </Container>
        </Box>
    );
};