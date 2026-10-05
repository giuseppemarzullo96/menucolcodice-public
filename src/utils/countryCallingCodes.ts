export type CountryDial = {
  iso: string;
  dial: string;
  name: string;
};

const RAW = `
IT|39|Italia
AF|93|Afghanistan
AL|355|Albania
DZ|213|Algeria
AD|376|Andorra
AO|244|Angola
AI|1264|Anguilla
AG|1268|Antigua e Barbuda
SA|966|Arabia Saudita
AR|54|Argentina
AM|374|Armenia
AW|297|Aruba
AU|61|Australia
AT|43|Austria
AZ|994|Azerbaigian
BS|1242|Bahamas
BH|973|Bahrein
BD|880|Bangladesh
BB|1246|Barbados
BE|32|Belgio
BZ|501|Belize
BJ|229|Benin
BM|1441|Bermuda
BT|975|Bhutan
BY|375|Bielorussia
BO|591|Bolivia
BA|387|Bosnia ed Erzegovina
BW|267|Botswana
BR|55|Brasile
BN|673|Brunei
BG|359|Bulgaria
BF|226|Burkina Faso
BI|257|Burundi
KH|855|Cambogia
CM|237|Camerun
CA|1|Canada
CV|238|Capo Verde
KY|1345|Isole Cayman
TD|235|Ciad
CL|56|Cile
CN|86|Cina
CY|357|Cipro
CO|57|Colombia
KM|269|Comore
CG|242|Congo
CD|243|Congo (RDC)
KP|850|Corea del Nord
KR|82|Corea del Sud
CR|506|Costa Rica
CI|225|Costa d'Avorio
HR|385|Croazia
CU|53|Cuba
CW|599|Curaçao
DK|45|Danimarca
DM|1767|Dominica
EC|593|Ecuador
EG|20|Egitto
SV|503|El Salvador
AE|971|Emirati Arabi Uniti
ER|291|Eritrea
EE|372|Estonia
ET|251|Etiopia
FJ|679|Figi
PH|63|Filippine
FI|358|Finlandia
FR|33|Francia
GA|241|Gabon
GM|220|Gambia
GE|995|Georgia
GS|500|Georgia del Sud
DE|49|Germania
GH|233|Ghana
JM|1876|Giamaica
JP|81|Giappone
DJ|253|Gibuti
JO|962|Giordania
GR|30|Grecia
GD|1473|Grenada
GL|299|Groenlandia
GP|590|Guadalupa
GU|1671|Guam
GT|502|Guatemala
GG|44|Guernsey
GN|224|Guinea
GQ|240|Guinea Equatoriale
GW|245|Guinea-Bissau
GY|592|Guyana
GF|594|Guyana francese
HT|509|Haiti
HN|504|Honduras
HK|852|Hong Kong
IN|91|India
ID|62|Indonesia
IR|98|Iran
IQ|964|Iraq
IE|353|Irlanda
IS|354|Islanda
IM|44|Isola di Man
AX|358|Isole Åland
FO|298|Isole Fær Øer
MP|1670|Isole Marianne Settentrionali
MH|692|Isole Marshall
SB|677|Isole Salomone
TC|1649|Isole Turks e Caicos
VI|1340|Isole Vergini americane
VG|1284|Isole Vergini britanniche
IL|972|Israele
JE|44|Jersey
KZ|7|Kazakistan
KE|254|Kenya
KG|996|Kirghizistan
KI|686|Kiribati
KW|965|Kuwait
LA|856|Laos
LS|266|Lesotho
LV|371|Lettonia
LB|961|Libano
LR|231|Liberia
LY|218|Libia
LI|423|Liechtenstein
LT|370|Lituania
LU|352|Lussemburgo
MO|853|Macao
MK|389|Macedonia del Nord
MG|261|Madagascar
MW|265|Malawi
MY|60|Malesia
MV|960|Maldive
ML|223|Mali
MT|356|Malta
MA|212|Marocco
MQ|596|Martinica
MR|222|Mauritania
MU|230|Mauritius
YT|262|Mayotte
MX|52|Messico
FM|691|Micronesia
MD|373|Moldavia
MC|377|Monaco
MN|976|Mongolia
ME|382|Montenegro
MS|1664|Montserrat
MZ|258|Mozambico
MM|95|Myanmar
NA|264|Namibia
NR|674|Nauru
NP|977|Nepal
NI|505|Nicaragua
NE|227|Niger
NG|234|Nigeria
NU|683|Niue
NO|47|Norvegia
NC|687|Nuova Caledonia
NZ|64|Nuova Zelanda
OM|968|Oman
NL|31|Paesi Bassi
PK|92|Pakistan
PW|680|Palau
PS|970|Palestina
PA|507|Panama
PG|675|Papua Nuova Guinea
PY|595|Paraguay
PE|51|Perù
PF|689|Polinesia francese
PL|48|Polonia
PR|1|Porto Rico
PT|351|Portogallo
QA|974|Qatar
GB|44|Regno Unito
CZ|420|Repubblica Ceca
CF|236|Repubblica Centrafricana
DO|1809|Repubblica Dominicana
RE|262|Riunione
RO|40|Romania
RW|250|Ruanda
RU|7|Russia
EH|212|Sahara Occidentale
KN|1869|Saint Kitts e Nevis
LC|1758|Saint Lucia
VC|1784|Saint Vincent e Grenadine
BL|590|Saint-Barthélemy
MF|590|Saint-Martin
PM|508|Saint-Pierre e Miquelon
WS|685|Samoa
AS|1684|Samoa Americane
SM|378|San Marino
ST|239|São Tomé e Príncipe
SN|221|Senegal
RS|381|Serbia
SC|248|Seychelles
SL|232|Sierra Leone
SG|65|Singapore
SX|1721|Sint Maarten
SY|963|Siria
SK|421|Slovacchia
SI|386|Slovenia
SO|252|Somalia
ES|34|Spagna
LK|94|Sri Lanka
US|1|Stati Uniti
ZA|27|Sudafrica
SD|249|Sudan
SS|211|Sudan del Sud
SR|597|Suriname
SE|46|Svezia
CH|41|Svizzera
SZ|268|Eswatini
TJ|992|Tagikistan
TW|886|Taiwan
TZ|255|Tanzania
TH|66|Thailandia
TL|670|Timor Est
TG|228|Togo
TK|690|Tokelau
TO|676|Tonga
TT|1868|Trinidad e Tobago
TN|216|Tunisia
TR|90|Turchia
TM|993|Turkmenistan
TV|688|Tuvalu
UA|380|Ucraina
UG|256|Uganda
HU|36|Ungheria
UY|598|Uruguay
UZ|998|Uzbekistan
VU|678|Vanuatu
VA|379|Città del Vaticano
VE|58|Venezuela
VN|84|Vietnam
WF|681|Wallis e Futuna
YE|967|Yemen
ZM|260|Zambia
ZW|263|Zimbabwe
XK|383|Kosovo
`.trim();

