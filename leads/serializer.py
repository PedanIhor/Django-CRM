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
from leads.models import Company, Lead
from teams.serializer import TeamsSerializer


class TagsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tags
        fields = ("id", "name", "slug")


class CompanySwaggerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ("name",)

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ("id", "name", "org")


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
            "company",
            "organization",
            "probability",
            "close_date",
        )


class LeadCreateSerializer(serializers.ModelSerializer):
    assigned_to = serializers.ListField(required=False)
    teams = serializers.ListField(required=False)
    contacts = serializers.ListField(required=False)
    tags = serializers.ListField(required=False)
    org = serializers.CharField(required=False)
    company = serializers.CharField(required=False, allow_null=True)

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
            "account_name",
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
            "teams",
            "tags",
            "company",
            "industry",
            "skype_ID",
            "org",
        )

    def create(self, validated_data):
        # ... create method if you have one ...
        pass

    def update(self, instance, validated_data):
        instance.title = validated_data.get('title', instance.title)
        instance.account_name = validated_data.get('account_name', instance.account_name)
        instance.phone = validated_data.get('phone', instance.phone)
        instance.email = validated_data.get('email', instance.email)
        instance.status = validated_data.get('status', instance.status)
        instance.source = validated_data.get('source', instance.source)
        instance.website = validated_data.get('website', instance.website)
        instance.description = validated_data.get('description', instance.description)
        instance.opportunity_amount = validated_data.get('opportunity_amount', instance.opportunity_amount)
        instance.skype_ID = validated_data.get('skype_ID', instance.skype_ID)
        instance.industry = validated_data.get('industry', instance.industry)
        instance.probability = validated_data.get('probability', instance.probability)

        # Handle company field
        company_name = validated_data.get('company')
        if company_name is None:
            instance.company = None
        else:
            try:
                company = Company.objects.filter(name=company_name).first()
                instance.company = company
            except Exception:
                instance.company = None

        # Handle assigned_to - extract IDs from the profile objects
        if 'assigned_to' in validated_data:
            assigned_to_ids = []
            for profile in validated_data['assigned_to']:
                if isinstance(profile, dict):
                    assigned_to_ids.append(profile.get('id'))
                else:
                    assigned_to_ids.append(profile)
            instance.assigned_to.set(assigned_to_ids)

        # Handle other many-to-many relationships
        if 'contacts' in validated_data:
            contact_ids = [c.get('id') if isinstance(c, dict) else c for c in validated_data['contacts']]
            instance.contacts.set(contact_ids)
        
        if 'teams' in validated_data:
            team_ids = [t.get('id') if isinstance(t, dict) else t for t in validated_data['teams']]
            instance.teams.set(team_ids)
        
        if 'tags' in validated_data:
            tag_ids = [t.get('id') if isinstance(t, dict) else t for t in validated_data['tags']]
            instance.tags.set(tag_ids)

        instance.save()
        return instance


class LeadCreateSwaggerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = ["title","first_name","last_name","account_name","phone","email","lead_attachment","opportunity_amount","website",
                "description","teams","assigned_to","contacts","status","source","address_line","street","city","state","postcode",
                "country","tags","company","probability","industry","skype_ID"]


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

