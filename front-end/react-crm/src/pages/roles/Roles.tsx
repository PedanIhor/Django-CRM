import React, { useState, useEffect } from 'react'
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

    const onEditRole = (id: any) => {
        // Show Popup
    }

    const onDeleteRole = (id: any) => {
        // Delete Role
        deleteRole(id)
    }

    const deleteRole = async (id: any) => {
        const Header = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
        }
        try {
            await fetchData(`${RolesUrl}/${id}/`, 'DELETE', null as any, Header)
                .then((res: any) => {
                    if (!res.error) {
                        getRoles()
                    }
                })
        } catch (error) {
            console.error('Error deleting data:', error);
        }
    }

    const handleRequestSort = (event: any, property: any) => {
        const isAsc = orderBy === property && order === 'asc'
        setOrder(isAsc ? 'desc' : 'asc')
        setOrderBy(property)
    }


    const actionsButtons = (id: any) => {
        return (
            <>
                <IconButton>
                    <FaEdit
                        onClick={() => onEditRole(id)}
                        style={{ fill: '#1A3353', cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                </IconButton>
                <IconButton>
                    <FaTrashAlt 
                        onClick={() => onDeleteRole(id)} 
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
                    {role.name !== 'ADMIN' && actionsButtons(role.id)}
                </div>
            </TableCell>
        </TableRow>)
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
        </Box>
    );
};




{/*
                        <TableContainer>
                            <Table>
                                <EnhancedTableHead
                                    numSelected={selected.length}
                                    order={order}
                                    orderBy={orderBy}
                                    onSelectAllClick={handleSelectAllClick}
                                    onRequestSort={handleRequestSort}
                                    rowCount={activeUsers?.length}
                                    numSelectedId={selectedId}
                                    isSelectedId={isSelectedId}
                                    headCells={headCells}
                                />
                                {tab === 'active' ?
                                    <TableBody>
                                        {
                                            activeUsers?.length > 0
                                                ? stableSort(activeUsers, getComparator(order, orderBy)).map((item: any, index: any) => {
                                                        const labelId = `enhanced-table-checkbox-${index}`
                                                        const rowIndex = selectedId.indexOf(item.id);
                                                        return (
                                                            <TableRow
                                                                tabIndex={-1}
                                                                key={index}
                                                                sx={{
                                                                    border: 0,
                                                                    '&:nth-of-type(even)': {
                                                                        backgroundColor: 'whitesmoke'
                                                                    },
                                                                    color: 'rgb(26, 51, 83)',
                                                                    textTransform: 'capitalize'
                                                                }}
                                                            >
                                                                <TableCell
                                                                    className='tableCell-link'
                                                                    onClick={() => userDetail(item.id)}
                                                                >
                                                                    {item?.user_details?.email ? item.user_details.email : '---'}
                                                                </TableCell>
                                                                <TableCell className='tableCell'>
                                                                    <div style={{ display: 'flex' }}>
                                                                        {item?.phone ? item.phone : '---'}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className='tableCell'>
                                                                    {item?.role.name ? item.role.name : '---'}
                                                                </TableCell>
                                                                <TableCell className='tableCell'>
                                                                    <IconButton>
                                                                        <FaEdit
                                                                            onClick={() => EditItem(item.id)}
                                                                            style={{ fill: '#1A3353', cursor: 'pointer', width: '18px' }}
                                                                        />
                                                                    </IconButton>
                                                                    <IconButton>
                                                                        <FaTrashAlt onClick={() => deleteRow(item?.id)} style={{ fill: '#1A3353', cursor: 'pointer', width: '15px' }} />
                                                                    </IconButton>
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })
                                                : <TableRow> <TableCell colSpan={8} sx={{ border: 0 }}><Spinner /></TableCell> </TableRow>
                                        }
                                    </TableBody> :
                                    <TableBody>
                                        {
                                            inactiveUsers?.length > 0
                                                ? stableSort(inactiveUsers, getComparator(order, orderBy)).map((item: any, index: any) => {
                                                        const labelId = `enhanced-table-checkbox-${index}`
                                                        const rowIndex = selectedId.indexOf(item.id);
                                                        return (
                                                            <TableRow
                                                                tabIndex={-1}
                                                                key={index}
                                                                sx={{
                                                                    border: 0,
                                                                    '&:nth-of-type(even)': {
                                                                        backgroundColor: 'whitesmoke'
                                                                    },
                                                                    color: 'rgb(26, 51, 83)',
                                                                    textTransform: 'capitalize'
                                                                }}
                                                            >
                                                                <TableCell
                                                                    className='tableCell-link'
                                                                    onClick={() => userDetail(item.id)}
                                                                >
                                                                    {item?.user_details?.email ? item.user_details.email : '---'}
                                                                </TableCell>
                                                                <TableCell className='tableCell'>
                                                                    <div style={{ display: 'flex' }}>
                                                                        {item?.phone ? item.phone : '---'}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className='tableCell'>
                                                                    {item?.role.name ? item.role.name : '---'}
                                                                </TableCell>
                                                                <TableCell className='tableCell'>
                                                                    <IconButton>
                                                                        <FaEdit
                                                                            onClick={() => EditItem(item.id)}
                                                                            style={{ fill: '#1A3353', cursor: 'pointer', width: '18px' }}
                                                                        />
                                                                    </IconButton>
                                                                    <IconButton>
                                                                        <FaTrashAlt onClick={() => deleteRow(item?.id)} style={{ fill: '#1A3353', cursor: 'pointer', width: '15px' }} />
                                                                    </IconButton>
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })
                                                : <TableRow> <TableCell colSpan={8} sx={{ border: 0 }}><Spinner /></TableCell> </TableRow>
                                        }
                                    </TableBody>
                                }
                            </Table>
                        </TableContainer>
                        */}
                        