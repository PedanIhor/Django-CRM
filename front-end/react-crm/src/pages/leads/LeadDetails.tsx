import React, { ChangeEvent, useEffect, useState } from 'react'
import { Check, Close } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import SuccessSnackbar from '../../components/SuccessSnackbar';

import {
    Card,
    Link,
    Button,
    Avatar,
    Divider,
    TextField,
    Box,
    MenuItem,
    Snackbar,
    Alert,
    Stack,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Typography,
    IconButton,
    Grid,
    Popover,
    ListItemIcon,
    Stepper,
    Step,
    StepLabel,
    StepButton,
    StepIconProps,
    CircularProgress,
    StepConnector
} from '@mui/material'
import { FaEllipsisV, FaPaperclip, FaPlus, FaRegAddressCard, FaStar, FaTimes } from 'react-icons/fa'
import { CustomAppBar } from '../../components/CustomAppBar'
import { useLocation, useNavigate } from 'react-router-dom'
import { LeadUrl } from '../../services/ApiUrls'
import { fetchData } from '../../components/FetchData'
import { Label } from '../../components/Label'
import { AntSwitch, CustomInputBoxWrapper, CustomSelectField, CustomSelectField1, StyledListItemButton, StyledListItemText } from '../../styles/CssStyled'
import FormateTime from '../../components/FormateTime'
import { formatFileSize } from '../../components/FormatSize'
import '../../styles/style.css'

export const formatDate = (dateString: any) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(dateString).toLocaleDateString(undefined, options)
}

// interface UserDetails {
//     id: string;
//     user_details: {
//         email: string;
//         id: string;
//         profile_pic: string;
//     };
//     // Add other user properties as needed
// }

// interface ContactDetails {
//     id: string;
//     // Add other contact properties as needed
// }

type Contact = {
    id: string;
    first_name: string;
    last_name: string;
    // add other contact properties as needed
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
    description: string | '';
    teams: string;
    assigned_to: string;
    contacts: Contact[];
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
};

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
    
    // Debug logging without activeStep
    // console.log('CustomStepIcon props:', {
    //     stageName,
    //     normalizedStageName: stageName?.trim().toLowerCase(),
    //     active,
    //     completed
    // });

    const normalizedStageName = stageName?.trim().toLowerCase();

    const iconStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: '50%',
        color: 'white',
        backgroundColor: completed
            ? normalizedStageName === 'converted'
                ? 'green'
                : normalizedStageName === 'closed'
                    ? 'red'
                    : '#1976d2'
            : active
                ? normalizedStageName === 'closed'
                    ? 'red'  // Active Closed step should be red
                    : '#1976d2'  // Other active steps are blue
                : '#ccc',  // Inactive steps are gray
    };

    const icon = completed ? (
        normalizedStageName === 'closed' ? (
            <Close fontSize="small" />
        ) : (
            <Check fontSize="small" />
        )
    ) : active ? (  // Show icon for active steps too
        normalizedStageName === 'closed' ? (
            <Close fontSize="small" />
        ) : (
            <Check fontSize="small" />
        )
    ) : null;

    return <div className={className} style={iconStyle}>{icon}</div>;
};


