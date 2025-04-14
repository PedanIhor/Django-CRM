from rest_framework import serializers

from common.models import Profile, User
from accounts.models import Account, Tags
from common.serializer import (
    AttachmentsSerializer,
    LeadCommentSerializer,
    OrganizationSerializer,
    ProfileSerializer,
    UserSerializer,
)
from contacts.serializer import ContactSerializer
from leads.models import Lead
from teams.serializer import TeamsSerializer


class TagsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tags
        fields = ("id", "name", "slug")


class LeadSerializer(serializers.ModelSerializer):
    contacts = ContactSerializer(read_only=True, many=True)
    assigned_to = ProfileSerializer(read_only=True, many=True)
    created_by = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    country = serializers.SerializerMethodField()
    tags = TagsSerializer(read_only=True, many=True)
    lead_attachment = AttachmentsSerializer(read_only=True, many=True)
    teams = TeamsSerializer(read_only=True, many=True)
    lead_comments = LeadCommentSerializer(read_only=True, many=True)

    def get_country(self, obj):
        return obj.get_country_display()

    class Meta:
        model = Lead
        # fields = ‘__all__’
        fields = (
            "id",
            "title",
            "first_name",
            "last_name",
            "phone",
            "email",
            "status",
            "source",
            "address_line",
            "contacts",
            "street",
            "city",
            "state",
            "postcode",
            "country",
            "website",
            "description",
            "lead_attachment",
            "lead_comments",
            "assigned_to",
            "opportunity_amount",
            "created_by",
            "created_at",
            "is_active",
            "enquiry_type",
            "tags",
            "created_from_site",
            "teams",
            "skype_ID",
            "industry",
            "organization",
            "probability",
            "close_date",
        )


class LeadCreateSerializer(serializers.ModelSerializer):
    assigned_to = serializers.ListField(required=False)
    contacts = serializers.ListField(required=False)
    tags = serializers.ListField(required=False)
    org = serializers.CharField(required=False)

    def __init__(self, *args, **kwargs):
        request_obj = kwargs.pop("request_obj", None)
        org = kwargs.pop("org", None)
        super(LeadCreateSerializer, self).__init__(*args, **kwargs)
        self.org = org
        self.request_obj = request_obj

        self.fields["title"].required = True
        self.fields["phone"].required = False
        self.fields["email"].required = False
        self.fields["status"].required = False
        self.fields["source"].required = False
        self.fields["website"].required = False
        self.fields["description"].required = False
        self.fields["opportunity_amount"].required = False

    def validate_org(self, org):
        if org:
            org = str(org)
            return org
        return None

    class Meta:
        model = Lead
        fields = (
            "title",
            "phone",
            "email",
            "status",
            "source",
            "website",
            "description",
            "opportunity_amount",
            "organization",
            "probability",
            "close_date",
            "assigned_to",
            "contacts",
            "tags",
            "industry",
            "skype_ID",
            "org",
        )


class LeadCreateSwaggerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = ["title","first_name","last_name","phone","email","lead_attachment","opportunity_amount","website",
                "description","teams","assigned_to","contacts","status","source","address_line","street","city","state","postcode",
                "country","tags","probability","industry","skype_ID"]


class CreateLeadFromSiteSwaggerSerializer(serializers.Serializer):
    apikey=serializers.CharField()
    title=serializers.CharField()
    first_name=serializers.CharField()
    last_name=serializers.CharField()
    phone=serializers.CharField()
    email=serializers.CharField()
    source=serializers.CharField()
    description=serializers.CharField()


class LeadDetailEditSwaggerSerializer(serializers.Serializer):
    comment = serializers.CharField()
    lead_attachment = serializers.FileField()

class LeadCommentEditSwaggerSerializer(serializers.Serializer):
    comment = serializers.CharField()

class LeadUploadSwaggerSerializer(serializers.Serializer):
    leads_file = serializers.FileField()

class LeadUpdateStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = ["status"]

class LeadCardViewSerializer(serializers.ModelSerializer):
    profile_pics = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            "id",
            "title",
            "country",
            "opportunity_amount",
            "probability",
            "profile_pics",  # Renamed for clarity, now returns a list
        ]

    def get_profile_pics(self, obj):
        """
        Get profile pictures of all assigned users.
        """
        if obj.assigned_profiles:
            return [
                profile.user.profile_pic
                for profile in obj.assigned_profiles
                if profile.user and profile.user.profile_pic
            ]
        return []

