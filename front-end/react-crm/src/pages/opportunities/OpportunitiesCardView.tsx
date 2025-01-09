import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  LinearProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import { ChevronLeft, ChevronRight, MoreVert, Euro } from '@mui/icons-material';
import { fetchData } from '../../components/FetchData';
import { OpportunityCardViewUrl, OpportunityUrl } from '../../services/ApiUrls';
import { useNavigate } from 'react-router-dom';

interface Opportunity {
  id: string;
  name: string;
  stage: string;
  amount: number;
  probability: number;
  profile_pics: string[];
}

type OpportunityStage = 'early_stage' | 'middle_stage' | 'late_stage' | 'final_stage';

const STAGE_COLORS = {
  early_stage: '#ff5722',
  middle_stage: '#ff9800',
  late_stage: '#2196f3',
  final_stage: '#4caf50',
};

const STAGE_TITLES = {
  early_stage: 'EARLY STAGE',
  middle_stage: 'MIDDLE STAGE',
  late_stage: 'LATE STAGE',
  final_stage: 'FINAL STAGE',
};

const STAGE_LIST: OpportunityStage[] = ['early_stage', 'middle_stage', 'late_stage', 'final_stage'];

const initialOpportunities = STAGE_LIST.reduce((acc, stage) => {
  acc[stage] = [];
  return acc;
}, {} as Record<OpportunityStage, Opportunity[]>);

