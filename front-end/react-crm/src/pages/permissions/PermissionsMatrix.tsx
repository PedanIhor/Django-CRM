import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Checkbox,
  Container,
  Box,
  Paper,
  TableContainer,
} from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { SERVER } from '../../services/ApiUrls';
import { CustomToolbar } from '../../styles/CssStyled';
import Stack from '@mui/material/Stack';

interface Permission {
  id: string;
  name: string;
  description: string;
  module_id: string;
  module_name: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

interface PermissionsMatrixData {
  roles: Role[];
  permissions: Permission[];
}

const PermissionsMatrix = () => {
  const [matrixData, setMatrixData] = useState<PermissionsMatrixData | null>(null);
  const [changes, setChanges] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  useEffect(() => {
    fetchPermissionsMatrix();
  }, []);

  const fetchPermissionsMatrix = async () => {
    try {
      const response = await axios.get(`${SERVER}/api/roles/permissions_matrix/`, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: localStorage.getItem('Token'),
          org: localStorage.getItem('org')                    
        }
      });
      setMatrixData(response.data);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to load permissions matrix",
        severity: 'error'
      });
    }
  };

  const handlePermissionToggle = (roleId: string, permissionName: string) => {
    if (!matrixData) return;

    const role = matrixData.roles.find(r => r.id === roleId);
    if (!role) return;

    const originalPermissions = new Set(role.permissions);
    const updatedPermissions = new Set(changes.get(roleId) || role.permissions);
    
    if (updatedPermissions.has(permissionName)) {
      updatedPermissions.delete(permissionName);
    } else {
      updatedPermissions.add(permissionName);
    }

    // Convert sets to arrays for comparison
    const updatedPermissionsArray = Array.from(updatedPermissions);
    const originalPermissionsArray = Array.from(originalPermissions);

    // Only store changes if they differ from original permissions
    if (JSON.stringify(updatedPermissionsArray.sort()) !== JSON.stringify(originalPermissionsArray.sort())) {
      setChanges(new Map(changes.set(roleId, updatedPermissionsArray)));
    } else {
      // If permissions match original state, remove this role from changes
      const newChanges = new Map(changes);
      newChanges.delete(roleId);
      setChanges(newChanges);
    }
  };

  const handleSave = async () => {
    if (changes.size === 0) return;

    setLoading(true);
    try {
      const rolePermissions = Array.from(changes.entries()).map(([roleId, permissions]) => ({
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

      await fetchPermissionsMatrix();
      setChanges(new Map());
      setSnackbar({
        open: true,
        message: "Permissions updated successfully",
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to update permissions",
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const groupPermissionsByModel = (permissions: Permission[]) => {
    // Group permissions by module_name
    const grouped = permissions.reduce((acc, permission) => {
      const moduleName = permission.module_name.toUpperCase();
      if (!acc[moduleName]) {
        acc[moduleName] = [];
      }
      acc[moduleName].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);

    return grouped;
  };

  if (!matrixData) return <div>Loading...</div>;

  const groupedPermissions = groupPermissionsByModel(matrixData.permissions);

  return (
    <Box sx={{ mt: '60px' }}>
      <CustomToolbar>
        <div></div>
        <Stack sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Button 
            onClick={handleSave} 
            disabled={changes.size === 0 || loading}
            variant="contained"
            className={'add-button'}
            sx={{
              '&.Mui-disabled': {
                backgroundColor: 'rgba(25, 118, 210, 0.5)', // lighter blue color when disabled
                color: 'white'
              }
            }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Stack>
      </CustomToolbar>

      <Container sx={{ width: '100%', maxWidth: '100%', minWidth: '100%' }}>
        <Box sx={{ width: '100%', minWidth: '100%', m: '15px 0px 0px 0px' }}>
          <Paper sx={{ width: 'calc(100%-15px)', mb: 2, p: '0px 15px 15px 15px' }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell 
                      style={{ 
                        width: '200px',
                        position: 'sticky',
                        top: 0,
                        backgroundColor: 'white',
                        zIndex: 1
                      }}
                    >
                      Permission
                    </TableCell>
                    {matrixData.roles.map((role) => (
                      <TableCell 
                        key={role.id} 
                        align="center"
                        style={{
                          position: 'sticky',
                          top: 0,
                          backgroundColor: 'white',
                          zIndex: 1
                        }}
                      >
                        {role.name}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(groupedPermissions).map(([model, permissions]) => (
                    <React.Fragment key={model}>
                      <TableRow
                        sx={{
                          backgroundColor: '#CEDBDF',
                          '& .MuiTableCell-root': {
                            padding: '8px 16px',  // Reduced padding to make row shorter
                          }
                        }}
                      >
                        <TableCell
                          colSpan={matrixData.roles.length + 1}
                          sx={{
                            color: 'rgb(26, 51, 83)',  // Changed text color to match theme
                            fontWeight: 'bold',
                            fontSize: '1rem',
                          }}
                        >
                          {model}
                        </TableCell>
                      </TableRow>
                      {permissions.map((permission) => (
                        <TableRow 
                          key={permission.id}
                          sx={{
                            border: 0,
                            '&:nth-of-type(even)': {
                              backgroundColor: 'whitesmoke'
                            },
                            color: 'rgb(26, 51, 83)',
                            textTransform: 'capitalize'
                          }}
                        >
                          <TableCell className="tableCell">
                            {permission.name}
                            <div style={{ fontSize: '0.875rem', color: 'gray' }}>
                              {permission.description}
                            </div>
                          </TableCell>
                          {matrixData.roles.map((role) => {
                            const rolePermissions = changes.get(role.id) || role.permissions;
                            return (
                              <TableCell key={role.id} align="center" className="tableCell">
                                <Checkbox
                                  checked={rolePermissions.includes(permission.name)}
                                  onChange={() => handlePermissionToggle(role.id, permission.name)}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Container>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PermissionsMatrix; 