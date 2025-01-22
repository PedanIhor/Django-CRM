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
} from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

interface Permission {
  id: string;
  name: string;
  description: string;
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
      const response = await axios.get('/api/permissions-matrix/', {
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

    const updatedPermissions = new Set(changes.get(roleId) || role.permissions);
    
    if (updatedPermissions.has(permissionName)) {
      updatedPermissions.delete(permissionName);
    } else {
      updatedPermissions.add(permissionName);
    }

    setChanges(new Map(changes.set(roleId, Array.from(updatedPermissions))));
  };

  const handleSave = async () => {
    if (changes.size === 0) return;

    setLoading(true);
    try {
      const rolePermissions = Array.from(changes.entries()).map(([roleId, permissions]) => ({
        role_id: roleId,
        permissions: permissions
      }));

      await axios.post('/api/update-permissions/', {
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

  if (!matrixData) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Permissions Management</h1>
        <Button 
          onClick={handleSave} 
          disabled={changes.size === 0 || loading}
          variant="contained"
          color="primary"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell style={{ width: '200px' }}>Permission</TableCell>
              {matrixData.roles.map((role) => (
                <TableCell key={role.id} align="center">
                  {role.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {matrixData.permissions.map((permission) => (
              <TableRow key={permission.id}>
                <TableCell>
                  {permission.name}
                  <div style={{ fontSize: '0.875rem', color: 'gray' }}>
                    {permission.description}
                  </div>
                </TableCell>
                {matrixData.roles.map((role) => {
                  const rolePermissions = changes.get(role.id) || role.permissions;
                  return (
                    <TableCell key={role.id} align="center">
                      <Checkbox
                        checked={rolePermissions.includes(permission.name)}
                        onChange={() => handlePermissionToggle(role.id, permission.name)}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
    </div>
  );
};

export default PermissionsMatrix; 