const OpportunitiesCardView = () => {
  const [opportunities, setOpportunities] = useState<Record<OpportunityStage, Opportunity[]>>(initialOpportunities);
  const [paginationInfo, setPaginationInfo] = useState<Record<OpportunityStage, { currentPage: number; totalCount: number }>>(
    Object.fromEntries(
      STAGE_LIST.map((stage) => [stage, { currentPage: 0, totalCount: 0 }])
    ) as Record<OpportunityStage, { currentPage: number; totalCount: number }>
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuOpportunity, setMenuOpportunity] = useState<string | null>(null);
  const [deleteSnackbar, setDeleteSnackbar] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const navigate = useNavigate();

  // Fetch opportunities for a specific stage
  const fetchOpportunities = async (stage: OpportunityStage, page = 1) => {
    try {
      const Header = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: localStorage.getItem('Token'),
        org: localStorage.getItem('org'),
      };
      
      const response = await fetchData(
        `${OpportunityCardViewUrl}/?stage=${stage}&page=${page}`,
        'GET',
        null as any,
        Header
      );

      setOpportunities((prev) => ({
        ...prev,
        [stage]: response.results,
      }));
      
      setPaginationInfo((prev) => ({
        ...prev,
        [stage]: {
          currentPage: page,
          totalCount: response.count,
        },
      }));
    } catch (error) {
      console.error(`Failed to fetch opportunities for stage: ${stage}`, error);
    }
  };

  // Initial fetch
  useEffect(() => {
    STAGE_LIST.forEach((stage) => fetchOpportunities(stage, 1));
  }, []);

  // Add these handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
    setAnchorEl(event.currentTarget);
    setMenuOpportunity(id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuOpportunity(null);
  };

  const handlePrevPage = (stage: OpportunityStage) => {
    const currentPage = paginationInfo[stage]?.currentPage || 1;
    if (currentPage > 1) {
      fetchOpportunities(stage, currentPage - 1);
    }
  };

  const handleNextPage = (stage: OpportunityStage) => {
    const currentPage = paginationInfo[stage]?.currentPage || 1;
    const totalCount = paginationInfo[stage]?.totalCount || 0;
    if (currentPage * 3 < totalCount) {
      fetchOpportunities(stage, currentPage + 1);
    }
  };

  function LinearProgressWithLabel(props: { value: number }) {
    const getColorForValue = (value: number): string => {
      if (value < 25) return '#ff0000';
      if (value < 50) return '#ff8c00';
      if (value < 75) return '#ffd700';
      return '#4caf50';
    };

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={props.value}
            sx={{
              height: 12,
              borderRadius: 7,
              '& .MuiLinearProgress-bar': {
                backgroundColor: getColorForValue(props.value),
                borderRadius: 7
              }
            }}
          />
        </Box>
        <Box sx={{ minWidth: 35 }}>
          <Typography variant="body2">{`${Math.round(props.value)}%`}</Typography>
        </Box>
      </Box>
    );
  }

  const handleDelete = async (id: string | null) => {
    if (!id) return;

    try {
      const Header = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: localStorage.getItem('Token'),
        org: localStorage.getItem('org'),
      };

      const response = await fetchData(`${OpportunityUrl}/${id}/`, 'DELETE', undefined, Header);
      
      if (!response.error) {
        setOpportunities((prev) => {
          const newOpportunities = { ...prev };
          Object.keys(newOpportunities).forEach((stage) => {
            newOpportunities[stage as OpportunityStage] = newOpportunities[stage as OpportunityStage]
              .filter((opp) => opp.id !== id);
          });
          return newOpportunities;
        });
        setDeleteSnackbar(true);
      } else {
        setDeleteError(true);
      }
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      setDeleteError(true);
    } finally {
      handleMenuClose();
    }
  };

  return (
    <Box display="flex" gap={2} sx={{ overflowX: 'auto', padding: 2 }}>
      {STAGE_LIST.map((stage) => (
        <Box key={stage} flex="1" minWidth="200px">
          <Box
            sx={{
              backgroundColor: STAGE_COLORS[stage],
              height: '5px',
              borderRadius: '4px',
              marginBottom: '5px',
            }}
          />
          <Typography variant="h6" align="center" gutterBottom>
            {STAGE_TITLES[stage]}
          </Typography>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <IconButton size="small" onClick={() => handlePrevPage(stage)}>
              <ChevronLeft />
            </IconButton>
            <Typography variant="body2">
              {paginationInfo[stage]?.currentPage || 1}/
              {Math.ceil((paginationInfo[stage]?.totalCount || 0) / 3)}
            </Typography>
            <IconButton size="small" onClick={() => handleNextPage(stage)}>
              <ChevronRight />
            </IconButton>
          </Box>
          <Box>
            {(opportunities[stage] || []).map((opportunity) => (
              <Box
                key={opportunity.id}
                onClick={() => navigate('/app/opportunities/opportunity-details', { 
                  state: { opportunityId: opportunity.id } 
                })}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '8px',
                  marginBottom: '8px',
                  position: 'relative',
                  backgroundColor: '#FEF7FF',
                  width: 'calc(100% - 50px)',
                  margin: '0 auto 32px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                    borderColor: '#ccc',
                  },
                }}
              >
                <Typography sx={{
                  paddingRight: '50px',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  color: '#000000',
                  fontSize: '13px',
                }}>
                  {opportunity.name}
                </Typography>
                <Box sx={{ margin: '12px 0' }}>
                  <Typography variant="body2" color="textSecondary" sx={{ marginBottom: '4px' }}>
                    Assigned to:
                  </Typography>
                  <Box display="flex" gap={1} mb={1} sx={{ marginTop: '4px' }}>
                    {opportunity.profile_pics.map((pic, index) => (
                      <Avatar key={index} src={pic} alt="profile-pic" />
                    ))}
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <LinearProgressWithLabel value={opportunity.probability} />
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Euro sx={{ color: '#4CAF50' }} />
                  <Typography variant="body2">
                    {Number(opportunity.amount).toLocaleString('nl-NL', {
                      style: 'decimal',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  sx={{ position: 'absolute', top: '8px', right: '8px' }}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleMenuOpen(event, opportunity.id);
                  }}
                >
                  <MoreVert />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => console.log('Edit', menuOpportunity)}>Edit</MenuItem>
        <MenuItem onClick={() => handleDelete(menuOpportunity)}>Delete</MenuItem>
      </Menu>

      <Snackbar
        open={deleteSnackbar}
        autoHideDuration={3000}
        onClose={() => setDeleteSnackbar(false)}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Opportunity deleted successfully!
        </Alert>
      </Snackbar>

      <Snackbar
        open={deleteError}
        autoHideDuration={3000}
        onClose={() => setDeleteError(false)}
      >
        <Alert severity="error" sx={{ width: '100%' }}>
          Failed to delete opportunity
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OpportunitiesCardView; 