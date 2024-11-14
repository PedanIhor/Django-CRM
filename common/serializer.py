from asyncore import write
from dataclasses import field
from email.message import EmailMessage
from importlib.metadata import requires
import re
from wsgiref import validate
from xml.dom import ValidationErr

from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from django.contrib.auth.password_validation import validate_password
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

from common.models import (
    Address,
    APISettings,
    Attachments,
    Comment,
    Document,
    Org,
    Profile,
    User,
    Role,
    Permission,
    Module
)


class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = (
            "id",
            "name"
        )

class PermissionSerializer(serializers.ModelSerializer):
    module = ModuleSerializer()
    class Meta:
        model = Permission
        fields = (
            "name",
            "module"
        )

class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True)
    class Meta:
        model = Role
        fields = (
            "name",
            "permissions"
        )

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Org
        fields = ("id", "name", "google_auth_enabled", "api_key")


class SocialLoginSerializer(serializers.Serializer):
    token = serializers.CharField()


class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = (
            "id",
            "comment",
            "commented_on",
            "commented_by",
            "account",
            "lead",
            "opportunity",
            "contact",
            "case",
            "task",
            "invoice",
            "event",
            "profile",
        )


class LeadCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = (
            "id",
            "comment",
            "commented_on",
            "commented_by",
            "lead",
        )


class OrgProfileCreateSerializer(serializers.ModelSerializer):
    """
    It is for creating organization
    """

    name = serializers.CharField(max_length=255)

    class Meta:
        model = Org
        fields = ["name"]
        extra_kwargs = {
            "name": {"required": True}
        }

    def validate_name(self, name):
        if bool(re.search(r"[~\!_.@#\$%\^&\*\ \(\)\+{}\":;'/\[\]]", name)):
            raise serializers.ValidationError(
                "organization name should not contain any special characters"
            )
        if Org.objects.filter(name=name).exists():
            raise serializers.ValidationError(
                "Organization already exists with this name"
            )
        return name


class ShowOrganizationListSerializer(serializers.ModelSerializer):
    """
    we are using it for show orjanization list
    """

    org = OrganizationSerializer()
    role = RoleSerializer()

    class Meta:
        model = Profile
        fields = (
            "role",
            "alternate_phone",
            "has_sales_access",
            "has_marketing_access",
            "is_organization_admin",
            "org",
        )


class BillingAddressSerializer(serializers.ModelSerializer):
    country = serializers.SerializerMethodField()

    def get_country(self, obj):
        return obj.get_country_display()

    class Meta:
        model = Address
        fields = ("address_line", "street", "city",
                  "state", "postcode", "country")

    def __init__(self, *args, **kwargs):
        account_view = kwargs.pop("account", False)

        super().__init__(*args, **kwargs)

        if account_view:
            self.fields["address_line"].required = True
            self.fields["street"].required = True
            self.fields["city"].required = True
            self.fields["state"].required = True
            self.fields["postcode"].required = True
            self.fields["country"].required = True


class CreateUserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = (
            "email",
            "profile_pic",
        )

    def __init__(self, *args, **kwargs):
        self.org = kwargs.pop("org", None)
        super().__init__(*args, **kwargs)
        self.fields["email"].required = True

    def validate_email(self, email):
        if self.instance:
            if self.instance.email != email:
                if not Profile.objects.filter(user__email=email, org=self.org).exists():
                    return email
                raise serializers.ValidationError("Email already exists")
            return email
        if not Profile.objects.filter(user__email=email.lower(), org=self.org).exists():
            return email
        raise serializers.ValidationError("Given Email id already exists")


class CreateProfileSerializer(serializers.ModelSerializer):
    role = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all())

    class Meta:
        model = Profile
        fields = (
            "role",
            "phone",
            "alternate_phone",
            "has_sales_access",
            "has_marketing_access",
            "is_organization_admin",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["alternate_phone"].required = False
        self.fields["role"].required = True
        self.fields["phone"].required = True


class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ["id", "email", "profile_pic"]


class ProfileSerializer(serializers.ModelSerializer):
    # address = BillingAddressSerializer()
    role = RoleSerializer()

    class Meta:
        model = Profile
        fields = (
            "id",
            "user_details",
            "role",
            "address",
            "has_marketing_access",
            "has_sales_access",
            "phone",
            "date_of_joining",
            "is_active",
        )


class AttachmentsSerializer(serializers.ModelSerializer):
    file_path = serializers.SerializerMethodField()

    def get_file_path(self, obj):
        if obj.attachment:
            return obj.attachment.url
        None

    class Meta:
        model = Attachments
        fields = ["id", "created_by", "file_name", "created_at", "file_path"]


class DocumentSerializer(serializers.ModelSerializer):
    shared_to = ProfileSerializer(read_only=True, many=True)
    teams = serializers.SerializerMethodField()
    created_by = UserSerializer()
    org = OrganizationSerializer()

    def get_teams(self, obj):
        return obj.teams.all().values()

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "document_file",
            "status",
            "shared_to",
            "teams",
            "created_at",
            "created_by",
            "org",
        ]


class DocumentCreateSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        request_obj = kwargs.pop("request_obj", None)
        super().__init__(*args, **kwargs)
        self.fields["title"].required = True
        self.org = request_obj.profile.org

    def validate_title(self, title):
        if self.instance:
            if (
                Document.objects.filter(title__iexact=title, org=self.org)
                .exclude(id=self.instance.id)
                .exists()
            ):
                raise serializers.ValidationError(
                    "Document with this Title already exists"
                )
        if Document.objects.filter(title__iexact=title, org=self.org).exists():
            raise serializers.ValidationError(
                "Document with this Title already exists")
        return title

    class Meta:
        model = Document
        fields = ["title", "document_file", "status", "org"]


