"""
Tests for the Leads API.
"""

from django.test import TestCase
from django.urls import reverse
import json

from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from help_tools import db_tests_dump

from common.models import (
    Org,
    Profile,
    User,
)
from leads.models import Lead
from contacts.models import Contact

from unittest.mock import patch


LEADS_URL = reverse("common_urls:api_leads:lead-list")

LIST_RESPONSE_KEYS = {
    "open_leads": {
        "leads_count": 0,
        "open_leads": [],
        "offset": 0,
        "limit": 0,
    },
    "close_leads": {
        "leads_count": 0,
        "close_leads": [],
        "offset": 0,
        "limit": 0,
    },
    "contacts": [],
    "status": [],
    "source": [],
    "tags": [],
    "users": [],
    "countries": [],
    "industries": [],
}

GET_RESPONSE_KEYS = {
    "lead_obj": {},
    "attachments": [],
    "comments":[],
    "assigned_data": [],
    "teams": [],
    "contacts": [],
    "status": [],
    "source": [],
    "users": [],
    "countries": [],
    "industries": [],
}

POST_REQUEST_PAYLOAD = {
   "title":"Test Lead Title CEO",
   "first_name":"Test",
   "last_name":"Contact",
   "phone":"+911234567899",
   "email":"contact_email@test.com",
   "lead_attachment":None,
   "opportunity_amount":"99999",
   "website":"https://random-site.com",
   "description":"",
   "teams":"",
   "assigned_to":[],
   "contacts":[],
   "status":"assigned",
   "source":"call",
   "address_line":"144 Testable str., Testad, Netherlands",
   "street":"Testable str.",
   "city":"Testad",
   "state":"North Holland",
   "postcode":"77777",
   "country":"NL",
   "tags":[],
   "company":"",
   "probability":"60",
   "industry":"ADVERTISING",
   "skype_ID":"any-skype"
}


