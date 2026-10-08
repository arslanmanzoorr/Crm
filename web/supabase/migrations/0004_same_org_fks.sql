-- Foreign key checks bypass RLS, so a plain contact_id FK would let one org attach rows to another
-- org's contact (and probe which ids exist). Composite FKs pin children to their parent's org.

alter table contacts add constraint contacts_id_org_key unique (id, org_id);

alter table activities drop constraint activities_contact_id_fkey;
alter table activities add constraint activities_contact_same_org
  foreign key (contact_id, org_id) references contacts (id, org_id) on delete cascade;

alter table tasks drop constraint tasks_contact_id_fkey;
alter table tasks add constraint tasks_contact_same_org
  foreign key (contact_id, org_id) references contacts (id, org_id) on delete cascade;
