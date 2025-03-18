import React, { ChangeEvent, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
    TextField,
    FormControl,
    TextareaAutosize,
    AccordionDetails,
    Accordion,
    AccordionSummary,
    Typography,
    Box,
    MenuItem,
    InputAdornment,
    Chip,
    Autocomplete,
    FormHelperText,
    IconButton,
    Select,
    Divider,
    Button
} from '@mui/material'
import '../../styles/style.css'
import { AccountsUrl } from '../../services/ApiUrls'
import { fetchData } from '../../components/FetchData'
import { CustomAppBar } from '../../components/CustomAppBar'
import { FaFileUpload, FaPlus, FaTimes, FaUpload } from 'react-icons/fa'
import { CustomPopupIcon, RequiredSelect, RequiredTextField } from '../../styles/CssStyled'
import { FiChevronDown } from '@react-icons/all-files/fi/FiChevronDown'
import { FiChevronUp } from '@react-icons/all-files/fi/FiChevronUp'
import { useQuill } from 'react-quilljs';
import 'quill/dist/quill.snow.css';
import { FaTimesCircle, FaCheckCircle } from 'react-icons/fa';



type FormErrors = {
    name?: string[],
    phone?: string[],
    email?: string[],
    billing_address_line?: string[],
    billing_street?: string[],
    billing_city?: string[],
    billing_state?: string[],
    billing_postcode?: string[],
    billing_country?: string[],
    tags?: string[],
    account_attachment?: string[],
    website?: string[],
    status?: string[],
    contacts?: string[],
    file?: string[],
    industry?: string[],
    description?: string[]
};
interface FormData {
    name: string,
    phone: string,
    email: string,
    billing_address_line: string,
    billing_street: string,
    billing_city: string,
    billing_state: string,
    billing_postcode: string,
    billing_country: string,
    tags: string[],
    account_attachment: string | null,
    website: string,
    status: string,
    contacts: [],
    file?: string | null,
    industry: string,
    description: string
}