function LeadDetails(props: any) {
    const { state } = useLocation()
    const navigate = useNavigate();
    const [leadDetails, setLeadDetails] = useState<response | null>(null)
    const [usersDetails, setUsersDetails] = useState<Array<{
        user_details: {
            email: string;
            id: string;
            profile_pic: string;
        }
    }>>([]);
    const [attachments, setAttachments] = useState<string[]>([]);
    const [attachmentList, setAttachmentList] = useState<File[]>([]);
    const [tags, setTags] = useState([])
    const [countries, setCountries] = useState<string[][]>([])
    const [source, setSource] = useState([])
    const [status, setStatus] = useState<string[]>([])
    const [industries, setIndustries] = useState([])
    const [contacts, setContacts] = useState([])
    const [users, setUsers] = useState([])
    const [teams, setTeams] = useState([])
    const [comments, setComments] = useState([])
    const [commentList, setCommentList] = useState('Recent Last')
    const [note, setNote] = useState('')
    const [selectedFile, setSelectedFile] = useState()
    const [inputValue, setInputValue] = useState<string>('');
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [currentStatus, setCurrentStatus] = useState('')
    const [activeStep, setActiveStep] = useState(0);
    const [updatingStage, setUpdatingStage] = useState(false);
    const [previousStatus, setPreviousStatus] = useState('');
    const [showSnackbar, setShowSnackbar] = useState(false);



    useEffect(() => {
        getLeadDetails(state.leadId)
    }, [state.leadId])
    useEffect(() => {
        if (status.length > 0 && currentStatus) {
            const normalizedCurrentStatus = currentStatus.trim().toLowerCase();
            
            // If status is recycled, treat it as assigned (completed first step only)
            if (normalizedCurrentStatus === 'recycled') {
                setCompletedSteps([0]); // Only first step (Assigned) is completed
                setActiveStep(0);
                return;
            }

            // Normal status handling for non-recycled cases
            const statusIndex = status.findIndex(
                stage => stage.trim().toLowerCase() === normalizedCurrentStatus
            );

            if (statusIndex === -1) {
                console.error(`Could not find status "${currentStatus}" in status array:`, status);
                return;
            }

            const initialCompletedSteps = Array.from(
                { length: statusIndex + 1 },
                (_, i) => i
            );
            setCompletedSteps(initialCompletedSteps);
            setActiveStep(statusIndex);
        }
    }, [status, currentStatus]);

    const getLeadDetails = (id: any) => {
        const Header = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
        }
        fetchData(`${LeadUrl}/${id}/`, 'GET', null as any, Header)
            .then((res) => {
                console.log(res, 'lead res')
                // console.log(res.status)
                console.log(res.lead_obj.status)
                if (!res.error) {
                    setLeadDetails(res?.lead_obj)
                    setUsers(res?.users)
                    setAttachments(res?.attachments)
                    setTags(res?.tags)
                    setCountries(res?.countries)
                    setIndustries(res?.industries)
                    setStatus(res?.status?.map((status: [string, string]) => status[1]) || []);
                    setSource(res?.source)
                    setUsers(res?.users)
                    setContacts(res?.contacts)
                    setTeams(res?.teams)
                    setComments(res?.comments)
                    setCurrentStatus(res?.lead_obj?.status)
                    setPreviousStatus(res?.lead_obj?.status)

                    // Format contacts for the dropdown
                    const formattedContacts = res.contacts.map((contact: any) => ({
                        value: contact.id,
                        label: `${contact.first_name} ${contact.last_name}`,
                        ...contact  // Keep all other contact data
                    }));

                    // Set both all contacts and the selected ones
                    setContacts(formattedContacts);
                    setLeadDetails({
                        ...res.lead_obj,
                        contacts: res.lead_obj.contacts.map((contact: any) => ({
                            value: contact.id,
                            label: `${contact.first_name} ${contact.last_name}`,
                            ...contact
                        }))
                    });
                }
            })
            .catch((err) => {
                // console.error('Error:', err)
                < Snackbar open={err} autoHideDuration={4000} onClose={() => navigate('/app/leads')} >
                    <Alert onClose={() => navigate('/app/leads')} severity="error" sx={{ width: '100%' }}>
                        Failed to load!
                    </Alert>
                </Snackbar >
            })
    }
    const sendComment = () => {
        const Header = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
        }
        // const formData = new FormData();
        // formData.append('inputValue', inputValue);
        // attachedFiles.forEach((file, index) => {
        //   formData.append(`file_${index}`, file);
        // });

        // const data = { comment: note }
        // const data = { comment:  inputValue }
        // const data = { comment: inputValue, attachedFiles }
        const data = { Comment: inputValue || note, lead_attachment: attachments }
        // fetchData(`${LeadUrl}/comment/${state.leadId}/`, 'PUT', JSON.stringify(data), Header)
        fetchData(`${LeadUrl}/${state.leadId}/`, 'POST', JSON.stringify(data), Header)
            .then((res: any) => {
                // console.log('Form data:', res);
                if (!res.error) {
                    resetForm()
                    getLeadDetails(state?.leadId)
                }
            })
            .catch(() => {
            })
    }

    useEffect(() => {
        if (currentStatus === 'converted' && previousStatus !== 'converted') {
            setShowSnackbar(true);
        }

    }, [currentStatus, previousStatus]);

    const backbtnHandle = () => {
        navigate('/app/leads')
    }
    const resetForm = () => {
        setNote('')
        setInputValue('')
        setAttachmentList([])
        setAttachedFiles([])
        setAttachments([])
    }

    const editHandle = () => {
        let country: string[] | undefined;
        for (country of countries) {
            if (Array.isArray(country) && country.includes(leadDetails?.country || '')) {
                const firstElement = country[0];
                break;
            }
        }

        // Format all available contacts
        const formattedContacts = contacts.map((contact: Contact) => ({
            value: contact.id,
            label: `${contact.first_name} ${contact.last_name}`,
            ...contact
        }));

        // Format selected contacts
        const selectedContacts = leadDetails?.contacts?.map((contact: Contact) => ({
            value: contact.id,
            label: `${contact.first_name} ${contact.last_name}`,
            ...contact
        })) || [];

        navigate('/app/leads/edit-lead', {
            state: {
                value: {
                    title: leadDetails?.title,
                    first_name: leadDetails?.first_name,
                    last_name: leadDetails?.last_name,
                    account_name: leadDetails?.account_name,
                    phone: leadDetails?.phone,
                    email: leadDetails?.email,
                    lead_attachment: leadDetails?.lead_attachment,
                    opportunity_amount: leadDetails?.opportunity_amount,
                    website: leadDetails?.website,
                    description: leadDetails?.description,
                    teams: leadDetails?.teams,
                    assigned_to: leadDetails?.assigned_to,
                    contacts: selectedContacts,
                    status: leadDetails?.status,
                    source: leadDetails?.source,
                    address_line: leadDetails?.address_line,
                    street: leadDetails?.street,
                    city: leadDetails?.city,
                    state: leadDetails?.state,
                    postcode: leadDetails?.postcode,
                    country: country?.[0],
                    tags: leadDetails?.tags,
                    company: leadDetails?.company,
                    probability: leadDetails?.probability,
                    industry: leadDetails?.industry,
                    skype_ID: leadDetails?.skype_ID,
                    file: leadDetails?.file,
                    close_date: leadDetails?.close_date,
                    organization: leadDetails?.organization,
                    created_from_site: leadDetails?.created_from_site,
                }, id: state?.leadId, tags, countries, source, status, industries, users, contacts: formattedContacts, teams, comments
            }
        });
    }

    const handleAttachmentClick = () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.addEventListener('change', handleFileInputChange);
        fileInput.click();
    };

    const handleFileInputChange = (event: any) => {
        const files = event.target.files;
        if (files) {
            setAttachedFiles((prevFiles: any) => [...prevFiles, ...Array.from(files)]);
        }
    };
    const addAttachments = (e: any) => {
        // console.log(e.target.files?.[0], 'e');
        const files = e.target.files;
        if (files) {
            const reader = new FileReader();
            reader.onload = () => {
                setAttachments((attachments: string[]) => [...(attachments || []), reader.result as string]);
            };
            reader.readAsDataURL(files[0]);
        }
        if (files) {
            const filesArray = Array.from(files);
            setAttachmentList((prevFiles: any) => [...prevFiles, ...filesArray]);
        }
    }

    const handleStageUpdate = async () => {
        if (activeStep > -1) {
            const currentStage = status[activeStep];
            if (!currentStage) {
                console.error('Invalid stage index:', activeStep);
                return;
            }
    
            const updatedStage = currentStage.trim().toLowerCase();
    
            // Optimistically update UI first
            const previousStatus = currentStatus;
            const previousCompletedSteps = [...completedSteps];
    
            // Update UI immediately
            setCurrentStatus(updatedStage);
            setCompletedSteps(prev => {
                const newCompleted = [...prev];
                if (!newCompleted.includes(activeStep)) {
                    newCompleted.push(activeStep);
                }
                return newCompleted;
            });
    
            setUpdatingStage(true);
    
            try {
                const Header = {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: localStorage.getItem('Token') || '',
                    org: localStorage.getItem('org') || ''
                };
    
                const updateResponse = await fetchData(
                    `${LeadUrl}/${state.leadId}/status/`,
                    'POST',
                    JSON.stringify({ status: updatedStage }),
                    Header
                );
    
                if (updateResponse.error) {
                    // Revert UI changes if the API call fails
                    console.error('Error updating lead status:', updateResponse);
                    setCurrentStatus(previousStatus);
                    setCompletedSteps(previousCompletedSteps);
                }
            } catch (error) {
                // Revert UI changes if there's an error
                console.error('Error occurred during status update:', error);
                setCurrentStatus(previousStatus);
                setCompletedSteps(previousCompletedSteps);
            } finally {
                setUpdatingStage(false);
            }
        }
    };


    

    const renderStages = () => {
        const normalizedCurrentStatus = currentStatus.trim().toLowerCase();
        
        return status.filter((stage) => {
            const normalizedStage = stage.trim().toLowerCase();
            
            // Always exclude Recycled
            if (normalizedStage === 'recycled') {
                return false;
            }
            
            // Special handling for Converted and Closed
            if (normalizedStage === 'converted') {
                // Only hide Converted if Closed is the current status
                return normalizedCurrentStatus !== 'closed';
            }
            
            if (normalizedStage === 'closed') {
                // Only hide Closed if Converted is the current status
                return normalizedCurrentStatus !== 'converted';
            }
            
            // Keep all other stages
            return true;
        });
    };
    

    const handleClickFile = (event: React.MouseEvent<HTMLButtonElement>, pic: any) => {
        setSelectedFile(pic)
        setAnchorEl(event.currentTarget);
    };

    const handleCloseFile = () => {
        setAnchorEl(null);
    };

    const deleteFile = () => {
        setAttachmentList(prevItems => prevItems.filter((item, i) => i !== selectedFile));
        setAttachments(prevItems => prevItems.filter((item, i) => i !== selectedFile));
        handleCloseFile()
    }

    const open = Boolean(anchorEl);
    const id = open ? 'simple-popover' : undefined;
    // console.log(attachedFiles, 'dsfsd', attachmentList, 'aaaaa', attachments);

    const module = 'Leads'
    const crntPage = 'Lead Details'
    const backBtn = 'Back To Leads'
    // console.log(tags, countries, source, status, industries, users, contacts, 'leaddetail')
    return (
        <Box sx={{ mt: '60px' }}>
            <SuccessSnackbar
                open={showSnackbar}
                onClose={() => setShowSnackbar(false)}
                message="🎉 Congratulations! Lead is Converted!"
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
                        Lead Status
                    </Typography>
                    <Stepper
                        nonLinear
                        activeStep={activeStep}
                        alternativeLabel
                        connector={<CustomStepConnector />}
                    >
                        {renderStages().map((stage, index) => {
                            const originalIndex = status.findIndex(s => s === stage);
                            
                            // More detailed logging
                            // console.log('Step rendering:', {
                            //     stage,
                            //     normalizedStage: stage.trim().toLowerCase(),
                            //     index,
                            //     originalIndex,
                            //     activeStep,
                            //     isActive: originalIndex === activeStep,
                            //     currentStatus: currentStatus.trim().toLowerCase()
                            // });
                            
                            return (
                                <Step 
                                    key={stage} 
                                    completed={completedSteps.includes(originalIndex)}
                                    active={originalIndex === activeStep}  // Explicitly set active prop
                                >
                                    <StepButton 
                                        onClick={() => {
                                            console.log('Setting active step to:', originalIndex);
                                            setActiveStep(originalIndex);
                                        }}
                                    >
                                        <StepLabel
                                            StepIconComponent={(props) => (
                                                <CustomStepIcon {...props} stageName={stage} />
                                            )}
                                            sx={{
                                                '& .MuiStepLabel-label': {
                                                    color: 'black',
                                                },
                                                '& .MuiStepLabel-label.Mui-active': {
                                                    color: '#1976d2 !important',
                                                    fontWeight: 600,
                                                },
                                                '& .MuiStepLabel-label.Mui-completed': {
                                                    color: 'black',
                                                    fontWeight: 600,
                                                },
                                                '& .MuiStepLabel-label.Mui-active.Mui-completed': {
                                                    color: '#1976d2 !important',
                                                    fontWeight: 600,
                                                },
                                            }}
                                        >
                                            {stage}
                                        </StepLabel>
                                    </StepButton>
                                </Step>
                            );
                        })}
                    </Stepper>
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleStageUpdate}
                            disabled={updatingStage}
                            sx={{ mt: 2 }}
                        >
                            {updatingStage ? <CircularProgress size={24} /> : 'Update Status'}
                        </Button>
                    </Box>
                </Box>
                <Box sx={{ mt: '0', p: '20px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Box sx={{ width: '65%' }}>
                        <Box sx={{ borderRadius: '10px', border: '1px solid #80808038', backgroundColor: 'white' }}>
                            <div style={{ padding: '20px', borderBottom: '1px solid lightgray', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 600, fontSize: '18px', color: '#1a3353f0' }}>
                                    Lead Information
                                </div>
                                <div style={{ color: 'gray', fontSize: '16px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginRight: '15px' }}>
                                        created &nbsp;
                                        {FormateTime(leadDetails?.created_at)} &nbsp; by   &nbsp;
                                        <Avatar
                                            src={leadDetails?.created_by?.profile_pic}
                                            alt={leadDetails?.created_by?.email}
                                        />
                                        &nbsp;
                                        &nbsp;
                                        {leadDetails?.first_name}&nbsp;
                                        {leadDetails?.last_name}
                                    </div>

                                </div>
                            </div>
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'row', marginTop: '10px' }}>
                                <div className='title2'>
                                    {leadDetails?.title}
                                    {/* {console.log(users?.length && users.length,'lll')} */}
                                    <Stack sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', mt: 1 }}>
                                        {/* {
                                                lead.assigned_to && lead.assigned_to.map((assignItem) => (
                                                    assignItem.user_details.profile_pic
                                                        ? */}

                                        {usersDetails?.length ? usersDetails.map((val: any, i: any) =>
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
                                    {leadDetails?.tags?.length ? leadDetails?.tags.map((tagData: any) => (
                                        <Label
                                            tags={tagData}
                                        />)) : ''}
                                </Stack>
                            </div>
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <div style={{ width: '32%' }}>
                                    <div className='title2' >Expected close date</div>
                                    <div className='title3'>
                                        {leadDetails?.close_date || '---'}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Account Name</div>
                                    <div className='title3'>
                                        {leadDetails?.account_name}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Organization Name</div>
                                    <div className='title3'>
                                        {leadDetails?.organization || '---'}
                                    </div>
                                </div>
                            </div>
                            <div className='detailList'>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Created from site</div>
                                    <div className='title3'>
                                        {/* {lead.pipeline ? lead.pipeline : '------'} */}
                                        {/* {leadDetails?.created_from_site} */}
                                        <AntSwitch checked={leadDetails?.created_from_site} />
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Probability</div>
                                    <div className='title3'>
                                        {leadDetails?.probability || '---'}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>website</div>
                                    <div className='title3'>
                                        {leadDetails?.website ? <Link>
                                            {leadDetails?.website}
                                        </Link> : '---'}

                                    </div>
                                </div>
                            </div>
                            <div className='detailList'>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Industry</div>
                                    <div className='title3'>
                                        {leadDetails?.industry || '---'}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>SkypeID</div>
                                    <div className='title3'>
                                        {leadDetails?.skype_ID ? <Link>
                                            {leadDetails?.skype_ID}
                                        </Link> : '---'}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 600 }}>&nbsp;</div>
                                    <div style={{ fontSize: '16px', color: 'gray' }}>&nbsp;</div>
                                </div>
                            </div>
                            {/* </div> */}
                            {/* Contact details */}
                            <div style={{ marginTop: '2%' }}>
                                <div style={{ padding: '20px', borderBottom: '1px solid lightgray', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <div style={{ fontWeight: 600, fontSize: '18px', color: '#1a3353f0' }}>
                                        Contact Details
                                    </div>
                                </div>
                                <div style={{ padding: '20px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: '10px' }}>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>First Name</div>
                                        <div className='title3'>
                                            {leadDetails?.first_name || '---'}
                                        </div>
                                    </div>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>Last Name</div>
                                        <div className='title3'>
                                            {leadDetails?.last_name || '---'}
                                        </div>
                                    </div>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>Job Title</div>
                                        <div className='title3'>
                                            {leadDetails?.title || '---'}
                                        </div>
                                    </div>
                                </div>
                                <div className='detailList'>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>Email Address</div>
                                        <div className='title3'>
                                            {leadDetails?.email ? <Link>
                                                {leadDetails?.email}
                                                <FaStar style={{ fontSize: '16px', fill: 'yellow' }} />
                                            </Link> : '---'}
                                        </div>
                                    </div>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>Mobile Number</div>
                                        <div className='title3'>
                                            {leadDetails?.phone ? `${leadDetails?.phone}
                                                <FaStar style={{ fontSize: '16px', fill: 'yellow' }} /><br />` : '---'}
                                        </div>
                                    </div>
                                    <div style={{ width: '32%' }}>
                                        <div style={{ fontSize: '16px', fontWeight: 600 }} />
                                        <div className='title3'>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Address details */}
                            <div style={{ marginTop: '2%' }}>
                                <div style={{ padding: '20px', borderBottom: '1px solid lightgray', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <div style={{ fontWeight: 600, fontSize: '18px', color: '#1a3353f0' }}>
                                        Address Details
                                    </div>
                                </div>
                                <div style={{ padding: '20px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: '10px' }}>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>Address Lane</div>
                                        <div className='title3'>
                                            {leadDetails?.address_line || '---'}
                                        </div>
                                    </div>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>Street</div>
                                        <div className='title3'>
                                            {leadDetails?.street || '---'}
                                        </div>
                                    </div>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>City</div>
                                        <div className='title3'>
                                            {leadDetails?.city || '---'}
                                        </div>
                                    </div>
                                </div>
                                <div className='detailList'>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>Pincode</div>
                                        <div className='title3'>
                                            {leadDetails?.postcode || '---'}
                                        </div>
                                    </div>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>State</div>
                                        <div className='title3'>
                                            {leadDetails?.state || '---'}
                                        </div>
                                    </div>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>Country</div>
                                        <div className='title3'>
                                            {leadDetails?.country || '---'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Description */}
                            <div style={{ marginTop: '3%' }}>
                                <div style={{ padding: '20px', borderBottom: '1px solid lightgray', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <div style={{ fontWeight: 600, fontSize: '18px', color: '#1a3353f0' }}>
                                        Description
                                    </div>
                                </div>
                                {/* <p style={{ fontSize: '16px', color: 'gray', padding: '15px' }}> */}
                                <Box sx={{ p: '15px' }}>
                                    {leadDetails?.description ? <div dangerouslySetInnerHTML={{ __html: leadDetails?.description }} /> : '---'}
                                </Box>
                                {/* </p> */}
                            </div>
                            <div style={{ marginTop: '2%' }}>
                                <div style={{ padding: '20px', borderBottom: '1px solid lightgray', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <div style={{ fontWeight: 600, fontSize: '18px', color: 'red' }}>
                                        Lost Reason
                                    </div>
                                </div>
                                <p style={{ fontSize: '16px', color: 'gray', padding: '15px', marginTop: '5%' }}>
                                    {/* {lead && lead.description} */}
                                    {/* fhj */}
                                </p>
                            </div>

                        </Box>
                    </Box>
                    <Box sx={{ width: '34%' }}>
                        <Box sx={{ borderRadius: '10px', border: '1px solid #80808038', backgroundColor: 'white' }}>
                            <div style={{ padding: '20px', borderBottom: '1px solid lightgray', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 600, fontSize: '18px', color: '#1a3353f0' }}>
                                    Attachments
                                </div>
                                {/* Add Social #1E90FF */}
                                <Button component="label" variant="text"
                                    startIcon={<FaPlus style={{ fill: '#3E79F7', width: '12px' }} />}
                                    style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: '16px' }}
                                >
                                    <input type="file" style={{ display: 'none' }} onChange={(e: any) => addAttachments(e)} />
                                    Add Attachments
                                </Button>
                            </div>
                            <div style={{ padding: '20px', marginTop: '2%', maxHeight: '500px', minHeight: '150px', overflowY: 'scroll' }}>
                                {/* {lead && lead.lead_attachment} */}
                                <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', flexWrap: 'wrap', alignContent: 'flex-start' }}>
                                    {attachmentList?.length ? attachmentList.map((pic: any, i: any) =>
                                        <Box key={i} sx={{ width: '45%', height: '35%', border: '0.5px solid #ccc', borderRadius: '3px', overflow: 'hidden', alignSelf: 'auto', flexShrink: 1, mr: 2.5, mb: 2 }}>
                                            <img src={URL.createObjectURL(pic)} alt={pic?.name} style={{ width: '100%', height: '50%' }} />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Box sx={{ ml: 1 }}>
                                                    <Typography sx={{ overflow: 'hidden' }}>{pic?.name}</Typography><br /><Typography sx={{ color: 'gray' }}>{formatFileSize(pic?.size)}</Typography>
                                                </Box>
                                                <IconButton onClick={(e: any) => handleClickFile(e, i)}>
                                                    <FaEllipsisV />
                                                </IconButton>
                                            </Box>
                                        </Box>

                                    ) : ''}
                                    {/* {attachments?.length ? attachments.map((pic: any, i: any) => <img src={pic} />) : ''} */}
                                </Box>
                                {/* {attachments?.length ? attachments.map((pic: any, i: any) =>
                                    <Box key={i} sx={{ width: '100px', height: '100px', border: '0.5px solid gray', borderRadius: '5px' }}>
                                        <img src={pic} alt={pic} />
                                    </Box>
                                ) : ''} */}
                            </div>
                        </Box>
                        <Box sx={{ borderRadius: '10px', mt: '15px', border: '1px solid #80808038', backgroundColor: 'white' }}>
                            <div style={{ padding: '20px', borderBottom: '1px solid lightgray', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 600, fontSize: '16px', color: '#1a3353f0' }}>
                                    Notes
                                </div>
                                <CustomSelectField1
                                    name='industry'
                                    select
                                    value={commentList}
                                    InputProps={{
                                        style: {
                                            height: '32px',
                                            maxHeight: '32px',
                                            borderRadius: '10px'
                                        }
                                    }}
                                    onChange={(e: any) => setCommentList(e.target.value)}
                                    sx={{ width: '27%' }}
                                // helperText={errors?.industry?.[0] ? errors?.industry[0] : ''}
                                // error={!!errors?.industry?.[0]}
                                >
                                    {['Recent Last', 'Recent Last'].map((option: any) => (
                                        <MenuItem key={option} value={option}>
                                            {option}
                                        </MenuItem>
                                    ))}
                                </CustomSelectField1>
                            </div>
                            <List sx={{ maxWidth: '500px' }}>
                                {comments?.length ? comments.map((val: any, i: any) =>
                                    <ListItem alignItems="flex-start">
                                        <ListItemAvatar>
                                            <Avatar alt="testing" src="test" />
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Stack sx={{ display: 'flex', flexDirection: 'column' }}>
                                                    <Typography>{val.comment}</Typography>
                                                    <Avatar alt="testing" src="test" sx={{ mt: 1, mb: 1 }} />
                                                </Stack>}
                                            secondary={
                                                <React.Fragment >
                                                    <Stack sx={{ mt: 3, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <Typography>
                                                            {val?.lead}
                                                            test
                                                            &nbsp;-&nbsp;
                                                            {val?.commented_by}
                                                            test
                                                            &nbsp;-&nbsp;<span style={{ textDecoration: 'underline' }}>reply</span>
                                                        </Typography>
                                                        <Typography sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>{FormateTime(val?.commented_on)}&nbsp;-&nbsp;test
                                                            {val?.commented_by}
                                                        </Typography>
                                                    </Stack>
                                                </React.Fragment>
                                            }
                                        />
                                        <Stack sx={{ display: 'flex', alignItems: 'flex-start', mr: -1.5 }}>
                                            <IconButton aria-label="comments" >
                                                <FaEllipsisV style={{ width: '7px' }} />
                                            </IconButton>
                                        </Stack>
                                    </ListItem>
                                ) : ''}
                            </List>
                            {/* <div style={{ padding: '10px', marginTop: '15px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', flexDirection: 'row', marginTop: '5%' }}>
                                    <div>
                                        <Avatar
                                            src='/broken-image.jpg'
                                            style={{
                                                height: '30px',
                                                width: '30px'
                                            }}
                                        />
                                    </div>
                                    <div style={{ fontSize: '16px', marginLeft: '10px', marginRight: '10px', textAlign: 'justify' }}>
                                        Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '10px' }}>Attachments</div> */}
                            {/* <div style={{ paddingLeft: '10px', paddingBottom: '10px', paddingRight: '10px', width: '100%', marginBottom: '10px' }}>
                                <div style={{
                                    border: '1px solid gray',
                                    padding: '10px',
                                    // paddingBottom: '10px',
                                    borderRadius: '5px',
                                    // paddingLeft: '5px',
                                    marginRight: '20px'
                                }}
                                >
                                    <TextField
                                        fullWidth
                                        label='Add Note'
                                        id='fullWidth'
                                        InputProps={{ disableUnderline: true }}
                                    />
                                </div>
                            </div> */}
                            <div style={{ padding: '20px', marginBottom: '10px' }}>
                                <TextField
                                    label='Add Note'
                                    id='fullWidth'
                                    value={note}
                                    onChange={(e: any) => setNote(e.target.value)}
                                    InputProps={{ style: { borderRadius: '10px' } }}
                                    sx={{ mb: '30px', width: '100%', borderRadius: '10px' }}
                                // InputProps={{ disableUnderline: true }}
                                />
                                <CustomInputBoxWrapper
                                    aria-label='qwe'
                                    // className='CustomInputBoxWrapper'
                                    contentEditable="true"
                                    onInput={(e: any) => setInputValue(e.currentTarget.innerText)}
                                // onInput={(e: React.SyntheticEvent<HTMLDivElement>) => setInputValue(e.currentTarget.innerText)}
                                // onInput={(e) => setInputValue(e.target.innerText)}
                                >
                                    {attachedFiles.length > 0 && (
                                        <div>
                                            {attachedFiles.map((file, index) => (
                                                <div key={index}>
                                                    <div>{file.name}</div>
                                                    <img src={URL.createObjectURL(file)} alt={file.name} style={{ maxWidth: '100%', maxHeight: '100px', marginTop: '8px' }} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CustomInputBoxWrapper>
                                <Box sx={{
                                    pt: '10px', display: 'flex', justifyContent: 'space-between', border: '1px solid #ccc', borderTop: 'none', mt: '-5px',
                                    borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', pb: '10px'
                                }}>
                                    <Button component='label' onClick={handleAttachmentClick} sx={{ ml: '5px' }}>
                                        <FaPaperclip style={{ fill: 'gray' }} />
                                    </Button>
                                    <Grid container justifyContent="flex-end">
                                        <Button
                                            variant='contained'
                                            size='small'
                                            color='inherit'
                                            disableFocusRipple
                                            disableRipple
                                            disableTouchRipple
                                            sx={{ backgroundColor: '#808080b5', borderRadius: '8px', color: 'white', textTransform: 'none', ml: '8px', '&:hover': { backgroundColor: '#C0C0C0' } }}
                                            onClick={resetForm}
                                        >
                                            Cancel
                                        </Button>
                                        <Button variant='contained' size='small'
                                            sx={{ backgroundColor: '#1976d2', borderRadius: '8px', textTransform: 'none', ml: '8px', mr: '12px' }}
                                            onClick={sendComment}
                                        >
                                            Send
                                        </Button>
                                    </Grid>
                                </Box>
                                {/* {attachedFiles.length > 0 && (
                                    <div>
                                        <strong>Attached Files:</strong>
                                        <ul>
                                            {attachedFiles.map((file: any, index) => (
                                                <li key={index}>{file.name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )} */}
                            </div>
                        </Box>
                    </Box>
                </Box>
            </div>
            <Popover
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right'
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handleCloseFile}
            >
                <List disablePadding>
                    <ListItem disablePadding>
                        <StyledListItemButton
                            onClick={deleteFile}
                        >
                            <ListItemIcon > <FaTimes fill='#3e79f7' /></ListItemIcon>
                            <StyledListItemText primary={'Remove'} sx={{ ml: '-20px', color: '#3e79f7' }} />
                        </StyledListItemButton>
                    </ListItem>
                </List>
            </Popover>
        </Box>
    )
}
export default LeadDetails;
{/* <form>
                                    <div style={{
                                        border: '1px solid gray',
                                        padding: '10px',
                                        borderRadius: '5px',
                                        marginRight: '20px'
                                    }}
                                    >
                                        <TextField
                                            fullWidth label='Add Note'
                                            id='fullWidth' style={{ marginBottom: '30px' }}
                                            InputProps={{ disableUnderline: true }}
                                        /> 
                                        <Divider light style={{ marginTop: '30px' }} />
                                        <div className='bottom-box' style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', paddingTop: '9px' }}>
                                            <div>
                                                <Button component='label'>
                                                    <FaRegAddressCard style={{ fill: 'gray' }} />
                                                    <input
                                                        type='file'
                                                        hidden
                                                    />
                                                </Button>
                                            </div>
                                            <div>
                                                <Button variant='contained' size='small' style={{ backgroundColor: '#C0C0C0', marginRight: '3px' }}>
                                                    Cancel
                                                </Button>
                                                <Button variant='contained' size='small' style={{ backgroundColor: '#1F51FF', marginRight: '3px' }}>
                                                    Send
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </form> */}