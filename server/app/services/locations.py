import json
import math
from pathlib import Path

DATA = json.loads((Path(__file__).resolve().parent.parent/'data/kenya_locations.json').read_text())
COUNTIES = {row['code']: row for row in DATA['counties']}
SUBCOUNTIES = {row['code']: row for row in DATA['subcounties']}
WARDS = {row['code']: row for row in DATA['wards']}


def validate_location(values, require=False, ward_required=False):
    county, sub, ward = (values.get(key) for key in ['county_code','subcounty_code','ward_code'])
    if not any([county,sub,ward]) and not require: return
    if county not in COUNTIES: raise ValueError('Select a valid county.')
    if sub not in SUBCOUNTIES or SUBCOUNTIES[sub]['county_code'] != county:
        raise ValueError('Select a subcounty belonging to your county.')
    if ward_required and not ward: raise ValueError('Select your farm ward.')
    if ward and (ward not in WARDS or WARDS[ward]['sub_county_code'] != sub):
        raise ValueError('Select a ward belonging to your subcounty.')


def validate_pin(values):
    lat, lng = values.get('latitude'), values.get('longitude')
    if type(lat) not in (int,float) or type(lng) not in (int,float) or not math.isfinite(lat) or not math.isfinite(lng):
        raise ValueError('Place the farm pin on the map.')
    # Approximate Kenya extent, not proof of ward/county membership or land rights.
    if not -4.9 <= lat <= 5.1 or not 33.8 <= lng <= 42.1:
        raise ValueError('Place the farm pin within Kenya.')


def general_location(values):
    return ', '.join(filter(None,[values.get('town'),SUBCOUNTIES.get(values.get('subcounty_code'),{}).get('name'),COUNTIES.get(values.get('county_code'),{}).get('name')]))
