from leads.serializer import LeadSerializer
from rest_framework import serializers

from accounts.models import Tags
from accounts.serializer import AccountSerializer
from common.serializer import AttachmentsSerializer, ProfileSerializer,UserSerializer
from common.models import Profile
from contacts.serializer import ContactSerializer
from opportunity.models import Opportunity
from teams.serializer import TeamsSerializer
from contacts.models import Contact


class TagsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tags
        fields = ("id", "name", "slug")


class OpportunitySerializer(serializers.ModelSerializer):
    closed_by = ProfileSerializer()
    created_by = UserSerializer()
    tags = TagsSerializer(read_only=True, many=True)
    assigned_to = ProfileSerializer(read_only=True, many=True)
    contacts = ContactSerializer(read_only=True, many=True)
    teams = TeamsSerializer(read_only=True, many=True)
    opportunity_attachment = AttachmentsSerializer(read_only=True, many=True)
    account = serializers.SerializerMethodField()

    def get_account(self, obj):
        # Get the first contact's account if available
        if obj.contacts.exists():
            contact = obj.contacts.first()
            if contact.account:
                return {
                    'id': contact.account.id,
                    'name': contact.account.name
                }
        return None

    class Meta:
        model = Opportunity
        # fields = 'all__'
        fields = (
            "id",
            "name",
            "stage",
            "currency",
            "amount",
            "probability",
            "contacts",
            "closed_by",
            "closed_on",
            "description",
            "assigned_to",
            "created_by",
            "created_at",
            "is_active",
            "tags",
            "opportunity_attachment",
            "teams",
            "created_on_arrow",
            "account",
            # "get_team_users",
            # "get_team_and_assigned_users",
            # "get_assigned_users_not_in_teams",
        )


class OpportunityCreateSerializer(serializers.ModelSerializer):
    probability = serializers.IntegerField(max_value=100)
    closed_on = serializers.DateField
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=Profile.objects.all(),
        many=True,
        required=True
    )
    contacts = serializers.PrimaryKeyRelatedField(
        queryset=Contact.objects.all(),
        many=True,
        required=False
    )

    def __init__(self, *args, **kwargs):
        request_obj = kwargs.pop("request_obj", None)
        super().__init__(*args, **kwargs)
        self.org = request_obj.profile.org
        if not self.instance:
            self.fields['contacts'].required = True

    def validate_name(self, name):
        if self.instance:
            if (
                Opportunity.objects.filter(name__iexact=name, org=self.org)
                .exclude(id=self.instance.id)
                .exists()
            ):
                raise serializers.ValidationError(
                    "Opportunity already exists with this name"
                )

        else:
            if Opportunity.objects.filter(name__iexact=name, org=self.org).exists():
                raise serializers.ValidationError(
                    "Opportunity already exists with this name"
                )
        return name

    def validate_lead(self, lead):
        if not lead:
            return lead

        # Check if lead belongs to the same organization
        if lead.org != self.org:
            raise serializers.ValidationError(
                "This lead does not belong to your organization"
            )

        # Check if lead is already associated with another opportunity
        # We don't need to exclude self.instance in this check when updating
        # because OneToOne field will handle that automatically
        if hasattr(lead, 'opportunity'):
            raise serializers.ValidationError(
                "This lead is already associated with another opportunity"
            )

        return lead

    def validate_assigned_to(self, assigned_to):
        if assigned_to:
            for profile in assigned_to:
                if profile.org != self.org:
                    raise serializers.ValidationError(
                        f"Profile {profile} does not belong to your organization"
                    )
        return assigned_to

    def validate_contacts(self, contacts):
        if contacts:
            # Check if all contacts belong to the same organization
            for contact in contacts:
                if contact.org != self.org:
                    raise serializers.ValidationError(
                        f"Contact {contact} does not belong to your organization"
                    )
            
            # Check if all contacts have the same type
            contact_types = set(contact.type for contact in contacts)
            if len(contact_types) > 1:
                raise serializers.ValidationError(
                    "All contacts must be of the same type (either all individual or all corporate)"
                )
            
            # If contacts are corporate, check if they belong to the same account
            if 'corporate' in contact_types:
                account_ids = set(contact.account.id for contact in contacts if contact.account)
                if len(account_ids) > 1:
                    raise serializers.ValidationError(
                        "All corporate contacts must belong to the same account"
                    )
                if None in account_ids:
                    raise serializers.ValidationError(
                        "Corporate contacts must have an associated account"
                    )
        
        return contacts

    class Meta:
        model = Opportunity
        fields = (
            "name",
            "stage",
            "currency",
            "amount",
            "probability",
            "closed_on",
            "description",
            "created_by",
            "created_at",
            "is_active",
            "created_on_arrow",
            "org",
            "lead",
            "assigned_to",
            "contacts",
            # "get_team_users",
            # "get_team_and_assigned_users",
            # "get_assigned_users_not_in_teams",
        )

class OpportunityCreateSwaggerSerializer(serializers.ModelSerializer):
    due_date = serializers.DateField()
    opportunity_attachment = serializers.FileField()
    class Meta:
        model = Opportunity
        fields = (
            "name",
            "account",
            "amount",
            "currency",
            "stage",
            "teams",
            "lead_source",
            "probability",
            "description",
            "assigned_to",
            "contacts",
            "due_date",
            "tags",
            "opportunity_attachment"
        )

class OpportunityDetailEditSwaggerSerializer(serializers.Serializer):
    comment = serializers.CharField()
    opportunity_attachment = serializers.FileField()

class OpportunityCommentEditSwaggerSerializer(serializers.Serializer):
    comment = serializers.CharField()


class OpportunityUpdateStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Opportunity
        fields = (
            "stage",
        )

class OpportunityCardViewSerializer(serializers.ModelSerializer):
    profile_pics = serializers.SerializerMethodField()
    stage = serializers.SerializerMethodField()

    class Meta:
        model = Opportunity
        fields = [
            "id",
            "name",
            "stage",
            "amount",
            "probability",
            "profile_pics",
        ]

    def get_profile_pics(self, obj):
        """Get profile pictures of all assigned users."""
        if hasattr(obj, 'assigned_profiles'):
            return [
                profile.user.profile_pic
                for profile in obj.assigned_profiles
                if profile.user and profile.user.profile_pic
            ]
        return []
    def get_stage(self, obj):
        """Map individual statuses to stages"""
        STAGE_MAPPING = {
            'QUALIFICATION': 'early_stage',
            'ID.DECISION MAKERS': 'early_stage',
            'NEEDS ANALYSIS': 'middle_stage',
            'PERCEPTION ANALYSIS': 'middle_stage',
            'VALUE PROPOSITION': 'middle_stage',
            'PROPOSAL/PRICE QUOTE': 'late_stage',
            'NEGOTIATION/REVIEW': 'late_stage',
            'CLOSED WON': 'final_stage',
            'CLOSED LOST': 'final_stage'
        }
        return STAGE_MAPPING.get(obj.stage, 'unknown')

