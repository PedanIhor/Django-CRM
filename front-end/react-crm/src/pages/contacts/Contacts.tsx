import {
    Box, Button, Card, Stack, Tab, Table, TableBody, TableContainer, TableHead,
    TableRow, Tabs, Toolbar, Typography, Paper, Select, MenuItem,
    TableCell, TableSortLabel, Container, Skeleton, Chip, Menu, IconButton
} from '@mui/material'
import React, { useEffect, useState } from 'react'
import { FiPlus } from "@react-icons/all-files/fi/FiPlus";
import { FiChevronLeft } from "@react-icons/all-files/fi/FiChevronLeft";
import { FiChevronRight } from "@react-icons/all-files/fi/FiChevronRight";
import { getComparator, stableSort } from '../../components/Sorting';
import { Spinner } from '../../components/Spinner';
import { fetchData } from '../../components/FetchData';
import { ContactUrl } from '../../services/ApiUrls';
import { useNavigate } from 'react-router-dom';
import { FaTrashAlt, FaEdit } from 'react-icons/fa';
import { DeleteModal } from '../../components/DeleteModal';
import { EnhancedTableHead } from '../../components/EnchancedTableHead';
import { CustomToolbar, FabLeft, FabRight } from '../../styles/CssStyled';
import { FiChevronUp } from '@react-icons/all-files/fi/FiChevronUp';
import { FiChevronDown } from '@react-icons/all-files/fi/FiChevronDown';



interface HeadCell {
    disablePadding: boolean;
    id: any;
    label: string;
    numeric: boolean;
}

const headCells: readonly HeadCell[] = [
    { id: 'first_name', numeric: false, disablePadding: false, label: 'Name' },
    { id: 'primary_email', numeric: true, disablePadding: false, label: 'Email Address' },
    { id: 'mobile_number', numeric: true, disablePadding: false, label: 'Phone Number' },
    { id: 'categories', numeric: true, disablePadding: false, label: 'Categories' },
    { id: '', numeric: true, disablePadding: false, label: 'Action' }
];

const categoryStyles: { [key: string]: { backgroundColor: string; borderColor: string } } = {
    Lead: { backgroundColor: '#FF73001A', borderColor: '#FF7300' },
    Opportunity: { backgroundColor: '#FFD7001A', borderColor: '#FFD700' },
    Customer: { backgroundColor: '#007BFF1A', borderColor: '#007BFF' },
    'Loyal Customer': { backgroundColor: '#0080801A', borderColor: '#008080' },
};

