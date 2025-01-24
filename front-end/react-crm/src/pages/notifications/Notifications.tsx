import React, { useEffect, useState } from 'react';
import { Box, List, ListItem, ListItemText, Typography, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { fetchData, Header1 } from '../../components/FetchData';
import fetchUnreadNotificationsCount from "../../components/Sidebar";
const Notifications = () => {
    const [notifications, setNotifications] = useState<any[]>([]); // Notifications state
    const navigate = useNavigate();  // To navigate back to previous page or home

    // Function to fetch notifications
    const fetchNotifications = () => {
        const Header = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
        }

        fetchData('/api/notifications/', 'GET', null as any, Header)
            .then((res: any) => {
                if (res?.notifications) {
                    setNotifications(res.notifications);
                }
            })
            .catch((error) => {
                console.error('Error fetching notifications:', error);
            });
    };

    // Function to handle clicking on a notification
    const handleNotificationClick = (notificationId: string, leadId: string) => {
        // Define the headers for the request
        const Header = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('Token'),
            org: localStorage.getItem('org')
        };

        // Send POST request to mark the notification as read
        fetchData(`/api/notifications/${notificationId}/mark-as-read/`, 'POST', '', Header)
            .then((res) => {
                if (!res.error) {
                    // Navigate to the lead details page
                    navigate(`/app/leads/lead-details`, { state: { leadId } });

                    // Update the notifications state by marking the notification as read
                    // setNotifications((prevNotifications) =>
                    //     prevNotifications.map((notification) =>
                    //         notification.id === notificationId
                    //             ? { ...notification, is_read: true }  // Update the notification in the state
                    //             : notification
                    //     )
                    // );
                    fetchUnreadNotificationsCount(undefined);
                } else {
                    console.error('Error marking notification as read:', res.error);
                }
            })
            .catch((err) => {
                console.error('Error:', err);
            });
    };

    useEffect(() => {
        fetchNotifications();  // Fetch notifications on page load
    }, []);

    return (
        <Box sx={{ padding: 3 }}>
            <Typography variant="h5" sx={{ marginBottom: 2 }}>
                Notifications
            </Typography>
            <List>
                {notifications.length > 0 ? (
                    notifications.map((notification: any) => (
                        <ListItem key={notification.id}
                            onClick={() => handleNotificationClick(notification.id, notification.lead)}
                        sx={{ padding: '10px 0' }}>
                            <ListItemText
                                primary={notification.message}
                                secondary={new Date(notification.created_at).toLocaleString()}
                            />
                        </ListItem>
                    ))
                ) : (
                    <Typography variant="body2" color="textSecondary">No notifications available.</Typography>
                )}
            </List>
        </Box>
    );
};

export default Notifications;
