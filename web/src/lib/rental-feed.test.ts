import assert from "node:assert/strict";
import { test } from "node:test";
import { feedGaps, feedXml, feesFromForm, leaseTerm, splitBaths, type FeedData } from "./rental-feed.ts";

const data: FeedData = {
  org: "org1", company: "Oak & Pine Realty", contact: { name: "Sam", email: "sam@example.com", phone: "5125550100" },
  listings: [{
    id: "abc123", street: "14 Oak Ave", unit: "2B", city: "Austin", state: "TX", zip: "78701", home_type: "CONDO",
    price: 2450, beds: 2, baths: 1.5, sqft: 900, description: "Bright <corner> unit & views", lease_months: 12,
    available_on: "2026-11-01", furnished: false, cats_ok: true, dogs_ok: false, parking: "garageLot",
    fees: [
      { type: "applicationFee", amount: 50, timing: "atApplication", requirement: "mandatory", refundable: false },
      { type: "customFee", name: "Trash", amount: 15, timing: "monthly", requirement: "mandatory" },
    ],
    tour_url: null, updated_at: "2026-10-10T12:00:00Z", photos: ["m1", "m2"],
  }],
};

test("feedXml: HotPads 2.1 shape, escaped text, fees, pets, photos, split baths", () => {
  const x = feedXml(data, (m) => `https://app.test/feeds/zillow/T/photo/${m}`);
  assert.ok(x.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<hotPadsItems version="2.1"><Company id="org1"><name>Oak &amp; Pine Realty</name></Company>'));
  assert.match(x, /<Listing id="abc123" type="RENTAL" companyId="org1" propertyType="CONDO"><unit>2B<\/unit><street hide="false">14 Oak Ave<\/street>/);
  assert.match(x, /<description>Bright &lt;corner&gt; unit &amp; views<\/description><leaseTerm>12 Months<\/leaseTerm>/);
  assert.match(x, /<pets><pet><petType>cats<\/petType><allowed>true<\/allowed><\/pet><pet><petType>dogs<\/petType><allowed>false<\/allowed><\/pet><\/pets>/);
  assert.match(x, /<fee><feeCalculationType value="50" valueType="flatFee"\/><feeType>applicationFee<\/feeType><feeTimingType>atApplication<\/feeTimingType><feeRequirementType>mandatory<\/feeRequirementType><feeRefundableType>nonRefundable<\/feeRefundableType><\/fee>/);
  assert.match(x, /<feeType>customFee<\/feeType><feeName>Trash<\/feeName>/);
  assert.match(x, /<ListingPhoto source="https:\/\/app.test\/feeds\/zillow\/T\/photo\/m1"\/><ListingPhoto source="[^"]+m2"\/>/);
  assert.match(x, /<price>2450<\/price><pricingFrequency>MONTH<\/pricingFrequency><numBedrooms>2<\/numBedrooms><numFullBaths>1<\/numFullBaths><numHalfBaths>1<\/numHalfBaths>/);
  assert.doesNotMatch(x, /virtualTourUrl/); // empty values are left out, not sent blank
  assert.ok(x.trimEnd().endsWith("</Listing></hotPadsItems>"));
});

test("an empty feed is still valid (that's how every listing gets taken down)", () => {
  assert.match(feedXml({ ...data, listings: [] }, (m) => m), /<\/Company><\/hotPadsItems>\n$/);
});

test("helpers: baths, lease term, gaps", () => {
  assert.deepEqual([splitBaths(2), splitBaths(2.5), splitBaths(1.75), splitBaths(1.1)], [{ full: 2, half: 0 }, { full: 2, half: 1 }, { full: 1, half: 1 }, { full: 1, half: 0 }]);
  assert.deepEqual([leaseTerm(0), leaseTerm(12), leaseTerm(null)], ["monthly", "12 Months", null]);
  assert.deepEqual(feedGaps({ street: "1 A St", city: "X", state: "TX", zip: "78701", homeType: "HOUSE", approved: true, status: "Active" }), []);
  assert.deepEqual(feedGaps({ status: "Coming soon", approved: false }), ["street, city, state and ZIP", "home type", "broker approval", "status Active"]);
});

test("feesFromForm: known fees get their MITS rules, blanks are skipped, other fees need a name", () => {
  const form = (o: Record<string, string>) => (k: string) => o[k] ?? "";
  assert.deepEqual(feesFromForm(form({ fee_applicationFee: "50", fee_securityDeposit: "2450", fee_petRent: "", other_name_1: "Trash", other_amount_1: "15" })), [
    { type: "applicationFee", amount: 50, timing: "atApplication", requirement: "mandatory", refundable: false },
    { type: "securityDeposit", amount: 2450, timing: "moveIn", requirement: "mandatory", refundable: true },
    { type: "customFee", name: "Trash", amount: 15, timing: "monthly", requirement: "mandatory" },
  ]);
  assert.deepEqual(feesFromForm(form({ other_amount_2: "20" })), { error: "Name each other fee (e.g. Trash, Utilities)." });
  assert.ok("error" in (feesFromForm(form({ fee_petDeposit: "-5" })) as object));
});
