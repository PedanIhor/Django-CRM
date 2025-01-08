import json
import secrets
from multiprocessing import context
from re import template

import requests
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.utils import json
from django.conf import settings
from django.contrib.auth import authenticate, login
from django.db import transaction
from django.db.models import Q
from django.http.response import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.utils.translation import gettext as _
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, extend_schema, extend_schema_view
# from common.external_auth import CustomDualAuthentication
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Account, Contact, Tags
from accounts.serializer import AccountSerializer
from cases.models import Case
from cases.serializer import CaseSerializer

# from common.custom_auth import JSONWebTokenAuthentication
from common import serializer, swagger_params1
from common.models import APISettings, Document, Org, Profile, User, Role
from common.serializer import *
# from common.serializer import (
#     CreateUserSerializer,
#     PasswordChangeSerializer,
#     RegisterOrganizationSerializer,
# )
from common.tasks import (
    resend_activation_link_to_user,
    send_email_to_new_user,
    send_email_to_newly_added_user,
    send_email_to_reset_password,
    send_email_user_delete,
)
from common.token_generator import account_activation_token

# from rest_framework_jwt.serializers import jwt_encode_handler
from common.utils import COUNTRIES, ROLES, jwt_payload_handler
from contacts.serializer import ContactSerializer
from leads.models import Lead
from leads.serializer import LeadSerializer
from opportunity.models import Opportunity
from opportunity.serializer import OpportunitySerializer
from teams.models import Teams
from teams.serializer import TeamsSerializer
from django.core.exceptions import ObjectDoesNotExist
from common.crm_permissions import IsAdmin, crm_permissions, crm_roles
from help_tools import help_views

class GetTeamsAndUsersView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(tags=["users"], parameters=swagger_params1.organization_params)
    def get(self, request, *args, **kwargs):
        data = {}
        teams = Teams.objects.filter(org=request.profile.org).order_by("-id")
        teams_data = TeamsSerializer(teams, many=True).data
        profiles = Profile.objects.filter(is_active=False, org=request.profile.org).order_by(
            "user__email"
        )
        profiles_data = ProfileSerializer(profiles, many=True).data
        data["teams"] = teams_data
        data["profiles"] = profiles_data
        return Response(data)


