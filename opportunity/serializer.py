from leads.serializer import LeadSerializer
from rest_framework import serializers

from accounts.models import Tags
from accounts.serializer import AccountSerializer
from common.serializer import AttachmentsSerializer, ProfileSerializer,UserSerializer
from contacts.serializer import ContactSerializer
from opportunity.models import Opportunity
from teams.serializer import TeamsSerializer


class TagsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tags
        fields = ("id", "name", "slug")


class OpportunitySerializer(serializers.ModelSerializer):
    account = AccountSerializer()
    closed_by = ProfileSerializer()
    created_by = UserSerializer()
    tags = TagsSerializer(read_only=True, many=True)
    assigned_to = ProfileSerializer(read_only=True, many=True)
    contacts = ContactSerializer(read_only=True, many=True)
    teams = TeamsSerializer(read_only=True, many=True)
    opportunity_attachment = AttachmentsSerializer(read_only=True, many=True)

    class Meta:
        model = Opportunity
        # fields = 'all__'
        fields = (
            "id",
            "name",
            "stage",
            "currency",
            "amount",
            "lead_source",
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

    def __init__(self, *args, **kwargs):
        request_obj = kwargs.pop("request_obj", None)
        super().__init__(*args, **kwargs)
        self.org = request_obj.profile.org

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

