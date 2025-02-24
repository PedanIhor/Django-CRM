import arrow
from django.db import models
from django.utils.translation import gettext_lazy as _
from phonenumber_field.modelfields import PhoneNumberField

from common.models import Address, Org, Profile
from common.base import BaseModel
from common.utils import COUNTRIES
from teams.models import Teams


class Contact(BaseModel):
    salutation = models.CharField(
        _("Salutation"), max_length=255, default="", blank=True
    )
    first_name = models.CharField(_("First name"), max_length=255)
    last_name = models.CharField(_("Last name"), max_length=255)
    title = models.CharField(_("Title"), max_length=255, default="", blank=True)
    primary_email = models.EmailField(unique=True)
    secondary_email = models.EmailField(default="", blank=True)
    mobile_number = PhoneNumberField(null=True, blank=True, unique=True)
    secondary_number = PhoneNumberField(null=True, blank=True, unique=True)
    department = models.CharField(_("Department"), max_length=255, blank=True)
    language = models.CharField(_("Language"), max_length=255, blank=True)
    do_not_call = models.BooleanField(default=False)
    address = models.ForeignKey(
        Address,
        related_name="address_contacts",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )
    description = models.TextField(blank=True)
    linked_in_url = models.URLField(blank=True, unique=True)
    facebook_url = models.URLField(blank=True, unique=True)
    twitter_username = models.CharField(max_length=255, blank=True, unique=True)
    # created_by = models.ForeignKey(
    #     Profile, related_name="contact_created_by", on_delete=models.SET_NULL, null=True
    # )
    is_active = models.BooleanField(default=False)
    teams = models.ManyToManyField(Teams, related_name="contact_teams")
    org = models.ForeignKey(Org, on_delete=models.SET_NULL, null=True, blank=True)
    country = models.CharField(max_length=3, choices=COUNTRIES, blank=True)
    account = models.ForeignKey(
        "accounts.Account", related_name="contacts", on_delete=models.CASCADE
    )

    TYPE_CHOICES = [
        ("individual", "Individual"),
        ("corporate", "Corporate"),
    ]

    type = models.CharField(
        max_length=10, choices=TYPE_CHOICES, default="individual"
    )

    class Meta:
        verbose_name = "Contact"
        verbose_name_plural = "Contacts"
        db_table = "contacts"
        ordering = ("-created_at",)

    def __str__(self):
        return self.first_name

    @property
    def created_on_arrow(self):
        return arrow.get(self.created_at).humanize()
    
    @property
    def created_on(self):
        return self.created_at


    @property
    def get_team_users(self):
        team_user_ids = list(self.teams.values_list("users__id", flat=True))
        return Profile.objects.filter(id__in=team_user_ids)

    def save(self, *args, **kwargs):
        if self.type == "corporate" and not self.account:
            raise ValueError("Corporate contacts must have an account.")
        if self.type == "individual":
            self.account = None
        super().save(*args, **kwargs)
