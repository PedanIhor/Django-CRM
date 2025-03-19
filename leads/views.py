from django.db.models import Q
from django.db.models import Prefetch
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, extend_schema
from leads.pagination import LeadCardViewPagination
from rest_framework import status
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Account, Tags
from common.models import APISettings, Attachments, Comment, Notification, Profile

# from common.external_auth import CustomDualAuthentication
from common.serializer import (
    AttachmentsSerializer,
    CommentSerializer,
    LeadCommentSerializer,
    ProfileSerializer,
)
from .forms import LeadListForm
from .models import Lead
from common.utils import COUNTRIES, INDCHOICES, LEAD_SOURCE, LEAD_STATUS
from contacts.models import Contact
from leads import swagger_params1
from leads.forms import LeadListForm
from leads.models import Lead
from leads.serializer import (
    LeadCardViewSerializer,
    LeadCreateSerializer,
    LeadSerializer,
    TagsSerializer,
    LeadCreateSwaggerSerializer,
    LeadDetailEditSwaggerSerializer,
    LeadCommentEditSwaggerSerializer,
    CreateLeadFromSiteSwaggerSerializer,
    LeadUploadSwaggerSerializer,
    LeadUpdateStatusSerializer,
)
from common.models import User
from leads.tasks import (
    create_lead_from_file,
    send_email_to_assigned_user,
    send_lead_assigned_emails,
)
from teams.models import Teams
from teams.serializer import TeamsSerializer
from common.crm_permissions import crm_permissions
from contacts.serializer import ContactSerializer
from help_tools import help_views


class LeadsViewSet(help_views.OrgViewSet):
    "list_leads", "add_leads", "get_leads", "edit_leads", "delete_leads",
    permission_classes = (crm_permissions(
        get="get_leads",
        list="list_leads",
        post="add_leads",
        put="edit_leads",
        delete="delete_leads")
    )
    serializer_class = LeadSerializer
    queryset = Lead.objects.all()