class UsersListView(APIView, LimitOffsetPagination):
    permission_classes = (IsAuthenticated,)

    @extend_schema(parameters=swagger_params1.organization_params, request=UserCreateSwaggerSerializer)
    def post(self, request, format=None):
        if self.request.profile.role.name != "ADMIN" and not self.request.user.is_superuser:
            return Response(
                {"error": True, "errors": "Permission Denied"},
                status=status.HTTP_403_FORBIDDEN,
            )
        else:
            params = request.data
            if params:
                user_serializer = CreateUserSerializer(
                    data=params, org=request.profile.org)
                address_serializer = BillingAddressSerializer(data=params)
                profile_serializer = CreateProfileSerializer(data=params)
                data = {}
                if not user_serializer.is_valid():
                    data["user_errors"] = dict(user_serializer.errors)
                if not profile_serializer.is_valid():
                    data["profile_errors"] = profile_serializer.errors
                if not address_serializer.is_valid():
                    data["address_errors"] = (address_serializer.errors,)
                if data:
                    return Response(
                        {"error": True, "errors": data},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if address_serializer.is_valid():
                    address_obj = address_serializer.save()
                    user = user_serializer.save(
                        is_active=False,
                    )
                    user.email = user.email
                    user.set_password("123")
                    user.save()
                    # if params.get("password"):
                    #     user.set_password(params.get("password"))
                    #     user.save()
                    role_name = params.get("role")
                    role = Role.objects.get(name=role_name)
                    profile = Profile.objects.create(
                        user=user,
                        date_of_joining=timezone.now(),
                        role=role,
                        address=address_obj,
                        org=request.profile.org,
                    )

                    send_email_to_newly_added_user(
                        user.id
                    )
                    return Response(
                        {"error": False, "message": "User Created Successfully"},
                        status=status.HTTP_201_CREATED,
                    )

    @extend_schema(parameters=swagger_params1.user_list_params)
    def get(self, request, format=None):
        if self.request.profile.role.name != "ADMIN" and not self.request.user.is_superuser:
            return Response(
                {"error": True, "errors": "Permission Denied"},
                status=status.HTTP_403_FORBIDDEN,
            )
        queryset = Profile.objects.filter(
            org=request.profile.org).order_by("-id")
        params = request.query_params
        if params:
            if params.get("email"):
                queryset = queryset.filter(
                    user__email__icontains=params.get("email"))
            if params.get("role"):
                queryset = queryset.filter(role=params.get("role"))
            if params.get("status"):
                queryset = queryset.filter(is_active=params.get("status"))

        context = {}
        queryset_active_users = queryset.filter(is_active=True)
        results_active_users = self.paginate_queryset(
            queryset_active_users.distinct(), self.request, view=self
        )
        active_users = ProfileSerializer(results_active_users, many=True).data
        if results_active_users:
            offset = queryset_active_users.filter(
                id__gte=results_active_users[-1].id
            ).count()
            if offset == queryset_active_users.count():
                offset = None
        else:
            offset = 0
        context["active_users"] = {
            "active_users_count": self.count,
            "active_users": active_users,
            "offset": offset,
        }

        queryset_inactive_users = queryset.filter(is_active=False)
        results_inactive_users = self.paginate_queryset(
            queryset_inactive_users.distinct(), self.request, view=self
        )
        inactive_users = ProfileSerializer(
            results_inactive_users, many=True).data
        if results_inactive_users:
            offset = queryset_inactive_users.filter(
                id__gte=results_inactive_users[-1].id
            ).count()
            if offset == queryset_inactive_users.count():
                offset = None
        else:
            offset = 0
        context["inactive_users"] = {
            "inactive_users_count": self.count,
            "inactive_users": inactive_users,
            "offset": offset,
        }

        context["admin_email"] = settings.ADMIN_EMAIL
        context["roles"] = ROLES
        context["status"] = [("True", "Active"), ("False", "In Active")]
        return Response(context)


class UserDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    def get_object(self, pk):
        profile = get_object_or_404(Profile, pk=pk)
        return profile

    def fill_required_data(self, data, profile):
        keys = data.keys()
        if "email" not in keys:
            data["email"] = profile.user.email

        if "role" not in keys:
            data["role"] = profile.role

        if "phone" not in keys:
            data["phone"] = profile.phone

        if "alternate_phone" not in keys:
            data["alternate_phone"] = profile.alternate_phone

        if "address_line" not in keys:
            data["address_line"] = profile.address.address_line

        if "street" not in keys:
            data["street"] = profile.address.street

        if "city" not in keys:
            data["city"] = profile.address.city

        if "state" not in keys:
            data["address_line"] = profile.address.state

        if "pincode" not in keys:
            data["pincode"] = profile.address.postcode

        if "country" not in keys:
            data["country"] = profile.address.country

    @extend_schema(tags=["users"], parameters=swagger_params1.organization_params)
    def get(self, request, pk, format=None):
        profile_obj = self.get_object(pk)
        if (
                self.request.profile.role.name != "ADMIN"
                and not self.request.profile.is_admin
                and self.request.profile.id != profile_obj.id
        ):
            return Response(
                {"error": True, "errors": "Permission Denied"},
                status=status.HTTP_403_FORBIDDEN,
            )
        if profile_obj.org != request.profile.org:
            return Response(
                {"error": True, "errors": "User company doesnot match with header...."},
                status=status.HTTP_403_FORBIDDEN,
            )
        assigned_data = Profile.objects.filter(org=request.profile.org, is_active=True).values(
            "id", "user__email"
        )
        context = {}
        context["profile_obj"] = ProfileSerializer(profile_obj).data
        opportunity_list = Opportunity.objects.filter(assigned_to=profile_obj)
        context["opportunity_list"] = OpportunitySerializer(
            opportunity_list, many=True
        ).data
        contacts = Contact.objects.filter(assigned_to=profile_obj)
        context["contacts"] = ContactSerializer(contacts, many=True).data
        cases = Case.objects.filter(assigned_to=profile_obj)
        context["cases"] = CaseSerializer(cases, many=True).data
        context["assigned_data"] = assigned_data
        comments = profile_obj.user_comments.all()
        context["comments"] = CommentSerializer(comments, many=True).data
        context["countries"] = COUNTRIES
        return Response(
            {"error": False, "data": context},
            status=status.HTTP_200_OK,
        )

    @extend_schema(tags=["users"], parameters=swagger_params1.organization_params, request=UserCreateSwaggerSerializer)
    def put(self, request, pk, format=None):
        params = request.data
        profile = self.get_object(pk)
        address_obj = profile.address
        if (
                self.request.profile.role.name != "ADMIN"
                and not self.request.user.is_superuser
                and self.request.profile.id != profile.id
        ):
            return Response(
                {"error": True, "errors": "Permission Denied"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if profile.org != request.profile.org:
            return Response(
                {"error": True, "errors": "User company doesnot match with header...."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = CreateUserSerializer(
            data=params, instance=profile.user, org=request.profile.org
        )
        address_serializer = BillingAddressSerializer(
            data=params, instance=address_obj)
        profile_serializer = CreateProfileSerializer(
            data=params, instance=profile)
        data = {}
        if not serializer.is_valid():
            data["contact_errors"] = serializer.errors
        if not address_serializer.is_valid():
            data["address_errors"] = (address_serializer.errors,)
        if not profile_serializer.is_valid():
            data["profile_errors"] = (profile_serializer.errors,)
        if data:
            data["error"] = True
            return Response(
                data,
                status=status.HTTP_400_BAD_REQUEST,
            )
        if address_serializer.is_valid():
            address_obj = address_serializer.save()
            user = serializer.save()
            user.email = user.email
            user.save()
        if profile_serializer.is_valid():
            profile = profile_serializer.save()
            return Response(
                {"error": False, "message": "User Updated Successfully"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"error": True, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @extend_schema(
        tags=["users"],
        parameters=swagger_params1.organization_params,
        request=UserPatchSwaggerSerializer)
    def patch(self, request, pk, format=None):
        params = request.data
        profile = self.get_object(pk)
        address_obj = profile.address

        if (
            self.request.profile.role.name != "ADMIN"
            and not self.request.user.is_superuser
            and self.request.profile.id != profile.id
        ):
            return Response(
                {"error": True, "errors": "Permission Denied"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if profile.org != request.profile.org:
            return Response(
                {"error": True, "errors": "User company does not match with header...."},
                status=status.HTTP_403_FORBIDDEN,
            )

        self.fill_required_data(params, profile)

        serializer = CreateUserSerializer(
            data=params, instance=profile.user, org=request.profile.org
        )
        address_serializer = BillingAddressSerializer(
            data=params, instance=address_obj)
        profile_serializer = CreateProfileSerializer(
            data=params, instance=profile)
        data = {}
        if not serializer.is_valid():
            data["contact_errors"] = serializer.errors
        if not address_serializer.is_valid():
            data["address_errors"] = (address_serializer.errors,)
        if not profile_serializer.is_valid():
            data["profile_errors"] = (profile_serializer.errors,)
        if data:
            data["error"] = True
            return Response(
                data,
                status=status.HTTP_400_BAD_REQUEST,
            )

        if address_serializer.is_valid():
            address_serializer.save()
            user = serializer.save()
            user.email = user.email
            user.save()
        if profile_serializer.is_valid():
            profile_serializer.save()
            return Response(
                {"error": False, "message": "User Updated Successfully"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"error": True, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @extend_schema(
        tags=["users"], parameters=swagger_params1.organization_params
    )
    def delete(self, request, pk, format=None):
        profile = self.get_object(pk)

        if (request.profile.role.name != "ADMIN"
                and not request.user.is_superuser
                and request.profile.id != profile.id):
            return Response(
                {
                    "error": True,
                    "errors": "Permission Denied"
                },
                status=status.HTTP_403_FORBIDDEN
            )
        # deleted_by = request.profile.user.email
        # send_email_user_delete(
        #     profile.user.email,
        #     deleted_by=deleted_by
        # )
        user = profile.user
        profile.delete()
        user.delete()
        return Response({"status": "success"}, status=status.HTTP_200_OK)


# check_header not working
class ApiHomeView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(parameters=swagger_params1.organization_params)
    def get(self, request, format=None):
        accounts = Account.objects.filter(
            status="open", org=request.profile.org)
        contacts = Contact.objects.filter(org=request.profile.org)
        leads = Lead.objects.filter(org=request.profile.org).exclude(
            Q(status="converted") | Q(status="closed")
        )
        opportunities = Opportunity.objects.filter(org=request.profile.org)

        if self.request.profile.role.name != "ADMIN" and not self.request.user.is_superuser:
            accounts = accounts.filter(
                Q(assigned_to=self.request.profile) | Q(
                    created_by=self.request.profile.user)
            )
            contacts = contacts.filter(
                Q(assigned_to__id__in=self.request.profile)
                | Q(created_by=self.request.profile.user)
            )
            leads = leads.filter(
                Q(assigned_to__id__in=self.request.profile)
                | Q(created_by=self.request.profile.user)
            ).exclude(status="closed")
            opportunities = opportunities.filter(
                Q(assigned_to__id__in=self.request.profile)
                | Q(created_by=self.request.profile.user)
            )
        context = {}
        context["accounts_count"] = accounts.count()
        context["contacts_count"] = contacts.count()
        context["leads_count"] = leads.count()
        context["opportunities_count"] = opportunities.count()
        context["accounts"] = AccountSerializer(accounts, many=True).data
        context["contacts"] = ContactSerializer(contacts, many=True).data
        context["leads"] = LeadSerializer(leads, many=True).data
        context["opportunities"] = OpportunitySerializer(
            opportunities, many=True).data
        return Response(context, status=status.HTTP_200_OK)


class OrgProfileCreateView(APIView):
    # authentication_classes = (CustomDualAuthentication,)
    permission_classes = (IsAuthenticated,)

    model1 = Org
    model2 = Profile
    serializer_class = OrgProfileCreateSerializer
    profile_serializer = CreateProfileSerializer

    @extend_schema(
        description="Organization and profile Creation api",
        request=OrgProfileCreateSerializer
    )
    def post(self, request, format=None):
        data = request.data
        data['api_key'] = secrets.token_hex(16)
        serializer = self.serializer_class(data=data)
        if serializer.is_valid():
            org_obj = serializer.save()

            # now creating the profile
            profile_obj = self.model2.objects.create(
                user=request.user, org=org_obj)
            # now the current user is the admin of the newly created organisation
            profile_obj.is_organization_admin = True
            profile_obj.role = Role.objects.filter(pk='ADMIN').first()
            profile_obj.save()

            return Response(
                {
                    "error": False,
                    "message": "New Org is Created.",
                    "org": self.serializer_class(org_obj).data,
                    "status": status.HTTP_201_CREATED,
                }
            )
        else:
            return Response(
                {
                    "error": True,
                    "errors": serializer.errors,
                    "status": status.HTTP_400_BAD_REQUEST,
                }
            )

    @extend_schema(
        description="Just Pass the token, will return ORG list, associated with user"
    )
    def get(self, request, format=None):
        """
        here we are passing profile list of the user, where org details also included
        """
        profile_list = Profile.objects.filter(user=request.user)
        serializer = ShowOrganizationListSerializer(profile_list, many=True)
        return Response(
            {
                "error": False,
                "status": status.HTTP_200_OK,
                "profile_org_list": serializer.data,
            }
        )


class OrganizationGoogleAuthView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, org_id):
        if request.profile.role.name != "ADMIN":
            return Response(
                {
                    "error": True,
                    "errors": "You do not have Permission to perform this action",
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        # Fetch the organization's google_auth_enabled status
        organization = get_object_or_404(Org, id=org_id)
        return Response({'google_auth_enabled': organization.google_auth_enabled})

    def patch(self, request, org_id):
        if request.profile.role.name != "ADMIN":
            return Response(
                {
                    "error": True,
                    "errors": "You do not have Permission to perform this action",
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        # Update the organization's google_auth_enabled status
        organization = get_object_or_404(Org, id=org_id)
        google_auth_enabled = request.data.get('google_auth_enabled', None)
        if google_auth_enabled is not None:
            organization.google_auth_enabled = google_auth_enabled
            organization.save()
            return Response({'google_auth_enabled': organization.google_auth_enabled})
        return Response({"error": "Invalid data"}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(parameters=swagger_params1.organization_params)
    def get(self, request, format=None):
        # profile=Profile.objects.get(user=request.user)
        context = {}
        context["user_obj"] = ProfileSerializer(self.request.profile).data
        return Response(context, status=status.HTTP_200_OK)


class DocumentListView(APIView, LimitOffsetPagination):
    # authentication_classes = (CustomDualAuthentication,)
    permission_classes = (IsAuthenticated,)
    model = Document

    def get_context_data(self, **kwargs):
        params = self.request.query_params
        queryset = self.model.objects.filter(
            org=self.request.profile.org).order_by("-id")
        if self.request.user.is_superuser or self.request.profile.role.name == "ADMIN":
            queryset = queryset
        else:
            if self.request.profile.documents():
                doc_ids = self.request.profile.documents().values_list("id", flat=True)
                shared_ids = queryset.filter(
                    Q(status="active") & Q(
                        shared_to__id__in=[self.request.profile.id])
                ).values_list("id", flat=True)
                queryset = queryset.filter(
                    Q(id__in=doc_ids) | Q(id__in=shared_ids))
            else:
                queryset = queryset.filter(
                    Q(status="active") & Q(
                        shared_to__id__in=[self.request.profile.id])
                )

        request_post = params
        if request_post:
            if request_post.get("title"):
                queryset = queryset.filter(
                    title__icontains=request_post.get("title"))
            if request_post.get("status"):
                queryset = queryset.filter(status=request_post.get("status"))

            if request_post.get("shared_to"):
                queryset = queryset.filter(
                    shared_to__id__in=json.loads(request_post.get("shared_to"))
                )

        context = {}
        profile_list = Profile.objects.filter(
            is_active=True, org=self.request.profile.org)
        if self.request.profile.role.name == "ADMIN" or self.request.profile.is_admin:
            profiles = profile_list.order_by("user__email")
        else:
            profiles = profile_list.filter(
                role="ADMIN").order_by("user__email")
        search = False
        if (
                params.get("document_file")
                or params.get("status")
                or params.get("shared_to")
        ):
            search = True
        context["search"] = search

        queryset_documents_active = queryset.filter(status="active")
        results_documents_active = self.paginate_queryset(
            queryset_documents_active.distinct(), self.request, view=self
        )
        documents_active = DocumentSerializer(
            results_documents_active, many=True).data
        if results_documents_active:
            offset = queryset_documents_active.filter(
                id__gte=results_documents_active[-1].id
            ).count()
            if offset == queryset_documents_active.count():
                offset = None
        else:
            offset = 0
        context["documents_active"] = {
            "documents_active_count": self.count,
            "documents_active": documents_active,
            "offset": offset,
        }

        queryset_documents_inactive = queryset.filter(status="inactive")
        results_documents_inactive = self.paginate_queryset(
            queryset_documents_inactive.distinct(), self.request, view=self
        )
        documents_inactive = DocumentSerializer(
            results_documents_inactive, many=True
        ).data
        if results_documents_inactive:
            offset = queryset_documents_inactive.filter(
                id__gte=results_documents_active[-1].id
            ).count()
            if offset == queryset_documents_inactive.count():
                offset = None
        else:
            offset = 0
        context["documents_inactive"] = {
            "documents_inactive_count": self.count,
            "documents_inactive": documents_inactive,
            "offset": offset,
        }

        context["users"] = ProfileSerializer(profiles, many=True).data
        context["status_choices"] = Document.DOCUMENT_STATUS_CHOICE
        return context

    @extend_schema(
        tags=["documents"], parameters=swagger_params1.document_get_params
    )
    def get(self, request, *args, **kwargs):
        context = self.get_context_data(**kwargs)
        return Response(context)

    @extend_schema(
        tags=["documents"], parameters=swagger_params1.organization_params, request=DocumentCreateSwaggerSerializer
    )
    def post(self, request, *args, **kwargs):
        params = request.data
        serializer = DocumentCreateSerializer(data=params, request_obj=request)
        if serializer.is_valid():
            doc = serializer.save(
                created_by=request.profile.user,
                org=request.profile.org,
                document_file=request.FILES.get("document_file"),
            )
            if params.get("shared_to"):
                assinged_to_list = params.get("shared_to")
                profiles = Profile.objects.filter(
                    id__in=assinged_to_list, org=request.profile.org, is_active=True
                )
                if profiles:
                    doc.shared_to.add(*profiles)
            if params.get("teams"):
                teams_list = params.get("teams")
                teams = Teams.objects.filter(
                    id__in=teams_list, org=request.profile.org)
                if teams:
                    doc.teams.add(*teams)

            return Response(
                {"error": False, "message": "Document Created Successfully"},
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"error": True, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


class DocumentDetailView(APIView):
    # authentication_classes = (CustomDualAuthentication,)
    permission_classes = (IsAuthenticated,)

    def get_object(self, pk):
        return Document.objects.filter(id=pk).first()

    @extend_schema(
        tags=["documents"], parameters=swagger_params1.organization_params
    )
    def get(self, request, pk, format=None):
        self.object = self.get_object(pk)
        if not self.object:
            return Response(
                {"error": True, "errors": "Document does not exist"},
                status=status.HTTP_403_FORBIDDEN,
            )
        if self.object.org != self.request.profile.org:
            return Response(
                {"error": True, "errors": "User company doesnot match with header...."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if self.request.profile.role.name != "ADMIN" and not self.request.user.is_superuser:
            if not (
                    (self.request.profile == self.object.created_by)
                    or (self.request.profile in self.object.shared_to.all())
            ):
                return Response(
                    {
                        "error": True,
                        "errors": "You do not have Permission to perform this action",
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
        profile_list = Profile.objects.filter(org=self.request.profile.org)
        if request.profile.role.name == "ADMIN" or request.user.is_superuser:
            profiles = profile_list.order_by("user__email")
        else:
            profiles = profile_list.filter(
                role="ADMIN").order_by("user__email")
        context = {}
        context.update(
            {
                "doc_obj": DocumentSerializer(self.object).data,
                "file_type_code": self.object.file_type()[1],
                "users": ProfileSerializer(profiles, many=True).data,
            }
        )
        return Response(context, status=status.HTTP_200_OK)

    @extend_schema(
        tags=["documents"], parameters=swagger_params1.organization_params
    )
    def delete(self, request, pk, format=None):
        document = self.get_object(pk)
        if not document:
            return Response(
                {"error": True, "errors": "Documdnt does not exist"},
                status=status.HTTP_403_FORBIDDEN,
            )
        if document.org != self.request.profile.org:
            return Response(
                {"error": True, "errors": "User company doesnot match with header...."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if self.request.profile.role.name != "ADMIN" and not self.request.user.is_superuser:
            if (
                    self.request.profile != document.created_by
            ):  # or (self.request.profile not in document.shared_to.all()):
                return Response(
                    {
                        "error": True,
                        "errors": "You do not have Permission to perform this action",
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
        document.delete()
        return Response(
            {"error": False, "message": "Document deleted Successfully"},
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        tags=["documents"], parameters=swagger_params1.organization_params, request=DocumentEditSwaggerSerializer
    )
    def put(self, request, pk, format=None):
        self.object = self.get_object(pk)
        params = request.data
        if not self.object:
            return Response(
                {"error": True, "errors": "Document does not exist"},
                status=status.HTTP_403_FORBIDDEN,
            )
        if self.object.org != self.request.profile.org:
            return Response(
                {"error": True, "errors": "User company doesnot match with header...."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if self.request.profile.role.name != "ADMIN" and not self.request.user.is_superuser:
            if not (
                    (self.request.profile == self.object.created_by)
                    or (self.request.profile in self.object.shared_to.all())
            ):
                return Response(
                    {
                        "error": True,
                        "errors": "You do not have Permission to perform this action",
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
        serializer = DocumentCreateSerializer(
            data=params, instance=self.object, request_obj=request
        )
        if serializer.is_valid():
            doc = serializer.save(
                document_file=request.FILES.get("document_file"),
                status=params.get("status"),
                org=request.profile.org,
            )
            doc.shared_to.clear()
            if params.get("shared_to"):
                assinged_to_list = params.get("shared_to")
                profiles = Profile.objects.filter(
                    id__in=assinged_to_list, org=request.profile.org, is_active=True
                )
                if profiles:
                    doc.shared_to.add(*profiles)

            doc.teams.clear()
            if params.get("teams"):
                teams_list = params.get("teams")
                teams = Teams.objects.filter(
                    id__in=teams_list, org=request.profile.org)
                if teams:
                    doc.teams.add(*teams)
            return Response(
                {"error": False, "message": "Document Updated Successfully"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"error": True, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


class UserStatusView(APIView):
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        description="User Status View", parameters=swagger_params1.organization_params,
        request=UserUpdateStatusSwaggerSerializer
    )
    def post(self, request, pk, format=None):
        if self.request.profile.role.name != "ADMIN" and not self.request.user.is_superuser:
            return Response(
                {
                    "error": True,
                    "errors": "You do not have permission to perform this action",
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        params = request.data
        profiles = Profile.objects.filter(org=request.profile.org)
        profile = profiles.get(id=pk)

        if params.get("status"):
            user_status = params.get("status")
            if user_status == "Active":
                profile.is_active = True
            elif user_status == "Inactive":
                profile.is_active = False
            else:
                return Response(
                    {"error": True, "errors": "Please enter Valid Status for user"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            profile.save()

        context = {}
        active_profiles = profiles.filter(is_active=True)
        inactive_profiles = profiles.filter(is_active=False)
        context["active_profiles"] = ProfileSerializer(
            active_profiles, many=True).data
        context["inactive_profiles"] = ProfileSerializer(
            inactive_profiles, many=True
        ).data
        return Response(context)


class DomainList(APIView):
    model = APISettings
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        tags=["Settings"], parameters=swagger_params1.organization_params
    )
    def get(self, request, *args, **kwargs):
        api_settings = APISettings.objects.filter(org=request.profile.org)
        users = Profile.objects.filter(is_active=True, org=request.profile.org).order_by(
            "user__email"
        )
        return Response(
            {
                "error": False,
                "api_settings": APISettingsListSerializer(api_settings, many=True).data,
                "users": ProfileSerializer(users, many=True).data,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        tags=["Settings"], parameters=swagger_params1.organization_params, request=APISettingsSwaggerSerializer
    )
    def post(self, request, *args, **kwargs):
        params = request.data
        assign_to_list = []
        if params.get("lead_assigned_to"):
            assign_to_list = params.get("lead_assigned_to")
        serializer = APISettingsSerializer(data=params)
        if serializer.is_valid():
            settings_obj = serializer.save(
                created_by=request.profile.user, org=request.profile.org)
            if params.get("tags"):
                tags = params.get("tags")
                for tag in tags:
                    tag_obj = Tags.objects.filter(name=tag).first()
                    if not tag_obj:
                        tag_obj = Tags.objects.create(name=tag)
                    settings_obj.tags.add(tag_obj)
            if assign_to_list:
                settings_obj.lead_assigned_to.add(*assign_to_list)
            return Response(
                {"error": False, "message": "API key added sucessfully"},
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"error": True, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


class DomainDetailView(APIView):
    model = APISettings
    # authentication_classes = (CustomDualAuthentication,)
    permission_classes = (IsAuthenticated,)

    @extend_schema(
        tags=["Settings"], parameters=swagger_params1.organization_params
    )
    def get(self, request, pk, format=None):
        api_setting = self.get_object(pk)
        return Response(
            {"error": False, "domain": APISettingsListSerializer(
                api_setting).data},
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        tags=["Settings"], parameters=swagger_params1.organization_params, request=APISettingsSwaggerSerializer
    )
    def put(self, request, pk, **kwargs):
        api_setting = self.get_object(pk)
        params = request.data
        assign_to_list = []
        if params.get("lead_assigned_to"):
            assign_to_list = params.get("lead_assigned_to")
        serializer = APISettingsSerializer(data=params, instance=api_setting)
        if serializer.is_valid():
            api_setting = serializer.save()
            api_setting.tags.clear()
            api_setting.lead_assigned_to.clear()
            if params.get("tags"):
                tags = params.get("tags")
                for tag in tags:
                    tag_obj = Tags.objects.filter(name=tag).first()
                    if not tag_obj:
                        tag_obj = Tags.objects.create(name=tag)
                    api_setting.tags.add(tag_obj)
            if assign_to_list:
                api_setting.lead_assigned_to.add(*assign_to_list)
            return Response(
                {"error": False, "message": "API setting Updated sucessfully"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"error": True, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @extend_schema(
        tags=["Settings"], parameters=swagger_params1.organization_params
    )
    def delete(self, request, pk, **kwargs):
        api_setting = self.get_object(pk)
        if api_setting:
            api_setting.delete()
        return Response(
            {"error": False, "message": "API setting deleted sucessfully"},
            status=status.HTTP_200_OK,
        )


class GoogleLoginView(APIView):
    """
    Check for authentication with google
    post:
        Returns token of logged In user
    """

    @extend_schema(
        description="Login through Google", request=SocialLoginSerializer,
    )
    def post(self, request):
        payload = {'access_token': request.data.get(
            "token")}  # validate the token
        r = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo', params=payload)
        data = json.loads(r.text)
        print(data)
        if 'error' in data:
            content = {
                'message': 'wrong google token / this google token is already expired.'}
            return Response(content)
        # create user if not exist
        try:
            user = User.objects.get(email=data['email'])
            profile = Profile.objects.filter(user=user).first()
            if profile and profile.org and not profile.org.google_auth_enabled:
                return Response(
                    {"error": True, "message": "Google login is disabled for this organization."},
                    status=status.HTTP_403_FORBIDDEN
                )
        except User.DoesNotExist:
            user = User()
            user.email = data['email']
            user.profile_pic = data['picture']
            # provider random default password
            user.password = make_password(
                BaseUserManager().make_random_password())
            user.email = data['email']
            user.save()
        # generate token without username & password
        token = RefreshToken.for_user(user)
        response = {}
        response['username'] = user.email
        response['access_token'] = str(token.access_token)
        response['refresh_token'] = str(token)
        response['user_id'] = user.id
        return Response(response)


class ValidateTokenView(APIView):
    def get(self, request, activation_key):
        user = get_object_or_404(User, activation_key=activation_key)
        # Check if the token has expired
        if user.key_expires < timezone.now():
            return Response({"error": True, "message": "Token expired"}, status=status.HTTP_400_BAD_REQUEST)
        # Token is valid
        return Response({"error": False, "message": "Token is valid", "token": activation_key}, status=status.HTTP_200_OK)


@extend_schema(request=PasswordSetupSerializer)
class PasswordSetupView(APIView):
    def post(self, request, activation_key):
        # Validate the incoming request data
        serializer = PasswordSetupSerializer(data=request.data)
        if serializer.is_valid():  # If data is valid
            # Access the validated password
            new_password = serializer.validated_data['password']

            # Fetch the user by activation_key
            user = get_object_or_404(User, activation_key=activation_key)

            # Confirm token is still valid
            if user.key_expires < timezone.now():
                return Response({"error": True, "message": "Token expired"}, status=status.HTTP_400_BAD_REQUEST)

            # Set the new password for the user and activate the account
            user.password = make_password(new_password)  # Set hashed password
            user.is_active = True  # Activate the user
            user.save()

            # Invalidate the token
            user.activation_key = None
            user.key_expires = None
            user.save()

            # Create JWT tokens for the user
            refresh = RefreshToken.for_user(user)

            # Return the tokens to the frontend
            return Response({
                "error": False,
                "message": "Password set successfully",
                "refresh": str(refresh),
                # This is the access token
                "access": str(refresh.access_token),
            }, status=status.HTTP_200_OK)

        # If validation fails, return the errors
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(request=UserRegistrationSerializer)
class UserRegistrationView(APIView):
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            user.is_active = False
            user.save()
            try:
                send_email_to_new_user(user.id)
            except Exception as e:
                user.delete()
                return Response({"error": "Failed to send verification email. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            return Response({"message": "User registered successfully. Please verify your email."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailForRegistrationView(APIView):
    def get(self, request, activation_key):
        if not activation_key:
            return Response({"error": True, "message": "Activation key is missing"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = get_object_or_404(User, activation_key=activation_key)
        except ObjectDoesNotExist:
            return Response({"error": True, "message": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": True, "message": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if user.key_expires < timezone.now():
            return Response({"error": True, "message": "Token expired"}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = True
        user.activation_key = None
        user.key_expires = None
        user.save()

        refresh = RefreshToken.for_user(user)
        tokens = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

        return Response(
            {
                "message": "Email verified successfully",
                "access_token": tokens['access'],
                "refresh_token": tokens['refresh'],
                "user_id": user.id,
            },
            status=status.HTTP_200_OK
        )


class UnreadNotificationsView(APIView):
    def get(self, request):
        # Fetch unread notifications for the authenticated user
        user_id = self.request.user.id
        profile = Profile.objects.get(user_id=user_id)
        notifications = Notification.objects.filter(profile=profile, is_read=False).order_by('-created_at')
        serializer = NotificationSerializer(notifications, many=True)
        return Response({
            "unread_count": notifications.count(),
            "notifications": serializer.data
        })

class MarkNotificationAsReadView(APIView):
    def post(self, request, pk):
        # Mark the specified notification as read
        user_id = self.request.user.id
        profile = Profile.objects.get(user_id=user_id)
        try:
            notification = Notification.objects.get(id=pk, profile=profile)
            notification.is_read = True
            notification.save()
            return Response({"success": True})
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found"}, status=404)
        
class UserNotificationsView(APIView):
    def get(self, request):
        # Fetch all notifications for the authenticated user
        user_id = self.request.user.id
        profile = Profile.objects.get(user_id=user_id)
        notifications = Notification.objects.filter(profile=profile).order_by('-created_at')
        serializer = NotificationSerializer(notifications, many=True)
        return Response({
            "notifications": serializer.data
        })


@extend_schema_view(list=extend_schema(parameters=swagger_params1.permissions_params))
class PermissionsViewSet(help_views.OrgViewSet):
    permission_classes = (crm_roles(["ADMIN"]),)
    serializer_class = PermissionSerializer
    queryset = Permission.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()

        module_id = self.request.GET.get('module_id', None)  # Fetch the 'module_id' query parameter
        if module_id:
            # Filter permissions by the module id
            queryset = queryset.filter(module__id=module_id)

        return queryset


class ModulesListView(APIView):
    permission_classes = (crm_roles("ADMIN"),)

    @extend_schema(parameters=[swagger_params1.organization_params_in_header])
    def get(self, request, *args, **kwargs):
        org_header = request.headers.get("org")
        org_id = str(request.profile.org.id)

        if request.user.is_superuser:
            modules = Module.objects.all()
        elif not request.user.is_superuser and org_id == org_header:
            modules = Module.objects.filter(org__id=org_id).all()
        else:
            return Response(
                {"error": True, "errors": "You don't have permissions to perform this action!"},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = ModuleSerializer(modules, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RolesViewSet(help_views.OrgViewSet):
    permission_classes = (crm_permissions(
        list='list_roles', get='get_roles', post='add_roles',
        put='edit_roles', patch='edit_roles', delete='delete_roles'),
    )
    queryset = Role.objects.all()
    serializer_class = RoleSerializer

    @extend_schema(parameters=swagger_params1.organization_params)
    def create(self, request, *args, **kwargs):
        serializer = RoleInputSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        response_serializer = RoleSerializer(instance=serializer.instance,
                                             context=self.get_serializer_context(),
                                             include_permissions=True)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(parameters=swagger_params1.organization_params)
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = RoleInputSerializer(instance=instance, data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        response_serializer = RoleSerializer(instance=serializer.instance,
                                             context=self.get_serializer_context(),
                                             include_permissions=True)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    @extend_schema(parameters=[
        OpenApiParameter("include_permissions",
                         type=bool,
                         location=OpenApiParameter.QUERY,
                         description='Include the array of permissions',
                         required=False),
        swagger_params1.organization_params_in_header
    ])
    def list(self, request, *args, **kwargs):
        include_permissions = request.query_params.get('include_permissions', None)
        if include_permissions is not None:
            include_permissions = include_permissions.lower() in ['true', '1', 't']
        role_serializer = RoleSerializer(self.get_queryset(), many=True, include_permissions=include_permissions)
        return Response(role_serializer.data)
