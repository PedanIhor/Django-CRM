import React, { useEffect, useState } from 'react'
import {
    Card,
    Link,
    Button,
    Avatar,
    Divider,
    TextField,
    Box,
    AvatarGroup
} from '@mui/material'
import { Fa500Px, FaAccusoft, FaAd, FaAddressCard, FaEnvelope, FaRegAddressCard, FaStar } from 'react-icons/fa'
import { CustomAppBar } from '../../components/CustomAppBar'
import { useLocation, useNavigate } from 'react-router-dom'
import { AntSwitch } from '../../styles/CssStyled'
import { ContactUrl } from '../../services/ApiUrls'
import { fetchData } from '../../components/FetchData'

type response = {
    created_by: {
        first_name: string;
        last_name: string;
    };
    created_on: string;
    created_on_arrow: string;
    date_of_birth: string;
    department: string;
    description: string;
    do_not_call: boolean;
    facebook_url: string;
    first_name: string;
    lastname: string;
    id: string;
    is_active: boolean;
    language: string;
    last_name: string;
    linked_in_url: string;
    mobile_number: string;
    organization: string;
    primary_email: string;
    salutation: string;
    secondary_email: string;
    secondary_number: string;
    title: string;
    twitter_username: string;
    address: {
        address_line: string;
        city: string;
        country: string;
        postcode: string;
        state: string;
        street: string;
    };
    name: string;
    country: string;
    type: string;
    account: {
        name: string;
        id: string;
    };
};

export const formatDate = (dateString: any) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(dateString).toLocaleDateString(undefined, options)
}