class LeadUploadView(APIView):
    model = Lead
    # authentication_classes = (CustomDualAuthentication,)
    permission_classes = (IsAuthenticated,)

    @extend_schema(tags=["Leads"], parameters=swagger_params1.organization_params, request=LeadUploadSwaggerSerializer)
    def post(self, request, *args, **kwargs):
        lead_form = LeadListForm(request.POST, request.FILES)
        if lead_form.is_valid():
            create_lead_from_file.delay(
                lead_form.validated_rows,
                lead_form.invalid_rows,
                request.profile.id,
                request.get_host(),
                request.profile.org.id,
            )
            return Response(
                {"error": False, "message": "Leads created Successfully"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"error": True, "errors": lead_form.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


class LeadCommentView(APIView):
    model = Comment
    # authentication_classes = (CustomDualAuthentication,)
    permission_classes = (IsAuthenticated,)

    def get_object(self, pk):
        return self.model.objects.get(pk=pk)

    @extend_schema(tags=["Leads"], parameters=swagger_params1.organization_params, request=LeadCommentEditSwaggerSerializer)
    def put(self, request, pk, format=None):
        params = request.data
        obj = self.get_object(pk)
        if (
            request.profile.role.name == "ADMIN"
            or request.user.is_superuser
            or request.profile == obj.commented_by
        ):
            serializer = LeadCommentSerializer(obj, data=params)
            if serializer.is_valid():
                serializer.save()
                return Response(
                    {"error": False, "message": "Comment Submitted"},
                    status=status.HTTP_200_OK,
                )
            return Response(
                {"error": True, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "error": True,
                "errors": "You don't have permission to perform this action",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    @extend_schema(tags=["Leads"], parameters=swagger_params1.organization_params)
    def delete(self, request, pk, format=None):
        self.object = self.get_object(pk)
        if (
            request.profile.role.name == "ADMIN"
            or request.user.is_superuser
            or request.profile == self.object.commented_by
        ):
            self.object.delete()
            return Response(
                {"error": False, "message": "Comment Deleted Successfully"},
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "error": True,
                "errors": "You do not have permission to perform this action",
            },
            status=status.HTTP_403_FORBIDDEN,
        )


class LeadAttachmentView(APIView):
    model = Attachments
    # authentication_classes = (CustomDualAuthentication,)
    permission_classes = (IsAuthenticated,)

    @extend_schema(tags=["Leads"], parameters=swagger_params1.organization_params)
    def delete(self, request, pk, format=None):
        self.object = self.model.objects.get(pk=pk)
        if (
            request.profile.role.name == "ADMIN"
            or request.user.is_superuser
            or request.profile.user == self.object.created_by
        ):
            self.object.delete()
            return Response(
                {"error": False, "message": "Attachment Deleted Successfully"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {
                "error": True,
                "errors": "You don't have permission to perform this action",
            },
            status=status.HTTP_403_FORBIDDEN,
        )


class CreateLeadFromSite(APIView):
    @extend_schema(
        tags=["Leads"],
        parameters=swagger_params1.organization_params, request=CreateLeadFromSiteSwaggerSerializer
    )
    def post(self, request, *args, **kwargs):
        params = request.data
        api_key = params.get("apikey")
        # api_setting = APISettings.objects.filter(
        #     website=website_address, apikey=api_key).first()
        api_setting = APISettings.objects.filter(apikey=api_key).first()
        if not api_setting:
            return Response(
                {
                    "error": True,
                    "message": "You don't have permission, please contact the admin!.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if api_setting and params.get("email") and params.get("title"):
            # user = User.objects.filter(is_admin=True, is_active=True).first()
            user = api_setting.created_by
            lead = Lead.objects.create(
                title=params.get("title"),
                first_name=params.get("first_name"),
                last_name=params.get("last_name"),
                status="assigned",
                source=api_setting.website,
                description=params.get("message"),
                email=params.get("email"),
                phone=params.get("phone"),
                is_active=True,
                created_by=user,
                org=api_setting.org,
            )
            lead.assigned_to.add(user)
            # Send Email to Assigned Users
            site_address = request.scheme + "://" + request.META["HTTP_HOST"]
            send_lead_assigned_emails.delay(lead.id, [user.id], site_address)
            # Create Contact
            try:
                contact = Contact.objects.create(
                    first_name=params.get("title"),
                    email=params.get("email"),
                    phone=params.get("phone"),
                    description=params.get("message"),
                    created_by=user,
                    is_active=True,
                    org=api_setting.org,
                )
                contact.assigned_to.add(user)

                lead.contacts.add(contact)
            except Exception:
                pass

            return Response(
                {"error": False, "message": "Lead Created sucessfully."},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"error": True, "message": "Invalid data"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class LeadStatusUpdate(APIView):
    permission_classes = (crm_permissions(post="update_lead_status"),)

    @extend_schema(tags=["Leads"], description="Update the lead status",
                   parameters=swagger_params1.organization_params,
                   operation_id="updateLeadStatus",
                   request=LeadUpdateStatusSerializer)
    def post(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        if lead.org != request.profile.org:
            return Response(
                {"error": True, "errors": "User organization does not match with header...."},
                status=status.HTTP_403_FORBIDDEN,
            )
        assigned_ids = [
            assigned_to.id for assigned_to in lead.assigned_to.all()]
        if request.profile.role.name != "ADMIN" and not request.user.is_superuser:
            if lead.created_by.id != request.user.id and request.profile.id not in assigned_ids:
                return Response(
                    {
                        "error": True,
                        "message": "You don't have permission to perform this action",
                    }
                )
        serializer = LeadUpdateStatusSerializer(lead, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"error": False, "message": "Status updated!"},
                        status=status.HTTP_200_OK)


class LeadCardView(APIView):
    pagination_class = LeadCardViewPagination

    def get(self, request, *args, **kwargs):
        status = request.query_params.get('status')
        if not status:
            return Response({"error": "Status is required"}, status=400)
        VALID_STATUSES = [status[0] for status in LEAD_STATUS]
        if status not in VALID_STATUSES:
            return Response({"error": "Invalid lead status"}, status=400)

        leads_filtered_by_status = Lead.objects.filter(status=status, org=request.profile.org).prefetch_related(
            Prefetch(
                "assigned_to",
                queryset=Profile.objects.select_related("user"),
                to_attr="assigned_profiles"
            )
        ).only("id", "title", "country", "opportunity_amount", "probability")

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(leads_filtered_by_status, request)
        if page is not None:
            serialized_data = LeadCardViewSerializer(page, many=True).data
            return paginator.get_paginated_response(serialized_data)
        return Response({"detail": "No leads found for this status"}, status=404)
