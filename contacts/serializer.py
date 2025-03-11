from rest_framework import serializers

from common.serializer import (
    AttachmentsSerializer,
    BillingAddressSerializer,
    UserSerializer,
    OrganizationSerializer,
    ProfileSerializer,
)
from contacts.models import Contact
from teams.serializer import TeamsSerializer
from accounts.serializer import AccountSerializer

class ContactSerializer(serializers.ModelSerializer):
    # teams = TeamsSerializer(read_only=True, many=True)
    address = BillingAddressSerializer(read_only=True)
    account = AccountSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    # get_team_users = ProfileSerializer(read_only=True, many=True)
    # contact_attachment = AttachmentsSerializer(read_only=True, many=True)
    # org = OrganizationSerializer()
    country = serializers.SerializerMethodField()

    def get_country(self, obj):
        return obj.get_country_display()

    class Meta:
        model = Contact
        fields = (
            "id",
            "salutation",
            "first_name",
            "last_name",
            "title",
            "primary_email",
            "secondary_email",
            "mobile_number",
            "secondary_number",
            "department",
            "country",
            "language",
            "do_not_call",
            "address",
            "description",
            "linked_in_url",
            "facebook_url",
            "twitter_username",
            "contact_attachment",
            "created_by",
            "created_at",
            "is_active",
            "teams",
            "created_on_arrow",
            "get_team_users",
            "type",
            "account",
        )


class CreateContactSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        request_obj = kwargs.pop("request_obj", None)
        super().__init__(*args, **kwargs)
        if request_obj:
            self.org = request_obj.profile.org

    def validate(self, data):
        if data.get('type') == 'corporate' and not data.get('account'):
            raise serializers.ValidationError("Corporate contacts must have an account.")
        if data.get('type') == 'individual':
            data['account'] = None
            data['title'] = None
            data['department'] = None
        return data

    class Meta:
        model = Contact
        fields = (
            "salutation",
            "first_name",
            "last_name",
            "title",
            "primary_email",
            "secondary_email",
            "mobile_number",
            "secondary_number",
            "department",
            "country",
            "language",
            "do_not_call",
            "address",
            "description",
            "linked_in_url",
            "facebook_url",
            "twitter_username",
            "type",
            "account",
        )


class ContactDetailEditSwaggerSerializer(serializers.Serializer):
    comment = serializers.CharField()
    contact_attachment = serializers.FileField()

class ContactCommentEditSwaggerSerializer(serializers.Serializer):
    comment = serializers.CharField()
