import json, random

from common.utils import LEAD_SOURCE, LEAD_STATUS
from common.models import (
    Org,
    User,
    Profile,
    Address,
    Role,
)
from leads.models import Lead
from contacts.models import Contact
from teams.models import Teams
from help_tools.default_roles import generate_default_access_models


POST_LEAD_JSON_FORMAT = """{{
   "title":"Test lead title {i}",
   "first_name":"Test",
   "last_name":"Contact",
   "phone":"+{phone}",
   "email":"test{i}@email.com",
   "lead_attachment":null,
   "opportunity_amount":"10000",
   "website":"https://test-site{i}.com/",
   "description":"<p>Test description {i}</p>",
   "teams":"",
   "assigned_to":[],
   "contacts":[],
   "status":"{status}",
   "source":"{source}",
   "address_line":"Test Address Lane {i}",
   "street":"Test Street {i}",
   "city":"Test City {i}",
   "state":"Test State",
   "postcode":"12345",
   "country":"GB",
   "tags":[],
   "probability":"45",
   "industry":"ADVERTISING",
   "skype_ID":"test_skype_id{i}"
}}"""


def create_test_org():
    """ Create an organization

    admin user - admin@test.com

    """
    org = Org.objects.create(
            name="Test Org",
            google_auth_enabled=True,
            is_active=True
    )
    generate_default_access_models(org)

    profiles = []
    for i in range(30):
        user = User.objects.create(
            email="admin@test.com" if i == 0 else f"user{i}@test.com",
            is_active=True,
            is_staff=(i == 0),
            is_superuser=(i == 0)
        )
        user.set_password("password")
        user.save()
        address = Address.objects.create(
            address_line=f"Test Address Lane{i}",
            street=f"Test Street{i}",
            city=f"Test City{i}",
            state=f"Test State{i}",
            postcode="12345",
            country="NL"
        )
        if i == 0:
            role = Role.objects.filter(org=org).filter(name="ADMIN").first()
        elif i in [1,2]:
            role = Role.objects.filter(org=org).filter(name="SALES_MANAGER").first()
        elif i in [3,4,5,6,7,8,9,10]:
            role = Role.objects.filter(org=org).filter(name="SALES_REPRESENTATIVE").first()
        else:
            role = Role.objects.filter(org=org).filter(name="EMPLOYEE").first()
        profile = Profile.objects.create(
            user=user,
            org=org,
            phone=f"+91{9999999999-i}",
            alternate_phone=f"+91{8999999999-i}",
            address=address,
            role=role,
            has_sales_access=False,
            has_marketing_access=False,
            is_active=True,
            is_organization_admin=(i == 0),
            created_by=None  # Set later after admin is identified
        )
        profiles.append(profile)
        if i == 0:
            org_admin = profile  # Save admin for later use

    for profile in profiles:
        profile.created_by = org_admin.user
        profile.save()

    teams = []
    for i in range(2):
        team = Teams.objects.create(
            name=f"Team{i}",
            description="Team{i} Description",
            org=org,
            created_by=org_admin.user  # Set created_by_id to org admin
        )
        teams.append(team)

    contacts = []
    for i in range(30):
        total_address_in_db = Address.objects.count()
        address = Address.objects.create(
            address_line=f"Test Address Lane{total_address_in_db+i}",
            street=f"Test Street{total_address_in_db+i}",
            city=f"Test City{total_address_in_db+i}",
            state=f"Test State{total_address_in_db+i}",
            postcode="12345",
            country="NL"
        )

        total_contact_in_db = Contact.objects.count()
        contact_titles = ['Manager', 'Executive', 'Analyst', 'Consultant']
        contact = Contact.objects.create(
            salutation="Mr." if i % 2 == 0 else "Ms.",
            first_name=f"Name{total_contact_in_db + i}",
            last_name=f"Lastname{total_contact_in_db + i}",
            title=contact_titles[i % len(contact_titles)],
            language="English",
            primary_email=f"contact{total_contact_in_db + i}@mail.com",
            mobile_number=None,
            address=address,
            org=org,
            is_active=True,
            created_by=org_admin.user
        )
        # Assign contact to 1–2 profiles
        contact.assigned_to.set(random.sample(profiles, random.randint(1, 2)))
        # Assign contact to one of the teams
        contact.teams.add(random.choice(teams))
        contacts.append(contact)


def fill_leads(count: int):
    total_count_in_db = Lead.objects.count()
    leads = []
    for i in range(total_count_in_db, count + total_count_in_db):
        status_id = i % len(LEAD_STATUS) # 1/5 leads will have status 'converted'
        source_id = i % len(LEAD_SOURCE)
        formatted_string = POST_LEAD_JSON_FORMAT.format(
            i=i,
            status=LEAD_STATUS[status_id][0],
            source=LEAD_SOURCE[source_id][0],
            phone=911234567890 + i)
        json_obj = json.loads(formatted_string)
        json_obj.pop("lead_attachment")
        json_obj.pop("teams")
        json_obj.pop("assigned_to")
        json_obj.pop("contacts")
        json_obj.pop("tags")
        lead = Lead(**json_obj)
        leads.append(lead)

    Lead.objects.bulk_create(leads)