export default function ContactDetails() {
    const navigate = useNavigate()
    const { state } = useLocation()
    const [contactDetails, setContactDetails] = useState<response | null>(null)

    useEffect(() => {
        getContactDetail(state.contactId)
    }, [state.contactId])

    const getContactDetail = (id: any) => {
        const Header = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
          }
        fetchData(`${ContactUrl}/${id}/`, 'GET', null as any, Header)
            .then((res) => {
                console.log(res, 'res');
                if (!res.error) {
                    setContactDetails(res?.contact_obj)
                }
            })
    }

    const backbtnHandle = () => {
        navigate('/app/contacts')
    }

    const editHandle = () => {
        navigate('/app/contacts/edit-contact', {
            state: {
                value: {
                    salutation: contactDetails?.salutation,
                    first_name: contactDetails?.first_name,
                    last_name: contactDetails?.last_name,
                    primary_email: contactDetails?.primary_email,
                    secondary_email: contactDetails?.secondary_email,
                    mobile_number: contactDetails?.mobile_number,
                    secondary_number: contactDetails?.secondary_number,
                    date_of_birth: contactDetails?.date_of_birth,
                    organization: contactDetails?.organization,
                    title: contactDetails?.title,
                    language: contactDetails?.language,
                    do_not_call: contactDetails?.do_not_call,
                    department: contactDetails?.department,
                    address: contactDetails?.address?.address_line,
                    street: contactDetails?.address?.street,
                    city: contactDetails?.address?.city,
                    state: contactDetails?.address?.state,
                    country: contactDetails?.country,
                    postcode: contactDetails?.address?.postcode,
                    description: contactDetails?.description,
                    linked_in_url: contactDetails?.linked_in_url,
                    facebook_url: contactDetails?.facebook_url,
                    twitter_username: contactDetails?.twitter_username
                }, id: state?.contactId?.id, countries: state?.countries
            }
        })
    }

    const module = 'Contacts'
    const crntPage = 'Contact Detail'
    const backBtn = 'Back To Contacts'

    return (
        <Box sx={{ mt: '60px' }}>
            <div>
                <CustomAppBar backbtnHandle={backbtnHandle} module={module} backBtn={backBtn} crntPage={crntPage} editHandle={editHandle} />
                <Box sx={{ mt: '110px', p: '20px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Box sx={{ width: '100%' }}>
                        <Card sx={{ borderRadius: '7px' }}>
                            <div style={{ padding: '20px', borderBottom: '1px solid lightgray', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 600, fontSize: '18px', color: '#1a3353f0' }}>
                                    Contact Information
                                </div>
                                <div style={{ color: 'gray', fontSize: '16px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginRight: '15px', textTransform: 'capitalize' }}>
                                        created{' '}
                                        {contactDetails?.created_on_arrow}
                                        &nbsp;by &nbsp;&nbsp;
                                        <span style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                                            <Avatar
                                                src='/broken-image.jpg'
                                                style={{
                                                    height: '24px',
                                                    width: '24px'
                                                }}
                                            />
                                        </span> &nbsp;&nbsp;
                                        {contactDetails?.created_by?.first_name}
                                        {contactDetails?.created_by?.last_name}
                                    </div>
                                    <div>Last update&nbsp;{contactDetails?.created_on_arrow}</div>
                                </div>
                            </div>
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <div style={{ width: '48%' }}>
                                    <div className='title2'>First Name</div>
                                    <div className='title3'>
                                        {contactDetails?.first_name || '----'}
                                    </div>
                                </div>
                                <div style={{ width: '48%' }}>
                                    <div className='title2'>Last Name</div>
                                    <div className='title3'>
                                        {contactDetails?.last_name || '----'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '20px', marginTop: '15px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <div style={{ width: '48%' }}>
                                    <div className='title2'>Email Address</div>
                                    <div style={{ fontSize: '16px', color: '#1E90FF', marginTop: '5%' }}>
                                        <div>
                                            {contactDetails?.primary_email ? <div><Link>{contactDetails?.primary_email}</Link><FaStar style={{ fontSize: '16px', fill: 'yellow' }} /></div> : '----'}<br />
                                            {contactDetails?.secondary_email ? <Link>{contactDetails?.secondary_email}</Link> : ''}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ width: '48%' }}>
                                    <div className='title2'>Mobile Number</div>
                                    <div className='title3'>
                                        <div>
                                            {contactDetails?.mobile_number ? <div>{contactDetails?.mobile_number}{<FaStar style={{ fontSize: '16px', fill: 'yellow' }} />}</div> : '----'}<br />
                                            {contactDetails?.secondary_number ? contactDetails?.secondary_number : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '20px', marginTop: '15px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Language</div>
                                    <div className='title3'>
                                        {contactDetails?.language || '----'}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Do Not Call</div>
                                    <div className='title3'>
                                        {contactDetails?.do_not_call ? 'True' : 'False'}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                </div>
                            </div>                            
                            <div style={{ padding: '20px', marginTop: '15px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>LinkedIn URL</div>
                                    <div className='title3'>
                                        {contactDetails?.linked_in_url || '----'}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Facebook URL</div>
                                    <div className='title3'>
                                        {contactDetails?.facebook_url || '----'}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Twitter URL</div>
                                    <div className='title3'>
                                        {contactDetails?.twitter_username || '----'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '20px', marginTop: '15px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                <div style={{ width: '32%' }}>
                                    <div className='title2'>Type</div>
                                    <div className='title3'>
                                        {contactDetails?.type ? contactDetails.type.charAt(0).toUpperCase() + contactDetails.type.slice(1).toLowerCase() : '----'}
                                    </div>
                                </div>
                                <div style={{ width: '32%' }}>
                                </div>
                                <div style={{ width: '32%' }}>
                                </div>
                            </div>
                            {contactDetails?.type === 'corporate' && (
                                <div style={{ marginTop: '15px' }}>
                                    <div style={{ padding: '20px', borderBottom: '1px solid lightgray', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <div style={{ fontWeight: 600, fontSize: '18px', color: '#1a3353f0' }}>
                                            Account Information
                                        </div>
                                    </div>
                                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>                                        
                                        <div style={{ width: '32%' }}>
                                            <div className='title2'>Account Name</div>
                                            <div className='title3'>
                                                {contactDetails?.account?.name ? 
                                                    <Link 
                                                        component="button"
                                                        variant="body1"
                                                        onClick={() => navigate(`/app/accounts/account-details`, { state: { accountId: contactDetails?.account?.id, detail: true} })}
                                                        style={{ color: '#3E79F7', textDecoration: 'none', cursor: 'pointer' }}
                                                    >
                                                        {contactDetails.account.name}
                                                    </Link> 
                                                    : '----'}
                                            </div>
                                        </div>
                                        <div style={{ width: '32%' }}>
                                            <div className='title2'>Contact Title</div>
                                            <div className='title3'>
                                                {contactDetails?.title || '----'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>                                        
                                        <div style={{ width: '32%' }}>
                                            <div className='title2'>Contact Department</div>
                                            <div className='title3'>
                                                {contactDetails?.department || '----'}
                                            </div>
                                        </div>
                                        <div style={{ width: '32%' }}>
                                        </div>
                                        <div style={{ width: '32%' }}>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div style={{ marginTop: '15px' }}>
                                <div style={{ padding: '20px', borderBottom: '1px solid lightgray', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <div style={{ fontWeight: 600, fontSize: '18px', color: '#1a3353f0' }}>
                                        Address Details
                                    </div>
                                </div>
                                <div style={{ padding: '20px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>Address Lane</div>
                                        <div className='title3'>
                                            {contactDetails?.address?.address_line || '----'}
                                        </div>
                                    </div>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>Street</div>
                                        <div className='title3'>
                                            {contactDetails?.address?.street || '----'}
                                        </div>
                                    </div>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>City</div>
                                        <div className='title3'>
                                            {contactDetails?.address?.city || '----'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ padding: '20px', marginTop: '15px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>Postcode</div>
                                        <div className='title3'>
                                            {contactDetails?.address?.postcode || '----'}
                                        </div>
                                    </div>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>State</div>
                                        <div className='title3'>
                                            {contactDetails?.address?.state || '----'}
                                        </div>
                                    </div>
                                    <div style={{ width: '32%' }}>
                                        <div className='title2'>Country</div>
                                        <div className='title3'>
                                            {contactDetails?.country || '----'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: '15px' }}>
                                <div style={{ padding: '20px', borderBottom: '1px solid lightgray', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <div style={{ fontWeight: 600, fontSize: '18px', color: '#1a3353f0' }}>
                                        Description
                                    </div>
                                </div>
                                <Box sx={{ p: '15px' }}>
                                    {contactDetails?.description ? <div dangerouslySetInnerHTML={{ __html: contactDetails?.description }} /> : '---'}
                                </Box>
                            </div>
                        </Card>
                    </Box>
                </Box>
            </div >
        </Box >
    )
}