export function EditAccount() {
    const navigate = useNavigate()
    const { state } = useLocation()
    console.log(state, 'state');
    const autocompleteRef = useRef<any>(null);
    const [error, setError] = useState(false)
    const [reset, setReset] = useState(false)
    const [selectedContacts, setSelectedContacts] = useState<any[]>([]);
    const [selectedTags, setSelectedTags] = useState<any[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<any[]>([]);
    const [statusSelectOpen, setStatusSelectOpen] = useState(false)
    const [countrySelectOpen, setCountrySelectOpen] = useState(false)
    const [contactSelectOpen, setContactSelectOpen] = useState(false)
    const [industrySelectOpen, setIndustrySelectOpen] = useState(false)
    const [errors, setErrors] = useState<FormErrors>({});
    const [formData, setFormData] = useState<FormData>({
        name: '',
        phone: '',
        email: '',
        billing_address_line: '',
        billing_street: '',
        billing_city: '',
        billing_state: '',
        billing_postcode: '',
        billing_country: '',
        tags: [],
        account_attachment: null,
        website: '',
        status: '',
        contacts: [],
        file: null,
        industry: '',
        description: ''
    })
    const { quill, quillRef } = useQuill();
    const initialContentRef = useRef<string | null>(null);

    useEffect(() => {
        setFormData(state?.value)
        if (state?.value?.assign_to) {
            setSelectedContacts(state?.value?.assign_to);
        }
    }, [state?.id])

    useEffect(() => {
        if (reset) {
            setFormData(state?.value)
        }
        return () => {
            setReset(false)
        }
    }, [reset])

    useEffect(() => {
        if (quill && state?.value?.description) {
            initialContentRef.current = state.value.description;
            quill.clipboard.dangerouslyPasteHTML(state.value.description);
        }
    }, [quill, state?.value?.description]);

    const backbtnHandle = () => {
        if (state?.edit) {
            navigate('/app/accounts')
        } else {
            navigate('/app/accounts/account-details', { state: { accountId: state?.id, detail: true } })
        }
    }
    const handleChange2 = (title: any, val: any) => {
        if (title === 'contacts') {
            setFormData({ ...formData, contacts: val.length > 0 ? val.map((item: any) => item.id) : [] });
            setSelectedContacts(val);
        } else if (title === 'tags') {
            setFormData({ ...formData, tags: val.length > 0 ? val.map((item: any) => item.id) : [] });
            setSelectedTags(val);
        }
        else {
            setFormData({ ...formData, [title]: val })
        }
    }
    const handleChange = (e: any) => {
        const { name, value, files, type, checked, id } = e.target;
        if (type === 'file') {
            setFormData({ ...formData, [name]: e.target.files?.[0] || null });
        }
        else if (type === 'checkbox') {
            setFormData({ ...formData, [name]: checked });
        }
        else {
            setFormData({ ...formData, [name]: value });
        }
    };
    const handleFileChange = (event: any) => {
        const file = event.target.files?.[0] || null;
        if (file) {
            setFormData((prevData) => ({
                ...prevData,
                account_attachment: file.name,
                file: prevData.file,
            }));

            const reader = new FileReader();
            reader.onload = () => {
                setFormData((prevData) => ({
                    ...prevData,
                    file: reader.result as string,
                }));
            };
            reader.readAsDataURL(file);
        }
    };
    const handleSubmit = (e: any) => {
        e.preventDefault();
        submitForm();
    }
    const submitForm = () => {
        const Header = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
          }
        const data = {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            billing_address_line: formData.billing_address_line,
            billing_street: formData.billing_street,
            billing_city: formData.billing_city,
            billing_state: formData.billing_state,
            billing_postcode: formData.billing_postcode,
            billing_country: formData.billing_country,
            tags: formData.tags,
            account_attachment: formData.file,
            website: formData.website,
            status: formData.status,
            contacts: formData.contacts,
            industry: formData.industry,
            description: formData.description
        }

        fetchData(`${AccountsUrl}/${state?.id}/`, 'PUT', JSON.stringify(data), Header)
            .then((res: any) => {
                if (!res.error) {
                    resetForm()
                    navigate('/app/accounts')
                }
                if (res.error) {
                    setError(true)
                    setErrors(res?.errors)
                }
            })
            .catch(() => {
            })
    };
    const resetForm = () => {
        setFormData({
            name: '',
            phone: '',
            email: '',
            billing_address_line: '',
            billing_street: '',
            billing_city: '',
            billing_state: '',
            billing_postcode: '',
            billing_country: '',
            tags: [],
            account_attachment: '',
            website: '',
            status: '',
            contacts: [],
            file: null,
            industry: '',
            description: ''
        });
        setErrors({})
        setSelectedContacts([]);
        setSelectedTags([])
    }
    const onCancel = () => {
        setReset(true)
    }

    const getIndustryIdByName = (industryName: string) => {
        if (!state?.industries || !industryName) return '';
        
        const foundIndustry = state.industries.find((industry: [string, string]) => 
            industry[1].toLowerCase() === industryName.toLowerCase()
        );
        
        return foundIndustry ? foundIndustry[0] : '';
    };

    const module = 'Accounts'
    const crntPage = 'Add Account'
    const backBtn = state?.edit ? 'Back to Accounts' : 'Back to AccountDetails'

    const resetQuillToInitialState = () => {
        if (quill && initialContentRef.current !== null) {
            quill.clipboard.dangerouslyPasteHTML(initialContentRef.current);
        }
    };

    return (
        <Box sx={{ mt: '60px' }}>
            <CustomAppBar backbtnHandle={backbtnHandle} module={module} backBtn={backBtn} crntPage={crntPage} onCancel={onCancel} onSubmit={handleSubmit} />
            <Box sx={{ mt: "120px" }}>
                <form onSubmit={handleSubmit}>
                    <div style={{ padding: '10px' }}>
                        <div className='leadContainer'>
                            <Accordion defaultExpanded style={{ width: '98%' }}>
                                <AccordionSummary expandIcon={<FiChevronDown style={{ fontSize: '25px' }} />}>
                                    <Typography className='accordion-header'>Account Information</Typography>
                                </AccordionSummary>
                                <Divider className='divider' />
                                <AccordionDetails>
                                    <Box sx={{ width: '98%', color: '#1A3353', mb: 1 }}>
                                        <div className='fieldContainer'>
                                            <div className='fieldSubContainer'>
                                                <div className='fieldTitle'>Name</div>
                                                <RequiredTextField
                                                    name='name'
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    style={{ width: '70%' }}
                                                    size='small'
                                                    helperText={errors?.name?.[0] ? errors?.name[0] : ''}
                                                    error={!!errors?.name?.[0]}
                                                />
                                            </div>
                                            <div className='fieldSubContainer'>
                                                <div className='fieldTitle'>Website</div>
                                                <TextField
                                                    name='website'
                                                    value={formData.website}
                                                    onChange={handleChange}
                                                    style={{ width: '70%' }}
                                                    size='small'
                                                    helperText={errors?.website?.[0] ? errors?.website[0] : ''}
                                                    error={!!errors?.website?.[0]}
                                                />
                                            </div>
                                        </div>
                                        <div className='fieldContainer2'>
                                            <div className='fieldSubContainer'>
                                                <div className='fieldTitle'>Phone number</div>
                                                <RequiredTextField
                                                    name='phone'
                                                    type='text'
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    style={{ width: '70%' }}
                                                    size='small'
                                                    helperText={errors?.phone?.[0] ? errors?.phone[0] : ''}
                                                    error={!!errors?.phone?.[0]}
                                                />
                                            </div>
                                            <div className='fieldSubContainer'>
                                                <div className='fieldTitle'>Email Address</div>
                                                <RequiredTextField
                                                    name='email'
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    style={{ width: '70%' }}
                                                    size='small'
                                                    helperText={errors?.email?.[0] ? errors?.email[0] : ''}
                                                    error={!!errors?.email?.[0]}
                                                />
                                            </div>
                                        </div>
                                        <div className='fieldContainer2'>
                                            <div className='fieldSubContainer'>
                                                <div className='fieldTitle'>Status</div>
                                                <FormControl sx={{ width: '70%' }}>
                                                    <Select
                                                        name='status'
                                                        value={formData.status}
                                                        open={statusSelectOpen}
                                                        onClick={() => setStatusSelectOpen(!statusSelectOpen)}
                                                        IconComponent={() => (
                                                            <div onClick={() => setStatusSelectOpen(!statusSelectOpen)} className="select-icon-background">
                                                                {statusSelectOpen ? <FiChevronUp className='select-icon' /> : <FiChevronDown className='select-icon' />}
                                                            </div>
                                                        )}
                                                        className='select'
                                                        onChange={handleChange}
                                                        error={!!errors?.status?.[0]}
                                                    >
                                                        {state?.status?.length && state?.status.map((option: any) => (
                                                            <MenuItem key={option} value={option}>
                                                                {option}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                    <FormHelperText>{errors?.status?.[0] ? errors?.status[0] : ''}</FormHelperText>
                                                </FormControl>
                                            </div>
                                            <div className='fieldSubContainer'>
                                                <div className='fieldTitle'>Industry</div>
                                                <FormControl sx={{ width: '70%' }}>
                                                    <Select
                                                        name='industry'
                                                        value={getIndustryIdByName(formData.industry) || ''}
                                                        open={industrySelectOpen}
                                                        onClick={() => setIndustrySelectOpen(!industrySelectOpen)}
                                                        IconComponent={() => (
                                                            <div onClick={() => setIndustrySelectOpen(!industrySelectOpen)} className="select-icon-background">
                                                                {industrySelectOpen ? <FiChevronUp className='select-icon' /> : <FiChevronDown className='select-icon' />}
                                                            </div>
                                                        )}
                                                        className='select'
                                                        onChange={handleChange}
                                                        error={!!errors?.industry?.[0]}
                                                    >
                                                        {state?.industries?.map((option: [string, string]) => (
                                                            <MenuItem key={option[0]} value={option[0]}>
                                                                {option[1]}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                    <FormHelperText>{errors?.industry?.[0] ? errors?.industry[0] : ''}</FormHelperText>
                                                </FormControl>
                                            </div>
                                        </div>
                                        <div className='fieldContainer2'>
                                            <div className='fieldSubContainer'>
                                                <div className='fieldTitle'>account_attachment</div>
                                                <TextField
                                                    name='account_attachment'
                                                    value={formData.account_attachment || ''}
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position='end'>
                                                                <IconButton disableFocusRipple
                                                                    disableTouchRipple
                                                                    sx={{ width: '40px', height: '40px', backgroundColor: 'whitesmoke', borderRadius: '0px', mr: '-13px', cursor: 'pointer' }}
                                                                >
                                                                    <label htmlFor='icon-button-file'>
                                                                        <input
                                                                            hidden
                                                                            accept='image/*'
                                                                            id='icon-button-file'
                                                                            type='file'
                                                                            name='account_attachment'
                                                                            onChange={(e: any) => {
                                                                                handleFileChange(e)
                                                                            }}
                                                                        />
                                                                        <FaUpload color='primary' style={{ fontSize: '15px', cursor: 'pointer' }} />
                                                                    </label>
                                                                </IconButton>
                                                            </InputAdornment>
                                                        )
                                                    }}
                                                    sx={{ width: '70%' }}
                                                    size='small'
                                                    helperText={errors?.account_attachment?.[0] ? errors?.account_attachment[0] : ''}
                                                    error={!!errors?.account_attachment?.[0]}
                                                />
                                            </div>
                                            <div className='fieldSubContainer'></div>
                                        </div>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', marginTop: '20px' }}>
                            <Accordion style={{ width: '98%' }} defaultExpanded>
                                <AccordionSummary expandIcon={<FiChevronDown style={{ fontSize: '25px' }} />}>
                                    <Typography className='accordion-header'>Address</Typography>
                                </AccordionSummary>
                                <Divider className='divider' />
                                <AccordionDetails>
                                    <Box
                                        sx={{ width: '98%', color: '#1A3353', mb: 1 }}
                                        component='form'
                                    >
                                        <div className='fieldContainer'>
                                            <div className='fieldSubContainer'>
                                                <div className='fieldTitle'>Billing Address Line</div>
                                                <RequiredTextField
                                                required
                                                    name='billing_address_line'
                                                    value={formData.billing_address_line}
                                                    onChange={handleChange}
                                                    style={{ width: '70%' }}
                                                    size='small'
                                                    helperText={errors?.billing_address_line?.[0] ? errors?.billing_address_line[0] : ''}
                                                    error={!!errors?.billing_address_line?.[0]}
                                                />
                                            </div>
                                            <div className='fieldSubContainer'>
                                                <div className='fieldTitle'>Billing Street</div>
                                                <RequiredTextField
                                                    required
                                                    name='billing_street'
                                                    value={formData.billing_street}
                                                    onChange={handleChange}
                                                    style={{ width: '70%' }}
                                                    size='small'
                                                    helperText={errors?.billing_street?.[0] ? errors?.billing_street[0] : ''}
                                                    error={!!errors?.billing_street?.[0]}
                                                />
                                            </div>
                                        </div>
                                        <div className='fieldContainer2'>
                                            <div className='fieldSubContainer'>
                                                <div className='fieldTitle'>Billing City</div>
                                                <RequiredTextField
                                                    required
                                                    name='billing_city'
                                                    value={formData.billing_city}
                                                    onChange={handleChange}
                                                    style={{ width: '70%' }}
                                                    size='small'
                                                    helperText={errors?.billing_city?.[0] ? errors?.billing_city[0] : ''}
                                                    error={!!errors?.billing_city?.[0]}
                                                />
                                            </div>
                                            <div className='fieldSubContainer'>
                                                <div className='fieldTitle'>Billing State</div>
                                                <RequiredTextField
                                                    required
                                                    name='billing_state'
                                                    value={formData.billing_state}
                                                    onChange={handleChange}
                                                    style={{ width: '70%' }}
                                                    size='small'
                                                    helperText={errors?.billing_state?.[0] ? errors?.billing_state[0] : ''}
                                                    error={!!errors?.billing_state?.[0]}
                                                />
                                            </div>
                                        </div>
                                        <div className='fieldContainer2'>
                                            <div className='fieldSubContainer'>
                                                <div className='fieldTitle'>Billing Postcode</div>
                                                <RequiredTextField
                                                    required
                                                    name='billing_postcode'
                                                    value={formData.billing_postcode}
                                                    onChange={handleChange}
                                                    style={{ width: '70%' }}
                                                    size='small'
                                                    helperText={errors?.billing_postcode?.[0] ? errors?.billing_postcode[0] : ''}
                                                    error={!!errors?.billing_postcode?.[0]}
                                                />
                                            </div>
                                            <div className='fieldSubContainer'>
                                                <div className='fieldTitle'>Billing Country</div>
                                                <FormControl sx={{ width: '70%' }}>
                                                    <RequiredSelect                                                        
                                                        name='billing_country'
                                                        value={formData.billing_country}
                                                        open={countrySelectOpen}
                                                        onClick={() => setCountrySelectOpen(!countrySelectOpen)}
                                                        IconComponent={() => (
                                                            <div onClick={() => setCountrySelectOpen(!countrySelectOpen)} className="select-icon-background">
                                                                {countrySelectOpen ? <FiChevronUp className='select-icon' /> : <FiChevronDown className='select-icon' />}
                                                            </div>
                                                        )}
                                                        className={'select'}
                                                        onChange={handleChange}
                                                        error={!!errors?.billing_country?.[0]}
                                                    >
                                                        {state?.countries?.length && state?.countries.map((option: any) => (
                                                            <MenuItem key={option[0]} value={option[0]}>
                                                                {option[1]}
                                                            </MenuItem>
                                                        ))}
                                                    </RequiredSelect>
                                                    <FormHelperText>{errors?.billing_country?.[0] ? errors?.billing_country[0] : ''}</FormHelperText>
                                                </FormControl>
                                            </div>
                                        </div>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        </div>
                        <div className='leadContainer'>
                            <Accordion defaultExpanded style={{ width: '98%' }}>
                                <AccordionSummary expandIcon={<FiChevronDown style={{ fontSize: '25px' }} />}>
                                    <Typography className='accordion-header'>Description</Typography>
                                </AccordionSummary>
                                <Divider className='divider' />
                                <AccordionDetails>
                                    <Box
                                        sx={{ width: '100%', mb: 1 }}
                                        component='form'
                                        noValidate
                                        autoComplete='off'
                                    >
                                        <div className='DescriptionDetail'>
                                            <div className='descriptionTitle'>Description</div>
                                            <div style={{ width: '100%', marginBottom: '3%' }}>
                                                <div ref={quillRef} />
                                            </div>
                                        </div>
                                        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', mt: 1.5 }}>
                                            <Button
                                                className='header-button'
                                                onClick={resetQuillToInitialState}
                                                size='small'
                                                variant='contained'
                                                startIcon={<FaTimesCircle style={{ fill: 'white', width: '16px', marginLeft: '2px' }} />}
                                                sx={{ backgroundColor: '#2b5075', ':hover': { backgroundColor: '#1e3750' } }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                className='header-button'
                                                onClick={() => setFormData({ ...formData, description: quillRef.current.firstChild.innerHTML })}
                                                variant='contained'
                                                size='small'
                                                startIcon={<FaCheckCircle style={{ fill: 'white', width: '16px', marginLeft: '2px' }} />}
                                                sx={{ ml: 1 }}
                                            >
                                                Save
                                            </Button>
                                        </Box>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        </div>
                    </div >
                </form >
            </Box >
        </Box >
    )
}
