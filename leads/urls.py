from django.urls import path, include

from leads import views
from rest_framework.routers import DefaultRouter

app_name = "api_leads"

leads_router = DefaultRouter()
leads_router.register("", views.LeadsViewSet, basename="lead")

urlpatterns = [
    path("card-view/", views.LeadCardView.as_view(), name="leads_card_view"),
    path(
        "create-from-site/",
        views.CreateLeadFromSite.as_view(),
        name="create_lead_from_site",
    ),
    path("", include(leads_router.urls)),
    path("upload/", views.LeadUploadView.as_view()),
    path("comment/<str:pk>/", views.LeadCommentView.as_view()),
    path("attachment/<str:pk>/", views.LeadAttachmentView.as_view()),
    path('<str:pk>/status/', views.LeadStatusUpdate.as_view(), name="lead_status_update"),
]