def find_urls(string):
    # website_regex = "^((http|https)://)?([A-Za-z0-9.-]+\.[A-Za-z]{2,63})?$"  # (http(s)://)google.com or google.com
    # website_regex = "^https?://([A-Za-z0-9.-]+\.[A-Za-z]{2,63})?$"  # (http(s)://)google.com
    # http(s)://google.com
    website_regex = "^https?://[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$"
    # http(s)://google.com:8000
    website_regex_port = "^https?://[A-Za-z0-9.-]+\.[A-Za-z]{2,63}:[0-9]{2,4}$"
    url = re.findall(website_regex, string)
    url_port = re.findall(website_regex_port, string)
    if url and url[0] != "":
        return url
    return url_port


class APISettingsSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    class Meta:
        model = APISettings
        fields = ("title", "website")

    def validate_website(self, website):
        if website and not (
            website.startswith("http://") or website.startswith("https://")
        ):
            raise serializers.ValidationError("Please provide valid schema")
        if not len(find_urls(website)) > 0:
            raise serializers.ValidationError(
                "Please provide a valid URL with schema and without trailing slash - Example: http://google.com"
            )
        return website


class APISettingsListSerializer(serializers.ModelSerializer):
    created_by = UserSerializer()
    lead_assigned_to = ProfileSerializer(read_only=True, many=True)
    tags = serializers.SerializerMethodField()
    org = OrganizationSerializer()

    def get_tags(self, obj):
        return obj.tags.all().values()

    class Meta:
        model = APISettings
        fields = [
            "title",
            "apikey",
            "website",
            "created_at",
            "created_by",
            "lead_assigned_to",
            "tags",
            "org",
        ]


class APISettingsSwaggerSerializer(serializers.ModelSerializer):
    class Meta:
        model = APISettings
        fields = [
            "title",
            "website",
            "lead_assigned_to",
            "tags",
        ]


class DocumentCreateSwaggerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            "title",
            "document_file",
            "teams",
            "shared_to",
        ]


class DocumentEditSwaggerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            "title",
            "document_file",
            "teams",
            "shared_to",
            "status"
        ]


class UserCreateSwaggerSerializer(serializers.Serializer):
    """
    It is swagger for creating or updating user
    """
    ROLE_CHOICES = ["ADMIN", "USER"]

    email = serializers.CharField(max_length=1000, required=True)
    role = serializers.ChoiceField(choices=ROLE_CHOICES, required=True)
    phone = serializers.CharField(max_length=12)
    alternate_phone = serializers.CharField(max_length=12)
    address_line = serializers.CharField(max_length=10000, required=True)
    street = serializers.CharField(max_length=1000)
    city = serializers.CharField(max_length=1000)
    state = serializers.CharField(max_length=1000)
    pincode = serializers.CharField(max_length=1000)
    country = serializers.CharField(max_length=1000)


class UserPatchSwaggerSerializer(serializers.Serializer):
    """
    It is swagger for patching user
    """
    ROLE_CHOICES = ["ADMIN", "USER"]

    email = serializers.CharField(
        max_length=1000, required=False, default=None, allow_blank=True)
    role = serializers.ChoiceField(
        choices=ROLE_CHOICES, required=False, default=None, allow_blank=True)
    phone = serializers.CharField(
        max_length=12, required=False, default=None, allow_blank=True)
    alternate_phone = serializers.CharField(
        max_length=12, required=False, default=None, allow_blank=True)
    address_line = serializers.CharField(
        max_length=10000, required=False, default=None, allow_blank=True)
    street = serializers.CharField(
        max_length=1000, required=False, default=None, allow_blank=True)
    city = serializers.CharField(
        max_length=1000, required=False, default=None, allow_blank=True)
    state = serializers.CharField(
        max_length=1000, required=False, default=None, allow_blank=True)
    pincode = serializers.CharField(
        max_length=1000, required=False, default=None, allow_blank=True)
    country = serializers.CharField(
        max_length=1000, required=False, default=None, allow_blank=True)


class UserUpdateStatusSwaggerSerializer(serializers.Serializer):

    STATUS_CHOICES = ["Active", "Inactive"]


    status = serializers.ChoiceField(choices = STATUS_CHOICES,required=True)

class PasswordSetupSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)



class UserRegistrationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        label="Confirm Password"
    )

    class Meta:
        model = User
        fields = ("email", "password", "password2")
        
    def validate_email(self, email):
        try:
            validate_email(email)
        except ValidationError:
            raise serializers.ValidationError("Invalid e-mail format.")
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("This e-mail is already registered")
        return email
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )

        if not re.search(r"[A-Z]", attrs['password']):
            raise ValidationError(
                "Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", attrs['password']):
            raise ValidationError(
                "Password must contain at least one lowercase letter.")
        if not re.search(r"\d", attrs['password']):
            raise ValidationError("Password must contain at least one digit.")
        if not re.search(r"[@$!%*?&.]", attrs['password']):
            raise ValidationError(
                "Password must contain at least one special character (@, $, !, %, *, ?, &, .).")
        return attrs
    
    def create(self, validated_data):
        email = validated_data['email'].lower()
        password = validated_data['password']
        
    # Create the user but no activate it yet
        user = User.objects.create(
            email=email,
            is_active=False # User will be inactive until email is verified.
        )    
        user.set_password(password)
        user.save()
        return user