import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Check, Close } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import ConfettiAnimation from '../../components/ConfettiAnimation';
import SuccessSnackbar from '../../components/SuccessSnackbar';

import {
    Card,
    Link,
    Avatar,
    Box,
    Snackbar,
    Alert,
    Stack,
    Button,
    Chip,
    Stepper,
    Step,
    StepLabel,
    Typography,
    StepButton,
    CircularProgress,
    SvgIcon,
    SvgIconProps,
    StepIconProps,
    StepConnector

} from '@mui/material'

import { fetchData } from '../../components/FetchData'
import { OpportunityUrl } from '../../services/ApiUrls'
import { Tags } from '../../components/Tags'
import { CustomAppBar } from '../../components/CustomAppBar'
import { FaPlus, FaStar } from 'react-icons/fa'
import FormateTime from '../../components/FormateTime'
import { Label } from '../../components/Label'

export const formatDate = (dateString: any) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(dateString).toLocaleDateString(undefined, options)
}
type response = {
    created_by: {
        email: string;
        id: string;
        profile_pic: string;
    };
    user_details: {
        email: string;
        id: string;
        profile_pic: string;
    };
    org: { name: string };
    lead: { account_name: string };
    account_attachment: [];
    assigned_to: [];
    billing_address_line: string;
    billing_city: string;
    billing_country: string;
    billing_state: string;
    billing_postcode: string;
    billing_street: string;
    contact_name: string;
    name: string;

    created_at: string;
    created_on: string;
    created_on_arrow: string;
    date_of_birth: string;
    title: string;
    first_name: string;
    last_name: string;
    account_name: string;
    phone: string;
    email: string;
    lead_attachment: string;
    opportunity_amount: string;
    website: string;
    description: string;
    contacts: [];
    status: string;
    source: string;
    address_line: string;
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    tags: [];
    company: string;
    probability: string;
    industry: string;
    skype_ID: string;
    file: string;

    close_date: string;
    organization: string;
    created_from_site: boolean;
    id: string;
    teams: [];
    leads: string;

    lead_source: string;
    amount: string;
    currency: string;
    users: string;
    stage: string;
    closed_on: string;
    opportunity_attachment: [];
    account: { id: string; name: string };
};
export const OpportunityDetails = (props: any) => {
    const { state } = useLocation()
    const navigate = useNavigate()

    const [opportunityDetails, setOpportunityDetails] = useState<response | null>(null)
    const [usersDetails, setUsersDetails] = useState<Array<{
        user_details: {
            email: string;
            id: string;
            profile_pic: string;
        }
    }>>([]);
    const [selectedCountry, setSelectedCountry] = useState([])
    const [attachments, setAttachments] = useState([])
    const [tags, setTags] = useState([])
    const [countries, setCountries] = useState<string[][]>([])
    const [source, setSource] = useState([])
    const [status, setStatus] = useState([])
    const [industries, setIndustries] = useState([])
    const [contacts, setContacts] = useState([])
    const [users, setUsers] = useState([])
    const [teams, setTeams] = useState([])
    const [leads, setLeads] = useState([])
    const [comments, setComments] = useState([])
    const [commentList, setCommentList] = useState('Recent Last')
    const [note, setNote] = useState('')
    const [currentStage, setCurrentStage] = useState('');
    const [activeStep, setActiveStep] = useState(0);
    const [updatingStage, setUpdatingStage] = useState(false);
    const [stages, setStages] = useState([]);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [closedWonCompleted, setClosedWonCompleted] = useState(false);
    const [closedLostCompleted, setClosedLostCompleted] = useState(false);
    const [updatedStages, setUpdatedStages] = React.useState(stages);
    const [showConfetti, setShowConfetti] = useState(false);
    const [previousStage, setPreviousStage] = useState('');
    const [showSnackbar, setShowSnackbar] = useState(false);


    useEffect(() => {
        getOpportunityDetails(state.opportunityId)
    }, [state.opportunityId])

    useEffect(() => {
        if (stages.length > 0 && currentStage) {
            const initialCompletedSteps = Array.from(
                { length: stages.findIndex(stage => stage === currentStage) + 1 },
                (_, i) => i
            );
            setCompletedSteps(initialCompletedSteps);
            setActiveStep(stages.findIndex(stage => stage === currentStage));
            console.log(activeStep)
        }
    }, [stages, currentStage]);


    const CustomStepConnector = styled(StepConnector)({
        '& .MuiStepConnector-line': {
            height: 4, // The height of the lines between steps
            marginLeft: 'auto',
            marginRight: 'auto',
            marginTop: '5%',
            width: '60%', // Reducing the line width by 30%
        },
    });


    const CustomStepIcon = (props: StepIconProps & { stageName?: string }) => {
        const { active, completed, stageName, className } = props;

        const iconStyle = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36, // Increased from 24 to 36px (50% bigger)
            height: 36, // Increased from 24 to 36px (50% bigger)
            borderRadius: '50%',
            color: 'white',
            backgroundColor: active
                ? stageName === 'CLOSED WON'
                    ? 'green'
                    : stageName === 'CLOSED LOST'
                        ? 'red'
                        : '#1976d2'
                : completed
                    ? stageName === 'CLOSED LOST'
                        ? 'red'
                        : stageName === 'CLOSED WON'
                            ? 'green'
                            : '#1976d2'
                    : '#ccc',
        };

        const icon = completed ? (
            stageName === 'CLOSED LOST' ? (
                <Close fontSize="small" />
            ) : (
                <Check fontSize="small" />
            )
        ) : null;

        return <div className={className} style={iconStyle}>{icon}</div>;
    };

    const getOpportunityDetails = (id: any) => {
        const Header = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
        }
        fetchData(`${OpportunityUrl}/${id}/`, 'GET', null as any, Header)
            .then((res) => {
                console.log(res, 'edd');
                if (!res.error) {
                    setOpportunityDetails(res?.opportunity_obj)
                    setUsers(res?.users)
                    // setContacts(res?.contacts)
                    // setIndustries(res?.industries)
                    // setUsers(res?.users)
                    // setStatus(res?.status)
                    // setCountries(res?.countries)
                    // setLeads(res?.leads)
                    // setTags(res?.tags)
                    // setTeams(res?.teams)
                    // setAttachments(res?.attachments)
                    // setTags(res?.tags)
                    // setCountries(res?.countries)
                    // setIndustries(res?.industries)
                    // setStatus(res?.status)
                    // setSource(res?.source)
                    // setUsers(res?.users)
                    // setContacts(res?.contacts)
                    // setTeams(res?.teams)
                    // setComments(res?.comments)
                    setCurrentStage(res?.opportunity_obj.stage)
                    setPreviousStage(res?.opportunity_obj.stage)
                    setStages(res?.stage?.map((stage: [string, string]) => stage[1]) || []);
                    


                }
            })
            .catch((err) => {
                // console.error('Error:', err)
                < Snackbar open={err} autoHideDuration={4000} onClose={() => navigate('/app/opportunities')} >
                    <Alert onClose={() => navigate('/app/opportunities')} severity="error" sx={{ width: '100%' }}>
                        Failed to load!
                    </Alert>
                </Snackbar >
            })
    }
    const accountCountry = (country: string) => {
        let countryName: string[] | undefined;
        for (countryName of countries) {
            if (Array.isArray(countryName) && countryName.includes(country)) {
                const ele = countryName;
                break;
            }
        }
        return countryName?.[1]
    }
    const editHandle = () => {
        // navigate('/contacts/edit-contacts', { state: { value: contactDetails, address: newAddress } })
        let country: string[] | undefined;
        for (country of countries) {
            if (Array.isArray(country) && country.includes(opportunityDetails?.country || '')) {
                const firstElement = country[0];
                break;
            }
        }
        navigate('/app/opportunities/edit-opportunity', {
            state: {
                value: {
                    name: opportunityDetails?.name,
                    account: opportunityDetails?.account?.id,
                    amount: opportunityDetails?.amount,
                    currency: opportunityDetails?.currency,
                    stage: opportunityDetails?.stage,
                    teams: opportunityDetails?.teams,
                    lead_source: opportunityDetails?.lead_source,
                    probability: opportunityDetails?.probability,
                    description: opportunityDetails?.description,
                    assigned_to: opportunityDetails?.assigned_to,
                    contacts: opportunityDetails?.contacts,
                    due_date: opportunityDetails?.closed_on,
                    tags: opportunityDetails?.tags,
                    opportunity_attachment: opportunityDetails?.opportunity_attachment,
                }, id: state?.opportunityId,
                contacts: state?.contacts || [], leadSource: state?.leadSource || [], currency: state?.currency || [], tags: state?.tags || [], account: state?.account || [], stage: state?.stage || [], users: state?.users || [], teams: state?.teams || [], countries: state?.countries || [], profiles: state?.profiles || [],
            }
        }
        )
    }

    useEffect(() => {
        if (currentStage === 'CLOSED WON' && previousStage !== 'CLOSED WON') {
            setShowConfetti(true);
            setShowSnackbar(true);
    
            // Stop the confetti after 10 seconds
            setTimeout(() => setShowConfetti(false), 10000);
        }
    
        // Update the previous stage
        // setPreviousStage(currentStage);
    }, [currentStage, previousStage]);

    const handleStageUpdate = async () => {
        if (activeStep > -1) {
            const updatedStage = stages[activeStep];
            if (!updatedStage) {
                console.error('Invalid stage index:', activeStep);
                return;
            }

            // Optimistically update UI first
            setCompletedSteps(prev => {
                const newCompleted = [...prev];
                if (!newCompleted.includes(activeStep)) {
                    newCompleted.push(activeStep);
                }
                return newCompleted;
            });

            setCurrentStage(updatedStage);
            setActiveStep(activeStep);
            setUpdatingStage(true);

            try {
                const Header = {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: localStorage.getItem('Token') || '',
                    org: localStorage.getItem('org') || ''
                };

                // Ensure URL ends with trailing slash
                const url = `${OpportunityUrl}/${state.opportunityId}/stage/`;
                
                const updateResponse = await fetchData(
                    url,
                    'POST',
                    JSON.stringify({ stage: updatedStage }),
                    Header
                );

                if (updateResponse.error) {
                    console.error('Error updating opportunity stage:', updateResponse);
                }
            } catch (error) {
                console.error('Error occurred during the update:', error);
            } finally {
                setUpdatingStage(false);
            }
        }
    };

    

    const renderStages = () => {
        return stages.filter((stage, index) => {
            if (index === 8) {
                // Include "CLOSED LOST" if it is active, completed, or "CLOSED WON" is not completed
                return (
                    activeStep === 8 ||
                    completedSteps.includes(8) ||
                    !completedSteps.includes(7)
                );
            }
            if (index === 7) {
                // Include "CLOSED WON" if it is active, completed, and "CLOSED LOST" is not completed
                return (
                    activeStep === 7 ||
                    (completedSteps.includes(7) && !completedSteps.includes(8)) ||
                    !completedSteps.includes(8)
                );
            }
            // Include all other stages
            return true;
        });
    };



    const backbtnHandle = () => {
        navigate('/app/opportunities')
    }

    const module = 'Opportunities'
    const crntPage = 'Opportunity Details'
    const backBtn = 'Back To Opportunities'
    console.log(state, 'oppdetail');

    return (
        <Box sx={{ mt: '60px' }}>
            <ConfettiAnimation run={showConfetti} />
            <SuccessSnackbar
                open={showSnackbar}
                onClose={() => setShowSnackbar(false)}
                message="🎉 Congratulations! Opportunity Closed as Won!"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '1.2rem', 
                    fontWeight: 'bold', 
                    textAlign: 'center', 
                    backgroundColor: '#fff', 
                    color: '#4caf50', 
                    // border: '2px solid #388e3c', 
                    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.6)', 
                    borderRadius: '8px', 
                }}
            />
            <div>
                <CustomAppBar backbtnHandle={backbtnHandle} module={module} backBtn={backBtn} crntPage={crntPage} editHandle={editHandle} />
                <Box
                    sx={{
                        mr: '20px',
                        ml: '20px',
                        mt: '120px',
                        p: '20px',
                        borderRadius: '10px',
                        border: '1px solid #80808038',
                        backgroundColor: 'white',
                    }}
                >
                    <Typography
                        sx={{
                            mb: 3,
                            textAlign: 'center',
                            fontWeight: 500,
                            fontSize: '1.25rem',
                        }}
                    >
                        Opportunity Stage
                    </Typography>
                    <Stepper
                        nonLinear
                        activeStep={activeStep}
                        alternativeLabel
                        connector={<CustomStepConnector />}
                        sx={{
                            width: '100%',
                            justifyContent: 'center',
                            '@media (max-width: 900px)': {
                                fontSize: '0.8rem', // Reduce font size on smaller screens
                                flexDirection: 'column', // Stack the stepper vertically when narrow
                                alignItems: 'center', // Center-align the items in the column view
                            },
                        }}
                    >
                        {renderStages().map((stage, index) => (
                            <Step key={stage} completed={completedSteps.includes(stages.indexOf(stage))}>
                                <StepButton onClick={() => setActiveStep(stages.indexOf(stage))}
                                
                                >
                                    <StepLabel
                                        StepIconComponent={(props) => (
                                            <CustomStepIcon {...props} stageName={stage} />
                                        )}
                                        sx={{
                                            '& .MuiStepLabel-label': {
                                                color: 'black', // Default label color
                                            },
                                            '& .MuiStepLabel-label.Mui-active': {
                                                color: '#1975d2', // Active step label color
                                            },
                                            '& .MuiStepLabel-label.Mui-completed': {
                                                color: 'black', // Completed step label color
                                            },
                                            '& .MuiStepLabel-label.Mui-active.Mui-completed': {
                                                color: '#1975d2', // Label when both active and completed
                                            },
                                        }}

                                    >
                                        {stage}
                                    </StepLabel>
                                </StepButton>
                            </Step>
                        ))}
                    </Stepper>




                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleStageUpdate}
                            disabled={updatingStage}
                            sx={{ mt: 2 }}
                        >
                            {updatingStage ? <CircularProgress size={24} /> : 'Update Stage'}
                        </Button>
                    </Box>
                </Box>


                <Box sx={{ mt: '0', p: '20px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Box sx={{ width: '65%' }}>
                        <Box sx={{ borderRadius: '10px', border: '1px solid #80808038', backgroundColor: 'white' }}>



                            <div style={{ padding: '20px', borderBottom: '1px solid lightgray', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 600, fontSize: '18px', color: '#1a3353f0' }}>
                                    Opportunity Information
                                </div>


                                <div style={{ color: 'gray', fontSize: '16px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginRight: '15px' }}>
                                        created &nbsp;
                                        {FormateTime(opportunityDetails?.created_at)} &nbsp; by   &nbsp;
                                        <Avatar
                                            src={opportunityDetails?.created_by?.profile_pic}
                                            alt={opportunityDetails?.created_by?.email}
                                        />
                                        &nbsp;
                                        &nbsp;
                                        {opportunityDetails?.created_by?.email}
                                        {/* {opportunityDetails?.first_name}&nbsp;
                                        {opportunityDetails?.last_name} */}
                                    </div>

                                </div>
                            </div>
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'row', marginTop: '10px' }}>
                                <div className='title2'>
                                    {opportunityDetails?.name}
                                    <Stack sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', mt: 1 }}>
                                        {/* {
                                            lead.assigned_to && lead.assigned_to.map((assignItem) => (
                                                assignItem.user_details.profile_pic
                                                    ? */}
                                        {users?.length ? users.map((val: any, i: any) =>
                                            <Avatar
                                                key={i}
                                                alt={val?.user_details?.email}
                                                src={val?.user_details?.profile_pic}
                                                sx={{ mr: 1 }}
                                            />
                                        ) : ''
                                        }
                                    </Stack>
                                </div>
                                <Stack sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    {opportunityDetails?.tags?.length ? opportunityDetails?.tags.map((tagData: any) => (
                                        <Label
                                            tags={tagData}
                                        />)) : ''}
                                </Stack>
                            </div>
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Name</div>
                                    <div className='title3'>
                                        {opportunityDetails?.name || '----'}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Lead Source</div>
                                    <div className='title3'>
                                        {opportunityDetails?.lead_source || '----'}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Account</div>
                                    <div className='title3'>
                                        {opportunityDetails?.account?.name ? (
                                            <Link
                                                component="button"
                                                onClick={() => navigate('/app/accounts/account-details', {
                                                    state: { accountId: opportunityDetails.account.id }
                                                })}
                                                sx={{
                                                    cursor: 'pointer',
                                                    textDecoration: 'none',
                                                    color: '#3E79F7',
                                                    '&:hover': {
                                                        textDecoration: 'underline'
                                                    }
                                                }}
                                            >
                                                {opportunityDetails.account.name}
                                            </Link>
                                        ) : '----'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '20px', marginTop: '10px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Probability</div>
                                    <div className='title3'>
                                        {/* {lead.pipeline ? lead.pipeline : '------'} */}
                                        {opportunityDetails?.probability || '----'}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Amount</div>
                                    <div className='title3'>
                                        {opportunityDetails?.amount || '----'}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Team</div>
                                    <div className='title3'>
                                        {opportunityDetails?.teams?.length ? opportunityDetails?.teams.map((team: any) =>
                                            <Chip label={team} sx={{ height: '20px', borderRadius: '4px' }} />
                                        ) : '----'}

                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '20px', marginTop: '10px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Currency</div>
                                    <div className='title3'>
                                        {opportunityDetails?.currency || '----'}
                                    </div>
                                </div>                                
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Closed Date</div>
                                    <div className='title3'>
                                        {opportunityDetails?.closed_on || '----'}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Contacts</div>
                                    <div className='title3'>
                                        {opportunityDetails?.contacts?.length ? (
                                            opportunityDetails.contacts.map((contact: any, index: number) => (
                                                <Link
                                                    key={index}
                                                    component="button"
                                                    onClick={() => navigate('/app/contacts/contact-details', {
                                                        state: { contactId: contact.id }
                                                    })}
                                                    sx={{
                                                        cursor: 'pointer',
                                                        textDecoration: 'none',
                                                        color: '#3E79F7',
                                                        '&:hover': {
                                                            textDecoration: 'underline'
                                                        }
                                                    }}
                                                >
                                                    {contact.first_name} {contact.last_name}
                                                    {index < opportunityDetails.contacts.length - 1 ? ', ' : ''}
                                                </Link>
                                            ))
                                        ) : '----'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '20px', marginTop: '10px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Stage</div>
                                    <div className='title3'>
                                        {opportunityDetails?.stage || '----'}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Assigned Users</div>
                                    <div className='title3'>
                                        {opportunityDetails?.assigned_to?.length
                                            ? opportunityDetails.assigned_to.map((assigned: any, index: number) => (
                                                <Link
                                                    key={index}
                                                    component="button"
                                                    onClick={() => navigate('/app/users/user-details', {
                                                        state: { userId: assigned.id }
                                                    })}
                                                    sx={{
                                                        cursor: 'pointer',
                                                        textDecoration: 'none',
                                                        color: '#3E79F7',
                                                        '&:hover': {
                                                            textDecoration: 'underline'
                                                        }
                                                    }}
                                                >
                                                    {assigned.user_details.email || 'No Email'}
                                                    {index < opportunityDetails.assigned_to.length - 1 ? ', ' : ''}
                                                </Link>
                                            ))
                                            : '----'}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}></div>
                            </div>
                            {/* </div> */}
                            {/* Description */}
                            <div style={{ marginTop: '2%' }}>
                                <div style={{ padding: '20px', borderBottom: '1px solid lightgray', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <div style={{ fontWeight: 600, fontSize: '18px', color: '#1a3353f0' }}>
                                        Description
                                    </div>
                                </div>
                                <Box sx={{ p: '15px' }}>
                                    {opportunityDetails?.description ? <div dangerouslySetInnerHTML={{ __html: opportunityDetails?.description }} /> : '---'}
                                </Box>
                            </div>

                        </Box>
                    </Box>
                    <Box sx={{ width: '34%' }}>
                        <Box sx={{ borderRadius: '10px', border: '1px solid #80808038', backgroundColor: 'white' }}>
                            <div style={{ padding: '20px', borderBottom: '1px solid lightgray', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 600, fontSize: '18px', color: '#1a3353f0' }}>
                                    Attachments
                                </div>
                                <Button
                                    type='submit'
                                    variant='text'
                                    size='small'
                                    startIcon={<FaPlus style={{ fill: '#3E79F7', width: '12px' }} />}
                                    style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '16px' }}
                                >
                                    Add Attachments
                                </Button>
                            </div>

                            <div style={{ padding: '10px 10px 10px 15px', marginTop: '5%' }}>
                                {opportunityDetails?.opportunity_attachment?.length ? opportunityDetails?.opportunity_attachment.map((pic: any, i: any) =>
                                    <Box key={i} sx={{ width: '100px', height: '100px', border: '0.5px solid gray', borderRadius: '5px' }}>
                                        <img src={pic} alt={pic} />
                                    </Box>
                                ) : ''}
                            </div>
                        </Box>
                    </Box>
                </Box>
            </div>
        </Box>
    )
}