export const COUNTRY_DIALS: CountryDial[] = RAW.split('\n')
  .map((line) => {
    const [iso, dial, name] = line.split('|');
    return { iso, dial, name };
  })
  .filter((row) => row.iso && row.dial && row.name);

const BY_ISO = new Map(COUNTRY_DIALS.map((row) => [row.iso, row]));
const DIAL_PRIORITY = ['IT', 'US', 'GB', 'FR', 'DE', 'ES', 'RU'];

export function countryFlag(iso: string) {
  return iso
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 2)
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export function countryByIso(iso: string) {
  return BY_ISO.get(iso.toUpperCase()) || BY_ISO.get('IT')!;
}

export function countriesForPicker() {
  const italy = countryByIso('IT');
  const rest = COUNTRY_DIALS.filter((row) => row.iso !== 'IT').sort((a, b) =>
    a.name.localeCompare(b.name, 'it')
  );
  return [italy, ...rest];
}

const BY_DIAL_LENGTH = [...COUNTRY_DIALS].sort((a, b) => {
  if (b.dial.length !== a.dial.length) return b.dial.length - a.dial.length;
  const pa = DIAL_PRIORITY.indexOf(a.iso);
  const pb = DIAL_PRIORITY.indexOf(b.iso);
  return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
});

export function parseStoredWhatsapp(stored: string): { iso: string; national: string } {
  const digits = String(stored || '')
    .replace(/[^\d]/g, '')
    .replace(/^00/, '');
  if (!digits) return { iso: 'IT', national: '' };
  for (const row of BY_DIAL_LENGTH) {
    if (digits.startsWith(row.dial) && digits.length > row.dial.length) {
      return { iso: row.iso, national: digits.slice(row.dial.length) };
    }
  }
  return { iso: 'IT', national: digits.replace(/^0+/, '') };
}

export function composeWhatsapp(iso: string, national: string) {
  const country = countryByIso(iso);
  let local = String(national || '').replace(/[^\d]/g, '');
  if (local.startsWith('00')) local = local.slice(2);
  if (local.startsWith(country.dial) && local.length > country.dial.length + 5) {
    local = local.slice(country.dial.length);
  }
  local = local.replace(/^0+/, '');
  if (!local) return '';
  return `${country.dial}${local}`;
}
