from drf_spectacular.utils import extend_schema_view, extend_schema
from rest_framework import viewsets
from common.swagger_params1 import organization_params
from django.core.exceptions import PermissionDenied

@extend_schema_view(
    list=extend_schema(parameters=organization_params),
    retrieve=extend_schema(parameters=organization_params),
    create=extend_schema(parameters=organization_params),
    update=extend_schema(parameters=organization_params),
    destroy=extend_schema(parameters=organization_params),
    partial_update=extend_schema(parameters=organization_params)
)
class OrgViewSet(viewsets.ModelViewSet):

    # This view set should be used for managing a model within an org.
    # It requires providing a header "org" containing an organization id, and then filters it's queryset.
    # Define a queryset property in children classes.
    # The maintained model must have ForeignKey relationship(one to many) to Org model under the "org" field.

    org_id: str

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.org_id:
            queryset = queryset.filter(org__id=self.org_id)
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['org_id'] = self.org_id
        return context

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            org_header = request.headers.get("org")
            org_id = str(request.profile.org.id)
            self.org_id = org_id
            if org_id != org_header:
                raise PermissionDenied("You don't have permissions to perform this action!")
        return super().dispatch(request, *args, **kwargs)