export default function Contacts({ userPermissions }: { userPermissions: string[] }) {
    const navigate = useNavigate();

    const [value, setValue] = useState('Open');
    const [loading, setLoading] = useState(true);
    const [loadingFiltSort, setLoadingFiltSort] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [contactList, setContactList] = useState<any[]>([]);
    const [countries, setCountries] = useState([]);
    const [deleteRowModal, setDeleteRowModal] = useState(false);
    const [selectedId, setSelectedId] = useState('');
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('first_name');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [recordsPerPage, setRecordsPerPage] = useState<number>(10);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [filterCategory, setFilterCategory] = useState<string | null>(null); // State for selected category
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null); // State for dropdown anchor
    const [selectOpen, setSelectOpen] = useState(false);
    const [sortCriteria, setSortCriteria] = useState<string | null>(null); // Sorting criteria state
    const [anchorElSort, setAnchorElSort] = useState<null | HTMLElement>(null); // State for sorting dropdown anchor

    useEffect(() => {
        getContacts();
    }, [currentPage, recordsPerPage, filterCategory, sortCriteria]);

    const getContacts = async () => {
        const Header = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
        };

        try {
            // Calculate offset for pagination
            const offset = (currentPage - 1) * recordsPerPage;

            // Add category filter if selected
            const categoryFilter = filterCategory ? `&category=${filterCategory}` : '';
            const sortingFilter = sortCriteria ? `&sorting-criteria=${sortCriteria}` : '';

            // Fetch data from the back-end with pagination and filtering
            const data = await fetchData(
                `${ContactUrl}/?offset=${offset}&limit=${recordsPerPage}${categoryFilter}${sortingFilter}`,
                'GET',
                null as any,
                Header
            );

            // Update states with the response
            setContactList(data.contact_obj_list); // Update contact list
            setCountries(data.countries); // Update countries if provided
            setTotalPages(Math.ceil(data.contacts_count / recordsPerPage)); // Calculate total pages
            setLoading(false); // Stop the loading spinner
            setLoadingFiltSort(false);
        } catch (error) {
            console.error('Error fetching contacts:', error);
            setLoading(false); // Stop the loading spinner on error
        }
    };

    const handleChipClick = (category: string, id: number) => {
        if (category === 'Lead') {
            navigate(`/app/leads/lead-details`, { state: { leadId: id, detail: true } });
        } else if (category === 'Opportunity' || category === 'Customer' || category === 'Loyal Customer') {
            navigate(`/app/opportunities/opportunity-details`, { state: { opportunityId: id, detail: true } });
        }
        // for customer
    };

    const handleRequestSort = (event: any, property: any) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handlePreviousPage = () => {
        setLoading(true);
        setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
    };

    const handleNextPage = () => {
        setLoading(true);
        setCurrentPage((prevPage) => Math.min(prevPage + 1, totalPages));
    };

    const handleRecordsPerPage = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setLoading(true);
        setRecordsPerPage(parseInt(event.target.value));
        setCurrentPage(1);
    };

    const onAddContact = () => {
        if (!loading) {
            navigate('/app/contacts/add-contacts', { state: { countries } });
        }
    };

    const contactHandle = (contactId: any) => {
        navigate(`/app/contacts/contact-details`, { state: { contactId, detail: true, countries } });
    };

    const deleteRow = (deleteId: any) => {
        setDeleteRowModal(true);
        setSelectedId(deleteId);
    };

    const deleteRowModalClose = () => {
        setDeleteRowModal(false);
        setSelectedId('');
    };

    // Function to handle dropdown opening
    const handleCategoryClick = (event: React.MouseEvent<HTMLTableHeaderCellElement>) => {
        setAnchorEl(event.currentTarget);
    };

    // Function to handle dropdown closing
    const handleCategoryClose = () => {
        setAnchorEl(null);
    };

    const handleCategorySelect = (category: string | null) => {
        setLoadingFiltSort(true);
        // Update the selected filter category
        setFilterCategory(category);

        // Reset to the first page when a new filter is applied
        setCurrentPage(1);

        // Close the dropdown and fetch new data
        handleCategoryClose();
    };

    const handleSortClick = (event: React.MouseEvent<HTMLDivElement>) => {
        setAnchorElSort(event.currentTarget);
    };

    const handleSortClose = () => {
        setAnchorElSort(null);
    };

    const handleSortSelection = (criteria: string) => {
        setLoadingFiltSort(true); // Start loading
        setSortCriteria(criteria);
        handleSortClose();
    };

    const DeleteItem = async () => {
        const Header = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
        };
        try {
            const res = await fetchData(`${ContactUrl}/${selectedId}/`, 'DELETE', null as any, Header);
            if (!res.error) {
                deleteRowModalClose();
                getContacts();
            }
        } catch (error) {
            console.error('Error deleting contact:', error);
        }
    };

    const recordsList = [[10, '10 Records per page'], [20, '20 Records per page'], [30, '30 Records per page'], [40, '40 Records per page'], [50, '50 Records per page']]

    return (
        <Box sx={{ mt: '60px' }}>
            <CustomToolbar sx={{ flexDirection: 'row-reverse' }}>
                <Stack sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <Select
                        value={recordsPerPage}
                        onChange={(e: any) => handleRecordsPerPage(e)}
                        open={selectOpen}
                        onOpen={() => setSelectOpen(true)}
                        onClose={() => setSelectOpen(false)}
                        className={`custom-select`}
                        onClick={() => setSelectOpen(!selectOpen)}
                        IconComponent={() => (
                            <div onClick={() => setSelectOpen(!selectOpen)} className="custom-select-icon">
                                {selectOpen ? <FiChevronUp style={{ marginTop: '12px' }} /> : <FiChevronDown style={{ marginTop: '12px' }} />}
                            </div>
                        )}
                        sx={{
                            '& .MuiSelect-select': { overflow: 'visible !important' }
                        }}
                    >
                        {recordsList?.length && recordsList.map((item: any, i: any) => (
                            <MenuItem key={i} value={item[0]}>
                                {item[1]}
                            </MenuItem>
                        ))}
                    </Select>
                    <Box sx={{ borderRadius: '7px', backgroundColor: 'white', height: '40px', minHeight: '40px', maxHeight: '40px', display: 'flex', flexDirection: 'row', alignItems: 'center', mr: 1, p: '0px' }}>
                        <FabLeft onClick={handlePreviousPage} disabled={currentPage === 1}>
                            <FiChevronLeft style={{ height: '15px' }} />
                        </FabLeft>
                        <Typography sx={{ mt: 0, textTransform: 'lowercase', fontSize: '15px', color: '#1A3353', textAlign: 'center' }}>
                            {currentPage} to {totalPages}
                            {/* {renderPageNumbers()} */}
                        </Typography>
                        <FabRight onClick={handleNextPage} disabled={currentPage === totalPages}>
                            <FiChevronRight style={{ height: '15px' }} />
                        </FabRight>
                    </Box>
                    {userPermissions.includes('add_contacts') && (
                    <Button
                        variant='contained'
                        startIcon={<FiPlus className='plus-icon' />}
                        onClick={onAddContact}
                        className={'add-button'}
                    >
                        Add Contact
                    </Button>
                    )}
                </Stack>
            </CustomToolbar>
            <Container sx={{ width: '100%', maxWidth: '100%', minWidth: '100%' }}>
                <Box sx={{ width: '100%', minWidth: '100%', m: '15px 0px 0px 0px' }}>

                    <Paper sx={{ width: 'cal(100%-15px)', mb: 2, p: '15px' }}>
                        <TableContainer>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    padding: '8px 16px',
                                    border: '1px solid #ccc',
                                    borderRadius: '8px',
                                    backgroundColor: '#f9f9f9',
                                    mr: 2,
                                    ml: "auto",
                                    width: "240px"
                                }}
                                onClick={handleSortClick}
                            >
                                <Typography variant="body2" sx={{ mr: 1 }}>
                                    Sort by: {sortCriteria ? `${sortCriteria}` : ''}
                                </Typography>
                                <FiChevronDown />
                            </Box>
                            <Table>
                                <EnhancedTableHead
                                    order={order}
                                    orderBy={orderBy}
                                    onRequestSort={(event: React.MouseEvent<unknown>, property: string) => {
                                        if (property !== 'categories') {
                                            handleRequestSort(event, property);
                                        }
                                    }}
                                    headCells={headCells.map((headCell) =>
                                        headCell.id === 'categories'
                                            ? {
                                                ...headCell,
                                                label: (
                                                    <span
                                                        onClick={handleCategoryClick} // Open dropdown on click
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        {headCell.label}
                                                    </span>
                                                ),
                                            }
                                            : headCell
                                    )}
                                />
                                <TableBody>
                                    {loadingFiltSort ? (
                                        <TableRow>
                                            <TableCell colSpan={5}>
                                                <Spinner /> {/* Replace with your loading component */}
                                            </TableCell>
                                        </TableRow>
                                    ) : contactList?.length
                                        ? (sortCriteria // Check if back-end sorting is applied
                                            ? contactList // Use the already sorted list from the back-end
                                            : stableSort(contactList, getComparator(order, orderBy)) // Fallback to front-end sorting
                                        ).map((item: any, index: any) => (
                                            <TableRow
                                                key={index}
                                                sx={{
                                                    border: 0,
                                                    '&:nth-of-type(even)': { backgroundColor: 'whitesmoke' },
                                                    textTransform: 'capitalize',
                                                }}
                                            >
                                                <TableCell onClick={() => contactHandle(item.id)}>
                                                    {item.first_name + ' ' + item.last_name}
                                                </TableCell>
                                                <TableCell>{item.primary_email}</TableCell>
                                                <TableCell>{item.mobile_number || '---'}</TableCell>
                                                <TableCell>
                                                    {item.categories && Object.keys(item.categories).length > 0 ? (
                                                        Object.entries(item.categories || {}).map(([category, ids]) =>
                                                            (ids as number[]).map((id: number) => (
                                                                <Chip
                                                                    key={`${category}-${id}`}
                                                                    label={`${category}`}
                                                                    clickable
                                                                    onClick={() => handleChipClick(category, id)}
                                                                    sx={{
                                                                        backgroundColor: categoryStyles[category]?.backgroundColor,
                                                                        border: `1px solid ${categoryStyles[category]?.borderColor}`,
                                                                        color: categoryStyles[category]?.borderColor,
                                                                        margin: '0 4px',
                                                                    }}
                                                                />
                                                            ))
                                                        )
                                                    ) : (
                                                        <Typography variant="body2" sx={{ color: 'gray' }}>
                                                            Has no special category
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton>
                                                        <FaEdit
                                                            onClick={() => { alert("Is not ready") }}
                                                            style={{ fill: '#1A3353', cursor: 'pointer', width: '18px' }}
                                                        />
                                                    </IconButton>
                                                    <IconButton>
                                                        <FaTrashAlt
                                                            style={{ fill: '#1A3353', cursor: 'pointer', width: '18px' }}
                                                            onClick={() => deleteRow(item.id)}
                                                        />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                        : null}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        {loading && <Spinner />}
                    </Paper>
                </Box>

                {/* Dropdown Menu */}
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleCategoryClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'center',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'center',
                    }}
                >
                    <MenuItem onClick={() => handleCategorySelect(null)}>All Categories</MenuItem>
                    {Object.keys(categoryStyles).map((category) => (
                        <MenuItem key={category} onClick={() => handleCategorySelect(category)}>
                            {category}
                        </MenuItem>
                    ))}
                </Menu>

                {/* Pagination */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                            startIcon={<FiChevronLeft />}
                        >
                            Previous
                        </Button>
                        <Button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            endIcon={<FiChevronRight />}
                        >
                            Next
                        </Button>
                    </Box>
                </Box>
            </Container>

            <Menu
                anchorEl={anchorElSort}
                open={Boolean(anchorElSort)}
                onClose={handleSortClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                sx={{
                    '& .MuiMenu-paper': {
                        width: "240px"
                    },
                }}
            >
                <MenuItem onClick={() => handleSortSelection('category')}>Category</MenuItem>
                <MenuItem onClick={() => handleSortSelection('category')}>Name</MenuItem>
                <MenuItem onClick={() => handleSortSelection('category')}>Email</MenuItem>
            </Menu>

            {/* Delete Modal */}
            <DeleteModal
                onClose={deleteRowModalClose}
                open={deleteRowModal}
                id={selectedId}
                modalDialog="Are you sure you want to delete this contact?"
                modalTitle="Delete Contact"
                DeleteItem={DeleteItem}
            />
        </Box>
    );
}
