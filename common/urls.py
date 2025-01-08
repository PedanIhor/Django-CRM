from django.urls import path, include
from rest_framework_simplejwt import views as jwt_views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.routers import DefaultRouter

from common import views

app_name = "api_common"

permissions_router = DefaultRouter()
permissions_router.register('', views.PermissionsViewSet, basename='permission')
roles_router = DefaultRouter()
roles_router.register('', views.RolesViewSet, basename='role')

urlpatterns = [
    path("dashboard/", views.ApiHomeView.as_view()),
    path(
        "auth/refresh-token/",
        jwt_views.TokenRefreshView.as_view(),
        name="token_refresh",
    ),
    # GoogleLoginView
    path("auth/google/", views.GoogleLoginView.as_view()),
    path("org/", views.OrgProfileCreateView.as_view()),
    path("profile/", views.ProfileView.as_view()),
    path("users/get-teams-and-users/", views.GetTeamsAndUsersView.as_view()),
    path("users/", views.UsersListView.as_view()),
    path("user/<str:pk>/", views.UserDetailView.as_view()),
    path("documents/", views.DocumentListView.as_view()),
    path("documents/<str:pk>/", views.DocumentDetailView.as_view()),
    path("api-settings/", views.DomainList.as_view()),
    path("api-settings/<str:pk>/", views.DomainDetailView.as_view()),
    path("user/<str:pk>/status/", views.UserStatusView.as_view()),
    path("organization/google-auth/<str:org_id>/",
         views.OrganizationGoogleAuthView.as_view()),
    path('auth/validate-token/<str:activation_key>/', views.ValidateTokenView.as_view()),
    path('auth/password-setup/<str:activation_key>/', views.PasswordSetupView.as_view()),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/register-user/', views.UserRegistrationView.as_view(),
        name='user-registration'),
    path('auth/verify-email/<str:activation_key>/', views.VerifyEmailForRegistrationView.as_view(),
        name='verify-email'),
    path('notifications/unread/', views.UnreadNotificationsView.as_view(), name='unread-notifications'),
    path('notifications/', views.UserNotificationsView.as_view(), name='unread-notifications'),
    path('notifications/<int:pk>/mark-as-read/', views.MarkNotificationAsReadView.as_view(), name='mark-notification-read'),
    path('roles/', include(roles_router.urls)),
    path('permissions/', include(permissions_router.urls)),
    path('modules/', views.ModulesListView.as_view()),
]
