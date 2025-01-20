from rest_framework import serializers
from accounts.models import Account, AccountEmail, Tags, AccountEmailLog
from common.serializer import (
    AttachmentsSerializer,
    OrganizationSerializer,
    ProfileSerializer,
    UserSerializer
)

class TagsSerailizer(serializers.ModelSerializer):
    class Meta:
        model = Tags
        fields = ("id", "name", "slug")


class AccountSerializer(serializers.ModelSerializer):
    created_by = UserSerializer()
    org = OrganizationSerializer()
    tags = TagsSerailizer(read_only=True, many=True)
    account_attachment = AttachmentsSerializer(read_only=True, many=True)

    class Meta:
        model = Account
        # fields = ‘__all__’
        fields = (
            "id",
            "name",
            "email",
            "phone",
            "industry",
            "billing_address_line",
            "billing_street",
            "billing_city",
            "billing_state",
            "billing_postcode",
            "billing_country",
            "website",
            "description",
            "account_attachment",
            "created_by",
            "created_at",
            "is_active",
            "tags",
            "status",
            "org",
        )


class EmailSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    class Meta:
        model = AccountEmail
        fields = (
            "message_subject",
            "message_body",
            "timezone",
            "scheduled_date_time",
            "scheduled_later",
            "created_at",
            "from_email",
            "rendered_message_body",
        )

    def validate_message_body(self, message_body):
        count = 0
        for i in message_body:
            if i == "{":
                count += 1
            elif i == "}":
                count -= 1
            if count < 0:
                raise serializers.ValidationError(
                    "Brackets do not match, Enter valid tags."
                )
        if count != 0:
            raise serializers.ValidationError(
                "Brackets do not match, Enter valid tags."
            )
        return message_body


class EmailLogSerializer(serializers.ModelSerializer):
    email = EmailSerializer()

    class Meta:
        model = AccountEmailLog
        fields = ["email", "contact", "is_sent"]


class AccountReadSerializer(serializers.ModelSerializer):

    class Meta:
        model = Account
        fields = ["name", "billing_city", "tags"]

class AccountWriteSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = Account
        fields = ["name","phone", "email", "billing_address_line","billing_street","billing_city", "billing_state", "billing_postcode","billing_country", "tags","account_attachment", "website", "status"]


class AccountCreateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)
    phone = serializers.CharField(required=True)  # Adjust type if needed, e.g., PhoneNumberField
    billing_address_line = serializers.CharField(required=True)
    billing_street = serializers.CharField(required=True)
    billing_city = serializers.CharField(required=True)
    billing_state = serializers.CharField(required=True)
    billing_postcode = serializers.CharField(required=True)
    billing_country = serializers.CharField(required=True)
    def __init__(self, *args, **kwargs):        
        request_obj = kwargs.pop("request_obj", None)
        super().__init__(*args, **kwargs)
        self.org = request_obj.profile.org

    def validate_name(self, name):
        if self.instance:
            if self.instance.name != name:
                if not Account.objects.filter(name__iexact=name, org=self.org).exists():
                    return name
                raise serializers.ValidationError(
                    "Account already exists with this name"
                )
            return name
        if not Account.objects.filter(name__iexact=name, org=self.org).exists():
            return name
        raise serializers.ValidationError("Account already exists with this name")

    class Meta:
        model = Account
        fields = (
            "name",
            "phone",
            "email",
            "website",
            "industry",
            "description",
            "status",
            "billing_address_line",
            "billing_street",
            "billing_city",
            "billing_state",
            "billing_postcode",
            "billing_country",
        )

class AccountDetailEditSwaggerSerializer(serializers.Serializer):
    comment = serializers.CharField()
    account_attachment = serializers.FileField()

class AccountCommentEditSwaggerSerializer(serializers.Serializer):
    comment = serializers.CharField()

class EmailWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountEmail
        fields = ("from_email", "recipients", "message_subject","scheduled_later","timezone","scheduled_date_time","message_body")