class PublicLeadsAPITests(TestCase):
    """Test the public features of the leads API."""

    def setUp(self):
        self.client = APIClient()

        # Create an organization with a bunch of users, contacts, teams and adresses
        self.org = db_tests_dump.create_test_org()

        self.admin = User.objects.get(profile__role__name="ADMIN", profile__org=self.org)
        self.sales_manager = User.objects.get(profile__org=self.org, email="user1@test.com")

        # Set the headers for the requests
        self.headers = {
            "org": str(self.org.id),
        }

        # Mock the current user with a sales manager to make all the leads created_by equal to the sales_manager
        patcher = patch("common.base.get_current_user", return_value=self.sales_manager)
        self.mock_get_current_user = patcher.start()

        # Create 100 leads
        db_tests_dump.fill_leads(self.org, 100) # 20 must be converted leads

        # Stop mocking the current user
        patcher.stop()

    def retrieve_token_for_role(self, role_name: str):
        user = Profile.objects.get(org__id=self.org.id, role__name=role_name).user
        return self.retrieve_token_for_user(user)

    def retrieve_token_for_user(self, user: User):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def test_get_leads_list_org_not_provided(self):
        print("\n~~~~~~~~~~~~~ test_get_leads_list_org_not_provided ~~~~~~~~~~~~~~~")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_role("ADMIN"))
        res = self.client.get(LEADS_URL, headers={})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_leads_list_response_structure(self):
        print("\n~~~~~~~~~~~~~ test_get_leads_list_response_structure ~~~~~~~~~~~~~~~")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_role("ADMIN"))
        res = self.client.get(LEADS_URL, headers=self.headers)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(set(LIST_RESPONSE_KEYS.keys()), set(res.data.keys()), "Response keys are not as expected")

    def test_get_leads_list_filter_by_status(self):
        print("\n~~~~~~~~~~~~~ test_get_leads_list_filter_by_status ~~~~~~~~~~~~~~~")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_role("ADMIN"))
        res = self.client.get(LEADS_URL, headers=self.headers, data={"status": "open"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["status"], "open")
        self.assertEqual(res.data['close_leads']['close_leads'], [])
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(LEADS_URL, headers=self.headers, data={"status": "assigned"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["status"], "assigned")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(LEADS_URL, headers=self.headers, data={"status": "in process"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["status"], "in process")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(LEADS_URL, headers=self.headers, data={"status": "converted"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["status"], "converted")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(LEADS_URL, headers=self.headers, data={"status": "recycled"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["status"], "recycled")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(LEADS_URL, headers=self.headers, data={"status": "closed"})
        self.assertEqual(res.data["open_leads"]["open_leads"], [])
        for lead in res.data['close_leads']['close_leads']:
            self.assertEqual(lead["status"], "closed")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_get_leads_list_filter_by_source(self):
        print("\n~~~~~~~~~~~~~ test_get_leads_list_filter_by_source ~~~~~~~~~~~~~~~")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_role("ADMIN"))
        res = self.client.get(LEADS_URL, headers=self.headers, data={"source": "call"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["source"], "call")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(LEADS_URL, headers=self.headers, data={"source": "email"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["source"], "email")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(LEADS_URL, headers=self.headers, data={"source": "existing customer"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["source"], "existing customer")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(LEADS_URL, headers=self.headers, data={"source": "partner"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["source"], "partner")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(LEADS_URL, headers=self.headers, data={"source": "public relations"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["source"], "public relations")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(LEADS_URL, headers=self.headers, data={"source": "compaign"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["source"], "compaign")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(LEADS_URL, headers=self.headers, data={"source": "other"})
        for lead in res.data["open_leads"]["open_leads"]:
            self.assertEqual(lead["source"], "other")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_get_leads_list_pagination(self):
        print("\n~~~~~~~~~~~~~ test_get_leads_list_pagination ~~~~~~~~~~~~~~~")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_role("ADMIN"))
        db_open_leads = (Lead.objects
            .filter(org__id=self.org.id)
            .exclude(status='closed')
            .order_by("-id")
            .all()
        )

        def proceed_limit_offset(limit, offset):
            res = self.client.get(LEADS_URL, headers=self.headers, data={"limit": limit, "offset": offset})
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertEqual(db_open_leads.count(), res.data["open_leads"]["leads_count"])
            total_count = db_open_leads.count()

            if total_count - offset <= 0:
                exp_res_count = 0
            elif total_count - offset < limit:
                exp_res_count = total_count - offset
            else:
                exp_res_count = limit

            res_count = len(res.data["open_leads"]["open_leads"])
            self.assertEqual(res_count, exp_res_count, f"Returned leads count {res_count} is not as expected {exp_res_count}")
            paginated_leads_ids = [str(lead.id) for lead in db_open_leads[offset:offset+limit]]
            paginated_res_ids = [lead["id"] for lead in res.data["open_leads"]["open_leads"]]
            self.assertEqual(paginated_leads_ids, paginated_res_ids)

        proceed_limit_offset(10, 0)
        proceed_limit_offset(10, 10)
        proceed_limit_offset(10, 20)
        proceed_limit_offset(20, 0)
        proceed_limit_offset(20, 20)
        proceed_limit_offset(20, 40)
        proceed_limit_offset(30, 0)
        proceed_limit_offset(30, 30)
        proceed_limit_offset(30, 60)
        proceed_limit_offset(40, 0)
        proceed_limit_offset(40, 40)
        proceed_limit_offset(40, 80) # Zero result expected
        proceed_limit_offset(50, 150) # Out of bounds

    def test_get_leads_list_filter_by_assigned_user(self):
        print("\n~~~~~~~~~~~~~ test_get_leads_list_filter_by_assigned_user ~~~~~~~~~~~~~~~")
        user = User.objects.filter(profile__org__id=self.org.id, email="user3@test.com").first()
        user_leads = (
            Lead.objects
                .filter(org__id=self.org.id, assigned_to__user=user)
                .exclude(status="closed")
                .order_by("-id")
                .distinct()
                .all()
        )
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_user(user))
        res = self.client.get(LEADS_URL, headers=self.headers, data={"limit": 100, "offset": 0})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(user_leads), len(res.data["open_leads"]["open_leads"]))
        db_leads_ids = [str(lead.id) for lead in user_leads]
        res_leads_ids = [lead["id"] for lead in res.data["open_leads"]["open_leads"]]
        self.assertEqual(db_leads_ids, res_leads_ids)

    def test_post_leads_without_org(self):
        print("\n~~~~~~~~~~~~~ test_post_leads_without_org ~~~~~~~~~~~~~~~")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_user(self.sales_manager))
        payload = POST_REQUEST_PAYLOAD.copy()
        res = self.client.post(LEADS_URL, json.dumps(payload), headers={}, content_type="application/json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_post_leads(self):
        print("\n~~~~~~~~~~~~~ test_post_leads ~~~~~~~~~~~~~~~")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_user(self.sales_manager))

        payload = POST_REQUEST_PAYLOAD.copy()

        contact = Contact.objects.first()
        contacts = [str(contact.id)]
        payload["contacts"] = contacts

        assignees = [str(id) for id in list(Profile.objects.filter(user__email__in=["user3@test.com", "user4@test.com"]).all().values_list("id", flat=True))]
        payload["assigned_to"] = assignees

        res = self.client.post(LEADS_URL, json.dumps(payload), headers=self.headers, content_type="application/json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Lead.objects.count(), 101)
        lead = Lead.objects.filter(org__id=self.org.id, created_by_id=self.sales_manager.id).first()
        self.assertEqual(lead.title, "Test Lead Title CEO")
        self.assertEqual(lead.phone, "+911234567899")
        self.assertEqual(lead.email, "contact_email@test.com")
        self.assertEqual(lead.opportunity_amount, 99999)
        self.assertEqual(lead.website, "https://random-site.com")
        self.assertEqual(lead.description, "")
        self.assertEqual(lead.teams.count(), 0) # We do not have an user interface to assign a lead to a team for now
        lead_assignees_ids = {str(id) for id in list(lead.assigned_to.all().values_list("id", flat=True))}
        self.assertEqual(lead_assignees_ids, set(assignees))
        self.assertEqual(lead.contacts.all().count(), 1)
        self.assertEqual(lead.contacts.first().id, contact.id)
        self.assertEqual(lead.status, "assigned")
        self.assertEqual(lead.source, "call")
        self.assertEqual(lead.probability, 60)
        self.assertEqual(lead.industry, "ADVERTISING")
        self.assertEqual(lead.skype_ID, "any-skype")

    def test_get_lead_details_no_permission(self):
        print("\n~~~~~~~~~~~~~ test_get_lead_details_no_permission ~~~~~~~~~~~~~~~")
        user = User.objects.filter(profile__org__id=self.org.id, email="user5@test.com").first()
        lead_to_get = Lead.objects.exclude(assigned_to__user=user).first()
        lead_url = reverse("common_urls:api_leads:lead-detail", args=[lead_to_get.id])
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_user(user))
        res = self.client.get(lead_url, headers=self.headers)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_lead_details(self):
        print("\n~~~~~~~~~~~~~ test_get_lead_details ~~~~~~~~~~~~~~~")
        lead_db = Lead.objects.filter(org_id=self.org.id).first()
        lead_url = reverse("common_urls:api_leads:lead-detail", args=[lead_db.id])
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_role("ADMIN"))
        res = self.client.get(lead_url, headers=self.headers)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(set(GET_RESPONSE_KEYS.keys()), set(res.data.keys()), "Response keys are not as expected")
        lead_res = res.data["lead_obj"]

        self.assertEqual(lead_res["id"], str(lead_db.id))
        self.assertEqual(lead_db.title, lead_res["title"])
        self.assertEqual(lead_db.phone, lead_res["phone"])
        self.assertEqual(lead_db.email, lead_res["email"])
        self.assertEqual(float(lead_db.opportunity_amount), float(lead_res["opportunity_amount"]))
        self.assertEqual(lead_db.website, lead_res["website"])
        self.assertEqual(lead_db.description, lead_res["description"])
        self.assertEqual(lead_db.teams.all().count(), len(lead_res["teams"])) # We do not have an user interface to assign a lead to a team for now
        self.assertEqual(lead_db.contacts.all().count(), len(lead_res["contacts"]))
        db_contacts_ids = {str(contact.id) for contact in lead_db.contacts.all()}
        res_contacts_ids = {contact["id"] for contact in lead_res["contacts"]}
        self.assertEqual(db_contacts_ids, res_contacts_ids)
        db_assigned_to_ids = {str(profile.id) for profile in lead_db.assigned_to.all()}
        res_assigned_to_ids = {profile["id"] for profile in lead_res["assigned_to"]}
        self.assertEqual(db_assigned_to_ids, res_assigned_to_ids)
        self.assertEqual(lead_db.status, lead_res["status"])
        self.assertEqual(lead_db.source, lead_res["source"])
        self.assertEqual(lead_db.probability, lead_res["probability"])
        self.assertEqual(lead_db.industry, lead_res["industry"])
        self.assertEqual(lead_db.skype_ID, lead_res["skype_ID"])

    def test_update_lead(self):
        print("\n~~~~~~~~~~~~~ test_update_lead ~~~~~~~~~~~~~~~")
        lead = Lead.objects.filter(org_id=self.org.id).first()

        old_assigned_to_ids = {profile.id for profile in lead.assigned_to.all()}
        new_assigned_to_ids = {str(profile.id) for profile in Profile.objects.exclude(id__in=old_assigned_to_ids).all()[:2]}
        old_contacts_ids = {contact.id for contact in lead.contacts.all()}
        new_contacts_ids = {str(contact.id) for contact in Contact.objects.exclude(id__in=old_contacts_ids).all()[:2]}

        update_payload = POST_REQUEST_PAYLOAD.copy()
        update_payload["title"] = "Updated Title"
        update_payload["phone"] = "+911234567999"
        update_payload["email"] = "updated_email@test.com"
        update_payload["opportunity_amount"] = 88888
        update_payload["website"] = "https://updated-site.com"
        update_payload["status"] = "in process"
        update_payload["source"] = "email"
        update_payload["probability"] = 80
        update_payload["industry"] = "AGRICULTURE"
        update_payload["skype_ID"] = "updated-skype"
        update_payload["assigned_to"] = [str(id) for id in list(new_assigned_to_ids)]
        update_payload["contacts"] = [str(id) for id in list(new_contacts_ids)]

        lead_url = reverse("common_urls:api_leads:lead-detail", args=[lead.id])
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_user(self.sales_manager))
        res = self.client.put(lead_url, json.dumps(update_payload), headers=self.headers, content_type="application/json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        lead.refresh_from_db()

        self.assertEqual(lead.title, "Updated Title")
        self.assertEqual(lead.phone, "+911234567999")
        self.assertEqual(lead.email, "updated_email@test.com")
        self.assertEqual(lead.opportunity_amount, 88888)
        self.assertEqual(lead.website, "https://updated-site.com")
        self.assertEqual(lead.description, "")
        self.assertEqual(lead.teams.count(), 0) # We do not have an user interface to assign a lead to a team for now
        updated_assigned_ids = {str(user.id) for user in list(lead.assigned_to.all())}
        self.assertEqual(updated_assigned_ids, new_assigned_to_ids)
        self.assertEqual(lead.contacts.all().count(), 2)
        updated_contacts_ids = {str(contact.id) for contact in lead.contacts.all()}
        self.assertEqual(updated_contacts_ids, new_contacts_ids)
        self.assertEqual(lead.status, "in process")
        self.assertEqual(lead.source, "email")
        self.assertEqual(lead.probability, 80)
        self.assertEqual(lead.industry, "AGRICULTURE")
        self.assertEqual(lead.skype_ID, "updated-skype")

    def test_update_lead_status(self):
        print("\n~~~~~~~~~~~~~ test_update_lead_status ~~~~~~~~~~~~~~~")
        lead = Lead.objects.filter(org_id=self.org.id, status="assigned").first()

        payload = {
            "status": "converted"
        }

        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_user(self.sales_manager))
        lead_url = reverse("common_urls:api_leads:lead_status_update", args=[lead.id])
        res = self.client.post(lead_url, json.dumps(payload), headers=self.headers, content_type="application/json")

        self.assertEqual(res.status_code, status.HTTP_200_OK)

        lead.refresh_from_db()
        self.assertEqual(lead.status, "converted")

    def test_delete_lead(self):
        print("\n~~~~~~~~~~~~~ test_delete_lead ~~~~~~~~~~~~~~~")
        lead_id = Lead.objects.filter(org_id=self.org.id).first().id

        lead_url = reverse("common_urls:api_leads:lead-detail", args=[lead_id])
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_user(self.sales_manager))
        res = self.client.delete(lead_url, headers=self.headers)

        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        exists = Lead.objects.filter(id=lead_id).exists()
        self.assertFalse(exists)

    def test_delete_lead_no_permission(self):
        print("\n~~~~~~~~~~~~~ test_delete_lead_no_permission ~~~~~~~~~~~~~~~")
        user = User.objects.get(profile__org__id=self.org.id, email="user3@test.com")
        lead_id = Lead.objects.filter(org_id=self.org.id).first().id

        lead_url = reverse("common_urls:api_leads:lead-detail", args=[lead_id])
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.retrieve_token_for_user(user))
        res = self.client.delete(lead_url, headers=self.headers)

        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        exists = Lead.objects.filter(id=lead_id).exists()
        self.assertTrue(exists)

